import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChatTaskRef = { id: string; title: string };
export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tasks: ChatTaskRef[] | null;
  created_at: string;
};
export type Conversation = {
  id: string;
  title: string;
  agent_id: string | null;
  updated_at: string;
  created_at: string;
};

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Conversation[]> => {
    const { data, error } = await context.supabase
      .from("chat_conversations")
      .select("id, title, agent_id, updated_at, created_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as Conversation[];
  });

const CreateConvSchema = z.object({
  title: z.string().max(200).optional(),
  teamspace_id: z.string().uuid().optional(),
  agent_id: z.string().max(60).optional(),
});
export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateConvSchema.parse(raw))
  .handler(async ({ data, context }): Promise<Conversation> => {
    const { data: row, error } = await context.supabase
      .from("chat_conversations")
      .insert({
        user_id: context.userId,
        teamspace_id: data.teamspace_id ?? null,
        title: data.title?.trim() || "New chat",
        agent_id: data.agent_id ?? null,
      })
      .select("id, title, agent_id, updated_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as Conversation;
  });

const RenameSchema = z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) });
export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RenameSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_conversations")
      .update({ title: data.title })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_conversations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const loadChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ conversation_id: z.string().uuid().optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<StoredChatMessage[]> => {
    let q = context.supabase
      .from("chat_messages")
      .select("id, role, content, tasks, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (data.conversation_id) q = q.eq("conversation_id", data.conversation_id);
    else q = q.is("conversation_id", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as StoredChatMessage[];
  });

const SaveSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(20000),
  conversation_id: z.string().uuid().optional(),
  teamspace_id: z.string().uuid().optional(),
  tasks: z
    .array(z.object({ id: z.string(), title: z.string() }))
    .optional(),
});

export const saveChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveSchema.parse(raw))
  .handler(async ({ data, context }): Promise<StoredChatMessage> => {
    const { data: row, error } = await context.supabase
      .from("chat_messages")
      .insert({
        user_id: context.userId,
        conversation_id: data.conversation_id ?? null,
        teamspace_id: data.teamspace_id ?? null,
        role: data.role,
        content: data.content,
        tasks: data.tasks ?? null,
      })
      .select("id, role, content, tasks, created_at")
      .single();
    if (error) throw new Error(error.message);

    if (data.conversation_id) {
      await context.supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.conversation_id)
        .eq("user_id", context.userId);
    }
    return row as StoredChatMessage;
  });

export const clearChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ conversation_id: z.string().uuid().optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("chat_messages").delete().eq("user_id", context.userId);
    if (data.conversation_id) q = q.eq("conversation_id", data.conversation_id);
    else q = q.is("conversation_id", null);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Log a system/assistant event into the user's most-recent conversation
// (creates one if none exists). Used e.g. when the user creates a task manually.
const LogEventSchema = z.object({
  content: z.string().min(1).max(4000),
  teamspace_id: z.string().uuid().optional(),
  tasks: z
    .array(z.object({ id: z.string(), title: z.string() }))
    .optional(),
});
export const logChatEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => LogEventSchema.parse(raw))
  .handler(async ({ data, context }) => {
    // Find most recent conversation, or create one
    const { data: conv } = await context.supabase
      .from("chat_conversations")
      .select("id")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let convId = conv?.id as string | undefined;
    if (!convId) {
      const { data: created, error: cErr } = await context.supabase
        .from("chat_conversations")
        .insert({
          user_id: context.userId,
          teamspace_id: data.teamspace_id ?? null,
          title: "Activity",
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      convId = created.id as string;
    }
    const { error } = await context.supabase.from("chat_messages").insert({
      user_id: context.userId,
      conversation_id: convId,
      teamspace_id: data.teamspace_id ?? null,
      role: "assistant",
      content: data.content,
      tasks: data.tasks ?? null,
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);
    return { ok: true, conversation_id: convId };
  });

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

export const loadChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoredChatMessage[]> => {
    const { data, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, tasks, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as StoredChatMessage[];
  });

const SaveSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
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
        teamspace_id: data.teamspace_id ?? null,
        role: data.role,
        content: data.content,
        tasks: data.tasks ?? null,
      })
      .select("id, role, content, tasks, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as StoredChatMessage;
  });

export const clearChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

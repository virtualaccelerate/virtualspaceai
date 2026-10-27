import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTaskHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ task_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { listTaskEventsForUser } = await import("./task-events.server");
    return (await listTaskEventsForUser(context.userId, data.task_id)) as any;
  });

export const getActivityFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { listActivityFeedForUser } = await import("./task-events.server");
    return (await listActivityFeedForUser(context.userId, data.teamspace_id)) as any[];
  });

export const saveTaskComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ task_id: z.string().uuid(), comment_id: z.string().uuid().optional(), body: z.string().trim().min(1).max(5000), mentions: z.array(z.string().uuid()).max(100).default([]) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { saveCommentForUser } = await import("./task-events.server");
    return saveCommentForUser(context.userId, data);
  });

export const deleteTaskComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ task_id: z.string().uuid(), comment_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { deleteCommentForUser } = await import("./task-events.server");
    return deleteCommentForUser(context.userId, data.task_id, data.comment_id);
  });

export const getTaskCommentCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ task_ids: z.array(z.string().uuid()).max(1500) }).parse(raw))
  .handler(async ({ data, context }) => {
    if (!data.task_ids.length) return {} as Record<string, number>;
    const { data: tasks, error } = await context.supabase.from("tasks").select("id").in("id", data.task_ids);
    if (error) throw error;
    if (!tasks?.length) return {} as Record<string, number>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const counts: Record<string, number> = {};
    for (let offset = 0; ; offset += 1000) {
      const { data: rows, error: readError } = await supabaseAdmin.from("task_events").select("task_id").in("task_id", tasks.map((task) => task.id)).eq("kind", "comment").is("deleted_at", null).range(offset, offset + 999);
      if (readError) throw readError;
      for (const row of rows ?? []) counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
      if ((rows?.length ?? 0) < 1000) break;
    }
    return counts;
  });

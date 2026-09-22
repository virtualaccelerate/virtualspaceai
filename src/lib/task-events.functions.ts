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

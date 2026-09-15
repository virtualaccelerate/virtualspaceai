import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CreateTasksBulkSchema, PreviewTasksSchema } from "./task-import.schemas";

export const previewTasksFromTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PreviewTasksSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const mod = await import("./task-import.server");
    return mod.previewTasksFromTable(context.userId, data);
  });

export const createTasksBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateTasksBulkSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const mod = await import("./task-import.server");
    return mod.createTasksBulkForUser(context.userId, data.teamspace_id, data.rows);
  });

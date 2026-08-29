import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CreateTaskSchema, DeleteTaskSchema, ListMembersSchema, UpdateTaskSchema } from "./tasks.schemas";

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateTaskSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { createTaskForUser } = await import("./tasks.server");
    return createTaskForUser(context.userId, data);
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateTaskSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { updateTaskForUser } = await import("./tasks.server");
    return updateTaskForUser(context.userId, data);
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteTaskSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { deleteTaskForUser } = await import("./tasks.server");
    return deleteTaskForUser(context.userId, data.id);
  });

export const listTaskMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListMembersSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { listMembersForUser } = await import("./tasks.server");
    return listMembersForUser(context.userId, data.teamspace_id);
  });

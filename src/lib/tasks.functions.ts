import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CreateTaskSchema, DeleteTaskSchema, ListMembersSchema, UpdateTaskSchema } from "./tasks.schemas";
import { createTaskForUser, deleteTaskForUser, listMembersForUser, updateTaskForUser } from "./tasks.server";

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateTaskSchema.parse(raw))
  .handler(async ({ data, context }) => createTaskForUser(context.userId, data));

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateTaskSchema.parse(raw))
  .handler(async ({ data, context }) => updateTaskForUser(context.userId, data));

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteTaskSchema.parse(raw))
  .handler(async ({ data, context }) => deleteTaskForUser(context.userId, data.id));

export const listTaskMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListMembersSchema.parse(raw))
  .handler(async ({ data, context }) => listMembersForUser(context.userId, data.teamspace_id));

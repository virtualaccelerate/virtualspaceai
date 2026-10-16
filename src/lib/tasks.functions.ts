import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CreateTaskSchema, DecideTaskSchema, DeleteTaskSchema, DeleteTasksBulkSchema, ListMembersSchema, SubmitProofSchema, UpdateTaskSchema, UpdateTasksBulkSchema } from "./tasks.schemas";

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

export const deleteTasksBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteTasksBulkSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { deleteTasksBulkForUser } = await import("./tasks.server");
    return deleteTasksBulkForUser(context.userId, data);
  });

export const listTaskMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListMembersSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { listMembersForUser } = await import("./tasks.server");
    return listMembersForUser(context.userId, data.teamspace_id);
  });

export const loadAssignmentPicker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: z.string().uuid().optional(), task_id: z.string().uuid().optional(), assignee: z.string().max(200).optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { assignmentPickerForUser } = await import("./tasks.server");
    return assignmentPickerForUser(context.userId, data);
  });

export const submitTaskForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SubmitProofSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { submitProofForUser } = await import("./tasks.server");
    return submitProofForUser(context.userId, data);
  });

export const reviewTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DecideTaskSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { decideTaskForUser } = await import("./tasks.server");
    return decideTaskForUser(context.userId, data);
  });

export const updateTasksBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateTasksBulkSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { updateTasksBulkForUser } = await import("./tasks.server");
    return (await updateTasksBulkForUser(context.userId, data)) as any;
  });

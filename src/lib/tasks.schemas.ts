import { z } from "zod";

export const TaskStatusSchema = z.enum(["backlog", "in_progress", "review", "done"]);
export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const RequiredDueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дедлайн");
const OptionalDueDateSchema = RequiredDueDateSchema.optional().nullable();

export const CreateTaskSchema = z.object({
  teamspace_id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  assignee_name: z.string().trim().max(160).optional().nullable(),
  project: z.string().trim().max(160).optional().nullable(),
  department: z.string().trim().max(160).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  due_date: OptionalDueDateSchema,
});

export const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  project: z.string().trim().max(160).optional().nullable(),
  department: z.string().trim().max(160).optional().nullable(),
  due_date: OptionalDueDateSchema,
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  position: z.number().int().min(0).optional(),
});

export const DeleteTaskSchema = z.object({ id: z.string().uuid() });
export const DeleteTasksBulkSchema = z.object({
  teamspace_id: z.string().uuid().optional(),
  ids: z.array(z.string().uuid()).max(2000).optional(),
  all: z.boolean().optional(),
});
export const ListMembersSchema = z.object({ teamspace_id: z.string().uuid() });

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const SubmitProofSchema = z.object({
  id: z.string().uuid(),
  proof_url: z.string().trim().max(2000).optional().nullable(),
  proof_note: z.string().trim().max(2000).optional().nullable(),
});

export const DecideTaskSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "rework"]),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const UpdateTasksBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: RequiredDueDateSchema.optional(),
});

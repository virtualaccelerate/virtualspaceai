import { z } from "zod";

export const TaskStatusSchema = z.enum(["backlog", "in_progress", "review", "done"]);
export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const DueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();

export const CreateTaskSchema = z.object({
  teamspace_id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: DueDateSchema,
});

export const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(4000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: DueDateSchema,
  position: z.number().int().min(0).optional(),
});

export const DeleteTaskSchema = z.object({ id: z.string().uuid() });
export const ListMembersSchema = z.object({ teamspace_id: z.string().uuid() });

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
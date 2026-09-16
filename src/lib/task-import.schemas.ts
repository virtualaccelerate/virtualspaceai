import { z } from "zod";
import { TaskPrioritySchema, TaskStatusSchema } from "./tasks.schemas";

export const PreviewTasksSchema = z.object({
  teamspace_id: z.string().uuid(),
  file_base64: z.string().optional(),
  file_name: z.string().max(300).optional(),
  sheet_url: z.string().url().optional(),
  document_id: z.string().uuid().optional(),
  drive_file_id: z.string().max(200).optional(),
});

export const ImportRowSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дедлайн"),
});

export const CreateTasksBulkSchema = z.object({
  teamspace_id: z.string().uuid(),
  rows: z.array(ImportRowSchema).min(1).max(300),
});

export type PreviewTasksInput = z.infer<typeof PreviewTasksSchema>;
export type ImportRow = z.infer<typeof ImportRowSchema>;

export type PreviewRow = ImportRow & {
  sheet: string;
  row_number: number;
  assignee_raw: string | null;
  assignee_matched: boolean;
  duplicate: boolean;
  include: boolean;
};

export type PreviewResult = {
  rows: PreviewRow[];
  skipped: number;
  sheets: string[];
  members: { id: string; name: string }[];
};

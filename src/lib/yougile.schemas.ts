import { z } from "zod";

export const ConnectYouGileSchema = z.object({
  teamspace_id: z.string().uuid(),
  api_key: z.string().trim().min(10).max(1000),
});

export const ConfigureYouGileSchema = z.object({
  teamspace_id: z.string().uuid(),
  project_id: z.string().min(1).max(200),
  project_name: z.string().min(1).max(300),
  column_map: z.record(z.string(), z.enum(["backlog", "in_progress", "review", "done"])),
  user_map: z.record(z.string(), z.string().uuid()).default({}),
});

export const YouGileStatusSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(["backlog", "in_progress", "review", "done"]),
});

export const TeamspaceSchema = z.object({ teamspace_id: z.string().uuid() });
export const YouGileProjectSchema = TeamspaceSchema.extend({ project_id: z.string().min(1).max(200) });
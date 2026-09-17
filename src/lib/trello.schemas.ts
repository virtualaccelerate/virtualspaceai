import { z } from "zod";

export const ConnectTrelloSchema = z.object({
  teamspace_id: z.string().uuid(),
  api_key: z.string().trim().min(8).max(500),
  api_token: z.string().trim().min(8).max(1000),
});

export const ConfigureTrelloSchema = z.object({
  teamspace_id: z.string().uuid(),
  board_id: z.string().min(1).max(200),
  board_name: z.string().min(1).max(300),
  column_map: z.record(z.string(), z.enum(["backlog", "in_progress", "review", "done"])),
  user_map: z.record(z.string(), z.string().uuid()).default({}),
});

export const TrelloStatusSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(["backlog", "in_progress", "review", "done"]),
});

export const TrelloTeamspaceSchema = z.object({ teamspace_id: z.string().uuid() });
export const TrelloBoardSchema = TrelloTeamspaceSchema.extend({ board_id: z.string().min(1).max(200) });

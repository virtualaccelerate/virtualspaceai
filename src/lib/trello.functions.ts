import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ConfigureTrelloSchema, ConnectTrelloSchema, TrelloBoardSchema, TrelloStatusSchema, TrelloTeamspaceSchema } from "./trello.schemas";

export const getTrelloStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TrelloTeamspaceSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { getTrelloStatusForUser } = await import("./trello.server");
    return (await getTrelloStatusForUser(context.userId, data.teamspace_id)) as any;
  });

export const connectTrello = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ConnectTrelloSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { connectTrelloForUser } = await import("./trello.server");
    return (await connectTrelloForUser(context.userId, data)) as any;
  });

export const inspectTrelloBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TrelloBoardSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { inspectTrelloBoardForUser } = await import("./trello.server");
    return (await inspectTrelloBoardForUser(context.userId, data.teamspace_id, data.board_id)) as any;
  });

export const configureTrello = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ConfigureTrelloSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { configureTrelloForUser } = await import("./trello.server");
    return configureTrelloForUser(context.userId, data);
  });

export const syncTrello = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TrelloTeamspaceSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { syncTrelloForUser } = await import("./trello.server");
    return syncTrelloForUser(context.userId, data.teamspace_id);
  });

export const disconnectTrello = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TrelloTeamspaceSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { disconnectTrelloForUser } = await import("./trello.server");
    return disconnectTrelloForUser(context.userId, data.teamspace_id);
  });

export const setTrelloTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TrelloStatusSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { updateTrelloTaskStatus } = await import("./trello.server");
    return updateTrelloTaskStatus(data.task_id, data.status, context.userId);
  });

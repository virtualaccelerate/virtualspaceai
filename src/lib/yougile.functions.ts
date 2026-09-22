import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ConfigureYouGileSchema, ConnectYouGileSchema, TeamspaceSchema, YouGileProjectSchema, YouGileStatusSchema } from "./yougile.schemas";

export const getYouGileStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TeamspaceSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { getYouGileStatusForUser } = await import("./yougile.server");
    return (await getYouGileStatusForUser(context.userId, data.teamspace_id)) as any;
  });

export const connectYouGile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ConnectYouGileSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { connectYouGileForUser } = await import("./yougile.server");
    return (await connectYouGileForUser(context.userId, data)) as any;
  });

export const inspectYouGileProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => YouGileProjectSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { inspectYouGileProjectForUser } = await import("./yougile.server");
    return (await inspectYouGileProjectForUser(context.userId, data.teamspace_id, data.project_ids)) as any;
  });

export const configureYouGile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ConfigureYouGileSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { configureYouGileForUser } = await import("./yougile.server");
    return configureYouGileForUser(context.userId, data);
  });

export const syncYouGile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TeamspaceSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { syncYouGileForUser } = await import("./yougile.server");
    return syncYouGileForUser(context.userId, data.teamspace_id);
  });

export const disconnectYouGile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TeamspaceSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { disconnectYouGileForUser } = await import("./yougile.server");
    return disconnectYouGileForUser(context.userId, data.teamspace_id);
  });

export const setYouGileTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => YouGileStatusSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { updateYouGileTaskStatus } = await import("./yougile.server");
    return updateYouGileTaskStatus(data.task_id, data.status, context.userId);
  });
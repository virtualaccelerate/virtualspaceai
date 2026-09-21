import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const loadTeamOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: z.string().uuid().optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { getTeamOverview } = await import("./team.server");
    return getTeamOverview(context.userId, data.teamspace_id);
  });

export const loadTeamPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: z.string().uuid().optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { getTeamPerformance } = await import("./team.server");
    return getTeamPerformance(context.userId, data.teamspace_id);
  });

export const loadMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: z.string().uuid().optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { getMyWorkspaceRole } = await import("./team.server");
    return getMyWorkspaceRole(context.userId, data.teamspace_id);
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        teamspace_id: z.string().uuid(),
        user_id: z.string().uuid(),
        role: z.enum(["admin", "member"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { setMemberRoleForUser } = await import("./team.server");
    return setMemberRoleForUser(context.userId, data);
  });

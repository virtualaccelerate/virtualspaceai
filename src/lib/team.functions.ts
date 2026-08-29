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

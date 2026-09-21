import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteTeamspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ teamspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { deleteTeamspaceForUser } = await import("./teamspaces.server");
    return deleteTeamspaceForUser(context.userId, data.teamspaceId);
  });
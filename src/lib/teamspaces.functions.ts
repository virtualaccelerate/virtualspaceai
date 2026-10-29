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

export const renameTeamspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ teamspaceId: z.string().uuid(), name: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { renameTeamspaceForUser } = await import("./teamspaces.server");
    return renameTeamspaceForUser(context.userId, data.teamspaceId, data.name);
  });

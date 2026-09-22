import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProjectsInput = z
  .object({
    teamspace_id: z.string().uuid().nullish(),
    board: z.string().max(300).nullish(),
    month: z.string().max(7).nullish(),
  })
  .default({});

export const listProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ProjectsInput.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { listProjectsForUser } = await import("./projects.server");
    return (await listProjectsForUser(context.userId, data.teamspace_id ?? null, {
      board: data.board ?? null,
      month: data.month ?? null,
    })) as any;
  });


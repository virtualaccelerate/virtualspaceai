import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["page_view", "action"]),
  feature: z.string().min(1).max(60),
  path: z.string().max(200).optional().nullable(),
  teamspace_id: z.string().uuid().optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const trackActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => schema.parse(raw))
  .handler(async ({ data, context }) => {
    const { logActivity } = await import("./activity.server");
    await logActivity({
      userId: context.userId,
      teamspaceId: data.teamspace_id ?? null,
      kind: data.kind,
      feature: data.feature,
      path: data.path ?? null,
      meta: (data.meta as Record<string, unknown> | null) ?? null,
    });
    return { ok: true as const };
  });

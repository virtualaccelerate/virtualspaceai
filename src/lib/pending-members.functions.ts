import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const loadPendingMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { listPendingMembers } = await import("./pending-members.server");
    return listPendingMembers(context.userId, data.teamspace_id);
  });

export const savePendingMemberEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), email: z.string().trim().max(200).nullable() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { setPendingMemberEmail } = await import("./pending-members.server");
    return setPendingMemberEmail(context.userId, data.id, data.email);
  });

export const removePendingMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { deletePendingMember } = await import("./pending-members.server");
    return deletePendingMember(context.userId, data.id);
  });

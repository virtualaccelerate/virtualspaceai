import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Join a teamspace by invite code. Runs server-side with the service client so
 * the public `join_teamspace_by_code` RPC no longer needs to be exposed to
 * authenticated/anon roles (security hardening).
 */
export const joinTeamspaceByCodeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ts, error: tsErr } = await supabaseAdmin
      .from("teamspaces")
      .select("id")
      .eq("invite_code", data.code)
      .maybeSingle();

    if (tsErr) throw new Error(tsErr.message);
    if (!ts) throw new Error("Invalid invite code");

    const { error: insErr } = await supabaseAdmin
      .from("teamspace_members")
      .upsert(
        { teamspace_id: ts.id, user_id: context.userId, role: "member" },
        { onConflict: "teamspace_id,user_id", ignoreDuplicates: true },
      );

    if (insErr) throw new Error(insErr.message);
    return ts.id as string;
  });

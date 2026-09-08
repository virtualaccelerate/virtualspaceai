/** Server-only helpers for platform activity tracking. */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function logActivity(input: {
  userId: string;
  teamspaceId?: string | null;
  kind: string;
  feature: string;
  path?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  if (!input.userId) return;
  try {
    const db = await admin();
    await db.from("activity_events").insert({
      user_id: input.userId,
      teamspace_id: input.teamspaceId ?? null,
      kind: input.kind,
      feature: input.feature,
      path: input.path ?? null,
      meta: (input.meta ?? null) as never,
    });
  } catch {
    /* tracking must never break a user action */
  }
}

/** Server-only helpers for in-app notifications. */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function displayName(userId: string): Promise<string> {
  const db = await admin();
  const { data } = await db.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return data?.full_name || data?.email || "Участник команды";
}

export async function createNotification(input: {
  userId: string;
  teamspaceId?: string | null;
  kind: string;
  title: string;
  body?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  taskId?: string | null;
}) {
  if (!input.userId) return;
  const db = await admin();
  await db.from("notifications").insert({
    user_id: input.userId,
    teamspace_id: input.teamspaceId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    task_id: input.taskId ?? null,
  });
}

export async function listNotificationsForUser(userId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const db = await admin();
  let q = db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (ids && ids.length) q = q.in("id", ids);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}

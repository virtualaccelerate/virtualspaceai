/**
 * People named in an imported table who are not workspace members yet.
 * They are created automatically on import (name only), the owner adds the
 * email later, and as soon as a profile with that email exists they become a
 * real member and inherit the tasks that carried their name.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertMember(userId: string, teamspaceId: string) {
  const db = await admin();
  const { data } = await db
    .from("teamspace_members")
    .select("id")
    .eq("teamspace_id", teamspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Workspace access denied");
}

export type PendingMember = {
  id: string;
  teamspace_id: string;
  name: string;
  email: string | null;
  linked_user_id: string | null;
  created_at: string;
  open_tasks: number;
  done_tasks: number;
};

/** Creates the placeholder (or returns the existing one) for a name from a table. */
export async function ensurePendingMember(userId: string, teamspaceId: string, name: string) {
  const clean = name.trim().slice(0, 120);
  if (!clean) return null;
  const db = await admin();
  const { data: existing } = await db
    .from("pending_members")
    .select("id, name")
    .eq("teamspace_id", teamspaceId)
    .ilike("name", clean)
    .maybeSingle();
  if (existing) return existing.name;
  const { error } = await db
    .from("pending_members")
    .insert({ teamspace_id: teamspaceId, name: clean, created_by: userId, source: "import" });
  if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
  return clean;
}

/** Links pending people whose email now belongs to a real account, and hands over their tasks. */
export async function reconcilePendingMembers(teamspaceId: string) {
  const db = await admin();
  const { data: pending } = await db
    .from("pending_members")
    .select("id, name, email, linked_user_id")
    .eq("teamspace_id", teamspaceId)
    .is("linked_user_id", null)
    .not("email", "is", null);
  if (!pending?.length) return;

  for (const row of pending) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email) continue;
    const { data: profile } = await db
      .from("profiles")
      .select("id, full_name, email")
      .ilike("email", email)
      .maybeSingle();
    if (!profile) continue;

    await db
      .from("teamspace_members")
      .upsert(
        { teamspace_id: teamspaceId, user_id: profile.id, role: "member" },
        { onConflict: "teamspace_id,user_id", ignoreDuplicates: true },
      );

    await db
      .from("tasks")
      .update({ assignee_id: profile.id, assignee_name: profile.full_name || profile.email })
      .eq("teamspace_id", teamspaceId)
      .is("assignee_id", null)
      .ilike("assignee_name", row.name);

    await db.from("pending_members").update({ linked_user_id: profile.id }).eq("id", row.id);
  }
}

export async function listPendingMembers(userId: string, teamspaceId: string): Promise<PendingMember[]> {
  await assertMember(userId, teamspaceId);
  await reconcilePendingMembers(teamspaceId).catch(() => {});
  const db = await admin();
  const [{ data: rows }, { data: tasks }] = await Promise.all([
    db
      .from("pending_members")
      .select("id, teamspace_id, name, email, linked_user_id, created_at")
      .eq("teamspace_id", teamspaceId)
      .is("linked_user_id", null)
      .order("created_at", { ascending: true }),
    db.from("tasks").select("assignee_name, status, assignee_id").eq("teamspace_id", teamspaceId),
  ]);
  return (rows ?? []).map((r) => {
    const mine = (tasks ?? []).filter(
      (t) => !t.assignee_id && (t.assignee_name ?? "").trim().toLowerCase() === r.name.trim().toLowerCase(),
    );
    return {
      ...r,
      open_tasks: mine.filter((t) => t.status !== "done").length,
      done_tasks: mine.filter((t) => t.status === "done").length,
    };
  });
}

export async function setPendingMemberEmail(userId: string, id: string, email: string | null) {
  const db = await admin();
  const { data: row } = await db.from("pending_members").select("teamspace_id").eq("id", id).maybeSingle();
  if (!row) throw new Error("Запись не найдена");
  await assertMember(userId, row.teamspace_id);
  const clean = email?.trim().toLowerCase() || null;
  if (clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Некорректная почта");
  const { error } = await db.from("pending_members").update({ email: clean }).eq("id", id);
  if (error) throw new Error(error.message);
  await reconcilePendingMembers(row.teamspace_id).catch(() => {});
  return { ok: true };
}

export async function deletePendingMember(userId: string, id: string) {
  const db = await admin();
  const { data: row } = await db.from("pending_members").select("teamspace_id").eq("id", id).maybeSingle();
  if (!row) return { ok: true };
  await assertMember(userId, row.teamspace_id);
  const { error } = await db.from("pending_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

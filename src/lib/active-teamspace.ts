import { supabase } from "@/integrations/supabase/client";

export type TeamspaceSummary = { id: string; name: string; invite_code: string; role?: string };

/** All teamspaces the signed-in user belongs to. */
export async function listMyTeamspaces(): Promise<TeamspaceSummary[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("teamspace_members")
    .select("role, teamspaces:teamspace_id (id, name, invite_code)")
    .eq("user_id", auth.user.id);
  return ((data as any[]) ?? [])
    .map((row) => (row.teamspaces ? { ...row.teamspaces, role: row.role } : null))
    .filter(Boolean) as TeamspaceSummary[];
}

/**
 * The active teamspace: profiles.current_teamspace_id when the user is still a
 * member of it, otherwise the first membership (which is then persisted).
 */
export async function getActiveTeamspaceId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("current_teamspace_id").eq("id", user.id).maybeSingle(),
    supabase.from("teamspace_members").select("teamspace_id").eq("user_id", user.id),
  ]);

  const ids = ((memberships as any[]) ?? []).map((m) => m.teamspace_id as string);
  if (!ids.length) return null;

  const current = (profile as any)?.current_teamspace_id as string | null | undefined;
  if (current && ids.includes(current)) return current;

  await supabase.from("profiles").update({ current_teamspace_id: ids[0] }).eq("id", user.id);
  return ids[0];
}

/** Switch the active teamspace (must be a membership of the current user). */
export async function setActiveTeamspace(teamspaceId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("profiles").update({ current_teamspace_id: teamspaceId }).eq("id", auth.user.id);
}

/** Join a teamspace by invite code and make it active. Returns the teamspace id. */
export async function joinTeamspaceByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_teamspace_by_code", { _code: code.trim() });
  if (error) throw error;
  const id = data as unknown as string;
  if (id) await setActiveTeamspace(id);
  return id;
}

import { supabase } from "@/integrations/supabase/client";

export type TeamspaceSummary = {
  id: string;
  name: string;
  invite_code: string;
  role?: string;
  logo_path: string | null;
  logo_url?: string | null;
};

/** All teamspaces the signed-in user belongs to. */
export async function listMyTeamspaces(): Promise<TeamspaceSummary[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("teamspace_members")
    .select("role, teamspaces:teamspace_id (id, name, invite_code, logo_path)")
    .eq("user_id", auth.user.id);
  const rows = ((data as any[]) ?? [])
    .map((row) => (row.teamspaces ? { ...row.teamspaces, role: row.role } : null))
    .filter(Boolean) as TeamspaceSummary[];
  return Promise.all(rows.map(async (row) => {
    if (!row.logo_path) return { ...row, logo_url: null };
    const { data: signed } = await supabase.storage.from("workspace-logos").createSignedUrl(row.logo_path, 3600);
    return { ...row, logo_url: signed?.signedUrl ?? null };
  }));
}

export async function uploadTeamspaceLogo(teamspace: TeamspaceSummary, file: File): Promise<void> {
  if (!file.type.startsWith("image/")) throw new Error("Можно загружать только изображения");
  if (file.size > 2 * 1024 * 1024) throw new Error("Размер логотипа не должен превышать 2 МБ");
  if (teamspace.role !== "owner" && teamspace.role !== "admin") throw new Error("Изменять логотип может владелец или администратор");
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${teamspace.id}/logo-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("workspace-logos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error: updateError } = await supabase.from("teamspaces").update({ logo_path: path }).eq("id", teamspace.id);
  if (updateError) {
    await supabase.storage.from("workspace-logos").remove([path]);
    throw new Error(updateError.message);
  }
  if (teamspace.logo_path) await supabase.storage.from("workspace-logos").remove([teamspace.logo_path]);
}

export async function removeTeamspaceLogo(teamspace: TeamspaceSummary): Promise<void> {
  if (teamspace.role !== "owner" && teamspace.role !== "admin") throw new Error("Изменять логотип может владелец или администратор");
  const { error } = await supabase.from("teamspaces").update({ logo_path: null }).eq("id", teamspace.id);
  if (error) throw new Error(error.message);
  if (teamspace.logo_path) await supabase.storage.from("workspace-logos").remove([teamspace.logo_path]);
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

/** Create a new teamspace owned by the current user and make it active. */
export async function createTeamspace(input: {
  name: string;
  teamSize?: string;
  businessType?: string;
}): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  // The id is generated client-side: RETURNING is blocked by the SELECT policy,
  // because membership is only added by an AFTER INSERT trigger.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("teamspaces").insert({
    id,
    name: input.name.trim(),
    team_size: (input.teamSize ?? "1-5") as any,
    business_type: (input.businessType ?? "startup") as any,
    owner_id: auth.user.id,
  });
  if (error) throw new Error(error.message || error.details || error.code || "Insert failed");
  await setActiveTeamspace(id);
  return id;
}

/** Join a teamspace by invite code and make it active. Returns the teamspace id. */
export async function joinTeamspaceByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_teamspace_by_code", { _code: code.trim() });
  if (error) throw error;
  const id = data as unknown as string;
  if (id) await setActiveTeamspace(id);
  return id;
}

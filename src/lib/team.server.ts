async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type TeamMember = {
  id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  telegram_linked: boolean;
  open_tasks: number;
  done_tasks: number;
};

export async function getTeamOverview(userId: string, requested?: string) {
  const db = await admin();
  let teamspaceId = requested;
  if (!teamspaceId) {
    const { data } = await db.from("profiles").select("current_teamspace_id").eq("id", userId).maybeSingle();
    teamspaceId = data?.current_teamspace_id ?? undefined;
  }
  if (!teamspaceId) return null;

  const { data: me } = await db
    .from("teamspace_members")
    .select("id")
    .eq("teamspace_id", teamspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!me) return null;

  const { data: ts } = await db
    .from("teamspaces")
    .select("id, name, invite_code, owner_id, business_type, team_size, created_at")
    .eq("id", teamspaceId)
    .maybeSingle();

  const { data: memberships } = await db
    .from("teamspace_members")
    .select("user_id, role, created_at")
    .eq("teamspace_id", teamspaceId)
    .order("created_at", { ascending: true });

  const ids = (memberships ?? []).map((m) => m.user_id);
  const [{ data: profiles }, { data: links }, { data: tasks }] = await Promise.all([
    ids.length ? db.from("profiles").select("id, full_name, email, avatar_url").in("id", ids) : Promise.resolve({ data: [] as never[] }),
    ids.length ? db.from("telegram_links").select("user_id, chat_id").in("user_id", ids) : Promise.resolve({ data: [] as never[] }),
    db.from("tasks").select("assignee_id, status").eq("teamspace_id", teamspaceId),
  ]);

  const members: TeamMember[] = (memberships ?? []).map((m) => {
    const p = profiles?.find((x) => x.id === m.user_id);
    const mine = (tasks ?? []).filter((t) => t.assignee_id === m.user_id);
    return {
      id: m.user_id,
      role: m.role,
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
      avatar_url: p?.avatar_url ?? null,
      joined_at: m.created_at ?? null,
      telegram_linked: Boolean(links?.some((l) => l.user_id === m.user_id && l.chat_id)),
      open_tasks: mine.filter((t) => t.status !== "done").length,
      done_tasks: mine.filter((t) => t.status === "done").length,
    };
  });

  return {
    teamspace: ts ? { id: ts.id, name: ts.name, invite_code: ts.invite_code, owner_id: ts.owner_id } : null,
    members,
    total_tasks: (tasks ?? []).length,
    unassigned_tasks: (tasks ?? []).filter((t) => !t.assignee_id).length,
    current_user_id: userId,
  };
}

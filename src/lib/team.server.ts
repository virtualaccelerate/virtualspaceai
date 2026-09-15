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

// ---------------- performance cards ----------------

export type MemberProjectStat = {
  teamspace_id: string;
  project: string;
  done: number;
  open: number;
  overdue: number;
};

export type MemberPerformance = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  total: number;
  done: number;
  in_progress: number;
  review: number;
  backlog: number;
  overdue: number;
  due_soon: number;
  completion_rate: number; // % of assigned tasks closed
  on_time_rate: number | null; // % of closed tasks finished on or before the due date
  avg_days_to_close: number | null;
  done_last_7: number;
  done_last_30: number;
  projects: MemberProjectStat[];
  recent_done: { id: string; title: string; project: string; closed_at: string | null }[];
};

const DAY = 86400000;

/**
 * Per-employee performance cards: pace, closed work and which project it belongs to.
 * Scope = every workspace the viewer shares with the member, so cross-project work is visible.
 */
export async function getTeamPerformance(userId: string, requested?: string) {
  const db = await admin();

  let teamspaceId = requested;
  if (!teamspaceId) {
    const { data } = await db.from("profiles").select("current_teamspace_id").eq("id", userId).maybeSingle();
    teamspaceId = data?.current_teamspace_id ?? undefined;
  }
  if (!teamspaceId) return null;

  // viewer must belong to the requested workspace
  const { data: me } = await db
    .from("teamspace_members")
    .select("id")
    .eq("teamspace_id", teamspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!me) return null;

  // workspaces the viewer belongs to = the projects we may report on
  const { data: mySpaces } = await db
    .from("teamspace_members")
    .select("teamspace_id")
    .eq("user_id", userId);
  const spaceIds = Array.from(new Set((mySpaces ?? []).map((r) => r.teamspace_id)));
  if (!spaceIds.length) return null;

  const [{ data: spaces }, { data: memberships }] = await Promise.all([
    db.from("teamspaces").select("id, name").in("id", spaceIds),
    db.from("teamspace_members").select("user_id, role").eq("teamspace_id", teamspaceId),
  ]);
  const projectName = new Map((spaces ?? []).map((s) => [s.id, s.name as string]));

  const ids = Array.from(new Set((memberships ?? []).map((m) => m.user_id)));
  if (!ids.length) return { members: [] as MemberPerformance[], projects: [] as string[] };

  const [{ data: profiles }, { data: tasks }] = await Promise.all([
    db.from("profiles").select("id, full_name, email, avatar_url").in("id", ids),
    db
      .from("tasks")
      .select("id, title, status, priority, due_date, created_at, updated_at, reviewed_at, assignee_id, teamspace_id")
      .in("teamspace_id", spaceIds)
      .in("assignee_id", ids),
  ]);

  const now = Date.now();
  const rows = (tasks ?? []) as any[];

  const members: MemberPerformance[] = ids.map((uid) => {
    const profile = profiles?.find((p) => p.id === uid);
    const role = (memberships ?? []).find((m) => m.user_id === uid)?.role ?? "member";
    const mine = rows.filter((task) => task.assignee_id === uid);

    const done = mine.filter((task) => task.status === "done");
    const open = mine.filter((task) => task.status !== "done");

    const closedAt = (task: any): number | null => {
      const raw = task.reviewed_at ?? task.updated_at;
      const ts = raw ? new Date(raw).getTime() : NaN;
      return Number.isNaN(ts) ? null : ts;
    };

    const overdue = open.filter(
      (task) => task.due_date && new Date(`${task.due_date}T18:00:00+06:00`).getTime() < now,
    ).length;
    const dueSoon = open.filter((task) => {
      if (!task.due_date) return false;
      const due = new Date(`${task.due_date}T18:00:00+06:00`).getTime();
      return due >= now && due - now <= 3 * DAY;
    }).length;

    const withDue = done.filter((task) => task.due_date && closedAt(task) !== null);
    const onTime = withDue.filter(
      (task) => (closedAt(task) as number) <= new Date(`${task.due_date}T23:59:59+06:00`).getTime(),
    ).length;

    const durations = done
      .map((task) => {
        const start = task.created_at ? new Date(task.created_at).getTime() : NaN;
        const end = closedAt(task);
        return end !== null && !Number.isNaN(start) && end >= start ? (end - start) / DAY : null;
      })
      .filter((d): d is number => d !== null);

    const projects: MemberProjectStat[] = spaceIds
      .map((sid) => {
        const inProject = mine.filter((task) => task.teamspace_id === sid);
        return {
          teamspace_id: sid,
          project: projectName.get(sid) ?? "—",
          done: inProject.filter((task) => task.status === "done").length,
          open: inProject.filter((task) => task.status !== "done").length,
          overdue: inProject.filter(
            (task) =>
              task.status !== "done" &&
              task.due_date &&
              new Date(`${task.due_date}T18:00:00+06:00`).getTime() < now,
          ).length,
        };
      })
      .filter((p) => p.done + p.open > 0)
      .sort((a, b) => b.done + b.open - (a.done + a.open));

    const recent_done = [...done]
      .sort((a, b) => (closedAt(b) ?? 0) - (closedAt(a) ?? 0))
      .slice(0, 5)
      .map((task) => ({
        id: task.id as string,
        title: task.title as string,
        project: projectName.get(task.teamspace_id) ?? "—",
        closed_at: task.reviewed_at ?? task.updated_at ?? null,
      }));

    return {
      user_id: uid,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role,
      total: mine.length,
      done: done.length,
      in_progress: mine.filter((task) => task.status === "in_progress").length,
      review: mine.filter((task) => task.status === "review").length,
      backlog: mine.filter((task) => task.status === "backlog").length,
      overdue,
      due_soon: dueSoon,
      completion_rate: mine.length ? Math.round((done.length / mine.length) * 100) : 0,
      on_time_rate: withDue.length ? Math.round((onTime / withDue.length) * 100) : null,
      avg_days_to_close: durations.length
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : null,
      done_last_7: done.filter((task) => (closedAt(task) ?? 0) >= now - 7 * DAY).length,
      done_last_30: done.filter((task) => (closedAt(task) ?? 0) >= now - 30 * DAY).length,
      projects,
      recent_done,
    };
  });

  members.sort((a, b) => b.done - a.done || b.total - a.total);

  return {
    members,
    projects: Array.from(new Set(members.flatMap((m) => m.projects.map((p) => p.project)))),
  };
}

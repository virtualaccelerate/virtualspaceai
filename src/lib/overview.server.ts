/** Real workspace numbers for the dashboard overview — server only. */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const DAY = 86_400_000;
const dueTs = (d: string) => new Date(`${d}T18:00:00+06:00`).getTime();

export type OverviewTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_name: string | null;
  overdue: boolean;
};

export type OverviewData = {
  teamspace: { id: string; name: string } | null;
  stats: {
    open_tasks: number;
    overdue: number;
    due_soon: number;
    done_last_7: number;
    completion_rate: number;
    members: number;
    documents: number;
    unassigned: number;
  };
  by_status: { backlog: number; in_progress: number; review: number; done: number };
  tasks: OverviewTask[];
  insights: { title: string; body: string; tone: "warn" | "info" }[];
  activity: { id: string; feature: string; kind: string; created_at: string; actor: string }[];
  notifications: { id: string; title: string; body: string | null; created_at: string; read: boolean }[];
  top_members: { id: string; name: string; open: number; done: number; overdue: number }[];
};

export async function getOverview(userId: string, requested?: string): Promise<OverviewData | null> {
  const db = await admin();

  let teamspaceId = requested;
  if (!teamspaceId) {
    const { data } = await db.from("profiles").select("current_teamspace_id").eq("id", userId).maybeSingle();
    teamspaceId = data?.current_teamspace_id ?? undefined;
  }
  if (!teamspaceId) return null;

  const { data: membership } = await db
    .from("teamspace_members")
    .select("id")
    .eq("teamspace_id", teamspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return null;

  const [{ data: ts }, { data: memberships }, { data: tasks }, { count: documents }, { data: events }, { data: notes }] =
    await Promise.all([
      db.from("teamspaces").select("id, name").eq("id", teamspaceId).maybeSingle(),
      db.from("teamspace_members").select("user_id, role").eq("teamspace_id", teamspaceId),
      db
        .from("tasks")
        .select("id, title, status, priority, due_date, assignee_id, assignee_name, created_at, updated_at, reviewed_at")
        .eq("teamspace_id", teamspaceId)
        .eq("external_archived", false)
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("documents").select("id", { count: "exact", head: true }).eq("teamspace_id", teamspaceId),
      db
        .from("activity_events")
        .select("id, feature, kind, created_at, user_id")
        .eq("teamspace_id", teamspaceId)
        .eq("kind", "action")
        .order("created_at", { ascending: false })
        .limit(8),
      db
        .from("notifications")
        .select("id, title, body, created_at, read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const rows = tasks ?? [];
  const now = Date.now();
  const open = rows.filter((t) => t.status !== "done");
  const done = rows.filter((t) => t.status === "done");
  const closedAt = (t: { reviewed_at?: string | null; updated_at?: string | null }) => {
    const raw = t.reviewed_at ?? t.updated_at;
    const v = raw ? new Date(raw).getTime() : NaN;
    return Number.isNaN(v) ? 0 : v;
  };
  const overdueRows = open.filter((t) => t.due_date && dueTs(t.due_date) < now);
  const dueSoon = open.filter((t) => t.due_date && dueTs(t.due_date) >= now && dueTs(t.due_date) - now <= 3 * DAY);
  const unassigned = open.filter((t) => !t.assignee_id).length;

  const ids = (memberships ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const nameOf = (id: string | null) => {
    if (!id) return "—";
    const p = profiles?.find((x) => x.id === id);
    return p?.full_name || p?.email?.split("@")[0] || "Участник";
  };

  const top_members = ids
    .map((id) => {
      const mine = rows.filter((t) => t.assignee_id === id);
      return {
        id,
        name: nameOf(id),
        open: mine.filter((t) => t.status !== "done").length,
        done: mine.filter((t) => t.status === "done").length,
        overdue: mine.filter((t) => t.status !== "done" && t.due_date && dueTs(t.due_date) < now).length,
      };
    })
    .filter((m) => m.open + m.done > 0)
    .sort((a, b) => b.open + b.done - (a.open + a.done))
    .slice(0, 5);

  const insights: OverviewData["insights"] = [];
  if (overdueRows.length) {
    insights.push({
      tone: "warn",
      title: `Просрочено задач: ${overdueRows.length}`,
      body: overdueRows.slice(0, 3).map((t) => t.title).join(" · "),
    });
  }
  if (dueSoon.length) {
    insights.push({
      tone: "info",
      title: `Дедлайн в ближайшие 3 дня: ${dueSoon.length}`,
      body: dueSoon.slice(0, 3).map((t) => t.title).join(" · "),
    });
  }
  if (unassigned) {
    insights.push({
      tone: "warn",
      title: `Без исполнителя: ${unassigned}`,
      body: "Назначьте ответственных, чтобы уведомления и отчёты работали.",
    });
  }
  const busiest = top_members[0];
  if (busiest && busiest.open > 0) {
    insights.push({ tone: "info", title: `Больше всего в работе: ${busiest.name}`, body: `${busiest.open} открытых задач` });
  }
  if (!insights.length) {
    insights.push({ tone: "info", title: "Всё под контролем", body: "Просрочек и задач без исполнителя нет." });
  }

  return {
    teamspace: ts ? { id: ts.id, name: ts.name } : null,
    stats: {
      open_tasks: open.length,
      overdue: overdueRows.length,
      due_soon: dueSoon.length,
      done_last_7: done.filter((t) => closedAt(t) >= now - 7 * DAY).length,
      completion_rate: rows.length ? Math.round((done.length / rows.length) * 100) : 0,
      members: ids.length,
      documents: documents ?? 0,
      unassigned,
    },
    by_status: {
      backlog: rows.filter((t) => t.status === "backlog").length,
      in_progress: rows.filter((t) => t.status === "in_progress").length,
      review: rows.filter((t) => t.status === "review").length,
      done: done.length,
    },
    tasks: [...open]
      .sort((a, b) => {
        const av = a.due_date ? dueTs(a.due_date) : Number.MAX_SAFE_INTEGER;
        const bv = b.due_date ? dueTs(b.due_date) : Number.MAX_SAFE_INTEGER;
        return av - bv;
      })
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        assignee_name: t.assignee_name ?? (t.assignee_id ? nameOf(t.assignee_id) : null),
        overdue: Boolean(t.due_date && dueTs(t.due_date) < now),
      })),
    insights,
    activity: (events ?? []).map((e) => ({
      id: e.id,
      feature: e.feature,
      kind: e.kind,
      created_at: e.created_at,
      actor: nameOf(e.user_id),
    })),
    notifications: (notes ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      created_at: n.created_at,
      read: Boolean(n.read_at),
    })),
    top_members,
  };
}

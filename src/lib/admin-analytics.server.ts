/** Server-only aggregation for the admin analytics dashboard. */

type Bucket = { period: string; events: number; users: number };

export type AdminWorkspaceRow = {
  id: string;
  name: string;
  business_type: string;
  team_size: string;
  owner_name: string;
  owner_email: string;
  members: number;
  tasks: number;
  documents: number;
  messages: number;
  created_at: string;
  last_activity: string | null;
};

export type AdminActivityRow = {
  id: string;
  created_at: string;
  feature: string;
  kind: string;
  user_name: string;
  workspace_name: string;
  path: string | null;
};

export type AdminAnalytics = {
  totals: {
    workspaces: number;
    users: number;
    tasks: number;
    documents: number;
    messages: number;
    activeUsers7d: number;
    activeUsers30d: number;
  };
  daily: Bucket[];
  weekly: Bucket[];
  topFeatures: { feature: string; count: number; users: number }[];
  workspaces: AdminWorkspaceRow[];
  recent: AdminActivityRow[];
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Ev = { ts: string; feature: string; userId: string | null; teamspaceId: string | null };

function dayKey(ts: string) {
  return new Date(ts).toISOString().slice(0, 10);
}

function weekKey(ts: string) {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function bucket(events: Ev[], keyFn: (ts: string) => string, limit: number): Bucket[] {
  const map = new Map<string, { events: number; users: Set<string> }>();
  for (const e of events) {
    const k = keyFn(e.ts);
    const entry = map.get(k) ?? { events: 0, users: new Set<string>() };
    entry.events += 1;
    if (e.userId) entry.users.add(e.userId);
    map.set(k, entry);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, limit)
    .map(([period, v]) => ({ period, events: v.events, users: v.users.size }))
    .reverse();
}

export async function getAdminAnalytics(days = 90): Promise<AdminAnalytics> {
  const db = await admin();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [teamspaces, members, profiles, tasks, documents, messages, financial, tracked] = await Promise.all([
    db.from("teamspaces").select("id, name, business_type, team_size, owner_id, created_at"),
    db.from("teamspace_members").select("teamspace_id, user_id"),
    db.from("profiles").select("id, full_name, email"),
    db.from("tasks").select("id, user_id, teamspace_id, created_at, updated_at").gte("created_at", since),
    db.from("documents").select("id, user_id, teamspace_id, created_at").gte("created_at", since),
    db.from("chat_messages").select("id, user_id, teamspace_id, created_at, role").gte("created_at", since),
    db.from("financial_sources").select("id, user_id, teamspace_id, created_at").gte("created_at", since),
    db
      .from("activity_events")
      .select("id, user_id, teamspace_id, kind, feature, path, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000),
  ]);

  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const teamspaceById = new Map((teamspaces.data ?? []).map((t) => [t.id, t]));

  const events: Ev[] = [
    ...(tasks.data ?? []).map((r) => ({ ts: r.created_at, feature: "Задачи", userId: r.user_id, teamspaceId: r.teamspace_id })),
    ...(documents.data ?? []).map((r) => ({ ts: r.created_at, feature: "База знаний", userId: r.user_id, teamspaceId: r.teamspace_id })),
    ...(messages.data ?? [])
      .filter((r) => r.role === "user")
      .map((r) => ({ ts: r.created_at, feature: "AI-чат", userId: r.user_id, teamspaceId: r.teamspace_id })),
    ...(financial.data ?? []).map((r) => ({ ts: r.created_at, feature: "Финансы", userId: r.user_id, teamspaceId: r.teamspace_id })),
    ...(tracked.data ?? []).map((r) => ({ ts: r.created_at, feature: r.feature, userId: r.user_id, teamspaceId: r.teamspace_id })),
  ];

  const now = Date.now();
  const activeSince = (d: number) =>
    new Set(events.filter((e) => now - new Date(e.ts).getTime() <= d * 86400_000 && e.userId).map((e) => e.userId!)).size;

  const featureMap = new Map<string, { count: number; users: Set<string> }>();
  for (const e of events) {
    const entry = featureMap.get(e.feature) ?? { count: 0, users: new Set<string>() };
    entry.count += 1;
    if (e.userId) entry.users.add(e.userId);
    featureMap.set(e.feature, entry);
  }

  const lastActivity = new Map<string, string>();
  for (const e of events) {
    if (!e.teamspaceId) continue;
    const prev = lastActivity.get(e.teamspaceId);
    if (!prev || prev < e.ts) lastActivity.set(e.teamspaceId, e.ts);
  }

  const countBy = <T extends { teamspace_id: string | null }>(rows: T[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.teamspace_id) m.set(r.teamspace_id, (m.get(r.teamspace_id) ?? 0) + 1);
    return m;
  };
  const memberCount = new Map<string, number>();
  for (const m of members.data ?? []) memberCount.set(m.teamspace_id, (memberCount.get(m.teamspace_id) ?? 0) + 1);
  const taskCount = countBy(tasks.data);
  const docCount = countBy(documents.data);
  const msgCount = countBy(messages.data);

  const workspaces: AdminWorkspaceRow[] = (teamspaces.data ?? [])
    .map((t) => {
      const owner = profileById.get(t.owner_id);
      return {
        id: t.id,
        name: t.name,
        business_type: String(t.business_type),
        team_size: String(t.team_size),
        owner_name: owner?.full_name ?? "—",
        owner_email: owner?.email ?? "—",
        members: memberCount.get(t.id) ?? 0,
        tasks: taskCount.get(t.id) ?? 0,
        documents: docCount.get(t.id) ?? 0,
        messages: msgCount.get(t.id) ?? 0,
        created_at: t.created_at,
        last_activity: lastActivity.get(t.id) ?? null,
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const recent: AdminActivityRow[] = (tracked.data ?? []).slice(0, 200).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    feature: r.feature,
    kind: r.kind,
    user_name: profileById.get(r.user_id)?.full_name || profileById.get(r.user_id)?.email || "—",
    workspace_name: r.teamspace_id ? (teamspaceById.get(r.teamspace_id)?.name ?? "—") : "—",
    path: r.path,
  }));

  return {
    totals: {
      workspaces: teamspaces.data?.length ?? 0,
      users: profiles.data?.length ?? 0,
      tasks: tasks.data?.length ?? 0,
      documents: documents.data?.length ?? 0,
      messages: messages.data?.length ?? 0,
      activeUsers7d: activeSince(7),
      activeUsers30d: activeSince(30),
    },
    daily: bucket(events, dayKey, 30),
    weekly: bucket(events, weekKey, 12),
    topFeatures: [...featureMap.entries()]
      .map(([feature, v]) => ({ feature, count: v.count, users: v.users.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    workspaces,
    recent,
  };
}

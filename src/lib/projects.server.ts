/**
 * Project roll-up for /app/projects.
 *
 * Projects are derived from the tasks already stored in `tasks`: locally
 * created tasks group by `project`, imported tasks group by
 * (external_source, external_project, external_board). Sync timestamps come
 * from the existing `task_sync_sources` rows — no new storage.
 */

export type ProjectSource = "virtual_space" | "yougile" | "trello";
export type ProjectStatus = "backlog" | "in_progress" | "review" | "done";

export type ProjectRow = {
  key: string;
  name: string;
  source: ProjectSource;
  board: string | null;
  status: ProjectStatus;
  progress: number;
  owner: string | null;
  done: number;
  total: number;
  last_sync_at: string | null;
  url: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function activeTeamspace(userId: string, requested?: string | null) {
  const db = await admin();
  let teamspaceId = requested ?? undefined;
  if (!teamspaceId) {
    const { data } = await db.from("profiles").select("current_teamspace_id").eq("id", userId).maybeSingle();
    teamspaceId = data?.current_teamspace_id ?? undefined;
  }
  if (!teamspaceId) throw new Error("Нет активного рабочего пространства");
  const { data: membership } = await db
    .from("teamspace_members").select("id").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!membership) throw new Error("Нет доступа к рабочему пространству");
  return teamspaceId;
}

function rollUpStatus(counts: Record<ProjectStatus, number>, total: number): ProjectStatus {
  if (total > 0 && counts.done === total) return "done";
  if (counts.in_progress > 0) return "in_progress";
  if (counts.review > 0) return "review";
  return "backlog";
}

export async function listProjectsForUser(userId: string, teamspaceId?: string | null) {
  const spaceId = await activeTeamspace(userId, teamspaceId);
  const db = await admin();

  const [{ data: tasks }, { data: sources }] = await Promise.all([
    db
      .from("tasks")
      .select("status, project, assignee_name, external_source, external_project, external_board, external_url, external_archived")
      .eq("teamspace_id", spaceId)
      .eq("external_archived", false)
      .limit(5000),
    db
      .from("task_sync_sources")
      .select("provider, project_name, last_sync_at, last_error")
      .eq("teamspace_id", spaceId),
  ]);

  const syncByProvider = new Map((sources ?? []).map((row) => [row.provider as string, row]));

  type Bucket = ProjectRow & { counts: Record<ProjectStatus, number>; owners: Map<string, number> };
  const buckets = new Map<string, Bucket>();

  for (const task of tasks ?? []) {
    const source = (task.external_source === "yougile" || task.external_source === "trello"
      ? task.external_source
      : "virtual_space") as ProjectSource;
    const name = source === "virtual_space"
      ? (task.project?.trim() || "Без проекта")
      : (task.external_project?.trim() || "Импортированный проект");
    const board = source === "virtual_space" ? null : (task.external_board?.trim() || null);
    const key = `${source}::${name}::${board ?? ""}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        name,
        source,
        board,
        status: "backlog",
        progress: 0,
        owner: null,
        done: 0,
        total: 0,
        last_sync_at: source === "virtual_space" ? null : syncByProvider.get(source)?.last_sync_at ?? null,
        url: null,
        counts: { backlog: 0, in_progress: 0, review: 0, done: 0 },
        owners: new Map(),
      };
      buckets.set(key, bucket);
    }

    const status = (["backlog", "in_progress", "review", "done"] as ProjectStatus[]).includes(task.status as ProjectStatus)
      ? (task.status as ProjectStatus)
      : "backlog";
    bucket.counts[status] += 1;
    bucket.total += 1;
    if (status === "done") bucket.done += 1;
    if (task.assignee_name) bucket.owners.set(task.assignee_name, (bucket.owners.get(task.assignee_name) ?? 0) + 1);
    if (!bucket.url && task.external_url) bucket.url = task.external_url;
  }

  const rows: ProjectRow[] = [...buckets.values()].map((bucket) => {
    const owner = [...bucket.owners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const { counts, owners, ...rest } = bucket;
    void owners;
    return {
      ...rest,
      owner,
      status: rollUpStatus(counts, bucket.total),
      progress: bucket.total ? Math.round((bucket.done / bucket.total) * 100) : 0,
    };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return {
    teamspace_id: spaceId,
    projects: rows,
    sync: (sources ?? []).map((row) => ({
      provider: row.provider as string,
      project_name: row.project_name,
      last_sync_at: row.last_sync_at,
      last_error: row.last_error,
    })),
  };
}

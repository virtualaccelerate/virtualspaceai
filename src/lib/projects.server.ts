/**
 * Project roll-up for /app/projects.
 *
 * A project is a real project: locally created tasks group by `project`,
 * imported tasks group by their tracker project (YouGile project / Trello
 * board owner). Boards inside a project — in YouGile these are usually month
 * timelines — are filters, not separate projects, together with a month
 * filter built from task deadlines.
 */

export type ProjectSource = "virtual_space" | "yougile" | "trello";
export type ProjectStatus = "backlog" | "in_progress" | "review" | "done";

export type ProjectRow = {
  key: string;
  name: string;
  source: ProjectSource;
  boards: string[];
  status: ProjectStatus;
  progress: number;
  owner: string | null;
  done: number;
  total: number;
  last_sync_at: string | null;
  url: string | null;
};

export type ProjectFilters = { board?: string | null; month?: string | null };

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

export async function listProjectsForUser(userId: string, teamspaceId?: string | null, filters: ProjectFilters = {}) {
  const spaceId = await activeTeamspace(userId, teamspaceId);
  const db = await admin();

  const [{ data: tasks }, { data: sources }] = await Promise.all([
    db
      .from("tasks")
      .select("status, project, due_date, updated_at, assignee_name, external_source, external_project, external_board, external_url, external_archived")
      .eq("teamspace_id", spaceId)
      .eq("external_archived", false)
      .limit(5000),
    db
      .from("task_sync_sources")
      .select("provider, project_name, last_sync_at, last_error")
      .eq("teamspace_id", spaceId),
  ]);

  const syncByProvider = new Map((sources ?? []).map((row) => [row.provider as string, row]));

  type Bucket = ProjectRow & { counts: Record<ProjectStatus, number>; owners: Map<string, number>; boardSet: Set<string> };
  const buckets = new Map<string, Bucket>();
  const allBoards = new Set<string>();
  const allMonths = new Set<string>();

  for (const task of tasks ?? []) {
    const source = (task.external_source === "yougile" || task.external_source === "trello"
      ? task.external_source
      : "virtual_space") as ProjectSource;
    const name = source === "virtual_space"
      ? (task.project?.trim() || "Без проекта")
      : (task.external_project?.trim() || "Импортированный проект");
    const board = source === "virtual_space" ? null : (task.external_board?.trim() || null);
    const month = (task.due_date ?? task.updated_at ?? "").slice(0, 7) || null;

    if (board) allBoards.add(board);
    if (month) allMonths.add(month);
    if (filters.board && board !== filters.board) continue;
    if (filters.month && month !== filters.month) continue;

    const key = `${source}::${name}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        name,
        source,
        boards: [],
        status: "backlog",
        progress: 0,
        owner: null,
        done: 0,
        total: 0,
        last_sync_at: source === "virtual_space" ? null : syncByProvider.get(source)?.last_sync_at ?? null,
        url: null,
        counts: { backlog: 0, in_progress: 0, review: 0, done: 0 },
        owners: new Map(),
        boardSet: new Set<string>(),
      };
      buckets.set(key, bucket);
    }

    const status = (["backlog", "in_progress", "review", "done"] as ProjectStatus[]).includes(task.status as ProjectStatus)
      ? (task.status as ProjectStatus)
      : "backlog";
    bucket.counts[status] += 1;
    bucket.total += 1;
    if (status === "done") bucket.done += 1;
    if (board) bucket.boardSet.add(board);
    if (task.assignee_name) bucket.owners.set(task.assignee_name, (bucket.owners.get(task.assignee_name) ?? 0) + 1);
    if (!bucket.url && task.external_url) bucket.url = task.external_url;
  }

  const rows: ProjectRow[] = [...buckets.values()].map((bucket) => {
    const owner = [...bucket.owners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const { counts, owners, boardSet, ...rest } = bucket;
    void owners;
    return {
      ...rest,
      boards: [...boardSet].sort(),
      owner,
      status: rollUpStatus(counts, bucket.total),
      progress: bucket.total ? Math.round((bucket.done / bucket.total) * 100) : 0,
    };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return {
    teamspace_id: spaceId,
    projects: rows,
    boards: [...allBoards].sort(),
    months: [...allMonths].sort().reverse(),
    sync: (sources ?? []).map((row) => ({
      provider: row.provider as string,
      project_name: row.project_name,
      last_sync_at: row.last_sync_at,
      last_error: row.last_error,
    })),
  };
}


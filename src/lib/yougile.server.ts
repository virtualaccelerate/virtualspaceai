import { randomBytes, timingSafeEqual } from "node:crypto";
import { decryptConnectionKey, encryptConnectionKey } from "./app-user-connections.server";
import { BACKGROUND_BUDGET_MS, createYouGileRequest, YouGileRequestError, type YouGileRequest } from "./yougile-request.server";

type Status = "backlog" | "in_progress" | "review" | "done";
type Source = {
  id: string;
  teamspace_id: string;
  api_key_ciphertext: string;
  project_id: string | null;
  project_name: string | null;
  project_ids: { id: string; name: string }[] | null;

  webhook_secret: string;
  webhook_id: string | null;
  column_map: Record<string, Status> | null;
  user_map: Record<string, string> | null;
  last_sync_at: string | null;
  last_error: string | null;
  enabled: boolean;
  created_by: string;
};

type YouGileItem = Record<string, unknown> & { id: string; title?: string };

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function requireManager(userId: string, teamspaceId: string) {
  const admin = await db();
  const { data } = await admin.from("teamspace_members").select("role").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!data || !["owner", "admin"].includes(data.role)) throw new Error("Только владелец или администратор может настроить YouGile");
}

async function requireMember(userId: string, teamspaceId: string) {
  const admin = await db();
  const { data } = await admin.from("teamspace_members").select("id").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Нет доступа к рабочему пространству");
}

async function api<T>(key: string, path: string, init?: RequestInit, scope = createYouGileRequest()): Promise<T> {
  return scope.request<T>(key, path, init);
}

function content(value: unknown): YouGileItem[] {
  if (Array.isArray(value)) return value as YouGileItem[];
  if (value && typeof value === "object" && Array.isArray((value as { content?: unknown }).content)) return (value as { content: YouGileItem[] }).content;
  return [];
}

async function pages(key: string, path: string, scope = createYouGileRequest()) {
  const rows: YouGileItem[] = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const separator = path.includes("?") ? "&" : "?";
    const result = await api<unknown>(key, `${path}${separator}limit=100&offset=${offset}`, undefined, scope);
    const batch = content(result);
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
  throw new YouGileRequestError("YouGile вернул слишком много данных. Сохранённые задачи оставлены без изменений");
}

function dueDate(value: unknown): string | null {
  const raw = typeof value === "number"
    ? value
    : value && typeof value === "object"
      ? Number(
        (value as Record<string, unknown>).deadline
        ?? (value as Record<string, unknown>).date
        ?? (value as Record<string, unknown>).dateTo
        ?? (value as Record<string, unknown>).timestamp,
      )
      : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return new Date(raw < 10_000_000_000 ? raw * 1000 : raw).toISOString().slice(0, 10);
}

/** YouGile keeps the deadline either on the task or inside its stickers. */
function taskDeadline(task: Record<string, unknown>): string | null {
  const candidates: unknown[] = [task['deadline'], task['dateTo'], task['dueDate'], task['endDate']];
  const stickers = task['stickers'];
  if (stickers && typeof stickers === "object") {
    for (const entry of Object.values(stickers as Record<string, unknown>)) candidates.push(entry);
  }
  for (const candidate of candidates) {
    const parsed = dueDate(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function externalTime(value: unknown): string | null {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return new Date(raw < 10_000_000_000 ? raw * 1000 : raw).toISOString();
}

function taskStatus(task: Record<string, unknown>, columnMap: Record<string, Status>): Status {
  if (task.completed === true || task.archived === true) return "done";
  return columnMap[String(task.columnId ?? "")] ?? "backlog";
}

function priority(task: Record<string, unknown>): "low" | "medium" | "high" | "urgent" {
  const raw = String(task.priority ?? task.sticker ?? "").toLowerCase();
  if (raw.includes("urgent") || raw.includes("сроч")) return "urgent";
  if (raw.includes("high") || raw.includes("высок")) return "high";
  if (raw.includes("low") || raw.includes("низк")) return "low";
  return "medium";
}

async function loadStructure(key: string, projectIds?: string[] | null, scope = createYouGileRequest()) {
  const projects = await pages(key, "/projects", scope);
  const selected = (projectIds ?? []).filter(Boolean);
  if (!selected.length) return { projects, boards: [], columns: [], users: [] };
  const boards: YouGileItem[] = [];
  for (const projectId of selected) {
    // A project or board removed in YouGile must not break the whole sync.
    const list = await pages(key, `/boards?projectId=${encodeURIComponent(projectId)}`, scope).catch((error: unknown) => {
      if (error instanceof YouGileRequestError && error.status === 404) return [] as YouGileItem[];
      throw error;
    });
    boards.push(...list.map((board) => ({ ...board, projectId })));
  }
  const columns: YouGileItem[] = [];
  for (const board of boards) {
    const list = await pages(key, `/columns?boardId=${encodeURIComponent(board.id)}`, scope).catch((error: unknown) => {
      if (error instanceof YouGileRequestError && error.status === 404) return [] as YouGileItem[];
      throw error;
    });
    columns.push(...list.map((column) => ({ ...column, boardId: board.id, projectId: (board as { projectId?: string }).projectId })));
  }

  const users = await pages(key, "/users", scope);
  return { projects, boards, columns, users };
}

/** Projects this workspace mirrors, normalised to {id, name}. */
function selectedProjects(source: Source): { id: string; name: string }[] {
  const list = Array.isArray(source.project_ids) ? source.project_ids.filter((row) => row && row.id) : [];
  if (list.length) return list.map((row) => ({ id: String(row.id), name: String(row.name || row.id) }));
  if (source.project_id) return [{ id: source.project_id, name: source.project_name || source.project_id }];
  return [];
}

async function sourceFor(teamspaceId: string) {
  const admin = await db();
  const { data, error } = await admin.from("task_sync_sources").select("*").eq("teamspace_id", teamspaceId).eq("provider", "yougile").maybeSingle();
  if (error) throw new Error(error.message);
  return data as Source | null;
}

export async function getYouGileStatusForUser(userId: string, teamspaceId: string) {
  await requireMember(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) return { connected: false, projects: [], boards: [], columns: [], users: [], members: [], selected_projects: [] };
  const selected = selectedProjects(source);
  let loadError: string | null = null;
  const structure = await loadStructure(decryptConnectionKey(source.api_key_ciphertext), selected.map((row) => row.id)).catch((error: unknown) => {
    loadError = error instanceof Error ? error.message : "YouGile временно недоступен";
    return { projects: selected.map((row) => ({ id: row.id, title: row.name })), boards: [], columns: [], users: [] };
  });
  const admin = await db();
  const { data: memberships } = await admin.from("teamspace_members").select("user_id").eq("teamspace_id", teamspaceId);
  const ids = (memberships ?? []).map((row) => row.user_id);
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  return {
    connected: true,
    project_id: source.project_id,
    project_name: source.project_name,
    selected_projects: selected,
    column_map: source.column_map ?? {},
    user_map: source.user_map ?? {},
    last_sync_at: source.last_sync_at,
    last_error: loadError ?? source.last_error,
    ...structure,
    members: profiles ?? [],
  };
}

export async function connectYouGileForUser(userId: string, input: { teamspace_id: string; api_key: string }) {
  await requireManager(userId, input.teamspace_id);
  const projects = await pages(input.api_key, "/projects");
  const admin = await db();
  const current = await sourceFor(input.teamspace_id);
  const secret = current?.webhook_secret ?? randomBytes(24).toString("base64url");
  const { error } = await admin.from("task_sync_sources").upsert({
    teamspace_id: input.teamspace_id,
    provider: "yougile",
    api_key_ciphertext: encryptConnectionKey(input.api_key),
    webhook_secret: secret,
    created_by: userId,
    enabled: true,
    last_error: null,
  }, { onConflict: "teamspace_id,provider" });
  if (error) throw new Error(error.message);
  return { connected: true, projects };
}

export async function inspectYouGileProjectForUser(userId: string, teamspaceId: string, projectIds: string[]) {
  await requireManager(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) throw new Error("YouGile не подключён");
  return loadStructure(decryptConnectionKey(source.api_key_ciphertext), projectIds);
}

/**
 * Saves the mirrored projects. Columns are NOT mapped by hand any more —
 * YouGile stays the source of truth and its columns are mirrored as workspace
 * columns during sync. Saving never fails because of a slow sync: the config
 * is persisted first and sync problems are reported as a warning.
 */
export async function configureYouGileForUser(userId: string, input: { teamspace_id: string; projects: { id: string; name: string }[]; column_map?: Record<string, Status>; user_map?: Record<string, string> }) {
  await requireManager(userId, input.teamspace_id);
  const source = await sourceFor(input.teamspace_id);
  if (!source) throw new Error("Сначала подключите YouGile");
  if (!input.projects.length) throw new Error("Выберите хотя бы один проект YouGile");
  const admin = await db();
  const first = input.projects[0];
  if (!first) throw new Error("Выберите хотя бы один проект YouGile");
  const patch = {
    project_id: first.id,
    project_name: first.name,
    project_ids: input.projects,
    column_map: input.column_map ?? source.column_map ?? {},
    user_map: input.user_map ?? source.user_map ?? {},
    last_error: null,
  };
  const { error } = await admin.from("task_sync_sources").update(patch).eq("id", source.id);
  if (error) throw new Error(error.message);
  const next: Source = { ...source, ...patch };
  const scope = createYouGileRequest();
  const webhookError = await registerWebhook(next, scope).catch(() => null);
  let result: { synced: number; archived: number } = { synced: 0, archived: 0 };
  let syncError: string | null = null;
  try {
    result = await syncSource(next, scope);
  } catch (error) {
    syncError = error instanceof Error ? error.message : String(error);
  }
  const warning = webhookError ?? syncError;
  if (warning) {
    await admin.from("task_sync_sources").update({ last_error: warning }).eq("id", source.id);
  }
  return { ...result, webhook_error: warning };
}


/** Returns null on success, or a human-readable message the admin should see. */
async function registerWebhook(source: Source, scope = createYouGileRequest()): Promise<string | null> {
  if (!source.project_id) return null;
  try {
    const key = decryptConnectionKey(source.api_key_ciphertext);
    const url = `https://ai-virtualspace.com/api/public/yougile-webhook?id=${encodeURIComponent(source.id)}&secret=${encodeURIComponent(source.webhook_secret)}`;
    // YouGile's /webhooks endpoint accepts only { url, event } — sending projectId is rejected with 400.
    const result = await api<Record<string, unknown>>(key, "/webhooks", { method: "POST", body: JSON.stringify({ url, event: "*" }) }, scope);
    const webhookId = typeof result?.id === "string" ? result.id : null;
    if (webhookId) {
      const admin = await db();
      await admin.from("task_sync_sources").update({ webhook_id: webhookId }).eq("id", source.id);
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[yougile] webhook registration failed", message);
    return `Автообновление из YouGile не подключено: ${message}. Задачи будут обновляться по расписанию и вручную.`;
  }
}

type Structure = { boards: YouGileItem[]; columns: YouGileItem[]; users: YouGileItem[] };
type LocalRow = {
  id: string; external_id: string | null; assignee_id: string | null; assignee_name: string | null; status: string;
  priority: string | null; due_date: string | null; title: string; external_archived: boolean;
  sync_archived_at: string | null; external_column_id: string | null;
};
const LOCAL_COLUMNS = "id, external_id, assignee_id, assignee_name, status, priority, due_date, title, external_archived, sync_archived_at, external_column_id";

/** Completed, archived or deleted in YouGile: not mirrored (local copies are only hidden). */
function isClosed(raw: YouGileItem) {
  return raw.completed === true || raw.archived === true || raw.deleted === true;
}

/**
 * Light mirror: upserts only open YouGile tasks in batches; local copies of
 * closed/missing tasks get `external_archived=true` (never deleted).
 * `reconcile` hides every local open copy not present in `tasks` — only
 * safe with a complete snapshot of all selected projects.
 */
async function mirrorTasks(source: Source, structure: Structure, tasks: YouGileItem[], reconcile: boolean) {
  const admin = await db();
  const { boards, columns, users } = structure;
  const projectList = selectedProjects(source);
  const projectName = new Map(projectList.map((row) => [row.id, row.name]));
  const boardName = new Map(boards.map((row) => [row.id, String(row.title ?? row['name'] ?? "YouGile")]));
  const boardProject = new Map(boards.map((row) => [row.id, String((row as { projectId?: string }).projectId ?? "")]));
  const columnBoard = new Map(columns.map((row) => [row.id, String(row.boardId ?? "")]));
  const userEmail = new Map(users.map((row) => [row.id, String(row.email ?? "").toLowerCase()]));
  const { data: memberships } = await admin.from("teamspace_members").select("user_id").eq("teamspace_id", source.teamspace_id);
  const memberIds = (memberships ?? []).map((row) => row.user_id);
  const { data: profiles } = memberIds.length ? await admin.from("profiles").select("id, full_name, email").in("id", memberIds) : { data: [] };
  const profileByEmail = new Map((profiles ?? []).filter((row) => row.email).map((row) => [String(row.email).toLowerCase(), row]));

  // YouGile columns become workspace columns; unknown ones are created.
  const { ensureStatusesForColumns, defaultStatusId } = await import("./task-statuses.server");
  const statusByColumn = await ensureStatusesForColumns(
    source.teamspace_id,
    "yougile",
    columns.map((row) => ({ id: String(row.id), name: String(row.title ?? row['name'] ?? "Колонка") })),
  );
  const defaultStatus = new Map<Status, string | null>();
  const { resolveTaskLabel } = await import("./projects.server");
  const projectLabel = new Map<string, string | null>();
  for (const name of new Set(projectList.map((row) => row.name))) {
    projectLabel.set(name, (await resolveTaskLabel("project", source.teamspace_id, source.created_by, name)) ?? null);
  }

  // Existing local copies in one read (paged only past PostgREST's row cap).
  const existing = new Map<string, LocalRow>();
  for (let from = 0; ; from += 1000) {
    let query = admin.from("tasks").select(LOCAL_COLUMNS).eq("teamspace_id", source.teamspace_id).eq("external_source", "yougile");
    if (!reconcile) query = query.in("external_id", tasks.map((row) => row.id));
    const { data, error } = await query.order("id").range(from, from + 999);
    if (error) throw error;
    for (const row of (data ?? []) as LocalRow[]) if (row.external_id) existing.set(row.external_id, row);
    if ((data ?? []).length < 1000) break;
  }

  const open = tasks.filter((raw) => !isClosed(raw));
  const openIds = new Set(open.map((raw) => raw.id));
  const patches = [];
  for (const raw of open) {
    const assigned = Array.isArray(raw.assigned) ? raw.assigned.map(String) : [];
    const mappedId = assigned.map((id) => source.user_map?.[id] ?? profileByEmail.get(userEmail.get(id) ?? "")?.id).find(Boolean) ?? null;
    const mappedProfile = (profiles ?? []).find((row) => row.id === mappedId);
    const columnId = String(raw.columnId ?? "");
    const boardId = columnBoard.get(columnId) ?? "";
    const projectId = boardProject.get(boardId) ?? "";
    const workspaceStatus = statusByColumn.get(columnId) ?? null;
    const status: Status = workspaceStatus?.base_status ?? taskStatus(raw, source.column_map ?? {});
    if (!workspaceStatus && !defaultStatus.has(status)) defaultStatus.set(status, await defaultStatusId(source.teamspace_id, status));
    const externalProject = projectName.get(projectId) ?? source.project_name;
    patches.push({
      user_id: source.created_by,
      teamspace_id: source.teamspace_id,
      title: String(raw.title ?? "Задача YouGile").slice(0, 500),
      description: typeof raw.description === "string" ? raw.description.slice(0, 10000) : null,
      status,
      status_id: workspaceStatus?.id ?? defaultStatus.get(status) ?? null,
      priority: priority(raw),
      assignee_id: mappedId,
      assignee_name: mappedProfile?.full_name || mappedProfile?.email || null,
      due_date: taskDeadline(raw),
      position: 0,
      project: externalProject ? projectLabel.get(externalProject) ?? null : null,
      external_source: "yougile",
      external_id: raw.id,
      external_url: typeof raw.url === "string" ? raw.url : null,
      external_project: externalProject,
      external_project_id: projectId || null,
      external_board: boardName.get(boardId) ?? null,
      external_column_id: columnId || null,
      external_updated_at: externalTime(raw.timestamp),
      external_archived: false,
      sync_archived_at: null,
    });
  }

  const { emitExternalTaskChange } = await import("./task-changes.server");
  const { flushTrackerNotifications } = await import("./tracker-notifications.server");
  const notificationBatch: import("./tracker-notifications.server").TrackerBatch = [];
  let synced = 0;
  for (let i = 0; i < patches.length; i += 100) {
    const chunk = patches.slice(i, i + 100);
    const { data: saved, error } = await admin.from("tasks").upsert(chunk, { onConflict: "teamspace_id,external_source,external_id" }).select("id, external_id, title, assignee_id");
    if (error) throw error;
    const byExternal = new Map(chunk.map((row) => [row.external_id, row]));
    for (const row of saved ?? []) {
      const patch = byExternal.get(String(row.external_id));
      if (!patch) continue;
      const before = existing.get(patch.external_id) ?? null;
      const statusName = statusByColumn.get(patch.external_column_id ?? "")?.name ?? patch.status;
      await emitExternalTaskChange({
        source: "yougile",
        teamspaceId: source.teamspace_id,
        taskId: row.id,
        title: patch.title,
        before: before
          ? { ...before, status_name: statusByColumn.get(before.external_column_id ?? "")?.name ?? before.status }
          : null,
        after: { ...patch, status_name: statusName },
        batch: notificationBatch,
      }).catch(() => {});
      if (row.assignee_id && row.assignee_id !== before?.assignee_id && row.assignee_id !== source.created_by) {
        notificationBatch.push({ userId: row.assignee_id, teamspaceId: source.teamspace_id, taskId: row.id, tracker: "YouGile", title: "Вам назначена задача", body: row.title, kind: "task_assigned", actorId: source.created_by });
      }
      synced++;
    }
  }

  // Hide (never delete) local copies that are closed in YouGile or gone from the snapshot.
  const hide = [...existing.values()]
    .filter((row) => !row.external_archived && row.external_id && !openIds.has(row.external_id))
    .filter((row) => reconcile || tasks.some((raw) => raw.id === row.external_id))
    .map((row) => row.id);
  const archivedAt = new Date().toISOString();
  for (let i = 0; i < hide.length; i += 100) {
    const { error } = await admin.from("tasks").update({ external_archived: true, sync_archived_at: archivedAt }).in("id", hide.slice(i, i + 100));
    if (error) throw error;
  }
  await flushTrackerNotifications(notificationBatch);
  return { synced, archived: hide.length };
}

export async function syncSource(source: Source, scope: YouGileRequest = createYouGileRequest()) {
  const projectList = selectedProjects(source);
  if (!source.enabled || !projectList.length) return { synced: 0, archived: 0 };
  const admin = await db();
  try {
    const key = decryptConnectionKey(source.api_key_ciphertext);
    const { boards, columns, users } = await loadStructure(key, projectList.map((row) => row.id), scope);
    const columnIds = new Set(columns.map((row) => row.id));
    // A structure read that returns nothing means YouGile is unreachable or the
    // project was removed — never treat that as "everything is archived".
    if (!columnIds.size) {
      await admin.from("task_sync_sources").update({ last_error: "YouGile не вернул колонки проекта — задачи оставлены без изменений" }).eq("id", source.id);
      return { synced: 0, archived: 0 };
    }
    // Fetch the complete snapshot before any writes; failed columns must not archive saved tasks.
    const tasks: YouGileItem[] = [];
    for (const columnId of columnIds) {
      tasks.push(...await pages(key, `/task-list?columnId=${encodeURIComponent(columnId)}`, scope));
    }
    const result = await mirrorTasks(source, { boards, columns, users }, tasks, true);
    await admin.from("task_sync_sources").update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("task_sync_sources").update({ last_error: message }).eq("id", source.id);
    throw error;
  }
}

/** Webhook fast path: mirror one task (column → board → selected project) without a full sweep. */
async function syncSingleTask(source: Source, taskId: string, scope: YouGileRequest) {
  const admin = await db();
  const key = decryptConnectionKey(source.api_key_ciphertext);
  const task = await api<YouGileItem>(key, `/tasks/${encodeURIComponent(taskId)}`, undefined, scope).catch((error: unknown) => {
    if (error instanceof YouGileRequestError && error.status === 404) return { id: taskId, deleted: true } as YouGileItem;
    throw error;
  });
  if (!task?.id) return;
  if (isClosed(task) || !task.columnId) {
    await mirrorTasks(source, { boards: [], columns: [], users: [] }, [{ ...task, deleted: true }], false);
    return;
  }
  const column = await api<YouGileItem>(key, `/columns/${encodeURIComponent(String(task.columnId))}`, undefined, scope);
  const board = await api<YouGileItem>(key, `/boards/${encodeURIComponent(String(column?.boardId ?? ""))}`, undefined, scope);
  const projectId = String(board?.projectId ?? "");
  // Tasks moved outside the mirrored projects are hidden like any other missing task.
  if (!selectedProjects(source).some((row) => row.id === projectId)) {
    await mirrorTasks(source, { boards: [], columns: [], users: [] }, [{ ...task, deleted: true }], false);
    return;
  }
  const users = await pages(key, "/users", scope);
  await mirrorTasks(source, { boards: [{ ...board, projectId }], columns: [{ ...column, boardId: board.id }], users }, [task], false);
  await admin.from("task_sync_sources").update({ last_error: null }).eq("id", source.id);
}

/** Extracts a task id from a YouGile webhook body ({ event: "task-…", payload: { id } }). */
export function webhookTaskId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const event = String((body as { event?: unknown }).event ?? "");
  const payload = (body as { payload?: unknown }).payload;
  const id = payload && typeof payload === "object" ? (payload as { id?: unknown }).id : null;
  if (!event.startsWith("task") || typeof id !== "string" || !id.trim()) return null;
  return id.trim();
}

export async function syncYouGileForUser(userId: string, teamspaceId: string) {
  await requireMember(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) throw new Error("YouGile не подключён");
  return syncSource(source);
}

export async function syncAllYouGileSources() {
  const admin = await db();
  const { data } = await admin.from("task_sync_sources").select("*").eq("provider", "yougile").eq("enabled", true);
  let synced = 0;
  let failed = 0;
  // A fresh budget per source: one slow or failing workspace never starves the others.
  for (const source of (data ?? []) as Source[]) {
    try { await syncSource(source, createYouGileRequest({ budgetMs: BACKGROUND_BUDGET_MS })); synced++; } catch { failed++; }
  }
  return { synced, failed };
}

export async function handleYouGileWebhook(id: string, secret: string, body?: unknown) {
  const admin = await db();
  const { data } = await admin.from("task_sync_sources").select("*").eq("id", id).eq("provider", "yougile").eq("enabled", true).maybeSingle();
  const source = data as Source | null;
  if (!source) return false;
  const left = Buffer.from(secret);
  const right = Buffer.from(source.webhook_secret);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  const taskId = webhookTaskId(body);
  if (taskId) {
    try {
      await syncSingleTask(source, taskId, createYouGileRequest({ budgetMs: BACKGROUND_BUDGET_MS }));
      return true;
    } catch (error) {
      console.error("[yougile] single-task webhook sync failed, falling back to full sync", error instanceof Error ? error.message : error);
    }
  }
  await syncSource(source, createYouGileRequest({ budgetMs: BACKGROUND_BUDGET_MS }));
  return true;
}

/**
 * Moves the card in YouGile and mirrors the move locally.
 * The target column is picked on the task's own board, so every project /
 * timeline board keeps working, not only the one that was mapped by hand.
 */
export async function updateYouGileTaskStatus(taskId: string, status: Status, actorId: string) {
  const admin = await db();
  const { data: task } = await admin.from("tasks").select("id, teamspace_id, external_id, external_source, external_column_id").eq("id", taskId).maybeSingle();
  if (!task?.teamspace_id || task.external_source !== "yougile" || !task.external_id) throw new Error("Задача YouGile не найдена");
  await requireMember(actorId, task.teamspace_id);
  const { completionStatusForUser } = await import("./roles.server");
  status = await completionStatusForUser(actorId, task.teamspace_id, status);
  const source = await sourceFor(task.teamspace_id);
  if (!source) throw new Error("YouGile не подключён");
  const key = decryptConnectionKey(source.api_key_ciphertext);
  const { guessBaseStatus } = await import("./task-statuses.server");
  const scope = createYouGileRequest();

  let columnId: string | undefined;
  if (task.external_column_id) {
    const current = await api<Record<string, unknown>>(key, `/columns/${encodeURIComponent(task.external_column_id)}`, undefined, scope).catch((error: unknown) => {
      if (error instanceof YouGileRequestError && error.status === 404) return null;
      throw error;
    });
    const boardId = current && typeof current['boardId'] === "string" ? current['boardId'] : null;
    if (boardId) {
      const columns = await pages(key, `/columns?boardId=${encodeURIComponent(boardId)}`, scope);
      const mapped = columns.find((column) => source.column_map?.[String(column.id)] === status);
      const guessed = columns.find((column) => guessBaseStatus(String(column.title ?? column['name'] ?? "")) === status);
      columnId = String((mapped ?? guessed)?.id ?? "") || undefined;
    }
  }
  if (!columnId) columnId = Object.entries(source.column_map ?? {}).find(([, mapped]) => mapped === status)?.[0];
  if (!columnId && status !== "done") throw new Error("В YouGile нет колонки для этого статуса");

  const body = columnId ? { columnId, completed: status === "done" } : { completed: true };
  await api(key, `/tasks/${encodeURIComponent(task.external_id)}`, { method: "PUT", body: JSON.stringify(body) }, scope);

  let statusId: string | null = null;
  if (columnId) {
    const { data: row } = await admin.from("teamspace_statuses").select("id").eq("teamspace_id", task.teamspace_id).eq("external_column_id", columnId).maybeSingle();
    statusId = row?.id ?? null;
  }
  await admin.from("tasks").update({ status, ...(columnId ? { external_column_id: columnId } : {}), ...(statusId ? { status_id: statusId } : {}) }).eq("id", task.id);
  return { ok: true, status };
}

/** Chat and log entries of a YouGile task, used by the task card history. */
export async function listYouGileTaskChat(teamspaceId: string, externalId: string) {
  const source = await sourceFor(teamspaceId);
  if (!source) return [];
  const key = decryptConnectionKey(source.api_key_ciphertext);
  const scope = createYouGileRequest();
  const rows = await pages(key, `/chats/${encodeURIComponent(externalId)}/messages`, scope).catch(() => [] as YouGileItem[]);
  const users = await pages(key, "/users", scope).catch(() => [] as YouGileItem[]);
  const names = new Map(
    users.map((row) => [String(row.id), String(row['realName'] ?? row['name'] ?? row.email ?? "").trim()]),
  );
  const clean = (value: unknown) =>
    String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return rows.map((row) => {
    const payload = (row['event'] ?? row['action'] ?? null) as Record<string, unknown> | null;
    // YouGile marks its own log entries as system events; plain messages are comments.
    const system = row['fromUserId'] == null || Boolean(payload) || row['label'] != null;
    const text = clean(row['text'] ?? row['label'] ?? (payload ? payload['text'] ?? payload['label'] : ""));
    const author = String(row['fromUserId'] ?? row['userId'] ?? "");
    return {
      id: `yg-${String(row.id)}`,
      created_at: externalTime(row['timestamp']) ?? new Date().toISOString(),
      actor_name: names.get(author) || null,
      kind: system ? "external_log" : "comment",
      source: "yougile",
      field: null,
      from_value: null,
      to_value: null,
      note: text.slice(0, 2000),
    };
  }).filter((row) => row.note);
}



export async function disconnectYouGileForUser(userId: string, teamspaceId: string) {
  await requireManager(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) return { ok: true };
  if (source.webhook_id) await api(decryptConnectionKey(source.api_key_ciphertext), `/webhooks/${encodeURIComponent(source.webhook_id)}`, { method: "DELETE" }).catch(() => null);
  const admin = await db();
  const { error } = await admin.from("task_sync_sources").delete().eq("id", source.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
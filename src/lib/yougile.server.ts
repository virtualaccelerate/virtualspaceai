import { randomBytes, timingSafeEqual } from "node:crypto";
import { decryptConnectionKey, encryptConnectionKey } from "./app-user-connections.server";

type Status = "backlog" | "in_progress" | "review" | "done";
type Source = {
  id: string;
  teamspace_id: string;
  api_key_ciphertext: string;
  project_id: string | null;
  project_name: string | null;
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
const BASE = "https://yougile.com/api-v2";

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

async function api<T>(key: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[yougile] ${path} failed [${response.status}]: ${detail}`);
    if (response.status === 401 || response.status === 403) throw new Error("YouGile отклонил API-ключ");
    if (response.status === 429) throw new Error("YouGile временно ограничил запросы. Повторите позже");
    throw new Error(`YouGile недоступен (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function content(value: unknown): YouGileItem[] {
  if (Array.isArray(value)) return value as YouGileItem[];
  if (value && typeof value === "object" && Array.isArray((value as { content?: unknown }).content)) return (value as { content: YouGileItem[] }).content;
  return [];
}

async function pages(key: string, path: string) {
  const rows: YouGileItem[] = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const separator = path.includes("?") ? "&" : "?";
    const result = await api<unknown>(key, `${path}${separator}limit=100&offset=${offset}`);
    const batch = content(result);
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows;
}

function dueDate(value: unknown): string | null {
  const raw = typeof value === "number" ? value : value && typeof value === "object" ? Number((value as Record<string, unknown>).deadline ?? (value as Record<string, unknown>).date) : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return new Date(raw < 10_000_000_000 ? raw * 1000 : raw).toISOString().slice(0, 10);
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

async function loadStructure(key: string, projectId?: string | null) {
  const projects = await pages(key, "/projects");
  if (!projectId) return { projects, boards: [], columns: [], users: [] };
  const boards = await pages(key, `/boards?projectId=${encodeURIComponent(projectId)}`);
  const columns = (await Promise.all(boards.map((board) => pages(key, `/columns?boardId=${encodeURIComponent(board.id)}`)))).flat();
  const users = await pages(key, "/users");
  return { projects, boards, columns, users };
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
  if (!source) return { connected: false, projects: [], boards: [], columns: [], users: [], members: [] };
  const structure = await loadStructure(decryptConnectionKey(source.api_key_ciphertext), source.project_id).catch(() => ({ projects: [], boards: [], columns: [], users: [] }));
  const admin = await db();
  const { data: memberships } = await admin.from("teamspace_members").select("user_id").eq("teamspace_id", teamspaceId);
  const ids = (memberships ?? []).map((row) => row.user_id);
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  return {
    connected: true,
    project_id: source.project_id,
    project_name: source.project_name,
    column_map: source.column_map ?? {},
    user_map: source.user_map ?? {},
    last_sync_at: source.last_sync_at,
    last_error: source.last_error,
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

export async function inspectYouGileProjectForUser(userId: string, teamspaceId: string, projectId: string) {
  await requireManager(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) throw new Error("YouGile не подключён");
  return loadStructure(decryptConnectionKey(source.api_key_ciphertext), projectId);
}

export async function configureYouGileForUser(userId: string, input: { teamspace_id: string; project_id: string; project_name: string; column_map: Record<string, Status>; user_map: Record<string, string> }) {
  await requireManager(userId, input.teamspace_id);
  const source = await sourceFor(input.teamspace_id);
  if (!source) throw new Error("Сначала подключите YouGile");
  const admin = await db();
  const { error } = await admin.from("task_sync_sources").update({ project_id: input.project_id, project_name: input.project_name, column_map: input.column_map, user_map: input.user_map, last_error: null }).eq("id", source.id);
  if (error) throw new Error(error.message);
  await registerWebhook({ ...source, project_id: input.project_id }).catch((error) => console.error("[yougile] webhook registration failed", error));
  return syncSource({ ...source, project_id: input.project_id, project_name: input.project_name, column_map: input.column_map, user_map: input.user_map });
}

async function registerWebhook(source: Source) {
  if (!source.project_id) return;
  const key = decryptConnectionKey(source.api_key_ciphertext);
  const url = `https://ai-virtualspace.com/api/public/yougile-webhook?id=${encodeURIComponent(source.id)}&secret=${encodeURIComponent(source.webhook_secret)}`;
  const result = await api<Record<string, unknown>>(key, "/webhooks", { method: "POST", body: JSON.stringify({ url, event: "task-*", projectId: source.project_id }) });
  const webhookId = typeof result.id === "string" ? result.id : null;
  if (webhookId) {
    const admin = await db();
    await admin.from("task_sync_sources").update({ webhook_id: webhookId }).eq("id", source.id);
  }
}

export async function syncSource(source: Source) {
  if (!source.enabled || !source.project_id) return { synced: 0, archived: 0 };
  const admin = await db();
  try {
    const key = decryptConnectionKey(source.api_key_ciphertext);
    const { boards, columns, users } = await loadStructure(key, source.project_id);
    const columnIds = new Set(columns.map((row) => row.id));
    const boardName = new Map(boards.map((row) => [row.id, String(row.title ?? row.name ?? "YouGile")]));
    const columnBoard = new Map(columns.map((row) => [row.id, String(row.boardId ?? "")]));
    const userEmail = new Map(users.map((row) => [row.id, String(row.email ?? "").toLowerCase()]));
    const { data: memberships } = await admin.from("teamspace_members").select("user_id").eq("teamspace_id", source.teamspace_id);
    const memberIds = (memberships ?? []).map((row) => row.user_id);
    const { data: profiles } = memberIds.length ? await admin.from("profiles").select("id, full_name, email").in("id", memberIds) : { data: [] };
    const profileByEmail = new Map((profiles ?? []).filter((row) => row.email).map((row) => [String(row.email).toLowerCase(), row]));
    const tasks = (await Promise.all([...columnIds].map((columnId) => pages(key, `/task-list?columnId=${encodeURIComponent(columnId)}&includeDeleted=true`)))).flat();
    const seen: string[] = [];
    let synced = 0;
    for (const raw of tasks) {
      const externalId = raw.id;
      seen.push(externalId);
      const assigned = Array.isArray(raw.assigned) ? raw.assigned.map(String) : [];
      const mappedId = assigned.map((id) => source.user_map?.[id] ?? profileByEmail.get(userEmail.get(id) ?? "")?.id).find(Boolean) ?? null;
      const mappedProfile = (profiles ?? []).find((row) => row.id === mappedId);
      const status = taskStatus(raw, source.column_map ?? {});
      const deleted = raw.deleted === true;
      const patch = {
        user_id: source.created_by,
        teamspace_id: source.teamspace_id,
        title: String(raw.title ?? "Задача YouGile").slice(0, 500),
        description: typeof raw.description === "string" ? raw.description.slice(0, 10000) : null,
        status,
        priority: priority(raw),
        assignee_id: mappedId,
        assignee_name: mappedProfile?.full_name || mappedProfile?.email || null,
        due_date: dueDate(raw.deadline),
        position: 0,
        external_source: "yougile",
        external_id: externalId,
        external_url: typeof raw.url === "string" ? raw.url : null,
        external_project: source.project_name,
        external_board: boardName.get(columnBoard.get(String(raw.columnId ?? "")) ?? "") ?? null,
        external_column_id: String(raw.columnId ?? "") || null,
        external_updated_at: externalTime(raw.timestamp),
        external_archived: deleted || raw.archived === true,
      };
      const { data: before } = await admin.from("tasks").select("id, assignee_id, status, priority, due_date").eq("teamspace_id", source.teamspace_id).eq("external_source", "yougile").eq("external_id", externalId).maybeSingle();
      const { data: saved, error } = await admin.from("tasks").upsert(patch, { onConflict: "teamspace_id,external_source,external_id" }).select("id, title, assignee_id, status, priority, due_date").single();
      if (error) throw error;
      if (saved.assignee_id && saved.assignee_id !== before?.assignee_id) {
        const { notifyAssignment } = await import("./tasks.server");
        await notifyAssignment({ assigneeId: saved.assignee_id, actorId: source.created_by, teamspaceId: source.teamspace_id, kind: "assigned", taskId: saved.id, title: saved.title, status: saved.status, priority: saved.priority, dueDate: saved.due_date });
      }
      synced++;
    }
    let archived = 0;
    if (seen.length) {
      const { data } = await admin.from("tasks").update({ external_archived: true }).eq("teamspace_id", source.teamspace_id).eq("external_source", "yougile").not("external_id", "in", `(${seen.join(",")})`).select("id");
      archived = data?.length ?? 0;
    } else {
      const { data } = await admin.from("tasks").update({ external_archived: true }).eq("teamspace_id", source.teamspace_id).eq("external_source", "yougile").select("id");
      archived = data?.length ?? 0;
    }
    await admin.from("task_sync_sources").update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
    return { synced, archived };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("task_sync_sources").update({ last_error: message }).eq("id", source.id);
    throw error;
  }
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
  for (const source of (data ?? []) as Source[]) {
    try { await syncSource(source); synced++; } catch { failed++; }
  }
  return { synced, failed };
}

export async function handleYouGileWebhook(id: string, secret: string) {
  const admin = await db();
  const { data } = await admin.from("task_sync_sources").select("*").eq("id", id).eq("provider", "yougile").eq("enabled", true).maybeSingle();
  const source = data as Source | null;
  if (!source) return false;
  const left = Buffer.from(secret);
  const right = Buffer.from(source.webhook_secret);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  await syncSource(source);
  return true;
}

export async function updateYouGileTaskStatus(taskId: string, status: Status, actorId: string) {
  const admin = await db();
  const { data: task } = await admin.from("tasks").select("id, teamspace_id, external_id, external_source").eq("id", taskId).maybeSingle();
  if (!task?.teamspace_id || task.external_source !== "yougile" || !task.external_id) throw new Error("Задача YouGile не найдена");
  await requireMember(actorId, task.teamspace_id);
  const source = await sourceFor(task.teamspace_id);
  if (!source) throw new Error("YouGile не подключён");
  const columnId = Object.entries(source.column_map ?? {}).find(([, mapped]) => mapped === status)?.[0];
  const body = status === "done" ? { completed: true } : { columnId, completed: false };
  if (!columnId && status !== "done") throw new Error("Для этого статуса не выбрана колонка YouGile");
  await api(decryptConnectionKey(source.api_key_ciphertext), `/tasks/${encodeURIComponent(task.external_id)}`, { method: "PUT", body: JSON.stringify(body) });
  await admin.from("tasks").update({ status }).eq("id", task.id);
  return { ok: true, status };
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
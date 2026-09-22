/**
 * Trello task-tracker integration.
 *
 * Independent from the YouGile integration (`yougile.server.ts`) but built on
 * the same storage: one row per workspace in `task_sync_sources` with
 * provider = 'trello', and tasks mirrored into `tasks` with
 * external_source = 'trello'.
 */
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

type Credentials = { key: string; token: string };
type TrelloItem = Record<string, unknown> & { id: string };

const BASE = "https://api.trello.com/1";
/** Trello allows 100 requests per 10s per token — keep a safe gap between calls. */
const MIN_GAP_MS = 120;
let lastCall = 0;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function throttle() {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCall = Date.now();
}

function credentials(source: Pick<Source, "api_key_ciphertext">): Credentials {
  const raw = decryptConnectionKey(source.api_key_ciphertext);
  const parsed = JSON.parse(raw) as Credentials;
  if (!parsed?.key || !parsed?.token) throw new Error("Некорректные данные подключения Trello");
  return parsed;
}

async function api<T>(creds: Credentials, path: string, init?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [name, value] of Object.entries(init?.query ?? {})) url.searchParams.set(name, value);
  url.searchParams.set("key", creds.key);
  url.searchParams.set("token", creds.token);

  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle();
    const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...init?.headers } });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[trello] ${path} failed [${response.status}]: ${detail}`);
      if (response.status === 401 || response.status === 403) throw new Error("Trello отклонил ключ или токен");
      if (response.status === 404) throw new Error("Объект Trello не найден");
      throw new Error(`Trello недоступен (${response.status})`);
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }
  throw new Error("Trello временно ограничил запросы. Повторите позже");
}

async function requireManager(userId: string, teamspaceId: string) {
  const admin = await db();
  const { data } = await admin.from("teamspace_members").select("role").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!data || !["owner", "admin"].includes(data.role)) throw new Error("Только владелец или администратор может настроить Trello");
}

async function requireMember(userId: string, teamspaceId: string) {
  const admin = await db();
  const { data } = await admin.from("teamspace_members").select("id").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Нет доступа к рабочему пространству");
}

async function sourceFor(teamspaceId: string) {
  const admin = await db();
  const { data, error } = await admin.from("task_sync_sources").select("*").eq("teamspace_id", teamspaceId).eq("provider", "trello").maybeSingle();
  if (error) throw new Error(error.message);
  return data as Source | null;
}

async function boards(creds: Credentials) {
  return api<TrelloItem[]>(creds, "/members/me/boards", { query: { fields: "name,url,closed", filter: "open" } });
}

async function loadStructure(creds: Credentials, boardId?: string | null) {
  const allBoards = await boards(creds);
  if (!boardId) return { boards: allBoards, lists: [], members: [] };
  const lists = await api<TrelloItem[]>(creds, `/boards/${encodeURIComponent(boardId)}/lists`, { query: { fields: "name,closed", filter: "open" } });
  const members = await api<TrelloItem[]>(creds, `/boards/${encodeURIComponent(boardId)}/members`, { query: { fields: "fullName,username,email" } });
  return { boards: allBoards, lists, members };
}

/** Trello paginates board cards with `before=<cardId>`; 1000 is the page cap. */
async function allCards(creds: Credentials, boardId: string) {
  const rows: TrelloItem[] = [];
  let before: string | undefined;
  for (let page = 0; page < 20; page++) {
    const query: Record<string, string> = {
      fields: "name,desc,idList,due,dueComplete,closed,idMembers,shortUrl,dateLastActivity,labels",
      filter: "all",
      limit: "1000",
    };
    if (before) query['before'] = before;
    const batch = await api<TrelloItem[]>(creds, `/boards/${encodeURIComponent(boardId)}/cards`, { query });
    if (!batch?.length) break;
    rows.push(...batch);
    if (batch.length < 1000) break;
    before = batch[batch.length - 1]?.id;
    if (!before) break;
  }
  return rows;
}

function dueDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function cardStatus(card: Record<string, unknown>, columnMap: Record<string, Status>): Status {
  if (card['dueComplete'] === true) return "done";
  return columnMap[String(card['idList'] ?? "")] ?? "backlog";
}

function priority(card: Record<string, unknown>): "low" | "medium" | "high" | "urgent" {
  const labels = Array.isArray(card['labels']) ? (card['labels'] as Record<string, unknown>[]) : [];
  const text = labels.map((label) => `${label['name'] ?? ""} ${label['color'] ?? ""}`).join(" ").toLowerCase();
  if (/urgent|critical|asap|сроч|критич|red/.test(text)) return "urgent";
  if (/high|важн|высок|orange/.test(text)) return "high";
  if (/low|низк|не срочн|green/.test(text)) return "low";
  return "medium";
}

export async function getTrelloStatusForUser(userId: string, teamspaceId: string) {
  await requireMember(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) return { connected: false, boards: [], lists: [], members: [], team: [] };
  const structure = await loadStructure(credentials(source), source.project_id).catch(() => ({ boards: [], lists: [], members: [] }));
  const admin = await db();
  const { data: memberships } = await admin.from("teamspace_members").select("user_id").eq("teamspace_id", teamspaceId);
  const ids = (memberships ?? []).map((row) => row.user_id);
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  return {
    connected: true,
    board_id: source.project_id,
    board_name: source.project_name,
    column_map: source.column_map ?? {},
    user_map: source.user_map ?? {},
    last_sync_at: source.last_sync_at,
    last_error: source.last_error,
    ...structure,
    team: profiles ?? [],
  };
}

export async function connectTrelloForUser(userId: string, input: { teamspace_id: string; api_key: string; api_token: string }) {
  await requireManager(userId, input.teamspace_id);
  const creds: Credentials = { key: input.api_key, token: input.api_token };
  const available = await boards(creds);
  const admin = await db();
  const current = await sourceFor(input.teamspace_id);
  const secret = current?.webhook_secret ?? randomBytes(24).toString("base64url");
  const { error } = await admin.from("task_sync_sources").upsert({
    teamspace_id: input.teamspace_id,
    provider: "trello",
    api_key_ciphertext: encryptConnectionKey(JSON.stringify(creds)),
    webhook_secret: secret,
    created_by: userId,
    enabled: true,
    last_error: null,
  }, { onConflict: "teamspace_id,provider" });
  if (error) throw new Error(error.message);
  return { connected: true, boards: available };
}

export async function inspectTrelloBoardForUser(userId: string, teamspaceId: string, boardId: string) {
  await requireManager(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) throw new Error("Trello не подключён");
  return loadStructure(credentials(source), boardId);
}

export async function configureTrelloForUser(userId: string, input: { teamspace_id: string; board_id: string; board_name: string; column_map: Record<string, Status>; user_map: Record<string, string> }) {
  await requireManager(userId, input.teamspace_id);
  const source = await sourceFor(input.teamspace_id);
  if (!source) throw new Error("Сначала подключите Trello");
  const admin = await db();
  const { error } = await admin.from("task_sync_sources").update({
    project_id: input.board_id,
    project_name: input.board_name,
    column_map: input.column_map,
    user_map: input.user_map,
    last_error: null,
  }).eq("id", source.id);
  if (error) throw new Error(error.message);
  const next: Source = { ...source, project_id: input.board_id, project_name: input.board_name, column_map: input.column_map, user_map: input.user_map };
  await registerWebhook(next).catch((error) => console.error("[trello] webhook registration failed", error));
  return syncTrelloSource(next);
}

function webhookUrl(source: Source) {
  return `https://ai-virtualspace.com/api/public/trello-webhook?id=${encodeURIComponent(source.id)}&secret=${encodeURIComponent(source.webhook_secret)}`;
}

async function registerWebhook(source: Source) {
  if (!source.project_id) return;
  const creds = credentials(source);
  if (source.webhook_id) await api(creds, `/webhooks/${encodeURIComponent(source.webhook_id)}`, { method: "DELETE" }).catch(() => null);
  const result = await api<Record<string, unknown>>(creds, "/webhooks", {
    method: "POST",
    query: { callbackURL: webhookUrl(source), idModel: source.project_id, description: "Virtual Space sync" },
  });
  const webhookId = typeof result?.['id'] === "string" ? (result['id'] as string) : null;
  if (webhookId) {
    const admin = await db();
    await admin.from("task_sync_sources").update({ webhook_id: webhookId }).eq("id", source.id);
  }
}

export async function syncTrelloSource(source: Source) {
  if (!source.enabled || !source.project_id) return { synced: 0, archived: 0 };
  const admin = await db();
  try {
    const creds = credentials(source);
    const { lists, members } = await loadStructure(creds, source.project_id);
    const listName = new Map(lists.map((row) => [row.id, String(row['name'] ?? "Trello")]));
    const memberEmail = new Map(members.map((row) => [row.id, String(row['email'] ?? "").toLowerCase()]));
    const memberHandle = new Map(members.map((row) => [row.id, String(row['username'] ?? "").toLowerCase()]));

    const { data: memberships } = await admin.from("teamspace_members").select("user_id").eq("teamspace_id", source.teamspace_id);
    const memberIds = (memberships ?? []).map((row) => row.user_id);
    const { data: profiles } = memberIds.length ? await admin.from("profiles").select("id, full_name, email").in("id", memberIds) : { data: [] };
    const profileByEmail = new Map((profiles ?? []).filter((row) => row.email).map((row) => [String(row.email).toLowerCase(), row]));

    // Trello lists become workspace columns; missing ones are created.
    const { ensureStatusesForColumns, defaultStatusId } = await import("./task-statuses.server");
    const statusByColumn = await ensureStatusesForColumns(
      source.teamspace_id,
      "trello",
      lists.map((row) => ({ id: String(row.id), name: String(row['name'] ?? "Список") })),
    );
    const { emitExternalTaskChange } = await import("./task-changes.server");

    const cards = await allCards(creds, source.project_id);
    const seen: string[] = [];
    let synced = 0;

    for (const card of cards) {
      const externalId = card.id;
      seen.push(externalId);
      const assigned = Array.isArray(card['idMembers']) ? (card['idMembers'] as unknown[]).map(String) : [];
      const mappedId = assigned
        .map((id) => source.user_map?.[id]
          ?? profileByEmail.get(memberEmail.get(id) ?? "")?.id
          ?? profileByEmail.get(`${memberHandle.get(id) ?? ""}`)?.id)
        .find(Boolean) ?? null;
      const mappedProfile = (profiles ?? []).find((row) => row.id === mappedId);
      const listId = String(card['idList'] ?? "");
      const workspaceStatus = statusByColumn.get(listId) ?? null;
      const status: Status = card['dueComplete'] === true
        ? "done"
        : source.column_map?.[listId] ?? workspaceStatus?.base_status ?? cardStatus(card, source.column_map ?? {});
      const statusId = workspaceStatus?.id ?? (await defaultStatusId(source.teamspace_id, status));
      const patch = {
        user_id: source.created_by,
        teamspace_id: source.teamspace_id,
        title: String(card['name'] ?? "Карточка Trello").slice(0, 500),
        description: typeof card['desc'] === "string" ? card['desc'].slice(0, 10000) : null,
        status: cardStatus(card, source.column_map ?? {}),
        priority: priority(card),
        assignee_id: mappedId,
        assignee_name: mappedProfile?.full_name || mappedProfile?.email || null,
        due_date: dueDate(card['due']),
        position: 0,
        external_source: "trello",
        external_id: externalId,
        external_url: typeof card['shortUrl'] === "string" ? card['shortUrl'] : null,
        external_project: source.project_name,
        external_board: listName.get(String(card['idList'] ?? "")) ?? null,
        external_column_id: String(card['idList'] ?? "") || null,
        external_updated_at: typeof card['dateLastActivity'] === "string" ? card['dateLastActivity'] : null,
        external_archived: card['closed'] === true,
      };
      const { data: before } = await admin.from("tasks").select("id, assignee_id").eq("teamspace_id", source.teamspace_id).eq("external_source", "trello").eq("external_id", externalId).maybeSingle();
      const { data: saved, error } = await admin.from("tasks").upsert(patch, { onConflict: "teamspace_id,external_source,external_id" }).select("id, title, assignee_id, status, priority, due_date").single();
      if (error) throw error;
      if (saved.assignee_id && saved.assignee_id !== before?.assignee_id) {
        const { notifyAssignment } = await import("./tasks.server");
        await notifyAssignment({ assigneeId: saved.assignee_id, actorId: source.created_by, teamspaceId: source.teamspace_id, kind: "assigned", taskId: saved.id, title: saved.title, status: saved.status, priority: saved.priority, dueDate: saved.due_date });
      }
      synced++;
    }

    // Cards deleted in Trello never come back in the listing — archive the rest.
    let archived = 0;
    const query = admin.from("tasks").update({ external_archived: true }).eq("teamspace_id", source.teamspace_id).eq("external_source", "trello");
    const { data: gone } = seen.length
      ? await query.not("external_id", "in", `(${seen.map((id) => `"${id}"`).join(",")})`).select("id")
      : await query.select("id");
    archived = gone?.length ?? 0;

    await admin.from("task_sync_sources").update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
    return { synced, archived };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("task_sync_sources").update({ last_error: message }).eq("id", source.id);
    throw error;
  }
}

export async function syncTrelloForUser(userId: string, teamspaceId: string) {
  await requireMember(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) throw new Error("Trello не подключён");
  return syncTrelloSource(source);
}

export async function syncAllTrelloSources() {
  const admin = await db();
  const { data } = await admin.from("task_sync_sources").select("*").eq("provider", "trello").eq("enabled", true);
  let synced = 0;
  let failed = 0;
  for (const source of (data ?? []) as Source[]) {
    try { await syncTrelloSource(source); synced++; } catch { failed++; }
  }
  return { synced, failed };
}

export async function handleTrelloWebhook(id: string, secret: string) {
  const admin = await db();
  const { data } = await admin.from("task_sync_sources").select("*").eq("id", id).eq("provider", "trello").eq("enabled", true).maybeSingle();
  const source = data as Source | null;
  if (!source) return false;
  const left = Buffer.from(secret);
  const right = Buffer.from(source.webhook_secret);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  await syncTrelloSource(source);
  return true;
}

export async function updateTrelloTaskStatus(taskId: string, status: Status, actorId: string) {
  const admin = await db();
  const { data: task } = await admin.from("tasks").select("id, teamspace_id, external_id, external_source").eq("id", taskId).maybeSingle();
  if (!task?.teamspace_id || task.external_source !== "trello" || !task.external_id) throw new Error("Задача Trello не найдена");
  await requireMember(actorId, task.teamspace_id);
  const source = await sourceFor(task.teamspace_id);
  if (!source) throw new Error("Trello не подключён");
  const listId = Object.entries(source.column_map ?? {}).find(([, mapped]) => mapped === status)?.[0];
  if (!listId && status !== "done") throw new Error("Для этого статуса не выбран список Trello");
  const query: Record<string, string> = { dueComplete: status === "done" ? "true" : "false" };
  if (listId) query['idList'] = listId;
  await api(credentials(source), `/cards/${encodeURIComponent(task.external_id)}`, { method: "PUT", query });
  await admin.from("tasks").update({ status }).eq("id", task.id);
  return { ok: true, status };
}

export async function disconnectTrelloForUser(userId: string, teamspaceId: string) {
  await requireManager(userId, teamspaceId);
  const source = await sourceFor(teamspaceId);
  if (!source) return { ok: true };
  if (source.webhook_id) await api(credentials(source), `/webhooks/${encodeURIComponent(source.webhook_id)}`, { method: "DELETE" }).catch(() => null);
  const admin = await db();
  const { error } = await admin.from("task_sync_sources").delete().eq("id", source.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

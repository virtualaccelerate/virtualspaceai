/** Personal Google Calendar connector and task/event synchronization — server only. */
import {
  appUserReconnectRequired,
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  deleteConnectionForUser,
  getConnectionKeyForUser,
  getConnectionRowForUser,
  saveConnectionKeyForUser,
} from "./app-user-connections.server";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const CONNECTOR_ID = "google_calendar";
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  // Same connection also syncs task due dates into the user's Google Tasks list.
  "https://www.googleapis.com/auth/tasks",
];
/** Scopes required for Calendar calls — excludes tasks so pre-Tasks connections keep working for meetings. */
const CALENDAR_REQUIRED_SCOPES = GOOGLE_CALENDAR_SCOPES.filter((s) => !s.endsWith("/auth/tasks"));
export const RECONNECT_REQUIRED = "GOOGLE_CALENDAR_RECONNECT_REQUIRED";

type Calendar = { id: string; summary: string; primary?: boolean; accessRole?: string };
type CalendarEvent = {
  id: string; etag?: string; status?: string; htmlLink?: string; summary?: string;
  description?: string; updated?: string; start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};
type TaskRow = {
  id: string; user_id: string; assignee_id: string | null; title: string; description: string | null;
  due_date: string | null; status: string; priority: string; external_source: string | null;
};

function clientApiKey() {
  const key = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  if (!key) throw new Error("Google Calendar connection is not configured");
  return key;
}
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
export async function startConnect(userId: string, origin: string) {
  const existing = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  const { authorizationUrl } = await authorizeAppUserOAuth({
    gatewayBaseUrl: GATEWAY_BASE_URL, connectorId: CONNECTOR_ID, appUserId: userId,
    clientAPIKey: clientApiKey(), returnUrl: new URL("/oauth/google-calendar/return", origin).toString(),
    connectionAPIKey: existing ?? undefined,
    credentialsConfiguration: { scopes: GOOGLE_CALENDAR_SCOPES },
  });
  return { authorizationUrl };
}
async function calendarFetch(userId: string, path: string, init?: RequestInit) {
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (!key) throw new Error(RECONNECT_REQUIRED);
  const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key,
    connectorId: CONNECTOR_ID, path, init, requiredScopes: CALENDAR_REQUIRED_SCOPES });
  if (await appUserReconnectRequired(res)) {
    const db = await admin();
    await db.from("google_calendar_settings").upsert({ user_id: userId, reconnect_required: true, last_error: RECONNECT_REQUIRED, updated_at: new Date().toISOString() });
    throw new Error(RECONNECT_REQUIRED);
  }
  return res;
}
async function calendarJson<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
  const res = await calendarFetch(userId, path, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Calendar request failed [${res.status}]: ${text.slice(0, 500)}`);
  return (text ? JSON.parse(text) : {}) as T;
}
export async function completeConnect(userId: string, code: string) {
  const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, code);
  if (connectorId !== CONNECTOR_ID) throw new Error("OAuth completion returned the wrong connector");
  await saveConnectionKeyForUser(userId, CONNECTOR_ID, connectionAPIKey);
  const calendars = await listCalendarsWithKey(connectionAPIKey);
  const primary = calendars.find((item) => item.primary) ?? calendars[0];
  const email = primary?.id?.includes("@") ? primary.id : null;
  if (email) await saveConnectionKeyForUser(userId, CONNECTOR_ID, connectionAPIKey, email);
  const db = await admin();
  await db.from("google_calendar_settings").upsert({ user_id: userId, calendar_id: primary?.id ?? "primary", calendar_name: primary?.summary ?? "Primary", reconnect_required: false, last_error: null, updated_at: new Date().toISOString() });
  return { ok: true };
}
async function listCalendarsWithKey(connectionAPIKey: string): Promise<Calendar[]> {
  const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey, connectorId: CONNECTOR_ID,
    path: "/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=250", requiredScopes: CALENDAR_REQUIRED_SCOPES });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Calendar request failed [${res.status}]: ${text.slice(0, 500)}`);
  return ((JSON.parse(text).items ?? []) as Calendar[]).filter((item) => item.accessRole === "owner" || item.accessRole === "writer");
}
export async function listCalendars(userId: string) {
  return calendarJson<{ items?: Calendar[] }>(userId, "/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=250").then((x) => x.items ?? []);
}
export async function status(userId: string) {
  const [connection, db] = await Promise.all([getConnectionRowForUser(userId, CONNECTOR_ID), admin()]);
  const { data: settings } = await db.from("google_calendar_settings").select("calendar_id, calendar_name, last_sync_at, last_error, reconnect_required").eq("user_id", userId).maybeSingle();
  return { connected: !!connection, email: connection?.account_email ?? null, calendarId: settings?.calendar_id ?? "primary",
    calendarName: settings?.calendar_name ?? null, lastSyncAt: settings?.last_sync_at ?? null,
    lastError: settings?.last_error ?? null, reconnectRequired: settings?.reconnect_required ?? false };
}
export async function selectCalendar(userId: string, calendarId: string, name: string) {
  const calendars = await listCalendars(userId);
  if (!calendars.some((item) => item.id === calendarId)) throw new Error("Calendar is not available");
  const db = await admin();
  await db.from("google_calendar_settings").upsert({ user_id: userId, calendar_id: calendarId, calendar_name: name, sync_token: null, updated_at: new Date().toISOString() });
  return syncUserCalendar(userId);
}
function nextDay(date: string) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
function eventBody(task: TaskRow) {
  return { summary: `${task.status === "done" ? "✅ " : ""}${task.title}`,
    description: [task.description, `Virtual Space task: ${task.id}`, `Status: ${task.status}`, `Priority: ${task.priority}`].filter(Boolean).join("\n"),
    start: { date: task.due_date }, end: { date: task.due_date ? nextDay(task.due_date) : undefined },
    extendedProperties: { private: { virtualSpaceTaskId: task.id } }, status: "confirmed" };
}
export async function syncTaskToCalendar(task: TaskRow, previousUserId?: string | null) {
  if (task.external_source) return;
  const targetUserId = task.assignee_id ?? task.user_id;
  const db = await admin();
  if (previousUserId && previousUserId !== targetUserId) await deleteTaskCalendarEvent(task.id, previousUserId).catch(() => {});
  if (!task.due_date) {
    await deleteTaskCalendarEvent(task.id, targetUserId).catch(() => {});
    return;
  }
  const connection = await getConnectionKeyForUser(targetUserId, CONNECTOR_ID);
  if (!connection) return;
  const { data: settings } = await db.from("google_calendar_settings").select("calendar_id").eq("user_id", targetUserId).maybeSingle();
  const calendarId = settings?.calendar_id ?? "primary";
  const { data: link } = await db.from("google_calendar_links").select("event_id, calendar_id").eq("user_id", targetUserId).eq("task_id", task.id).maybeSingle();
  const encodedCalendar = encodeURIComponent(link?.calendar_id ?? calendarId);
  const path = link
    ? `/calendar/v3/calendars/${encodedCalendar}/events/${encodeURIComponent(link.event_id)}`
    : `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const event = await calendarJson<CalendarEvent>(targetUserId, path, { method: link ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventBody(task)) });
  await db.from("google_calendar_links").upsert({ user_id: targetUserId, task_id: task.id, event_id: event.id, calendar_id: link?.calendar_id ?? calendarId,
    etag: event.etag ?? null, event_updated_at: event.updated ?? null, last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }, { onConflict: "user_id,task_id" });
}
export async function deleteTaskCalendarEvent(taskId: string, onlyUserId?: string | null) {
  const db = await admin();
  let query = db.from("google_calendar_links").select("id,user_id,event_id,calendar_id").eq("task_id", taskId);
  if (onlyUserId) query = query.eq("user_id", onlyUserId);
  const { data: links } = await query;
  for (const link of links ?? []) {
    if (await getConnectionKeyForUser(link.user_id, CONNECTOR_ID)) {
      const res = await calendarFetch(link.user_id, `/calendar/v3/calendars/${encodeURIComponent(link.calendar_id)}/events/${encodeURIComponent(link.event_id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Google Calendar delete failed [${res.status}]`);
    }
    await db.from("google_calendar_links").delete().eq("id", link.id);
  }
}
export const TASKS_SCOPE_MISSING = "GOOGLE_TASKS_RECONNECT_REQUIRED";
type GoogleTask = { id: string };
const TASKS_BASE = "/tasks/v1/lists/%40default/tasks";
/** Google Tasks calls go through the same Calendar connection; old tokens lack the tasks scope. */
async function tasksFetch(userId: string, path: string, init?: RequestInit) {
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (!key) throw new Error(RECONNECT_REQUIRED);
  const res = await callAsAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: CONNECTOR_ID, path, init });
  if (await appUserReconnectRequired(res)) {
    const db = await admin();
    await db.from("google_calendar_settings").upsert({ user_id: userId, reconnect_required: true, last_error: RECONNECT_REQUIRED, updated_at: new Date().toISOString() });
    throw new Error(RECONNECT_REQUIRED);
  }
  if (res.status === 401 || res.status === 403) {
    const text = await res.clone().text();
    if (/insufficient authentication scopes|insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(text)) {
      const db = await admin();
      await db.from("google_calendar_settings").update({ last_error: TASKS_SCOPE_MISSING, updated_at: new Date().toISOString() }).eq("user_id", userId);
      throw new Error(TASKS_SCOPE_MISSING);
    }
  }
  return res;
}
export async function syncTaskToGoogleTasks(task: TaskRow, previousUserId?: string | null) {
  if (task.external_source) return;
  const targetUserId = task.assignee_id ?? task.user_id;
  const db = await admin();
  if (previousUserId && previousUserId !== targetUserId) await deleteGoogleTask(task.id, previousUserId).catch(() => {});
  if (!task.due_date) {
    await deleteGoogleTask(task.id, targetUserId).catch(() => {});
    return;
  }
  if (!(await getConnectionKeyForUser(targetUserId, CONNECTOR_ID))) return;
  try {
    const { data: link } = await db.from("google_tasks_links").select("google_task_id").eq("user_id", targetUserId).eq("task_id", task.id).maybeSingle();
    const body = { title: task.title, notes: task.description ?? undefined, due: `${task.due_date}T00:00:00.000Z`, status: task.status === "done" ? "completed" : "needsAction" };
    const send = (path: string, method: string) => tasksFetch(targetUserId, path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let res = link ? await send(`${TASKS_BASE}/${encodeURIComponent(link.google_task_id)}`, "PATCH") : await send(TASKS_BASE, "POST");
    if (link && res.status === 404) res = await send(TASKS_BASE, "POST"); // deleted in Google — recreate
    const text = await res.text();
    if (!res.ok) throw new Error(`Google Tasks request failed [${res.status}]: ${text.slice(0, 500)}`);
    const created = JSON.parse(text) as GoogleTask;
    const now = new Date().toISOString();
    await db.from("google_tasks_links").upsert({ user_id: targetUserId, task_id: task.id, google_task_id: created.id, tasklist_id: "@default", last_sync_at: now, last_error: null, updated_at: now }, { onConflict: "user_id,task_id" });
  } catch (error) {
    // Previously swallowed silently by every call site (.catch(() => {})) — record it so
    // it actually surfaces on the Integrations page instead of vanishing without a trace.
    const message = error instanceof Error ? error.message : String(error);
    if (message !== TASKS_SCOPE_MISSING && message !== RECONNECT_REQUIRED) {
      await db.from("google_calendar_settings").update({ last_error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("user_id", targetUserId);
    }
    throw error;
  }
}
export async function deleteGoogleTask(taskId: string, onlyUserId?: string | null) {
  const db = await admin();
  let query = db.from("google_tasks_links").select("id,user_id,google_task_id").eq("task_id", taskId);
  if (onlyUserId) query = query.eq("user_id", onlyUserId);
  const { data: links } = await query;
  for (const link of links ?? []) {
    if (await getConnectionKeyForUser(link.user_id, CONNECTOR_ID)) {
      const res = await tasksFetch(link.user_id, `${TASKS_BASE}/${encodeURIComponent(link.google_task_id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Google Tasks delete failed [${res.status}]`);
    }
    await db.from("google_tasks_links").delete().eq("id", link.id);
  }
}
export async function createMeeting(userId: string, input: { title: string; start: string; end: string; description?: string; attendees?: string[] }) {
  const db = await admin();
  const { data: settings } = await db.from("google_calendar_settings").select("calendar_id").eq("user_id", userId).maybeSingle();
  const calendarId = settings?.calendar_id ?? "primary";
  const event = await calendarJson<CalendarEvent>(userId, `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: input.title, description: input.description || undefined,
      start: { dateTime: input.start, timeZone: "Asia/Bishkek" }, end: { dateTime: input.end, timeZone: "Asia/Bishkek" },
      attendees: (input.attendees ?? []).map((email) => ({ email })) }),
  });
  return { id: event.id, title: event.summary ?? input.title, url: event.htmlLink ?? null };
}
export async function syncUserCalendar(userId: string) {
  const db = await admin();
  const { data: settings } = await db.from("google_calendar_settings").select("calendar_id").eq("user_id", userId).maybeSingle();
  const calendarId = settings?.calendar_id ?? "primary";
  const { data: links } = await db.from("google_calendar_links").select("id,task_id,event_id,event_updated_at").eq("user_id", userId).eq("calendar_id", calendarId);
  let updated = 0;
  for (const link of links ?? []) {
    const event = await calendarJson<CalendarEvent>(userId, `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(link.event_id)}`);
    if (event.status === "cancelled") continue;
    const due = event.start?.date ?? event.start?.dateTime?.slice(0, 10);
    if (due && event.updated && event.updated !== link.event_updated_at) {
      await db.from("tasks").update({ due_date: due, updated_at: new Date().toISOString() }).eq("id", link.task_id).is("external_source", null);
      updated++;
    }
    await db.from("google_calendar_links").update({ etag: event.etag ?? null, event_updated_at: event.updated ?? null, last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", link.id);
  }
  const { data: taskLinks } = await db.from("google_tasks_links").select("task_id").eq("user_id", userId);
  const linkedTaskIds = new Set((taskLinks ?? []).map((link: any) => link.task_id));
  const { data: tasks } = await db.from("tasks")
    .select("id,user_id,assignee_id,title,description,due_date,status,priority,external_source")
    .not("due_date", "is", null)
    .is("external_source", null)
    .or(`assignee_id.eq.${userId},and(assignee_id.is.null,user_id.eq.${userId})`);
  for (const task of tasks ?? []) {
    if (!linkedTaskIds.has(task.id)) await syncTaskToGoogleTasks(task).catch(() => {});
  }
  const now = new Date().toISOString();
  await db.from("google_calendar_settings").upsert({ user_id: userId, calendar_id: calendarId, last_sync_at: now, last_error: null, reconnect_required: false, updated_at: now });
  return { synced: links?.length ?? 0, updated };
}
export async function syncAllGoogleCalendars() {
  const db = await admin();
  const { data: rows } = await db.from("google_calendar_settings").select("user_id").eq("reconnect_required", false);
  let synced = 0, failed = 0;
  for (const row of rows ?? []) {
    try { await syncUserCalendar(row.user_id); synced++; }
    catch (error) { failed++; await db.from("google_calendar_settings").update({ last_error: error instanceof Error ? error.message.slice(0, 500) : String(error), updated_at: new Date().toISOString() }).eq("user_id", row.user_id); }
  }
  return { synced, failed };
}
export async function disconnect(userId: string) {
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (key) try { await disconnectAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: CONNECTOR_ID }); } catch { /* local disconnect still proceeds */ }
  const db = await admin();
  await db.from("google_calendar_links").delete().eq("user_id", userId);
  await db.from("google_tasks_links").delete().eq("user_id", userId);
  await db.from("google_calendar_settings").delete().eq("user_id", userId);
  await deleteConnectionForUser(userId, CONNECTOR_ID);
  return { ok: true };
}

/**
 * Turns a diff between the stored task and its fresh external state into
 * history records plus notifications (in-app + Telegram) for the people the
 * change concerns: the assignee and the workspace owner/admins.
 */
import { recordTaskEvent } from "./task-events.server";
import { shouldNotifyRestoration } from "./notification-facts";
import { flushTrackerNotifications, type TrackerBatch } from "./tracker-notifications.server";

type Snapshot = {
  status?: string | null;
  status_name?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  due_date?: string | null;
  priority?: string | null;
  title?: string | null;
  external_archived?: boolean | null;
  sync_archived_at?: string | null;
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function managerIds(teamspaceId: string): Promise<string[]> {
  const admin = await db();
  const { data } = await admin
    .from("teamspace_members")
    .select("user_id, role")
    .eq("teamspace_id", teamspaceId)
    .in("role", ["owner", "admin"]);
  return (data ?? []).map((row) => row.user_id);
}

function label(source: string) {
  return source === "trello" ? "Trello" : source === "yougile" ? "YouGile" : "Virtual Space";
}

/** Sends one short message to a person, in the app and to Telegram. */
async function tell(userId: string, teamspaceId: string, taskId: string, title: string, body: string, kind: string) {
  const { createNotification } = await import("./notifications.server");
  await createNotification({ userId, teamspaceId, kind, title, body, taskId }).catch(() => {});
  const { notifyUserMessage } = await import("./telegram.server");
  await notifyUserMessage(userId, `${title}\n${body}`).catch(() => {});
}

export async function emitExternalTaskChange(input: {
  source: "trello" | "yougile";
  teamspaceId: string;
  taskId: string;
  title: string;
  before: Snapshot | null;
  after: Snapshot;
  batch?: TrackerBatch;
}) {
  const { source, teamspaceId, taskId, title, before, after } = input;
  const tracker = label(source);

  if (!before) {
    await recordTaskEvent({ taskId, teamspaceId, source, kind: "imported", note: tracker });
    return;
  }

  const changes: { field: string; from: string | null; to: string | null; text: string }[] = [];
  const columnBefore = before.status_name ?? before.status ?? null;
  const columnAfter = after.status_name ?? after.status ?? null;
  if (columnBefore !== columnAfter || before.status !== after.status) {
    changes.push({ field: "status", from: before.status !== after.status ? before.status ?? null : columnBefore, to: before.status !== after.status ? after.status ?? null : columnAfter, text: `Статус: ${columnBefore ?? "—"} → ${columnAfter ?? "—"}` });
  }
  if ((before.assignee_name ?? null) !== (after.assignee_name ?? null)) {
    changes.push({ field: "assignee", from: before.assignee_name ?? null, to: after.assignee_name ?? null, text: `Исполнитель: ${after.assignee_name ?? "не назначен"}` });
  }
  if ((before.due_date ?? null) !== (after.due_date ?? null)) {
    changes.push({ field: "due_date", from: before.due_date ?? null, to: after.due_date ?? null, text: `Срок: ${after.due_date ?? "без срока"}` });
  }
  if ((before.priority ?? null) !== (after.priority ?? null)) {
    changes.push({ field: "priority", from: before.priority ?? null, to: after.priority ?? null, text: `Приоритет: ${after.priority ?? "—"}` });
  }
  if ((before.title ?? "").trim() !== (after.title ?? "").trim()) {
    changes.push({ field: "title", from: before.title ?? null, to: after.title ?? null, text: `Новое название: ${after.title ?? ""}` });
  }
  if (Boolean(before.external_archived) !== Boolean(after.external_archived)) {
    changes.push({
      field: "archived",
      from: String(Boolean(before.external_archived)),
      to: String(Boolean(after.external_archived)),
      text: after.external_archived ? `Задача удалена/архивирована в ${tracker}` : `Задача восстановлена в ${tracker}`,
    });
  }
  if (!changes.length) return;

  for (const change of changes) {
    await recordTaskEvent({ taskId, teamspaceId, source, kind: "external_update", field: change.field, from: change.from, to: change.to });
  }

  const restoring = before.external_archived && !after.external_archived;
  const notifiable = restoring && !shouldNotifyRestoration(before.sync_archived_at)
    ? changes.filter(change => change.field !== "archived")
    : changes;
  if (!notifiable.length) return;

  const done = after.status === "done" && before.status !== "done";
  // Short factual report: what is already done, no long lists.
  const main = notifiable.find((change) => change.field === "status") ?? notifiable[0];
  const body = done
    ? `${title} — выполнено (${tracker})`
    : `${title} — ${main.text} (${tracker})`;
  const heading = done ? "Задача выполнена" : "Задача обновлена";

  const recipients = new Set<string>(await managerIds(teamspaceId));
  if (after.assignee_id) recipients.add(after.assignee_id);
  if (before.assignee_id) recipients.add(before.assignee_id);

  const notices = [...recipients].map(userId => ({ userId, teamspaceId, taskId, tracker, title: heading, body, kind: done ? "task_external_done" : "task_external_update" }));
  if (input.batch) input.batch.push(...notices);
  else await flushTrackerNotifications(notices);
}

/** History + manager ping for a status change made inside Virtual Space or Telegram. */
export async function emitLocalStatusChange(input: {
  taskId: string;
  teamspaceId: string | null;
  actorId: string;
  actorName?: string | null;
  from: string | null;
  to: string;
  title: string;
  source?: "virtual_space" | "telegram";
  tracker?: string | null;
}) {
  await recordTaskEvent({
    taskId: input.taskId,
    teamspaceId: input.teamspaceId,
    actorId: input.actorId,
    actorName: input.actorName ?? null,
    source: input.source ?? "virtual_space",
    kind: "status_change",
    field: "status",
    from: input.from,
    to: input.to,
    note: input.tracker ?? null,
  });
  if (!input.teamspaceId) return;
  const managers = (await managerIds(input.teamspaceId)).filter((id) => id !== input.actorId);
  if (!managers.length) return;
  const who = input.actorName ?? "Участник";
  const body = `${input.title}\n${input.from ?? "—"} → ${input.to}${input.tracker ? `\nСинхронизировано с ${input.tracker}` : ""}`;
  for (const userId of managers) {
    await tell(userId, input.teamspaceId, input.taskId, `${who} изменил статус задачи`, body, "task_status_change");
  }
}

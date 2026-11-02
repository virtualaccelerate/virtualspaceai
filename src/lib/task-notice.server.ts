/**
 * Delivers task notifications through the shared formatter: one bell row plus the
 * same lines in Telegram (HTML, with "open task" buttons). Server-only.
 */
import { formatTaskNotice, DEFAULT_TZ, type NoticeChange, type NoticeKind, type NoticeTask } from "./task-notice";

type InlineRow = { text: string; callback_data?: string; url?: string }[];

export const APP_URL = () => process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://ai-virtualspace.com";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type PreparedNotice = {
  userId: string; teamspaceId: string; taskId: string | null; kind: string;
  title: string; body: string; html: string; keyboard?: { inline_keyboard: InlineRow[] };
  actorId?: string; actorName?: string | null; tracker: string;
};

/** Loads the task details the formatter needs (title, project, workspace, tracker url). */
export async function loadNoticeTask(taskId: string, override?: Partial<NoticeTask> & { teamspace_id?: string | null }) {
  const db = await admin();
  const { data } = await db.from("tasks")
    .select("id, title, project, status, priority, due_date, teamspace_id, external_source, external_url")
    .eq("id", taskId).maybeSingle();
  const row = { ...(data ?? {}), ...(override ?? {}) } as NoticeTask & { teamspace_id?: string | null };
  let space: string | null = null;
  if (row.teamspace_id) {
    const { data: ts } = await db.from("teamspaces").select("name").eq("id", row.teamspace_id).maybeSingle();
    space = ts?.name ?? null;
  }
  return { ...row, id: taskId, title: row.title ?? "", space };
}

/** The recipient's language: app profile first, then the bot link, default Russian. */
async function languages(userIds: string[]) {
  const db = await admin();
  const [{ data: profiles }, { data: links }] = await Promise.all([
    db.from("profiles").select("id, language").in("id", userIds),
    db.from("telegram_links").select("user_id, language").in("user_id", userIds),
  ]);
  const map = new Map<string, string>();
  for (const l of links ?? []) if (l.language) map.set(l.user_id, l.language);
  for (const p of profiles ?? []) if (p.language) map.set(p.id, p.language);
  return map;
}

export async function prepareTaskNotices(input: {
  userIds: string[]; kind: NoticeKind; notificationKind: string;
  task: NoticeTask & { teamspace_id?: string | null };
  actorId?: string | null; actorName?: string | null; tracker?: string | null;
  changes?: NoticeChange[]; extraRows?: InlineRow[]; now?: number;
}): Promise<PreparedNotice[]> {
  const ids = [...new Set(input.userIds.filter(Boolean))];
  if (!ids.length || !input.task.teamspace_id) return [];
  const langs = await languages(ids);
  return ids.map((userId) => {
    const f = formatTaskNotice({
      kind: input.kind, task: input.task, lang: langs.get(userId), actor: input.actorName,
      tracker: input.tracker, changes: input.changes, tz: DEFAULT_TZ, now: input.now, appUrl: APP_URL(),
    });
    const rows: InlineRow[] = [...(input.extraRows ?? []), ...f.buttons.map((b) => [{ text: b.text, url: b.url }])];
    return {
      userId, teamspaceId: input.task.teamspace_id as string, taskId: input.kind === "deleted" ? null : input.task.id,
      kind: input.notificationKind, title: f.title, body: f.body, html: f.html,
      keyboard: rows.length ? { inline_keyboard: rows } : undefined,
      actorId: input.actorId ?? undefined, actorName: input.actorName ?? null, tracker: input.tracker ?? "",
    };
  });
}

/** Telegram copy of a prepared notice; silent when the person has no linked chat. */
export async function sendNoticeTelegram(n: Pick<PreparedNotice, "userId" | "html" | "keyboard">) {
  const { notifyUserMessage } = await import("./telegram.server");
  return notifyUserMessage(n.userId, n.html, { parse_mode: "HTML", ...(n.keyboard ? { reply_markup: n.keyboard } : {}) });
}

/** Bell row + Telegram message for each prepared notice. */
export async function deliverTaskNotices(notices: PreparedNotice[], opts?: { skipTelegram?: boolean; skipBell?: boolean }) {
  const { createNotification } = await import("./notifications.server");
  for (const n of notices) {
    if (!opts?.skipBell) {
      await createNotification({
        userId: n.userId, teamspaceId: n.teamspaceId, kind: n.kind, title: n.title, body: n.body,
        actorId: n.actorId ?? null, actorName: n.actorName ?? null, taskId: n.taskId,
      }).catch(() => {});
    }
    if (!opts?.skipTelegram) await sendNoticeTelegram(n).catch(() => {});
  }
}

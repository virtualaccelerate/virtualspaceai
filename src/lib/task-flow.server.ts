/**
 * Task lifecycle automation: deadline reminders, overdue alerts, proof submission,
 * owner approve / send-back, and the evening per-workspace report.
 * Server-only. Telegram + in-app notifications are kept in sync here.
 */

const BISHKEK_OFFSET_HOURS = 6;
/** Tasks are due at the end of the working day (18:00 Bishkek) of their due_date. */
const DEADLINE_HOUR_LOCAL = 18;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function tgApi() {
  return import("./telegram.server");
}

/** Milliseconds from now until the task deadline (negative = overdue). */
export function msUntilDeadline(due: string, now = Date.now()): number {
  const base = new Date(`${due}T00:00:00.000Z`).getTime();
  return base + (DEADLINE_HOUR_LOCAL - BISHKEK_OFFSET_HOURS) * 3600_000 - now;
}

export function localDateString(now = new Date()): string {
  return new Date(now.getTime() + BISHKEK_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
}

const PRIORITY_ICON: Record<string, string> = { low: "⚪️", medium: "🔵", high: "🟠", urgent: "🔴" };
const STATUS_RU: Record<string, string> = {
  backlog: "⬜️ Бэклог",
  in_progress: "🟪 В работе",
  review: "🟨 На проверке",
  done: "🟩 Готово",
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  user_id: string;
  teamspace_id: string | null;
  proof_url?: string | null;
  proof_note?: string | null;
};

async function chatIdFor(userId: string | null): Promise<number | null> {
  if (!userId) return null;
  const db = await admin();
  const { data } = await db
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", userId)
    .not("chat_id", "is", null)
    .maybeSingle();
  return data?.chat_id ? Number(data.chat_id) : null;
}

/** Who reviews the work: the task creator, falling back to the workspace owner. */
export async function approverFor(task: TaskRow): Promise<string | null> {
  if (task.user_id && task.user_id !== task.assignee_id) return task.user_id;
  if (!task.teamspace_id) return task.user_id ?? null;
  const db = await admin();
  const { data } = await db.from("teamspaces").select("owner_id").eq("id", task.teamspace_id).maybeSingle();
  return data?.owner_id ?? task.user_id ?? null;
}

async function notifyInApp(input: {
  userId: string | null;
  teamspaceId: string | null;
  kind: string;
  title: string;
  body: string;
  taskId: string;
  actorId?: string | null;
}) {
  if (!input.userId) return;
  const { createNotification } = await import("./notifications.server");
  await createNotification({
    userId: input.userId,
    teamspaceId: input.teamspaceId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    taskId: input.taskId,
    actorId: input.actorId ?? null,
  }).catch(() => {});
}

export function taskCard(task: TaskRow, spaceName?: string | null): string {
  return [
    `${PRIORITY_ICON[task.priority] ?? ""} ${task.title}`,
    spaceName ? `Пространство: ${spaceName}` : null,
    `Статус: ${STATUS_RU[task.status] ?? task.status}`,
    task.due_date ? `Дедлайн: ${task.due_date} до ${DEADLINE_HOUR_LOCAL}:00` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Workspace name for a task, so every bot message says where it belongs. */
async function spaceName(teamspaceId: string | null): Promise<string | null> {
  if (!teamspaceId) return null;
  const db = await admin();
  const { data } = await db.from("teamspaces").select("name").eq("id", teamspaceId).maybeSingle();
  return data?.name ?? null;
}

export function assigneeKeyboard(taskId: string, status: string) {
  const row: { text: string; callback_data: string }[] = [];
  if (status === "backlog") row.push({ text: "▶️ Начать", callback_data: `begin:${taskId}` });
  if (status !== "review" && status !== "done") row.push({ text: "📎 Сдать", callback_data: `submit:${taskId}` });
  return row.length ? { inline_keyboard: [row] } : undefined;
}

// ---------------- reminders ----------------

async function alreadySent(taskId: string, kind: string): Promise<boolean> {
  const db = await admin();
  const { error } = await db.from("task_reminders").insert({ task_id: taskId, kind });
  return Boolean(error); // unique violation => reminder already delivered
}

/** Hourly sweep: 3h / 1h before the deadline, at the deadline, then once a day while overdue. */
export async function runDeadlineReminders(): Promise<{ sent: number }> {
  const db = await admin();
  const { data } = await db
    .from("tasks")
    .select("id, title, status, priority, due_date, assignee_id, assignee_name, user_id, teamspace_id")
    .neq("status", "done")
    .eq("external_archived", false)
    .not("assignee_id", "is", null)
    .not("due_date", "is", null)
    .limit(500);

  const tasks = (data ?? []) as TaskRow[];
  const { sendMessage } = await tgApi();
  const now = Date.now();
  const today = localDateString();
  let sent = 0;

  for (const task of tasks) {
    if (!task.due_date) continue;
    const leftMs = msUntilDeadline(task.due_date, now);
    const leftH = leftMs / 3600_000;

    let kind: string | null = null;
    let heading: string | null = null;
    if (leftH > 2 && leftH <= 3) {
      kind = "h3";
      heading = "⏰ До дедлайна 3 часа";
    } else if (leftH > 0 && leftH <= 1) {
      kind = "h1";
      heading = "⏰ До дедлайна 1 час";
    } else if (leftH <= 0) {
      kind = `overdue:${today}`;
      heading = "🔴 Задача просрочена";
    }
    if (!kind || !heading) continue;
    if (await alreadySent(task.id, kind)) continue;

    const chatId = await chatIdFor(task.assignee_id);
    if (chatId) {
      await sendMessage(chatId, `${heading}\n\n${taskCard(task)}`, {
        reply_markup: assigneeKeyboard(task.id, task.status),
      });
    }
    await notifyInApp({
      userId: task.assignee_id,
      teamspaceId: task.teamspace_id,
      kind: kind.startsWith("overdue") ? "task_overdue" : "task_deadline",
      title: heading,
      body: task.title,
      taskId: task.id,
    });
    sent++;
  }
  return { sent };
}

// ---------------- evening report ----------------

/** Evening digest for owners/admins: what was created today in each of their workspaces. */
export async function runEveningReport(): Promise<{ sent: number }> {
  const db = await admin();
  const today = localDateString();
  const sinceUtc = new Date(new Date(`${today}T00:00:00.000Z`).getTime() - BISHKEK_OFFSET_HOURS * 3600_000).toISOString();

  const { data: links } = await db
    .from("telegram_links")
    .select("user_id, chat_id")
    .not("chat_id", "is", null);

  const { sendMessage } = await tgApi();
  let sent = 0;

  for (const link of links ?? []) {
    const { data: memberships } = await db
      .from("teamspace_members")
      .select("teamspace_id, role")
      .eq("user_id", link.user_id)
      .in("role", ["owner", "admin"]);
    const spaceIds = (memberships ?? []).map((m) => m.teamspace_id);
    if (!spaceIds.length) continue;

    const { data: spaces } = await db.from("teamspaces").select("id, name").in("id", spaceIds);
    const blocks: string[] = [];

    for (const space of spaces ?? []) {
      const { data: created } = await db
        .from("tasks")
        .select("title, status, priority, assignee_name, due_date")
        .eq("teamspace_id", space.id)
        .eq("external_archived", false)
        .gte("created_at", sinceUtc)
        .order("created_at", { ascending: true });
      const { data: closed } = await db
        .from("tasks")
        .select("title")
        .eq("teamspace_id", space.id)
        .eq("external_archived", false)
        .eq("status", "done")
        .gte("updated_at", sinceUtc);
      const { data: review } = await db
        .from("tasks")
        .select("title, assignee_name")
        .eq("teamspace_id", space.id)
        .eq("external_archived", false)
        .eq("status", "review");

      const rows = created ?? [];
      if (!rows.length && !(closed ?? []).length && !(review ?? []).length) continue;

      const part = [`🏢 ${space.name}`];
      part.push(`Создано за день: ${rows.length}`);
      for (const r of rows.slice(0, 15)) {
        part.push(
          `• ${PRIORITY_ICON[r.priority] ?? ""} ${r.title}${r.assignee_name ? ` — ${r.assignee_name}` : ""}${r.due_date ? ` (до ${r.due_date})` : ""}`,
        );
      }
      if ((closed ?? []).length) part.push(`Закрыто: ${(closed ?? []).length}`);
      if ((review ?? []).length) {
        part.push(`🟨 Ждут вашей проверки: ${(review ?? []).length}`);
        for (const r of (review ?? []).slice(0, 10)) {
          part.push(`• ${r.title}${r.assignee_name ? ` — ${r.assignee_name}` : ""}`);
        }
      }
      blocks.push(part.join("\n"));
    }

    if (!blocks.length) continue;
    await sendMessage(Number(link.chat_id), `🌆 Вечерний отчёт за ${today}\n\n${blocks.join("\n\n")}`);
    sent++;
  }
  return { sent };
}

// ---------------- submit / review ----------------

export async function submitTaskProof(input: {
  taskId: string;
  assigneeId: string;
  proofUrl?: string | null;
  proofNote?: string | null;
}): Promise<TaskRow | null> {
  const db = await admin();
  const { data: sourceTask } = await db.from("tasks").select("external_source").eq("id", input.taskId).maybeSingle();
  if (sourceTask?.external_source === "yougile") {
    const { updateYouGileTaskStatus } = await import("./yougile.server");
    await updateYouGileTaskStatus(input.taskId, "review", input.assigneeId);
  }
  const { data: task } = await db
    .from("tasks")
    .update({
      status: "review",
      proof_url: input.proofUrl ?? null,
      proof_note: input.proofNote ?? null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", input.taskId)
    .select("id, title, status, priority, due_date, assignee_id, assignee_name, user_id, teamspace_id, proof_url, proof_note")
    .maybeSingle();
  if (!task) return null;

  const row = task as TaskRow;
  const approverId = await approverFor(row);
  const who = row.assignee_name || "Сотрудник";
  const body = [
    `${who} сдал(а) задачу на проверку.`,
    "",
    taskCard(row),
    row.proof_note ? `Комментарий: ${row.proof_note}` : null,
    row.proof_url ? `Пруф: ${row.proof_url}` : null,
  ]
    .filter((x) => x !== null)
    .join("\n");

  const chatId = await chatIdFor(approverId);
  if (chatId) {
    const { sendMessage } = await tgApi();
    await sendMessage(chatId, `🟨 Задача на проверке\n\n${body}`, {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Принять", callback_data: `approve:${row.id}` },
          { text: "↩️ На доработку", callback_data: `rework:${row.id}` },
        ]],
      },
    });
  }
  await notifyInApp({
    userId: approverId,
    teamspaceId: row.teamspace_id,
    kind: "task_review",
    title: "Задача сдана на проверку",
    body,
    taskId: row.id,
    actorId: input.assigneeId,
  });
  return row;
}

export async function decideTask(input: {
  taskId: string;
  reviewerId: string;
  decision: "approve" | "rework";
  comment?: string | null;
}): Promise<TaskRow | null> {
  const db = await admin();
  const { data: sourceTask } = await db.from("tasks").select("external_source").eq("id", input.taskId).maybeSingle();
  if (sourceTask?.external_source === "yougile") {
    const { updateYouGileTaskStatus } = await import("./yougile.server");
    await updateYouGileTaskStatus(input.taskId, input.decision === "approve" ? "done" : "in_progress", input.reviewerId);
  }
  const { data: task } = await db
    .from("tasks")
    .update({
      status: input.decision === "approve" ? "done" : "in_progress",
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.reviewerId,
    })
    .eq("id", input.taskId)
    .select("id, title, status, priority, due_date, assignee_id, assignee_name, user_id, teamspace_id, proof_url, proof_note")
    .maybeSingle();
  if (!task) return null;
  const row = task as TaskRow;

  const { displayName } = await import("./notifications.server");
  const reviewer = await displayName(input.reviewerId).catch(() => "Руководитель");
  const heading = input.decision === "approve" ? "✅ Задача принята" : "↩️ Задача возвращена на доработку";
  const body = [
    taskCard(row),
    `Проверил: ${reviewer}`,
    input.comment ? `Комментарий: ${input.comment}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const chatId = await chatIdFor(row.assignee_id);
  if (chatId) {
    const { sendMessage } = await tgApi();
    await sendMessage(chatId, `${heading}\n\n${body}`, {
      reply_markup: input.decision === "rework" ? assigneeKeyboard(row.id, row.status) : undefined,
    });
  }
  await notifyInApp({
    userId: row.assignee_id,
    teamspaceId: row.teamspace_id,
    kind: input.decision === "approve" ? "task_approved" : "task_rework",
    title: heading,
    body,
    taskId: row.id,
    actorId: input.reviewerId,
  });
  return row;
}

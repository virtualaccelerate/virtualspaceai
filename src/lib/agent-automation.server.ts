/**
 * Agent automation: duplicate-safe task creation from AI replies, direct
 * messages with follow-ups, and recurring actions executed by the cron sweep.
 *
 * Tokens emitted by the AI (web chat and Telegram):
 *   [[message:recipient||text||followupISO]]            send now (+ optional follow-up)
 *   [[recurring:recipient||text||schedule||time||taskId]] schedule = once|hourly|daily|weekdays|weekly,
 *                                                        time = HH:MM (Bishkek) or ISO datetime for once
 */

const OFFSET_MS = 6 * 3600_000; // Asia/Bishkek
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type Schedule = "once" | "hourly" | "daily" | "weekdays" | "weekly";
const SCHEDULES: Schedule[] = ["once", "hourly", "daily", "weekdays", "weekly"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------------- duplicates ----------------

export function normTitle(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function words(s: string) {
  return new Set(normTitle(s).split(" ").filter((w) => w.length > 3).map((w) => w.slice(0, 5)));
}

export function isDuplicateTitle(a: string, b: string) {
  const na = normTitle(a);
  const nb = normTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = words(a);
  const wb = words(b);
  if (wa.size < 2 || wb.size < 2) return false;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter) >= 0.75;
}

export async function findDuplicateTask(teamspaceId: string | null, title: string, extra: string[] = []) {
  if (extra.some((t) => isDuplicateTitle(t, title))) return { id: null as string | null, title };
  if (!teamspaceId) return null;
  const db = await admin();
  const { data } = await db
    .from("tasks")
    .select("id, title")
    .eq("teamspace_id", teamspaceId)
    .neq("status", "done")
    .eq("external_archived", false)
    .order("created_at", { ascending: false })
    .limit(1000);
  const hit = (data ?? []).find((t) => isDuplicateTitle(t.title, title));
  return hit ? { id: hit.id as string | null, title: hit.title as string } : null;
}

/** Drop [[task:...]] tokens that duplicate open tasks or each other. */
export async function dedupeTaskTokens(reply: string, teamspaceId: string | null) {
  const skipped: string[] = [];
  const seen: string[] = [];
  const re = /\[\[task:([^\]]+)\]\]/g;
  const tokens = [...reply.matchAll(re)];
  let out = reply;
  for (const m of tokens) {
    const title = (m[1].split("||")[0] ?? "").trim();
    if (!title) continue;
    const dup = await findDuplicateTask(teamspaceId, title, seen);
    if (dup) {
      skipped.push(dup.title);
      out = out.replace(m[0], "");
    } else {
      seen.push(title);
    }
  }
  if (skipped.length) {
    out = `${out.trim()}\n\nУже есть, не создаю повторно: ${[...new Set(skipped)].join("; ")}`;
  }
  return { reply: out, skipped };
}

// ---------------- scheduling ----------------

function local(d: Date) {
  return new Date(d.getTime() + OFFSET_MS);
}

function parseHm(time: string | null | undefined): [number, number] {
  const m = /^(\d{1,2}):(\d{2})/.exec((time ?? "").trim());
  if (!m) return [10, 0];
  return [Math.min(23, Number(m[1])), Math.min(59, Number(m[2]))];
}

/** Next execution strictly after `after`. Returns null when a one-off already ran. */
export function nextRun(schedule: Schedule, time: string | null, after: Date, firstRun = false): Date | null {
  if (schedule === "once") {
    if (!firstRun) return null;
    if (time && /\d{4}-\d{2}-\d{2}T/.test(time)) {
      const d = new Date(time);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const [h, min] = parseHm(time);
  if (schedule === "hourly") {
    const d = new Date(after.getTime());
    d.setUTCMinutes(min, 0, 0);
    if (d <= after) d.setUTCHours(d.getUTCHours() + 1);
    return d;
  }
  const l = local(after);
  const candidate = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), h, min) - OFFSET_MS);
  const step = schedule === "weekly" && !firstRun ? 7 : 1;
  let d = candidate;
  if (schedule === "weekly" && !firstRun) d = new Date(candidate.getTime() + 7 * 86400_000);
  while (d <= after) d = new Date(d.getTime() + step * 86400_000);
  if (schedule === "weekdays") {
    while ([0, 6].includes(local(d).getUTCDay())) d = new Date(d.getTime() + 86400_000);
  }
  return d;
}

// ---------------- delivery ----------------

type Member = { id: string; name: string; email: string | null };

async function teamRoster(teamspaceId: string): Promise<Member[]> {
  const db = await admin();
  const { data: members } = await db.from("teamspace_members").select("user_id").eq("teamspace_id", teamspaceId);
  const ids = (members ?? []).map((m) => m.user_id);
  if (!ids.length) return [];
  const { data: profs } = await db.from("profiles").select("id, full_name, email").in("id", ids);
  return (profs ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email || "", email: p.email }));
}

async function resolveRecipient(raw: string, teamspaceId: string, senderId: string) {
  const roster = await teamRoster(teamspaceId);
  const s = raw.trim();
  if (!s || /^(я|мне|me|myself|себе)$/i.test(s)) return roster.find((m) => m.id === senderId) ?? null;
  if (UUID.test(s)) return roster.find((m) => m.id === s) ?? null;
  const { matchMember } = await import("./task-import.server");
  return matchMember(s, roster);
}

async function nameOf(userId: string) {
  const db = await admin();
  const { data } = await db.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return data?.full_name || data?.email || "Коллега";
}

/** Send a message to a workspace member: Telegram (if linked) + in-app notification. */
export async function deliver(input: {
  userId: string;
  teamspaceId: string;
  actorId: string;
  title: string;
  body: string;
  taskId?: string | null;
}) {
  const db = await admin();
  const actorName = await nameOf(input.actorId);
  await db.from("notifications").insert({
    user_id: input.userId,
    teamspace_id: input.teamspaceId,
    kind: "agent_message",
    title: input.title,
    body: input.body,
    actor_id: input.actorId,
    actor_name: actorName,
    task_id: input.taskId ?? null,
  });
  const { data: link } = await db
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", input.userId)
    .not("chat_id", "is", null)
    .maybeSingle();
  let telegram = false;
  if (link?.chat_id) {
    const { sendMessage } = await import("./telegram.server");
    const extra: Record<string, unknown> = {};
    if (input.taskId) {
      const { data: task } = await db.from("tasks").select("status").eq("id", input.taskId).maybeSingle();
      const { assigneeKeyboard } = await import("./task-flow.server");
      const kb = task ? assigneeKeyboard(input.taskId, task.status) : undefined;
      if (kb) extra["reply_markup"] = kb;
    }
    await sendMessage(Number(link.chat_id), `${input.title}\n\n${input.body}\n\n— ${actorName}`, extra);
    telegram = true;
  }
  return { telegram };
}

// ---------------- token execution ----------------

export async function executeAgentTokens(reply: string, ctx: { userId: string; teamspaceId: string | null }) {
  const results: string[] = [];
  let out = reply;
  const db = await admin();

  for (const m of [...reply.matchAll(/\[\[message:([^\]]+)\]\]/g)]) {
    out = out.replace(m[0], "");
    const [recipientRaw = "", text = "", followRaw = ""] = m[1].split("||").map((x) => x.trim());
    if (!ctx.teamspaceId || !text) continue;
    const to = await resolveRecipient(recipientRaw, ctx.teamspaceId, ctx.userId);
    if (!to) { results.push(`⚠️ Не нашёл в команде: ${recipientRaw}`); continue; }
    try {
      const { telegram } = await deliver({ userId: to.id, teamspaceId: ctx.teamspaceId, actorId: ctx.userId, title: "💬 Сообщение", body: text });
      results.push(`✅ Отправлено ${to.name}${telegram ? " (Telegram + приложение)" : " (в приложении)"}`);
      const followAt = followRaw ? new Date(followRaw) : null;
      if (followAt && !Number.isNaN(followAt.getTime()) && followAt.getTime() > Date.now()) {
        await db.from("agent_automations").insert({
          teamspace_id: ctx.teamspaceId, created_by: ctx.userId, target_user_id: to.id, target_name: to.name,
          kind: "followup", message: text, schedule: "once", run_time: followAt.toISOString(), next_run_at: followAt.toISOString(),
        });
        results.push(`⏰ Follow-up для ${to.name}: ${local(followAt).toISOString().slice(0, 16).replace("T", " ")}`);
      }
    } catch (e) {
      results.push(`⚠️ Не удалось отправить ${to.name}: ${e instanceof Error ? e.message.slice(0, 120) : e}`);
    }
  }

  for (const m of [...reply.matchAll(/\[\[recurring:([^\]]+)\]\]/g)]) {
    out = out.replace(m[0], "");
    const [recipientRaw = "", text = "", schedRaw = "", time = "", taskRaw = ""] = m[1].split("||").map((x) => x.trim());
    if (!ctx.teamspaceId || !text) continue;
    const schedule = (SCHEDULES.includes(schedRaw as Schedule) ? schedRaw : "daily") as Schedule;
    const to = await resolveRecipient(recipientRaw, ctx.teamspaceId, ctx.userId);
    if (!to) { results.push(`⚠️ Не нашёл в команде: ${recipientRaw}`); continue; }
    let taskId: string | null = null;
    if (UUID.test(taskRaw)) {
      const { data: t } = await db.from("tasks").select("id").eq("id", taskRaw).eq("teamspace_id", ctx.teamspaceId).maybeSingle();
      taskId = t?.id ?? null;
    }
    const next = nextRun(schedule, time || null, new Date(), true);
    if (!next) { results.push("⚠️ Не понял время напоминания"); continue; }
    const { error } = await db.from("agent_automations").insert({
      teamspace_id: ctx.teamspaceId, created_by: ctx.userId, target_user_id: to.id, target_name: to.name,
      kind: schedule === "once" ? "reminder" : "recurring", message: text, task_id: taskId,
      schedule, run_time: time || null, next_run_at: next.toISOString(),
    });
    if (error) { results.push(`⚠️ ${error.message}`); continue; }
    const label: Record<Schedule, string> = { once: "один раз", hourly: "каждый час", daily: "каждый день", weekdays: "по будням", weekly: "каждую неделю" };
    results.push(`🔁 Автоматизация: ${label[schedule]} → ${to.name}, ближайший запуск ${local(next).toISOString().slice(0, 16).replace("T", " ")}`);
  }

  if (results.length) out = `${out.trim()}\n\n${results.join("\n")}`.trim();
  return { reply: out, results };
}

// ---------------- cron runner ----------------

/** Executes due automations. Bounded per run; each row is claimed before it runs. */
export async function runDueAutomations(limit = 50) {
  const db = await admin();
  const now = new Date();
  const { data: due } = await db
    .from("agent_automations")
    .select("*")
    .eq("active", true)
    .lte("next_run_at", now.toISOString())
    .order("next_run_at")
    .limit(limit);
  let ran = 0;
  let failed = 0;
  for (const row of due ?? []) {
    const next = nextRun(row.schedule as Schedule, row.run_time, now);
    // Claim: only one sweep can move next_run_at forward.
    const { data: claimed } = await db
      .from("agent_automations")
      .update({ next_run_at: next?.toISOString() ?? null, active: !!next, last_run_at: now.toISOString(), runs: row.runs + 1 })
      .eq("id", row.id)
      .eq("next_run_at", row.next_run_at as string)
      .select("id");
    if (!claimed?.length) continue;
    try {
      let body = row.message as string;
      if (row.task_id) {
        const { data: task } = await db.from("tasks").select("title, status, due_date").eq("id", row.task_id).maybeSingle();
        if (!task || task.status === "done") {
          await db.from("agent_automations").update({ active: false, last_error: "task done" }).eq("id", row.id);
          continue;
        }
        body = `${body}\n\n📌 ${task.title}${task.due_date ? ` · дедлайн ${task.due_date}` : ""}`;
      }
      const target = row.target_user_id ?? row.created_by;
      const title = row.kind === "followup" ? "🔔 Follow-up" : row.kind === "reminder" ? "⏰ Напоминание" : "🔁 Автоматическое напоминание";
      await deliver({ userId: target, teamspaceId: row.teamspace_id, actorId: row.created_by, title, body, taskId: row.task_id });
      if (row.kind === "followup" && target !== row.created_by) {
        await deliver({ userId: row.created_by, teamspaceId: row.teamspace_id, actorId: row.created_by, title: "✅ Follow-up отправлен", body: `${row.target_name ?? ""}: ${row.message}` });
      }
      await db.from("agent_automations").update({ last_error: null }).eq("id", row.id);
      ran++;
    } catch (e) {
      failed++;
      await db.from("agent_automations").update({ last_error: e instanceof Error ? e.message.slice(0, 300) : String(e) }).eq("id", row.id);
    }
  }
  return { ran, failed };
}

// ---------------- management ----------------

export async function listAutomations(userId: string, teamspaceId: string) {
  const db = await admin();
  const { data: member } = await db.from("teamspace_members").select("role").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!member) throw new Error("Нет доступа");
  let q = db.from("agent_automations").select("id, kind, message, schedule, run_time, next_run_at, last_run_at, runs, active, target_name, created_by, last_error, task_id")
    .eq("teamspace_id", teamspaceId).order("created_at", { ascending: false }).limit(100);
  if (member.role === "member") q = q.or(`created_by.eq.${userId},target_user_id.eq.${userId}`);
  const { data } = await q;
  return data ?? [];
}

export async function cancelAutomation(userId: string, id: string) {
  const db = await admin();
  const { data: row } = await db.from("agent_automations").select("created_by, teamspace_id").eq("id", id).maybeSingle();
  if (!row) return { ok: true };
  const { data: member } = await db.from("teamspace_members").select("role").eq("teamspace_id", row.teamspace_id).eq("user_id", userId).maybeSingle();
  if (row.created_by !== userId && !(member && member.role !== "member")) throw new Error("Отменить может автор или администратор");
  await db.from("agent_automations").update({ active: false }).eq("id", id);
  return { ok: true };
}

export const AGENT_AUTOMATION_PROMPT =
  "\nBULK TASKS: when the user sends a long text, meeting notes or a list, extract EVERY actionable item and emit one [[task:...]] token per item (no confirmation question for each). Skip items that already exist in the current tasks list — the system also removes duplicates automatically. If a deadline is missing for list items, use a sensible default (end of this week) instead of asking." +
  "\nMESSAGES & FOLLOW-UP: when the user asks to write/tell/send something to a teammate (\"напиши Айзе…\", \"передай Тимуру…\", \"напомни Бермет о встрече\"), emit [[message:recipientIdOrName||message text written in first person to that person||followupISO_or_empty]]. The system sends it immediately (Telegram + app). If the user wants a reminder later (\"и напомни завтра в 10\"), put that moment as ISO with +06:00 in the third field — the agent will send the follow-up itself. Do not ask permission; just confirm briefly." +
  "\nRECURRING ACTIONS: for repeating reminders or check-ins (\"каждый день в 9 спрашивай Тимура о статусе\", \"ежечасно напоминай\", \"по будням\"), emit [[recurring:recipientIdOrName||message text||once|hourly|daily|weekdays|weekly||HH:MM or ISO for once||taskIdOrEmpty]]. The agent executes it automatically at that time (sends the message and task status), and stops by itself when the linked task is done. Use the recipient 'я' for the user themself.";

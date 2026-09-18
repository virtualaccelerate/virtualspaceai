// Server-only Telegram bot logic. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TELEGRAM_API = "https://api.telegram.org";

export function miniAppUrl(): string {
  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://ai-virtualspace.com";
  return `${base}/tg`;
}

export function botToken(): string {

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  return token;
}

function b64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function webhookSecret(token: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${token}`);
  return b64url(await crypto.subtle.digest("SHA-256", data));
}

export async function tg<T = any>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as any;
  if (!json.ok) console.error(`[telegram] ${method} failed:`, JSON.stringify(json));
  return json as T;
}

export async function sendMessage(
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
) {
  // Never send an empty message — Telegram rejects it with a 400 and the user sees silence.
  const safe = text?.trim() ? text : "✅ Готово";
  return tg("sendMessage", { chat_id: chatId, text: safe, disable_web_page_preview: true, ...extra });
}

/** Workspace names for the given ids — the bot always says where a task comes from. */
export async function spaceNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data } = await supabaseAdmin.from("teamspaces").select("id, name").in("id", unique);
  for (const row of data ?? []) map.set(row.id, row.name);
  return map;
}

export async function spaceNameOf(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const map = await spaceNames([id]);
  return map.get(id) ?? null;
}

type TaskNoticeKind = "assigned" | "updated" | "deleted";

export async function notifyTaskAssignee(input: {
  assigneeId: string | null;
  actorId: string;
  actorName?: string | null;
  kind: TaskNoticeKind;
  title: string;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  taskId?: string | null;
  teamspaceId?: string | null;
}) {
  if (!input.assigneeId || input.assigneeId === input.actorId) return false;
  const [{ data: link }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("telegram_links").select("chat_id, language").eq("user_id", input.assigneeId).not("chat_id", "is", null).maybeSingle(),
    supabaseAdmin.from("profiles").select("email").eq("id", input.assigneeId).maybeSingle(),
  ]);
  if (!profile?.email || !link?.chat_id) return false;

  const lang = pickLang(link.language);
  const heading = lang === "en"
    ? input.kind === "assigned" ? "📌 A task was assigned to you" : input.kind === "deleted" ? "🗑 Task deleted" : "✏️ Task updated"
    : input.kind === "assigned" ? "📌 Вам назначена задача" : input.kind === "deleted" ? "🗑 Задача удалена" : "✏️ Задача обновлена";
  const when = new Date().toLocaleString(lang === "en" ? "en-GB" : "ru-RU", {
    timeZone: "Asia/Bishkek",
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const space = await spaceNameOf(input.teamspaceId).catch(() => null);
  const details = [
    space ? `${lang === "en" ? "Workspace" : "Пространство"}: ${space}` : null,
    input.title,
    input.actorName ? `${lang === "en" ? "By" : "Кто"}: ${input.actorName}` : null,
    `${lang === "en" ? "When" : "Когда"}: ${when}`,
    input.status ? `${lang === "en" ? "Status" : "Статус"}: ${statusTag(input.status, lang)}` : null,
    input.priority ? `${lang === "en" ? "Priority" : "Приоритет"}: ${input.priority}` : null,
    input.dueDate ? `${lang === "en" ? "Due" : "Срок"}: ${input.dueDate}` : null,
  ].filter(Boolean);
  let reply_markup: Record<string, unknown> | undefined;
  if (input.taskId && input.kind !== "deleted") {
    const { assigneeKeyboard } = await import("./task-flow.server");
    reply_markup = assigneeKeyboard(input.taskId, input.status ?? "backlog");
  }
  const response = await sendMessage(Number(link.chat_id), `${heading}\n\n${details.join("\n")}`, {
    ...(reply_markup ? { reply_markup } : {}),
  }) as { ok?: boolean };
  return response.ok === true;
}


// ---------------- i18n (ru default / en) ----------------
type Lang = "ru" | "en";
const T = {
  ru: {
    needLink:
      "Привет! Это бот Virtual Space.\n\nЧтобы связать Telegram с вашим аккаунтом, откройте раздел «Телеграм» в веб-приложении и отправьте сюда команду:\n/start ВАШ_КОД",
    badCode: "Код не найден или уже использован. Получите новый код в разделе «Телеграм» в веб-приложении.",
    linked: (n: string) => `Готово! Аккаунт ${n} привязан. Напишите /help, чтобы увидеть команды.`,
    help:
      "Что я умею:\n\n" +
      "/tasks — активные задачи и смена статуса\n" +
      "/today — задачи на сегодня и ближайшие дедлайны\n" +
      "/new Название задачи — создать задачу\n" +
      "/done Название — отметить задачу выполненной\n" +
      "/report day | week | month — отчёт за период\n" +
      "/unlink — отвязать Telegram\n\n" +
      "Любое обычное сообщение — вопрос AI-ассистенту Virtual Space (он видит вашу базу знаний и задачи).",
    noTasks: "Активных задач нет 🎉",
    tasksHeader: "Ваши активные задачи:",
    created: (t: string) => `Задача создана: ${t}`,
    needTitle: "Укажите название: /new Позвонить клиенту",
    notFound: "Задача не найдена.",
    doneOk: (t: string) => `Готово ✅ ${t}`,
    statusSet: (t: string, s: string) => `${t} → ${s}`,
    unlinked: "Telegram отвязан. Чтобы снова подключить — отправьте /start КОД.",
    reportTitle: (p: string) => `Отчёт за ${p}`,
    day: "день",
    week: "неделю",
    month: "месяц",
    stats: (c: number, d: number, o: number) =>
      `Создано: ${c}\nЗавершено: ${d}\nВ работе сейчас: ${o}`,
    thinking: "Думаю…",
    error: "Что-то пошло не так. Попробуйте ещё раз.",
  },
  en: {
    needLink:
      "Hi! This is the Virtual Space bot.\n\nTo connect Telegram to your account, open the “Telegram” page in the web app and send:\n/start YOUR_CODE",
    badCode: "Code not found or already used. Get a fresh code on the Telegram page in the web app.",
    linked: (n: string) => `Done! Account ${n} is linked. Send /help to see the commands.`,
    help:
      "What I can do:\n\n" +
      "/tasks — open tasks and status changes\n" +
      "/today — today's tasks and upcoming deadlines\n" +
      "/new Task title — create a task\n" +
      "/done Title — mark a task done\n" +
      "/report day | week | month — period report\n" +
      "/unlink — disconnect Telegram\n\n" +
      "Any plain message goes to the Virtual Space AI assistant (it sees your knowledge base and tasks).",
    noTasks: "No open tasks 🎉",
    tasksHeader: "Your open tasks:",
    created: (t: string) => `Task created: ${t}`,
    needTitle: "Add a title: /new Call the client",
    notFound: "Task not found.",
    doneOk: (t: string) => `Done ✅ ${t}`,
    statusSet: (t: string, s: string) => `${t} → ${s}`,
    unlinked: "Telegram disconnected. Send /start CODE to connect again.",
    reportTitle: (p: string) => `Report for the ${p}`,
    day: "day",
    week: "week",
    month: "month",
    stats: (c: number, d: number, o: number) =>
      `Created: ${c}\nCompleted: ${d}\nIn progress now: ${o}`,
    thinking: "Thinking…",
    error: "Something went wrong. Please try again.",
  },
} as const;

const t = (lang: Lang) => T[lang];
const pickLang = (l?: string | null): Lang => (l === "en" ? "en" : "ru");
const bishkekDate = (date = new Date()) =>
  new Date(date.getTime() + 6 * 3600_000).toISOString().slice(0, 10);

const STATUS_LABEL: Record<string, Record<Lang, string>> = {
  backlog: { ru: "Бэклог", en: "Backlog" },
  in_progress: { ru: "В работе", en: "In progress" },
  review: { ru: "На проверке", en: "Review" },
  done: { ru: "Готово", en: "Done" },
};
// Цвет статуса задачи (совпадает с цветами колонок в веб-приложении)
const STATUS_ICON: Record<string, string> = {
  backlog: "⬜️",
  in_progress: "🟪",
  review: "🟨",
  done: "🟩",
};
const statusTag = (status: string, lang: Lang) =>
  `${STATUS_ICON[status] ?? "⬜️"} ${STATUS_LABEL[status]?.[lang] ?? status}`;

const PRIORITY_ICON: Record<string, string> = {
  low: "⚪️",
  medium: "🔵",
  high: "🟠",
  urgent: "🔴",
};

type Link = {
  user_id: string;
  teamspace_id: string | null;
  chat_id: number | null;
  language: string | null;
  pending_proof_task_id?: string | null;
};

async function findLink(chatId: number): Promise<Link | null> {
  const { data } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id, teamspace_id, chat_id, language, pending_proof_task_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return (data as Link) ?? null;
}

// ---------------- commands ----------------

async function handleStart(chatId: number, arg: string, username: string | null) {
  const code = arg.trim();
  if (!code) {
    const existing = await findLink(chatId);
    const lang = pickLang(existing?.language);
    await sendMessage(chatId, existing ? t(lang).help : t("ru").needLink);
    return;
  }
  const { data: row } = await supabaseAdmin
    .from("telegram_links")
    .select("id, user_id, chat_id, language")
    .eq("link_code", code)
    .maybeSingle();
  if (!row) {
    await sendMessage(chatId, t("ru").badCode);
    return;
  }
  await supabaseAdmin
    .from("telegram_links")
    .update({ chat_id: chatId, telegram_username: username, linked_at: new Date().toISOString() })
    .eq("id", (row as any).id);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, language")
    .eq("id", (row as any).user_id)
    .maybeSingle();
  const lang = pickLang((profile as any)?.language ?? (row as any).language);
  await sendMessage(
    chatId,
    t(lang).linked((profile as any)?.full_name || (profile as any)?.email || ""),
    { reply_markup: mainMenuKeyboard(lang) },
  );
}

function tasksKeyboard(tasks: any[], lang: Lang) {
  return {
    inline_keyboard: tasks.slice(0, 8).map((task) => [
      {
        text: `${STATUS_ICON[task.status] ?? "⬜️"} ${task.title.slice(0, 24)}`,
        callback_data: `cycle:${task.id}`,
      },
      { text: `✅`, callback_data: `done:${task.id}` },
    ]),
  };
}

async function handleTasks(link: Link, chatId: number, lang: Lang) {
  const { data } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, priority, due_date, teamspace_id")
    .or(`user_id.eq.${link.user_id},assignee_id.eq.${link.user_id}`)
    .neq("status", "done")
    .eq("external_archived", false)
    .order("position", { ascending: true })
    .limit(30);
  const tasks = (data as any[]) ?? [];
  if (!tasks.length) {
    await sendMessage(chatId, t(lang).noTasks);
    return;
  }
  const names = await spaceNames(tasks.map((x) => x.teamspace_id));
  const noSpace = lang === "en" ? "Personal" : "Личные";
  const groups = new Map<string, any[]>();
  for (const task of tasks) {
    const label = names.get(task.teamspace_id ?? "") ?? noSpace;
    groups.set(label, [...(groups.get(label) ?? []), task]);
  }
  const order = ["in_progress", "review", "backlog"];
  const body = Array.from(groups.entries())
    .map(([space, list]) => {
      const inner = order
        .filter((s) => list.some((task) => task.status === s))
        .map((s) => {
          const rows = list
            .filter((task) => task.status === s)
            .map(
              (task) =>
                `${STATUS_ICON[s] ?? "⬜️"} ${PRIORITY_ICON[task.priority] ?? ""} ${task.title}${
                  task.due_date ? ` (${lang === "en" ? "due" : "до"} ${task.due_date})` : ""
                }`,
            )
            .join("\n");
          return `${statusTag(s, lang)}\n${rows}`;
        })
        .join("\n\n");
      return `🏢 ${space}\n${inner}`;
    })
    .join("\n\n");
  await sendMessage(chatId, `${t(lang).tasksHeader}\n\n${body}`, {
    reply_markup: tasksKeyboard(tasks, lang),
  });
}

async function handleNew(link: Link, chatId: number, title: string, lang: Lang) {
  if (!title.trim()) {
    await sendMessage(chatId, t(lang).needTitle);
    return;
  }
  let counter = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "backlog");
  counter = link.teamspace_id
    ? counter.eq("teamspace_id", link.teamspace_id)
    : counter.eq("user_id", link.user_id);
  const { count } = await counter;
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      user_id: link.user_id,
      teamspace_id: link.teamspace_id,
      title: title.trim().slice(0, 300),
      status: "backlog",
      priority: "medium",
      position: (count ?? 0) * 1000,
    })
    .select("title, teamspace_id")
    .single();
  if (error) {
    await sendMessage(chatId, t(lang).error);
    return;
  }
  const space = await spaceNameOf((data as any).teamspace_id).catch(() => null);
  await sendMessage(
    chatId,
    `${t(lang).created((data as any).title)}${space ? `\n🏢 ${space}` : ""}`,
  );
}

async function handleDone(link: Link, chatId: number, query: string, lang: Lang) {
  if (!query.trim()) return handleTasks(link, chatId, lang);
  const { data } = await supabaseAdmin
    .from("tasks")
    .select("id, title, teamspace_id")
    .or(`user_id.eq.${link.user_id},assignee_id.eq.${link.user_id}`)
    .neq("status", "done")
    .ilike("title", `%${query.trim()}%`)
    .limit(1);
  const task = (data as any[])?.[0];
  if (!task) {
    await sendMessage(chatId, t(lang).notFound);
    return;
  }
  await supabaseAdmin.from("tasks").update({ status: "done" }).eq("id", task.id);
  const space = await spaceNameOf(task.teamspace_id).catch(() => null);
  await sendMessage(chatId, `${t(lang).doneOk(task.title)}${space ? `\n🏢 ${space}` : ""}`);
}

async function handleToday(link: Link, chatId: number, lang: Lang) {
  const today = bishkekDate();
  const soonDate = bishkekDate(new Date(Date.now() + 3 * 86400000));
  const { data } = await supabaseAdmin
    .from("tasks")
    .select("title, status, priority, due_date, teamspace_id")
    .or(`user_id.eq.${link.user_id},assignee_id.eq.${link.user_id}`)
    .neq("status", "done")
    .eq("external_archived", false)
    .order("due_date", { ascending: true });
  const rows = ((data as any[]) ?? []) as any[];
  const names = await spaceNames(rows.map((x) => x.teamspace_id));
  const fmtRow = (x: any) => {
    const space = names.get(x.teamspace_id ?? "");
    return `${STATUS_ICON[x.status] ?? "⬜️"} ${PRIORITY_ICON[x.priority] ?? ""} ${x.title}${
      x.due_date ? ` — ${x.due_date}` : ""
    }${space ? ` · 🏢 ${space}` : ""}`;
  };
  const overdue = rows.filter((x) => x.due_date && x.due_date < today);
  const dueToday = rows.filter((x) => x.due_date === today);
  const soon = rows.filter((x) => x.due_date && x.due_date > today && x.due_date <= soonDate);
  const blocks: string[] = [];
  if (overdue.length) blocks.push(`${lang === "en" ? "🔥 Overdue" : "🔥 Просрочено"}\n${overdue.map(fmtRow).join("\n")}`);
  if (dueToday.length) blocks.push(`${lang === "en" ? "📌 Today" : "📌 Сегодня"}\n${dueToday.map(fmtRow).join("\n")}`);
  if (soon.length)
    blocks.push(
      `${lang === "en" ? "⏳ Upcoming deadlines (3 days)" : "⏳ Ближайшие дедлайны (3 дня)"}\n${soon.map(fmtRow).join("\n")}`,
    );
  const header = lang === "en" ? "📅 Today's tasks" : "📅 Задачи на сегодня";
  const empty =
    lang === "en"
      ? `No deadlines today. Open tasks: ${rows.length}`
      : `На сегодня дедлайнов нет. Активных задач: ${rows.length}`;
  await sendMessage(chatId, `${header}\n\n${blocks.length ? blocks.join("\n\n") : empty}`);
}

// Period switcher shown under every report message
function reportKeyboard(lang: Lang, active: "d" | "w" | "m") {
  const mark = (k: string, label: string) => (k === active ? `• ${label}` : label);
  return {
    inline_keyboard: [[
      { text: mark("d", lang === "ru" ? "День" : "Day"), callback_data: "report:d" },
      { text: mark("w", lang === "ru" ? "Неделя" : "Week"), callback_data: "report:w" },
      { text: mark("m", lang === "ru" ? "Месяц" : "Month"), callback_data: "report:m" },
    ]],
  };
}

// Persistent bottom menu so the report is always one tap away
export function mainMenuKeyboard(lang: Lang) {
  return {
    keyboard: [
      [
        { text: lang === "ru" ? "📋 Задачи" : "📋 Tasks" },
        { text: lang === "ru" ? "🗓 Сегодня" : "🗓 Today" },
      ],
      [
        { text: lang === "ru" ? "➕ Новая задача" : "➕ New task" },
        { text: lang === "ru" ? "✅ Завершить" : "✅ Complete" },
      ],
      [
        { text: lang === "ru" ? "📊 Отчёт" : "📊 Report" },
        { text: lang === "ru" ? "🚀 Приложение" : "🚀 App" },
      ],
      [{ text: lang === "ru" ? "❓ Помощь" : "❓ Help" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/** Every reply keeps the button menu visible unless it carries its own inline keyboard. */
export function withMenu(lang: Lang, extra: Record<string, unknown> = {}) {
  return extra.reply_markup ? extra : { ...extra, reply_markup: mainMenuKeyboard(lang) };
}

async function handleReport(link: Link, chatId: number, periodArg: string, lang: Lang) {
  const arg = periodArg.trim().toLowerCase();
  const days = arg.startsWith("m") || arg.startsWith("мес") ? 30 : arg.startsWith("w") || arg.startsWith("нед") ? 7 : 1;
  const label = days === 30 ? t(lang).month : days === 7 ? t(lang).week : t(lang).day;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [createdRes, doneRes, openRes] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select("title, priority, created_at")
      .eq("user_id", link.user_id)
      .gte("created_at", since),
    supabaseAdmin
      .from("tasks")
      .select("title, updated_at")
      .eq("user_id", link.user_id)
      .eq("status", "done")
      .gte("updated_at", since),
    supabaseAdmin
      .from("tasks")
      .select("title, status, priority, due_date")
      .eq("user_id", link.user_id)
      .neq("status", "done"),
  ]);
  const created = (createdRes.data as any[]) ?? [];
  const completed = (doneRes.data as any[]) ?? [];
  const open = (openRes.data as any[]) ?? [];

  let text = `📊 ${t(lang).reportTitle(label)}\n\n${t(lang).stats(created.length, completed.length, open.length)}`;
  if (completed.length) {
    text += `\n\n✅ ${completed.slice(0, 10).map((x) => x.title).join("\n✅ ")}`;
  }
  if (open.length) {
    text += `\n\n🕒 ${open
      .slice(0, 10)
      .map((x) => `${PRIORITY_ICON[x.priority] ?? ""} ${x.title}`)
      .join("\n🕒 ")}`;
  }

  const summary = await aiSummary(
    lang,
    `Данные за период (${label}). Создано: ${created.length}. Завершено: ${completed.length}. Открытые задачи: ${open
      .map((x) => `${x.title} [${x.status}/${x.priority}${x.due_date ? `/до ${x.due_date}` : ""}]`)
      .slice(0, 25)
      .join("; ")}`,
  );
  if (summary) text += `\n\n🧠 ${summary}`;

  await sendMessage(chatId, text, {
    reply_markup: reportKeyboard(lang, days === 30 ? "m" : days === 7 ? "w" : "d"),
  });
}

async function aiSummary(lang: Lang, facts: string): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              lang === "en"
                ? `You are a concise business assistant. Today is ${bishkekDate()} in Asia/Bishkek. This date is authoritative. Summarize the period in 2-3 sentences and give 1-2 recommendations. Plain text, no markdown.`
                : `Ты краткий бизнес-ассистент. Сегодня ${bishkekDate()} по часовому поясу Бишкека. Эта дата точная. Подведи итог периода в 2-3 предложениях и дай 1-2 рекомендации. Обычный текст, без markdown.`,
          },
          { role: "user", content: facts },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    return (json?.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch {
    return null;
  }
}

// ---------------- AI chat ----------------

async function handleAiMessage(link: Link, chatId: number, text: string, lang: Lang) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    await sendMessage(chatId, t(lang).error);
    return;
  }
  await tg("sendChatAction", { chat_id: chatId, action: "typing" });

  // All workspaces of the user — the agent picks the right one from the message
  const { data: memRows } = await supabaseAdmin
    .from("teamspace_members")
    .select("teamspace_id")
    .eq("user_id", link.user_id);
  const spaceIds = Array.from(new Set(((memRows as any[]) ?? []).map((m) => m.teamspace_id)));
  if (link.teamspace_id && !spaceIds.includes(link.teamspace_id)) spaceIds.push(link.teamspace_id);
  const spaceMap = await spaceNames(spaceIds).catch(() => new Map<string, string>());
  const defaultSpaceId = link.teamspace_id ?? spaceIds[0] ?? null;

  const [tasksRes, docsRes, histRes] = await Promise.all([
    spaceIds.length
      ? supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee_name, project, department, teamspace_id")
          .in("teamspace_id", spaceIds)
          .neq("status", "done")
          .limit(80)
      : supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee_name, project, department, teamspace_id")
          .eq("user_id", link.user_id)
          .is("teamspace_id", null)
          .neq("status", "done")
          .limit(80),
    spaceIds.length
      ? supabaseAdmin
          .from("documents")
          .select("name, extracted_text")
          .in("teamspace_id", spaceIds)
          .limit(8)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", link.user_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const tasks = ((tasksRes.data as any[]) ?? [])
    .map(
      (x) =>
        `- id=${x.id} "${x.title}" [${x.status}/${x.priority}${x.due_date ? `/до ${x.due_date}` : ""}${x.assignee_name ? `/${x.assignee_name}` : "/без ответственного"}${x.project ? `/проект ${x.project}` : ""}${x.department ? `/${x.department}` : ""}/пространство "${spaceMap.get(x.teamspace_id) ?? "личное"}"]`,
    )
    .join("\n");

  // Team members across all workspaces, so the agent can assign by name
  let teamBlock = "";
  if (spaceIds.length) {
    const { data: members } = await supabaseAdmin
      .from("teamspace_members")
      .select("user_id, role, teamspace_id")
      .in("teamspace_id", spaceIds);
    const ids = Array.from(new Set(((members as any[]) ?? []).map((m) => m.user_id)));
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      teamBlock = ((members as any[]) ?? [])
        .map((m) => {
          const p = ((profs as any[]) ?? []).find((x) => x.id === m.user_id);
          return `- id=${m.user_id} name="${p?.full_name || p?.email || "Без имени"}" role=${m.role} space="${spaceMap.get(m.teamspace_id) ?? ""}"`;
        })
        .join("\n");
    }
  }
  const spacesBlock = spaceIds.length
    ? "\n\nWORKSPACES (the user's workspaces):\n" +
      spaceIds
        .map((id) => `- id=${id} name="${spaceMap.get(id) ?? id}"${id === defaultSpaceId ? " (default)" : ""}`)
        .join("\n")
    : "";
  const docs = ((docsRes as any).data as any[] ?? [])
    .map((d) => `### ${d.name}\n${(d.extracted_text ?? "").slice(0, 3000)}`)
    .join("\n\n");
  const history = (((histRes.data as any[]) ?? []).reverse() as any[]).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content).slice(0, 4000),
  }));

  const system =
    (lang === "en"
      ? "You are Virtual Space, the user's AI business assistant, answering inside Telegram. Answer in the user's language, plain text only (no markdown symbols), short and practical."
      : "Ты Virtual Space — AI-ассистент бизнеса пользователя, отвечаешь в Telegram. Отвечай на языке пользователя, обычным текстом без markdown, кратко и по делу.") +
    `\nCURRENT DATE: ${bishkekDate()} in Asia/Bishkek (UTC+6). This is authoritative. Never infer today's date from message history or model knowledge.` +
    "\nYou are the task agent of the user's workspaces. From a plain sentence infer title, assignee, project, department, priority, deadline, a short description and the WORKSPACE the task belongs to." +
    "\nTo create a task, emit a line [[task:Title||priority||YYYY-MM-DD||description||assigneeIdOrName||project||department||workspaceIdOrName]] (priority low|medium|high|urgent; due date is required and cannot be earlier than CURRENT DATE; empty fields stay empty)." +
    "\nWorkspace field (8th): the id or exact name from WORKSPACES. Whenever the message names a workspace (\"для воркспейса X\", \"воркспейс: X\", \"в пространстве X\"), you MUST put that workspace's id there — never fall back to the default. If not mentioned use the default workspace." +
    "\nTitle must contain ONLY the work itself: never include the workspace name or phrases like \"для воркспейса …\", \"воркспейс: …\", and never append the workspace with a dash." +
    "\nTo change an existing task, emit [[task-update:TASK_ID||field=value||field=value]] — fields: title, priority, due_date, status (backlog|in_progress|review|done), assignee (member id), project, department, description. Take TASK_ID from OPEN TASKS (each task is labelled with its workspace)." +
    "\nSTATUS CHANGES ARE MANDATORY TOKENS: whenever the user says a task is started, in progress, finished, done, closed, ready, sent for review, or should go back to backlog — immediately emit [[task-update:TASK_ID||status=...]] for the matching task from OPEN TASKS. Wording: сделал/готово/выполнил/закрыл/завершил = done; начал/в работе/делаю = in_progress; на проверку/на ревью = review; вернуть/в бэклог = backlog. Never answer that you changed the status without emitting the token. Match the task by title even if worded loosely; only if several open tasks match equally, ask one short question naming them." +
    "\nAssignee field: ALWAYS the member id from TEAM MEMBERS when the person has an account; make sure the member belongs to the chosen workspace. Priority wording: срочно/горит/ASAP = urgent, важно/высокий = high, обычная = medium, не срочно = low." +
    "\nWhen CREATING a task, if the title, assignee or deadline cannot be inferred confidently, do NOT emit a create token — ask one short clarifying question instead. This rule never applies to updates: updates only need the task id and the changed field." +
    "\nQuestions about a person's tasks are answered from OPEN TASKS: list their open tasks with status, deadline and workspace." +

    (teamBlock ? `\n\nTEAM MEMBERS (resolve the named person to one of these ids):\n${teamBlock}` : "") +
    spacesBlock +
    (tasks ? `\n\nOPEN TASKS:\n${tasks}` : "") +
    (docs ? `\n\nKNOWLEDGE BASE:\n${docs.slice(0, 12000)}` : "");

  let reply = "";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...history, { role: "user", content: text }],
      }),
    });
    const json = (await res.json()) as any;
    reply = (json?.choices?.[0]?.message?.content ?? "").trim();
  } catch {
    reply = "";
  }
  if (!reply) {
    await sendMessage(chatId, t(lang).error);
    return;
  }

  // Execute [[task:...]] and [[task-update:...]] tokens
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const taskRe = /\[\[task:([^\]]+)\]\]/g;
  const updateRe = /\[\[task-update:([^\]]+)\]\]/g;
  const createdTitles: string[] = [];
  const updatedTitles: string[] = [];
  const updateErrors: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = taskRe.exec(reply))) {
    const [title, priority, due, description, assignee, project, department, space] = match[1].split("||");
    if (!title?.trim()) continue;
    const assigneeRaw = (assignee ?? "").trim();
    const assigneeId = UUID.test(assigneeRaw) ? assigneeRaw : null;
    // Resolve the workspace named in the 8th field; fall back to the message text, then the default
    const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const matchSpaceName = (raw: string): string | null => {
      const n = norm(raw);
      if (!n) return null;
      const entries = [...spaceMap.entries()];
      const exact = entries.find(([, name]) => norm(name) === n);
      if (exact) return exact[0];
      const partial = entries.find(([, name]) => n.includes(norm(name)) || norm(name).includes(n));
      return partial ? partial[0] : null;
    };
    const spaceRaw = (space ?? "").trim();
    let targetSpace = defaultSpaceId;
    let resolved = false;
    if (spaceRaw) {
      if (UUID.test(spaceRaw) && spaceMap.has(spaceRaw)) {
        targetSpace = spaceRaw;
        resolved = true;
      } else {
        const found = matchSpaceName(spaceRaw);
        if (found) {
          targetSpace = found;
          resolved = true;
        }
      }
    }
    if (!resolved) {
      // The user may have named the workspace in the message itself
      const fromText = matchSpaceName(text);
      if (fromText) targetSpace = fromText;
    }
    const targetSpaceName = targetSpace ? spaceMap.get(targetSpace) : null;
    // The model sometimes glues the workspace phrase into the title — strip it
    let cleanTitle = title
      .trim()
      .replace(/\s*(для|в)\s+(воркспейс[а-я]*|пространств[а-я]*|workspace)\s+["«]?[^,.;]*["»]?\s*$/iu, "")
      .replace(/\s*[—-]\s*$/u, "")
      .trim();
    if (!cleanTitle) cleanTitle = title.trim();
    const { data } = await supabaseAdmin
      .from("tasks")
      .insert({
        user_id: link.user_id,
        teamspace_id: targetSpace,
        title: cleanTitle.slice(0, 300),
        description: description?.trim() || null,
        status: "backlog",
        priority: (["low", "medium", "high", "urgent"] as const).includes(
          (priority?.trim() ?? "") as any,
        )
          ? (priority.trim() as "low" | "medium" | "high" | "urgent")
          : "medium",
        due_date: /^\d{4}-\d{2}-\d{2}$/.test(due?.trim() ?? "") ? due.trim() : null,
        assignee_id: assigneeId,
        assignee_name: assigneeId ? null : assigneeRaw || null,
        project: project?.trim() || null,
        department: department?.trim() || null,
        position: 0,
      })
      .select("id, title, status, priority, due_date, assignee_id")
      .single();
    if (data) {
      createdTitles.push(
        targetSpaceName ? `${(data as any).title} — ${targetSpaceName}` : (data as any).title,
      );
      if ((data as any).assignee_id) {
        const { notifyAssignment } = await import("./tasks.server");
        await notifyAssignment({
          assigneeId: (data as any).assignee_id,
          actorId: link.user_id,
          teamspaceId: targetSpace,
          kind: "assigned",
          taskId: (data as any).id,
          title: (data as any).title,
          status: (data as any).status,
          priority: (data as any).priority,
          dueDate: (data as any).due_date,
        }).catch(() => {});
      }
    }
  }
  while ((match = updateRe.exec(reply))) {
    const parts = match[1].split("||").map((p) => p.trim()).filter(Boolean);
    const taskId = parts.shift() ?? "";
    if (!UUID.test(taskId)) continue;
    const patch: Record<string, unknown> = {};
    for (const part of parts) {
      const eq = part.indexOf("=");
      if (eq < 1) continue;
      const field = part.slice(0, eq).trim().toLowerCase();
      const value = part.slice(eq + 1).trim();
      if (!value) continue;
      if (["title", "description", "project", "department"].includes(field)) patch[field] = value;
      else if (field === "priority" && ["low", "medium", "high", "urgent"].includes(value)) patch.priority = value;
      else if (field === "status" && ["backlog", "in_progress", "review", "done"].includes(value)) patch.status = value;
      else if (field === "due_date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) patch.due_date = value;
      else if (field === "assignee" && UUID.test(value)) patch.assignee_id = value;
    }
    if (!Object.keys(patch).length) continue;

    const { data: existing } = await supabaseAdmin
      .from("tasks")
      .select("id, title, external_source, teamspace_id")
      .eq("id", taskId)
      .maybeSingle();
    if (!existing) {
      updateErrors.push(lang === "en" ? "Task not found" : "Задача не найдена");
      continue;
    }
    // Only allow edits to tasks inside workspaces the sender belongs to
    const taskSpace = (existing as any).teamspace_id as string | null;
    if (!taskSpace || !spaceIds.includes(taskSpace)) {
      updateErrors.push(lang === "en" ? "Task not found" : "Задача не найдена");
      continue;
    }

    // Tasks mirrored from YouGile / Trello are managed there — push the status back
    const { isExternalTask, externalLabel, pushExternalStatus } = await import("./external-tasks.server");
    if (isExternalTask((existing as any).external_source)) {
      const tracker = externalLabel((existing as any).external_source);
      if (typeof patch.status === "string") {
        try {
          await pushExternalStatus((existing as any).external_source, taskId, patch.status as any, link.user_id);
          updatedTitles.push((existing as any).title);
        } catch (e) {
          updateErrors.push(
            `${(existing as any).title}: ${e instanceof Error ? e.message.slice(0, 120) : tracker}`,
          );
        }
      } else {
        updateErrors.push(
          `${(existing as any).title}: ${lang === "en" ? `managed in ${tracker}` : `задача из ${tracker} — правится в ${tracker}`}`,
        );
      }
      continue;
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update(patch as never)
      .eq("id", taskId)
      .select("title")
      .single();
    if (data) updatedTitles.push((data as any).title);
    else
      updateErrors.push(
        `${(existing as any).title}: ${error?.message?.slice(0, 120) ?? (lang === "en" ? "update failed" : "не удалось обновить")}`,
      );

  }
  let clean = reply.replace(taskRe, "").replace(/[*_`#]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  clean = clean.replace(updateRe, "").trim();
  if (createdTitles.length) clean += `\n\n➕ ${createdTitles.join("\n➕ ")}`;
  if (updatedTitles.length) clean += `\n\n✏️ ${updatedTitles.join("\n✏️ ")}`;
  if (updateErrors.length) clean += `\n\n⚠️ ${updateErrors.join("\n⚠️ ")}`;

  await supabaseAdmin.from("chat_messages").insert([
    { user_id: link.user_id, teamspace_id: link.teamspace_id, role: "user", content: text },
    { user_id: link.user_id, teamspace_id: link.teamspace_id, role: "assistant", content: clean },
  ]);

  const openTracker = createdTitles.length || updatedTitles.length
    ? { reply_markup: {
        inline_keyboard: [[
          {
            text: lang === "ru" ? "📋 Открыть трекер задач" : "📋 Open the task tracker",
            web_app: { url: `${miniAppUrl()}?to=/app/tasks` },
          },
        ]],
      } }
    : {};

  if (!clean.trim()) clean = lang === "en" ? "✅ Done." : "✅ Готово.";
  await sendMessage(chatId, clean.slice(0, 3800), openTracker);
}

// ---------------- callbacks ----------------

const CYCLE: Record<string, string> = {
  backlog: "in_progress",
  in_progress: "review",
  review: "done",
  done: "backlog",
};

async function handleFlowCallback(
  cb: any,
  link: Link,
  chatId: number,
  action: string,
  taskId: string,
  lang: Lang,
) {
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, assignee_id, user_id, teamspace_id, external_source")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: t(lang).notFound });
    return;
  }
  const flow = await import("./task-flow.server");
  const ack = (text: string) => tg("answerCallbackQuery", { callback_query_id: cb.id, text });

  if (action === "begin") {
    if (task.assignee_id !== link.user_id) return ack("Это не ваша задача");
    const { isExternalTask, externalLabel, pushExternalStatus } = await import("./external-tasks.server");
    if (isExternalTask(task.external_source)) {
      try {
        await pushExternalStatus(task.external_source, task.id, "in_progress", link.user_id);
      } catch (error) {
        return ack(error instanceof Error ? error.message.slice(0, 180) : `${externalLabel(task.external_source)} недоступен`);
      }
    } else {
      await supabaseAdmin.from("tasks").update({ status: "in_progress" }).eq("id", task.id);
    }
    await ack("Взято в работу");
    await sendMessage(chatId, `🟪 В работе: ${task.title}`, {
      reply_markup: flow.assigneeKeyboard(task.id, "in_progress"),
    });
    return;
  }

  if (action === "submit") {
    if (task.assignee_id !== link.user_id) return ack("Это не ваша задача");
    await supabaseAdmin
      .from("telegram_links")
      .update({ pending_proof_task_id: task.id })
      .eq("user_id", link.user_id);
    await ack("Отправьте пруф");
    await sendMessage(
      chatId,
      `📎 Сдача задачи: ${task.title}\n\nПришлите файл, скриншот или ссылку — можно с комментарием. Отмена: /cancel`,
    );
    return;
  }

  // approve / rework — only the reviewer (creator or workspace owner)
  const approverId = await flow.approverFor(task as any);
  if (approverId !== link.user_id) return ack("Решение принимает руководитель");
  const decision = action === "approve" ? "approve" : "rework";
  await flow.decideTask({ taskId: task.id, reviewerId: link.user_id, decision });
  await ack(decision === "approve" ? "Принято" : "Отправлено на доработку");
  await sendMessage(
    chatId,
    decision === "approve" ? `🟩 Принято: ${task.title}` : `↩️ На доработку: ${task.title}`,
  );
}

async function handleCallback(cb: any) {
  const chatId = cb.message?.chat?.id;
  if (!chatId) return;
  const link = await findLink(chatId);
  if (!link) return;
  const lang = pickLang(link.language);
  const [action, taskId] = String(cb.data ?? "").split(":");

  if (action === "report") {
    await tg("answerCallbackQuery", { callback_query_id: cb.id });
    const period = taskId === "m" ? "month" : taskId === "w" ? "week" : "day";
    await handleReport(link, chatId, period, lang);
    return;
  }

  // Task workflow buttons: start work, submit proof, approve / send back
  if (["begin", "submit", "approve", "rework"].includes(action)) {
    await handleFlowCallback(cb, link, chatId, action, taskId, lang);
    return;
  }

  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, external_source")
    .eq("id", taskId)
    .or(`user_id.eq.${link.user_id},assignee_id.eq.${link.user_id}`)
    .maybeSingle();
  if (!task) {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: t(lang).notFound });
    return;
  }
  const next = (action === "done" ? "done" : CYCLE[(task as any).status] ?? "in_progress") as
    | "backlog"
    | "in_progress"
    | "review"
    | "done";
  const external = await import("./external-tasks.server");
  if (external.isExternalTask((task as any).external_source)) {
    try {
      await external.pushExternalStatus((task as any).external_source, (task as any).id, next, link.user_id);
    } catch (error) {
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: error instanceof Error ? error.message.slice(0, 180) : `${external.externalLabel((task as any).external_source)} недоступен` });
      return;
    }
  } else {
    await supabaseAdmin.from("tasks").update({ status: next }).eq("id", (task as any).id);
  }
  await tg("answerCallbackQuery", {
    callback_query_id: cb.id,
    text: t(lang).statusSet((task as any).title, STATUS_LABEL[next]?.[lang] ?? next),
  });
  await sendMessage(chatId, t(lang).statusSet((task as any).title, statusTag(next, lang)));
}

// ---------------- entry ----------------

// ---------------- voice ----------------

async function transcribeTelegramFile(fileId: string, mime: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return "";
  try {
    const info = await tg<any>("getFile", { file_id: fileId });
    const path = info?.result?.file_path;
    if (!path) return "";
    const fileRes = await fetch(`${TELEGRAM_API}/file/bot${botToken()}/${path}`);
    if (!fileRes.ok) return "";
    const bytes = await fileRes.arrayBuffer();
    if (bytes.byteLength < 512) return "";
    const rawExt = (path.split(".").pop() || "ogg").toLowerCase();
    // OpenAI transcription rejects "oga"/"opus" — Telegram voice is Ogg/Opus, send it as .ogg
    const extMap: Record<string, string> = { oga: "ogg", opus: "ogg", oggx: "ogg" };
    const primary = extMap[rawExt] ?? rawExt;
    const candidates: Array<[string, string]> = [
      [primary, primary === "ogg" ? "audio/ogg" : mime],
      ["ogg", "audio/ogg"],
      ["mp4", "audio/mp4"],
      ["wav", "audio/wav"],
    ];

    const seen = new Set<string>();
    for (const [ext, type] of candidates) {
      if (seen.has(ext)) continue;
      seen.add(ext);

      const form = new FormData();
      form.append("model", "openai/gpt-4o-mini-transcribe");
      form.append("file", new Blob([bytes], { type }), `voice.${ext}`);

      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      if (!res.ok) {
        console.error(
          "[telegram] transcription failed",
          ext,
          res.status,
          await res.text().catch(() => ""),
        );
        continue;
      }
      const json = (await res.json()) as { text?: string };
      const text = (json.text ?? "").trim();
      if (text) return text;
      return "";
    }
    return "";

  } catch (e) {
    console.error("[telegram] voice error", e);
    return "";
  }
}

export async function handleUpdate(update: any) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }
  const message = update.message ?? update.edited_message;
  const chatId = message?.chat?.id;
  let text: string = (message?.text ?? message?.caption ?? "").trim();

  // Proof submission: the employee pressed "Сдать" and now sends a file, screenshot or link
  if (chatId) {
    const pendingLink = await findLink(chatId);
    if (pendingLink?.pending_proof_task_id) {
      const clear = () =>
        supabaseAdmin
          .from("telegram_links")
          .update({ pending_proof_task_id: null })
          .eq("user_id", pendingLink.user_id);

      if (/^\/cancel/i.test(text)) {
        await clear();
        await sendMessage(chatId, "Сдача отменена.");
        return;
      }

      const fileId =
        message?.document?.file_id ??
        (Array.isArray(message?.photo) ? message.photo[message.photo.length - 1]?.file_id : null) ??
        message?.video?.file_id ??
        null;

      let proofUrl: string | null = null;
      if (fileId) {
        const info = await tg<any>("getFile", { file_id: fileId });
        const path = info?.result?.file_path;
        if (path) proofUrl = `${TELEGRAM_API}/file/bot${botToken()}/${path}`;
      }
      const linkInText = text.match(/https?:\/\/\S+/)?.[0] ?? null;
      if (!proofUrl && linkInText) proofUrl = linkInText;

      if (!proofUrl && !text) {
        await sendMessage(chatId, "Пришлите файл, скриншот или ссылку как подтверждение. Отмена: /cancel");
        return;
      }

      const { submitTaskProof } = await import("./task-flow.server");
      const row = await submitTaskProof({
        taskId: pendingLink.pending_proof_task_id,
        assigneeId: pendingLink.user_id,
        proofUrl,
        proofNote: text || null,
      });
      await clear();
      await sendMessage(
        chatId,
        row
          ? `🟨 Задача отправлена на проверку: ${row.title}\n\nРуководитель получил уведомление.`
          : t("ru").notFound,
      );
      return;
    }
  }

  const voice = message?.voice ?? message?.audio ?? message?.video_note;
  if (chatId && !text && voice?.file_id) {
    const link0 = await findLink(chatId);
    if (!link0) {
      await sendMessage(chatId, t("ru").needLink);
      return;
    }
    const lang0 = pickLang(link0.language);
    await tg("sendChatAction", { chat_id: chatId, action: "typing" });
    const spoken = await transcribeTelegramFile(
      voice.file_id,
      voice.mime_type ?? "audio/ogg",
    );
    if (!spoken) {
      await sendMessage(
        chatId,
        lang0 === "ru"
          ? "Не удалось распознать голосовое сообщение. Попробуйте ещё раз."
          : "Could not recognize the voice message. Please try again.",
      );
      return;
    }
    await sendMessage(chatId, `🎤 ${spoken}`);
    const { data: prof0 } = await supabaseAdmin
      .from("profiles")
      .select("language")
      .eq("id", link0.user_id)
      .maybeSingle();
    await handleAiMessage(link0, chatId, spoken, pickLang((prof0 as any)?.language ?? link0.language));
    return;
  }

  if (!chatId || !text) return;


  // Menu buttons arrive as plain text — map them onto the matching command
  const MENU_MAP: Record<string, string> = {
    "📊 отчёт": "/report",
    "📊 отчет": "/report",
    "📊 report": "/report",
    "🗓 сегодня": "/today",
    "🗓 today": "/today",
    "📋 задачи": "/tasks",
    "📋 tasks": "/tasks",
    "🚀 приложение": "/app",
    "🚀 app": "/app",
  };
  const mapped = MENU_MAP[text.trim().toLowerCase()];
  if (mapped) text = mapped;

  const [rawCmd, ...rest] = text.split(/\s+/);
  const arg = text.slice(rawCmd.length).trim();
  const cmd = rawCmd.toLowerCase().replace(/@[\w_]+$/, "");
  void rest;

  if (cmd === "/start") {
    await handleStart(chatId, arg, message?.from?.username ?? null);
    return;
  }

  const link = await findLink(chatId);
  if (!link) {
    await sendMessage(chatId, t("ru").needLink);
    return;
  }
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("language")
    .eq("id", link.user_id)
    .maybeSingle();
  const lang = pickLang((profile as any)?.language ?? link.language);

  switch (cmd) {
    case "/help":
    case "/menu":
      await sendMessage(chatId, t(lang).help, { reply_markup: mainMenuKeyboard(lang) });
      return;
    case "/app":
    case "/open":
      await sendMessage(
        chatId,
        lang === "ru" ? "Открыть Virtual Space:" : "Open Virtual Space:",
        {
          reply_markup: {
            inline_keyboard: [[
              {
                text: lang === "ru" ? "🚀 Открыть приложение" : "🚀 Open the app",
                web_app: { url: miniAppUrl() },
              },
            ]],
          },
        },
      );
      return;

    case "/today":
    case "/deadlines":
      await handleToday(link, chatId, lang);
      return;
    case "/tasks":
      await handleTasks(link, chatId, lang);
      return;
    case "/new":
      await handleNew(link, chatId, arg, lang);
      return;
    case "/done":
      await handleDone(link, chatId, arg, lang);
      return;
    case "/report":
      await handleReport(link, chatId, arg, lang);
      return;
    case "/unlink":
      await supabaseAdmin
        .from("telegram_links")
        .update({ chat_id: null, linked_at: null })
        .eq("user_id", link.user_id);
      await sendMessage(chatId, t(lang).unlinked);
      return;
    default:
      await handleAiMessage(link, chatId, text, lang);
  }
}

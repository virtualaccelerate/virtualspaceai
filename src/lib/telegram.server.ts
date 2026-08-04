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
  return tg("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...extra });
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

const STATUS_LABEL: Record<string, Record<Lang, string>> = {
  backlog: { ru: "Бэклог", en: "Backlog" },
  in_progress: { ru: "В работе", en: "In progress" },
  review: { ru: "На проверке", en: "Review" },
  done: { ru: "Готово", en: "Done" },
};
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
};

async function findLink(chatId: number): Promise<Link | null> {
  const { data } = await supabaseAdmin
    .from("telegram_links")
    .select("user_id, teamspace_id, chat_id, language")
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
  );
}

function tasksKeyboard(tasks: any[], lang: Lang) {
  return {
    inline_keyboard: tasks.slice(0, 8).map((task) => [
      {
        text: `${task.status === "in_progress" ? "▶️" : "⏸"} ${task.title.slice(0, 24)}`,
        callback_data: `cycle:${task.id}`,
      },
      { text: `✅`, callback_data: `done:${task.id}` },
    ]),
  };
}

async function handleTasks(link: Link, chatId: number, lang: Lang) {
  const { data } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, priority, due_date")
    .eq("user_id", link.user_id)
    .neq("status", "done")
    .order("position", { ascending: true })
    .limit(20);
  const tasks = (data as any[]) ?? [];
  if (!tasks.length) {
    await sendMessage(chatId, t(lang).noTasks);
    return;
  }
  const body = tasks
    .map(
      (task, i) =>
        `${i + 1}. ${PRIORITY_ICON[task.priority] ?? ""} ${task.title} — ${
          STATUS_LABEL[task.status]?.[lang] ?? task.status
        }${task.due_date ? ` (до ${task.due_date})` : ""}`,
    )
    .join("\n");
  await sendMessage(chatId, `${t(lang).tasksHeader}\n\n${body}`, {
    reply_markup: tasksKeyboard(tasks, lang),
  });
}

async function handleNew(link: Link, chatId: number, title: string, lang: Lang) {
  if (!title.trim()) {
    await sendMessage(chatId, t(lang).needTitle);
    return;
  }
  const { count } = await supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", link.user_id)
    .eq("status", "backlog");
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      user_id: link.user_id,
      title: title.trim().slice(0, 300),
      status: "backlog",
      priority: "medium",
      position: (count ?? 0) * 1000,
    })
    .select("title")
    .single();
  if (error) {
    await sendMessage(chatId, t(lang).error);
    return;
  }
  await sendMessage(chatId, t(lang).created((data as any).title));
}

async function handleDone(link: Link, chatId: number, query: string, lang: Lang) {
  if (!query.trim()) return handleTasks(link, chatId, lang);
  const { data } = await supabaseAdmin
    .from("tasks")
    .select("id, title")
    .eq("user_id", link.user_id)
    .neq("status", "done")
    .ilike("title", `%${query.trim()}%`)
    .limit(1);
  const task = (data as any[])?.[0];
  if (!task) {
    await sendMessage(chatId, t(lang).notFound);
    return;
  }
  await supabaseAdmin.from("tasks").update({ status: "done" }).eq("id", task.id);
  await sendMessage(chatId, t(lang).doneOk(task.title));
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

  await sendMessage(chatId, text);
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
                ? "You are a concise business assistant. Summarize the period in 2-3 sentences and give 1-2 recommendations. Plain text, no markdown."
                : "Ты краткий бизнес-ассистент. Подведи итог периода в 2-3 предложениях и дай 1-2 рекомендации. Обычный текст, без markdown.",
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

  const [tasksRes, docsRes, histRes] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select("title, status, priority, due_date")
      .eq("user_id", link.user_id)
      .neq("status", "done")
      .limit(30),
    link.teamspace_id
      ? supabaseAdmin
          .from("documents")
          .select("name, extracted_text")
          .eq("teamspace_id", link.teamspace_id)
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
    .map((x) => `- ${x.title} [${x.status}/${x.priority}${x.due_date ? `/до ${x.due_date}` : ""}]`)
    .join("\n");
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
    "\nTo create a task, emit a line [[task:Title||priority||YYYY-MM-DD||description]] (priority low|medium|high|urgent, use |||| to skip date)." +
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

  // Execute [[task:...]] tokens
  const taskRe = /\[\[task:([^\]]+)\]\]/g;
  const createdTitles: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = taskRe.exec(reply))) {
    const [title, priority, due, description] = match[1].split("||");
    if (!title?.trim()) continue;
    const { data } = await supabaseAdmin
      .from("tasks")
      .insert({
        user_id: link.user_id,
        title: title.trim().slice(0, 300),
        description: description?.trim() || null,
        status: "backlog",
        priority: (["low", "medium", "high", "urgent"] as const).includes(
          (priority?.trim() ?? "") as any,
        )
          ? (priority.trim() as "low" | "medium" | "high" | "urgent")
          : "medium",
        due_date: /^\d{4}-\d{2}-\d{2}$/.test(due?.trim() ?? "") ? due.trim() : null,
        position: 0,
      })
      .select("title")
      .single();
    if (data) createdTitles.push((data as any).title);
  }
  let clean = reply.replace(taskRe, "").replace(/[*_`#]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (createdTitles.length) clean += `\n\n➕ ${createdTitles.join("\n➕ ")}`;

  await supabaseAdmin.from("chat_messages").insert([
    { user_id: link.user_id, teamspace_id: link.teamspace_id, role: "user", content: text },
    { user_id: link.user_id, teamspace_id: link.teamspace_id, role: "assistant", content: clean },
  ]);

  await sendMessage(chatId, clean.slice(0, 3800));
}

// ---------------- callbacks ----------------

const CYCLE: Record<string, string> = {
  backlog: "in_progress",
  in_progress: "review",
  review: "done",
  done: "backlog",
};

async function handleCallback(cb: any) {
  const chatId = cb.message?.chat?.id;
  if (!chatId) return;
  const link = await findLink(chatId);
  if (!link) return;
  const lang = pickLang(link.language);
  const [action, taskId] = String(cb.data ?? "").split(":");
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status")
    .eq("id", taskId)
    .eq("user_id", link.user_id)
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
  await supabaseAdmin.from("tasks").update({ status: next }).eq("id", (task as any).id);
  await tg("answerCallbackQuery", {
    callback_query_id: cb.id,
    text: t(lang).statusSet((task as any).title, STATUS_LABEL[next]?.[lang] ?? next),
  });
  await sendMessage(chatId, t(lang).statusSet((task as any).title, STATUS_LABEL[next]?.[lang] ?? next));
}

// ---------------- entry ----------------

export async function handleUpdate(update: any) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }
  const message = update.message ?? update.edited_message;
  const chatId = message?.chat?.id;
  const text: string = (message?.text ?? "").trim();
  if (!chatId || !text) return;

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
      await sendMessage(chatId, t(lang).help);
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

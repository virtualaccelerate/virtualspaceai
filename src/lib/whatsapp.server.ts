// Server-only WhatsApp bot logic (v1: 1:1 linking + conversational task agent).
// The agent logic is a deliberate copy of telegram.server.ts handleAiMessage (minus
// Telegram-only UI and agent automation) so the Telegram path stays untouched.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { spaceNames } from "./telegram.server";

type Lang = "ru" | "en";
type WaLink = { user_id: string; teamspace_id: string | null; language: string | null };

const ERR: Record<Lang, string> = {
  ru: "Что-то пошло не так. Попробуйте ещё раз.",
  en: "Something went wrong. Please try again.",
};
const pickLang = (l?: string | null): Lang => (l === "en" ? "en" : "ru");
const responseLang = (text: string, fallback: Lang): Lang => {
  if (/[А-Яа-яЁё]/.test(text)) return "ru";
  const words = text.match(/[A-Za-z]+/g) ?? [];
  if (words.length >= 3 || words.join("").length >= 18) return "en";
  return fallback;
};
const bishkekDate = (date = new Date()) =>
  new Date(date.getTime() + 6 * 3600_000).toISOString().slice(0, 10);

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  const safe = text?.trim() ? text : "✅ Готово";
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: safe.slice(0, 4000) } }),
  });
  if (!res.ok) console.error("[whatsapp] send failed:", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/** Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body). */
export async function verifyWhatsAppSignature(rawBody: string, header: string | null): Promise<boolean> {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const got = header.slice(7).toLowerCase();
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function handleIncoming(from: string, text: string, profileName?: string | null) {
  const { data: link } = await supabaseAdmin
    .from("whatsapp_links")
    .select("user_id, teamspace_id, language")
    .eq("phone_number", from)
    .not("linked_at", "is", null)
    .maybeSingle();

  if (!link) {
    const code = text.trim().toLowerCase();
    const { data: pending } = /^[0-9a-f]{4,32}$/.test(code)
      ? await supabaseAdmin
          .from("whatsapp_links")
          .select("id")
          .ilike("link_code", code)
          .is("linked_at", null)
          .maybeSingle()
      : { data: null };
    if (!pending) {
      await sendWhatsAppMessage(
        from,
        "Не удалось распознать код. Откройте раздел «WhatsApp» в Virtual Space, чтобы получить код привязки, и отправьте его сюда.",
      );
      return;
    }
    const { error } = await supabaseAdmin
      .from("whatsapp_links")
      .update({ phone_number: from, wa_name: profileName ?? null, linked_at: new Date().toISOString() } as never)
      .eq("id", (pending as any).id);
    await sendWhatsAppMessage(
      from,
      error
        ? "Этот номер уже привязан к другому аккаунту Virtual Space."
        : "Готово! WhatsApp привязан к Virtual Space. Пишите задачи обычным сообщением — например: «Позвонить клиенту завтра, срочно».",
    );
    return;
  }

  const l = link as unknown as WaLink;
  await handleAiMessage(l, from, text, responseLang(text, pickLang(l.language)));
}

async function handleAiMessage(link: WaLink, phone: string, text: string, lang: Lang) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    await sendWhatsAppMessage(phone, ERR[lang]);
    return;
  }

  // All workspaces of the user — the agent picks the right one from the message
  const { data: memRows } = await supabaseAdmin
    .from("teamspace_members")
    .select("teamspace_id, role")
    .eq("user_id", link.user_id);
  const spaceIds = Array.from(new Set(((memRows as any[]) ?? []).map((m) => m.teamspace_id)));
  // A plain member only ever sees their own tasks; owner/admin see the whole workspace.
  const managerSpaceIds = new Set(
    ((memRows as any[]) ?? []).filter((m) => m.role === "owner" || m.role === "admin").map((m) => m.teamspace_id),
  );
  if (link.teamspace_id && !spaceIds.includes(link.teamspace_id)) spaceIds.push(link.teamspace_id);
  const spaceMap = await spaceNames(spaceIds).catch(() => new Map<string, string>());
  const defaultSpaceId = link.teamspace_id ?? spaceIds[0] ?? null;

  const [tasksRes, docsRes, histRes] = await Promise.all([
    spaceIds.length
      ? supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee_name, assignee_id, user_id, project, department, teamspace_id")
          .in("teamspace_id", spaceIds)
          .neq("status", "done")
          .limit(80)
      : supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee_name, assignee_id, user_id, project, department, teamspace_id")
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
    .filter((x) => managerSpaceIds.has(x.teamspace_id) || x.assignee_id === link.user_id || x.user_id === link.user_id)
    .map(
      (x) =>
        `- id=${x.id} "${x.title}" [${x.status}/${x.priority}${x.due_date ? `/до ${x.due_date}` : ""}${x.assignee_name ? `/${x.assignee_name}` : "/без ответственного"}${x.project ? `/проект ${x.project}` : ""}${x.department ? `/${x.department}` : ""}/пространство "${spaceMap.get(x.teamspace_id) ?? "личное"}"]`,
    )
    .join("\n");

  // Notifications the bot itself sent recently — follow-up messages ("назначь Бермет", "задача решена")
  // refer to those tasks, so the agent must see them and the tasks they point at.
  let notifyBlock = "";
  let notifiedTasksBlock = "";
  try {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: notes } = await supabaseAdmin
      .from("notifications")
      .select("title, body, task_id, teamspace_id, created_at")
      .eq("user_id", link.user_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(8);
    const rows = ((notes as any[]) ?? []);
    if (rows.length) {
      notifyBlock = rows
        .map(
          (n, i) =>
            `${i === 0 ? "- (MOST RECENT) " : "- "}${n.created_at?.slice(0, 16).replace("T", " ")} "${n.title}"${
              n.body ? `: ${String(n.body).slice(0, 400)}` : ""
            }${n.task_id ? ` [task_id=${n.task_id}]` : ""}${
              n.teamspace_id ? ` [пространство "${spaceMap.get(n.teamspace_id) ?? ""}"]` : ""
            }`,
        )
        .join("\n");

      // Tasks referenced by those notifications — by id and by title mentioned in the text.
      const ids = Array.from(new Set(rows.map((n) => n.task_id).filter(Boolean)));
      const haystack = rows.map((n) => `${n.title} ${n.body ?? ""}`).join(" ").toLowerCase();
      const pool = new Map<string, any>();
      if (ids.length) {
        const { data } = await supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee_name, teamspace_id")
          .in("id", ids as string[]);
        for (const task of ((data as any[]) ?? [])) pool.set(task.id, task);
      }
      if (spaceIds.length) {
        const { data } = await supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee_name, teamspace_id")
          .in("teamspace_id", spaceIds)
          .order("updated_at", { ascending: false })
          .limit(200);
        for (const task of ((data as any[]) ?? [])) {
          const title = String(task.title ?? "").toLowerCase().trim();
          if (title.length > 3 && haystack.includes(title)) pool.set(task.id, task);
        }
      }
      notifiedTasksBlock = Array.from(pool.values())
        .map(
          (x) =>
            `- id=${x.id} "${x.title}" [${x.status}/${x.priority}${x.due_date ? `/до ${x.due_date}` : ""}${
              x.assignee_name ? `/${x.assignee_name}` : "/без ответственного"
            }/пространство "${spaceMap.get(x.teamspace_id) ?? "личное"}"]`,
        )
        .join("\n");
    }
  } catch {
    notifyBlock = "";
  }


  // Team members across all workspaces, so the agent can assign by name
  let teamBlock = "";
  const roster: { id: string; name: string; email: string | null; teamspace_id: string }[] = [];
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
          roster.push({
            id: m.user_id,
            name: p?.full_name || p?.email || "",
            email: p?.email ?? null,
            teamspace_id: m.teamspace_id,
          });
          return `- id=${m.user_id} name="${p?.full_name || p?.email || "Без имени"}" email="${p?.email ?? ""}" role=${m.role} space="${spaceMap.get(m.teamspace_id) ?? ""}"${m.user_id === link.user_id ? " (this is the user writing to you — \"я\"/\"me\")" : ""}`;
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
      ? "You are Virtual Space, the user's AI business assistant, answering inside WhatsApp. The current message is in English, so answer in English even if the profile or earlier messages use another language. Use plain text only (no markdown symbols), short and practical."
      : "Ты Virtual Space — AI-ассистент бизнеса пользователя, отвечаешь в WhatsApp. Текущее сообщение и его контекст на русском, поэтому отвечай только на русском, даже если язык профиля или прошлых сообщений другой. Пиши обычным текстом без markdown, кратко и по делу.") +
    `\nCURRENT DATE: ${bishkekDate()} in Asia/Bishkek (UTC+6). This is authoritative. Never infer today's date from message history or model knowledge.` +
    "\nCONTEXT RULE: the bot also sends the user AI notifications and briefs (see RECENT NOTIFICATIONS and NOTIFIED TASKS). When a message has no explicit task name (\"назначь ответственной Бермет\", \"задача решена\", \"сделано\", \"перенеси на завтра\"), it refers to the tasks from the MOST RECENT notification — use those task ids and emit [[task-update:...]]. Never say a task does not exist while it is listed in OPEN TASKS or NOTIFIED TASKS. Only if the latest notification covers several tasks equally, ask one short question naming them." +
    "\nYou are the task agent of the user's workspaces. From a plain sentence infer title, assignee, project, department, priority, deadline, a short description and the WORKSPACE the task belongs to." +
    "\nTo create a task, emit a line [[task:Title||priority||YYYY-MM-DD||description||assigneeIdOrName||project||department||workspaceIdOrName]] (priority low|medium|high|urgent; due date is required and cannot be earlier than CURRENT DATE; empty fields stay empty)." +
    "\nIf the user asks to create a \"task\", a \"Google Task\" or \"задачу в Google Tasks\" (any phrasing, including when they explicitly name Google Tasks), it is still the SAME action — ALWAYS emit the [[task:...]] token above. A task with a due date already syncs to Google Tasks automatically in the background; this is already set up. Never say you cannot create tasks directly in Google Tasks, never ask whether to create it \"in my system\" instead, and never ask for confirmation — title plus a deadline (even \"today\"/\"сегодня\") is enough information, so create it immediately." +
    "\nWorkspace field (8th): the id or exact name from WORKSPACES. Whenever the message names a workspace (\"для воркспейса X\", \"воркспейс: X\", \"в пространстве X\"), you MUST put that workspace's id there — never fall back to the default. If not mentioned use the default workspace." +
    "\nTitle must contain ONLY the work itself: never include the workspace name or phrases like \"для воркспейса …\", \"воркспейс: …\", and never append the workspace with a dash." +
    "\nTo change an existing task, emit [[task-update:TASK_ID||field=value||field=value]] — fields: title, priority, due_date, status (backlog|in_progress|review|done), assignee (member id), project, department, description. Take TASK_ID from OPEN TASKS or NOTIFIED TASKS (each task is labelled with its workspace)." +
    "\nSTATUS CHANGES ARE MANDATORY TOKENS: whenever the user says a task is started, in progress, finished, done, closed, ready, sent for review, or should go back to backlog — immediately emit [[task-update:TASK_ID||status=...]] for the matching task from OPEN TASKS or NOTIFIED TASKS. Wording: сделал/готово/выполнил/закрыл/завершил = done; начал/в работе/делаю = in_progress; на проверку/на ревью = review; вернуть/в бэклог = backlog. Never answer that you changed the status without emitting the token. Match the task by title even if worded loosely; only if several open tasks match equally, ask one short question naming them." +
    "\nAssignee field: ALWAYS the member id from TEAM MEMBERS when the person has an account; make sure the member belongs to the chosen workspace. Priority wording: срочно/горит/ASAP = urgent, важно/высокий = high, обычная = medium, не срочно = low." +
    "\nWhen CREATING a task, if the title, assignee or deadline cannot be inferred confidently, do NOT emit a create token — ask one short clarifying question instead. This rule never applies to updates: updates only need the task id and the changed field." +
    "\nOPEN TASK LIST FORMAT: when asked for the user's or another person's open/current tasks, start with the localized equivalent of \"Вот ваши текущие задачи:\" and put each task on its own plain line. Format future/today deadlines as \"Task title — до D month\", overdue deadlines as \"Task title — просрочено с D month\", and tasks without a deadline as the title only. Use natural localized month names, not YYYY-MM-DD. Do not include status, priority, icons, bullets, numbering, assignee, department, or workspace. Append \" · Project name\" only when the project helps explain context. Adapt the heading naturally when listing another person's tasks." +
    "\nCALENDAR: if the user asks to create or schedule a meeting, emit [[meeting:Title||START_ISO_WITH_+06:00||END_ISO_WITH_+06:00||description||comma-separated-emails]]. ONLY the date and time are required — if they are present, you MUST emit the token immediately in the same reply. Never ask for the meeting title: if it is not given, use a sensible short default (\"Встреча\" / \"Meeting\", or the workspace name). Attendees are optional: leave the emails field empty when nobody is named; when people are named (including \"я\", \"me\"), resolve their emails from TEAM MEMBERS and skip names you cannot resolve. Never ask the same clarification twice — if you already asked once, create the meeting with defaults. Default duration is one hour. Do not use this token for tasks." +

    (teamBlock ? `\n\nTEAM MEMBERS (resolve the named person to one of these ids):\n${teamBlock}` : "") +
    spacesBlock +
    (tasks ? `\n\nOPEN TASKS:\n${tasks}` : "") +
    (notifyBlock ? `\n\nRECENT NOTIFICATIONS sent to this user (newest first):\n${notifyBlock}` : "") +
    (notifiedTasksBlock ? `\n\nNOTIFIED TASKS (tasks those notifications are about, may include finished ones):\n${notifiedTasksBlock}` : "") +
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
    await sendWhatsAppMessage(phone, ERR[lang]);
    return;
  }

  // Execute [[task:...]] and [[task-update:...]] tokens
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const taskRe = /\[\[task:([^\]]+)\]\]/g;
  const updateRe = /\[\[task-update:([^\]]+)\]\]/g;
  const meetingRe = /\[\[meeting:([^\]]+)\]\]/g;
  const createdTitles: string[] = [];
  const updatedTitles: string[] = [];
  const updateErrors: string[] = [];
  const meetingResults: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = taskRe.exec(reply))) {
    const [title, priority, due, description, assignee, project, department, space] = match[1].split("||");
    if (!title?.trim()) continue;
    const assigneeRaw = (assignee ?? "").trim();
    let assigneeId = UUID.test(assigneeRaw) ? assigneeRaw : null;
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
    // A written name ("Бермет", "bermet") is matched against the workspace team list,
    // so the task lands on a real person instead of a plain text label.
    if (!assigneeId && assigneeRaw) {
      const { matchMember } = await import("./task-import.server");
      const pool = roster.filter((m) => !targetSpace || m.teamspace_id === targetSpace);
      const found = matchMember(assigneeRaw, pool);
      if (found) assigneeId = found.id;
    }
    if (assigneeId && targetSpace && !roster.some((m) => m.id === assigneeId && m.teamspace_id === targetSpace)) {
      assigneeId = null;
    }
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
      const { syncTaskToGoogleTasks } = await import("./google-calendar.server");
      await syncTaskToGoogleTasks({ ...(data as any), user_id: link.user_id, description: description?.trim() || null, external_source: null }).catch(() => {});
    }
  }
  while ((match = updateRe.exec(reply))) {
    const parts = match[1].split("||").map((p) => p.trim()).filter(Boolean);
    const taskId = parts.shift() ?? "";
    if (!UUID.test(taskId)) continue;
    const patch: Record<string, unknown> = {};
    let assigneeName = "";
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
      else if (field === "assignee") {
        if (UUID.test(value)) patch.assignee_id = value;
        else assigneeName = value;
      }
    }
    if (!Object.keys(patch).length && !assigneeName) continue;

    const { data: existing } = await supabaseAdmin
      .from("tasks")
      .select("id, title, external_source, teamspace_id, assignee_id, user_id")
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

    // "назначь Бермет" — match the spoken name against the task's workspace team list
    if (assigneeName) {
      const { matchMember } = await import("./task-import.server");
      const found = matchMember(assigneeName, roster.filter((m) => m.teamspace_id === taskSpace));
      if (found) {
        patch.assignee_id = found.id;
        patch.assignee_name = null;
      } else {
        updateErrors.push(
          lang === "en"
            ? `${assigneeName}: not in this workspace`
            : `${assigneeName}: нет такого участника в этом пространстве`,
        );
      }
    }
    if (typeof patch.assignee_id === "string" && !roster.some((m) => m.id === patch.assignee_id && m.teamspace_id === taskSpace)) {
      delete patch.assignee_id;
    }
    if (!Object.keys(patch).length) continue;

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
      .select("id,user_id,assignee_id,title,description,due_date,status,priority,external_source")
      .single();
    if (data) {
      updatedTitles.push((data as any).title);
      const { syncTaskToGoogleTasks } = await import("./google-calendar.server");
      await syncTaskToGoogleTasks(data as any, (existing as any).assignee_id ?? (existing as any).user_id).catch(() => {});
    }
    else
      updateErrors.push(
        `${(existing as any).title}: ${error?.message?.slice(0, 120) ?? (lang === "en" ? "update failed" : "не удалось обновить")}`,
      );

  }
  while ((match = meetingRe.exec(reply))) {
    const [rawTitle, start, end, description, emails] = match[1].split("||").map((part) => part.trim());
    if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end)) || new Date(end) <= new Date(start)) continue;
    const title = rawTitle || (lang === "en" ? "Meeting" : "Встреча");
    // Only real email addresses can be invited; unresolved names would make Google reject the event.
    const attendees = (emails ?? "")
      .split(",")
      .map((email) => email.trim())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    try {
      const { createMeeting } = await import("./google-calendar.server");
      const input = { title, start, end, description: description || undefined };
      let event;
      try {
        event = await createMeeting(link.user_id, { ...input, attendees: attendees.length ? attendees : undefined });
      } catch (inviteError) {
        // Retry without attendees so the meeting itself still lands in the calendar.
        if (!attendees.length || (inviteError instanceof Error && inviteError.message.includes("RECONNECT"))) throw inviteError;
        event = await createMeeting(link.user_id, input);
      }
      meetingResults.push(`${event.title}${event.url ? `\n${event.url}` : ""}`);
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      updateErrors.push(raw.includes("RECONNECT")
        ? (lang === "en" ? "Connect Google Calendar in Integrations" : "Подключите Google Calendar в Интеграциях")
        : `${lang === "en" ? "Meeting was not created" : "Не удалось создать встречу"}: ${raw.slice(0, 200)}`);
    }
  }
  let clean = reply.replace(taskRe, "").replace(meetingRe, "").replace(/[*_`#]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  clean = clean.replace(updateRe, "").trim();
  if (createdTitles.length) clean += `\n\n➕ ${createdTitles.join("\n➕ ")}`;
  if (updatedTitles.length) clean += `\n\n✏️ ${updatedTitles.join("\n✏️ ")}`;
  if (updateErrors.length) clean += `\n\n⚠️ ${updateErrors.join("\n⚠️ ")}`;
  if (meetingResults.length) clean += `\n\n📅 ${meetingResults.join("\n📅 ")}`;

  await supabaseAdmin.from("chat_messages").insert([
    { user_id: link.user_id, teamspace_id: link.teamspace_id, role: "user", content: text },
    { user_id: link.user_id, teamspace_id: link.teamspace_id, role: "assistant", content: clean },
  ]);

  if (!clean.trim()) clean = lang === "en" ? "✅ Done." : "✅ Готово.";
  await sendWhatsAppMessage(phone, clean.slice(0, 3800));
}

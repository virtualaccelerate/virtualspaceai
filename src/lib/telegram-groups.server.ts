// Server-only: Telegram group membership + message capture. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendMessage } from "./telegram.server";
import { groupCompletionStatus, isAfterBotAdded, isDuplicateTask, isGroupChat, newGroupLinkCode, pendingMessages, shouldProcess } from "./telegram-groups";
import { resolveMember } from "./member-resolution";

const db = supabaseAdmin as any;

/** Returns true when the update belonged to a group and was handled here. */
export async function handleGroupUpdate(update: any): Promise<boolean> {
  if (update.my_chat_member) {
    const m = update.my_chat_member;
    if (!isGroupChat(m.chat)) return false;
    await onMembership(m.chat, m.old_chat_member?.status, m.new_chat_member?.status);
    return true;
  }
  const message = update.message ?? update.edited_message;
  if (!message || !isGroupChat(message.chat)) return false;
  if (message.migrate_to_chat_id) {
    await db.from("telegram_groups").update({ chat_id: message.migrate_to_chat_id }).eq("chat_id", message.chat.id);
    return true;
  }
  if (message.migrate_from_chat_id) return true;
  const cmd = /^\/(summary|tasks)(?:@\w+)?(?:\s+(\S+))?/i.exec((message.text ?? "").trim());
  if (cmd) {
    await runCommand(message.chat.id, cmd[1]!.toLowerCase(), (cmd[2] ?? "").toLowerCase()).catch((e) =>
      console.error("[tg-group] command failed", e instanceof Error ? e.message : e));
    return true;
  }
  await storeMessage(message);
  return true;
}

async function onMembership(chat: any, oldStatus?: string, newStatus?: string) {
  const present = ["member", "administrator", "creator", "restricted"];
  const { data: existing } = await db.from("telegram_groups").select("id, status, link_code").eq("chat_id", chat.id).maybeSingle();
  if (newStatus === "left" || newStatus === "kicked") {
    if (existing) await db.from("telegram_groups").update({ status: "left", bot_is_admin: false }).eq("id", existing.id);
    return;
  }
  if (!newStatus || !present.includes(newStatus)) return;
  const isAdmin = newStatus === "administrator";
  const justAdded = !existing || existing.status === "left" || !present.includes(oldStatus ?? "");
  if (!justAdded) {
    await db.from("telegram_groups").update({ bot_is_admin: isAdmin, title: chat.title ?? null }).eq("id", existing.id);
    return;
  }
  const code = newGroupLinkCode();
  const row = { chat_id: chat.id, title: chat.title ?? null, bot_added_at: new Date().toISOString(), bot_is_admin: isAdmin, link_code: code,
    status: existing?.status === "linked" ? "linked" : "pending" };
  await db.from("telegram_groups").upsert(row, { onConflict: "chat_id" });
  await sendMessage(chat.id, `Задачи ведутся с этого момента. Назначьте меня администратором, чтобы я видел все сообщения.\n\nКод привязки: ${code}\nВведите его на странице Telegram → «Группы» в Virtual Space.`);
}

async function storeMessage(message: any) {
  const { data: group } = await db.from("telegram_groups").select("id, bot_added_at, status").eq("chat_id", message.chat.id).maybeSingle();
  if (!group || group.status === "left") return;
  if (!isAfterBotAdded(message.date, group.bot_added_at)) return;
  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) return;
  const from = message.from ?? {};
  await db.from("telegram_group_messages").upsert({
    group_id: group.id, chat_id: message.chat.id, message_id: message.message_id,
    from_id: from.id ?? null, from_username: from.username ?? null,
    author_name: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
    text, sent_at: new Date(message.date * 1000).toISOString(),
  }, { onConflict: "chat_id,message_id" });
}

// ---------------- Step 2: AI task extraction ----------------

async function askJson(system: string, user: string): Promise<any> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI недоступен: нет ключа");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`AI недоступен (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

type Member = { id: string; name: string; email: string | null; tgId: number | null; tgUser: string | null; manager: boolean };

async function loadMembers(teamspaceId: string): Promise<Member[]> {
  const { data: rows } = await db.from("teamspace_members").select("user_id, role").eq("teamspace_id", teamspaceId);
  const ids = (rows ?? []).map((r: any) => r.user_id);
  if (!ids.length) return [];
  const [{ data: profiles }, { data: links }] = await Promise.all([
    db.from("profiles").select("id, full_name, email").in("id", ids),
    db.from("telegram_links").select("user_id, chat_id, telegram_username").in("user_id", ids).not("chat_id", "is", null),
  ]);
  return (rows ?? []).map((r: any) => {
    const p = (profiles ?? []).find((x: any) => x.id === r.user_id);
    const l = (links ?? []).find((x: any) => x.user_id === r.user_id);
    return { id: r.user_id, name: p?.full_name || p?.email || "", email: p?.email ?? null,
      tgId: l?.chat_id ? Number(l.chat_id) : null, tgUser: l?.telegram_username?.replace(/^@/, "").toLowerCase() ?? null,
      manager: r.role === "owner" || r.role === "admin" };
  });
}

/** Telegram id → linked account; then @username; then name via the shared exact resolver. */
function resolveAssignee(raw: string | null | undefined, members: Member[], tgId?: number | null): Member | null {
  if (tgId) { const m = members.find((x) => x.tgId === tgId); if (m) return m; }
  const v = (raw ?? "").trim();
  if (!v) return null;
  const u = v.replace(/^@/, "").toLowerCase();
  const byUser = members.find((x) => x.tgUser === u);
  if (byUser) return byUser;
  const r = resolveMember(v.replace(/^@/, ""), members);
  return "match" in r ? r.match : null;
}

const EXTRACT = "Ты извлекаешь задачи из переписки рабочей группы. Ответь ТОЛЬКО JSON без markdown: " +
  '{"new_tasks":[{"title":"...","assignee":"@username или имя или null","due_date":"YYYY-MM-DD или null","message_ids":[1]}],' +
  '"completed":[{"task_id":"uuid","message_ids":[1]}],"updates":[{"task_id":"uuid","due_date":"YYYY-MM-DD или null","assignee":"... или null"}]}. ' +
  "Правила: только явные поручения и обязательства (кто-то берётся или кому-то поручают сделать конкретное дело). " +
  "Не создавай задачи, дублирующие открытые задачи из списка. Сообщения «сделал/готово/done» про существующую задачу → completed. " +
  "Болтовню, вопросы и мнения игнорируй. Сроки вычисляй относительно даты сообщения. Если ничего нет — пустые массивы.";

export async function processGroup(groupId: string): Promise<{ created: number; completed: number; skipped?: string }> {
  const { data: g } = await db.from("telegram_groups").select("*").eq("id", groupId).maybeSingle();
  if (!g || g.status !== "linked" || !g.teamspace_id) return { created: 0, completed: 0, skipped: "not linked" };
  const since = [g.bot_added_at, g.last_processed_at].filter(Boolean).sort().pop();
  const { data: raw } = await db.from("telegram_group_messages").select("message_id, from_id, from_username, author_name, text, sent_at")
    .eq("group_id", g.id).gte("sent_at", since).order("sent_at").limit(300);
  const msgs = pendingMessages(raw ?? [], g.bot_added_at, g.last_processed_at);
  if (!msgs.length) return { created: 0, completed: 0, skipped: "no messages" };
  const mark = () => db.from("telegram_groups").update({ last_processed_at: msgs[msgs.length - 1].sent_at }).eq("id", g.id);
  if (!shouldProcess(msgs.map((m: any) => m.text ?? ""))) return { created: 0, completed: 0, skipped: "too few" };

  const { data: open } = await db.from("tasks").select("id, title, assignee_name, assignee_id, due_date, status")
    .eq("teamspace_id", g.teamspace_id).eq("source_group_id", g.id).in("status", ["backlog", "in_progress"]).limit(200);
  const openTasks = open ?? [];
  const members = await loadMembers(g.teamspace_id);
  const transcript = msgs.map((m: any) => `[${m.message_id}] ${m.sent_at.slice(0, 10)} ${m.from_username ? "@" + m.from_username : m.author_name ?? "?"}: ${m.text}`).join("\n");
  const ctx = openTasks.map((t: any) => `${t.id} | ${t.title} | ${t.assignee_name ?? "-"} | ${t.due_date ?? "-"}`).join("\n") || "нет";
  const content = await askJson(EXTRACT, `Открытые задачи (id | название | исполнитель | срок):\n${ctx}\n\nНовые сообщения:\n${transcript}`);
  const match = String(content).match(/\{[\s\S]*\}/);
  const out = match ? JSON.parse(match[0]) : {};
  const byMsg = new Map(msgs.map((m: any) => [Number(m.message_id), m]));
  const lines: string[] = [];
  const titles = openTasks.map((t: any) => t.title);
  let created = 0, completed = 0;

  for (const nt of Array.isArray(out.new_tasks) ? out.new_tasks : []) {
    const title = String(nt?.title ?? "").trim().slice(0, 300);
    if (!title || isDuplicateTask(title, titles)) continue;
    titles.push(title);
    const ids = (Array.isArray(nt.message_ids) ? nt.message_ids : []).map(Number).filter((n: number) => byMsg.has(n));
    const who = resolveAssignee(nt.assignee, members);
    const due = /^\d{4}-\d{2}-\d{2}$/.test(nt.due_date ?? "") ? nt.due_date : null;
    const { error } = await db.from("tasks").insert({
      user_id: g.linked_by, teamspace_id: g.teamspace_id, title, status: "backlog", priority: "medium",
      assignee_id: who?.id ?? null, assignee_name: who?.name ?? (nt.assignee ? String(nt.assignee).slice(0, 120) : null),
      due_date: due, project: g.project ?? null, source_group_id: g.id, source_message_ids: ids.length ? ids : null,
    });
    if (error) { console.error("[tg-group] insert failed", error.message); continue; }
    created++;
    const handle = who?.tgUser ? "@" + who.tgUser : who?.name ?? nt.assignee ?? "без исполнителя";
    lines.push(`➕ ${title} — ${handle} — ${due ?? "без срока"}`);
  }

  for (const c of Array.isArray(out.completed) ? out.completed : []) {
    const task = openTasks.find((t: any) => t.id === c?.task_id);
    if (!task) continue;
    const ids = (Array.isArray(c.message_ids) ? c.message_ids : []).map(Number);
    const src: any = ids.map((i: number) => byMsg.get(i)).find(Boolean);
    const author = src ? resolveAssignee(src.from_username, members, src.from_id) : null;
    const status = groupCompletionStatus(Boolean(author?.manager));
    const patch: any = { status, ...(status === "review" ? { submitted_at: new Date().toISOString() } : {}) };
    const { error } = await db.from("tasks").update(patch).eq("id", task.id);
    if (error) continue;
    await db.from("task_events").insert({ task_id: task.id, teamspace_id: g.teamspace_id, actor_id: author?.id ?? null,
      actor_name: author?.name ?? src?.author_name ?? null, source: "telegram_group", kind: "status", field: "status",
      from_value: task.status, to_value: status, note: ids.length ? `messages: ${ids.join(",")}` : null });
    completed++;
    lines.push(`${status === "done" ? "✅" : "🕓 на проверке:"} ${task.title}`);
  }

  for (const u of Array.isArray(out.updates) ? out.updates : []) {
    const task = openTasks.find((t: any) => t.id === u?.task_id);
    if (!task) continue;
    const patch: any = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(u.due_date ?? "")) patch.due_date = u.due_date;
    if (u.assignee) { const who = resolveAssignee(u.assignee, members); patch.assignee_id = who?.id ?? null; patch.assignee_name = who?.name ?? String(u.assignee).slice(0, 120); }
    if (Object.keys(patch).length) await db.from("tasks").update(patch).eq("id", task.id);
  }

  await mark();
  if (lines.length) await sendMessage(g.chat_id, `Добавлено: ${created}, закрыто: ${completed}\n${lines.join("\n")}`);
  return { created, completed };
}

export async function processAllGroups() {
  const { data: groups } = await db.from("telegram_groups").select("id").eq("status", "linked");
  let created = 0, completed = 0, failed = 0;
  for (const g of groups ?? []) {
    try { const r = await processGroup(g.id); created += r.created; completed += r.completed; }
    catch (e) { failed++; console.error("[tg-group] process failed", g.id, e instanceof Error ? e.message : e); }
  }
  return { groups: (groups ?? []).length, created, completed, failed };
}

async function runCommand(chatId: number, cmd: string, arg: string) {
  const { data: g } = await db.from("telegram_groups").select("id, teamspace_id, project, status").eq("chat_id", chatId).maybeSingle();
  if (!g || g.status !== "linked" || !g.teamspace_id) {
    await sendMessage(chatId, "Группа ещё не привязана. Введите код на странице Telegram → «Группы».");
    return;
  }
  if (cmd === "tasks") {
    let q = db.from("tasks").select("title, assignee_name, assignee_id, due_date").eq("teamspace_id", g.teamspace_id)
      .in("status", ["backlog", "in_progress", "review"]).eq("external_archived", false).order("due_date", { nullsFirst: false }).limit(30);
    q = g.project ? q.eq("project", g.project) : q.eq("source_group_id", g.id);
    const { data: tasks } = await q;
    const members = await loadMembers(g.teamspace_id);
    const list = (tasks ?? []).map((t: any) => {
      const m = members.find((x) => x.id === t.assignee_id);
      return `• ${t.title} — ${m?.tgUser ? "@" + m.tgUser : m?.name ?? t.assignee_name ?? "без исполнителя"}${t.due_date ? " — " + t.due_date : ""}`;
    });
    await sendMessage(chatId, list.length ? `Открытые задачи${g.project ? " «" + g.project + "»" : ""}:\n${list.join("\n")}` : "Открытых задач нет.");
    return;
  }
  const days = arg === "week" ? 7 : arg === "month" ? 30 : 1;
  const from = new Date(Date.now() - days * 86400000).toISOString();
  const { data: msgs } = await db.from("telegram_group_messages").select("from_username, author_name, text, sent_at")
    .eq("group_id", g.id).gte("sent_at", from).order("sent_at").limit(800);
  if (!msgs?.length) { await sendMessage(chatId, "За этот период сообщений нет."); return; }
  const transcript = msgs.map((m: any) => `${m.sent_at.slice(0, 16)} ${m.from_username ? "@" + m.from_username : m.author_name ?? "?"}: ${m.text}`).join("\n").slice(-60000);
  const text = await askJson("Сделай краткое саммари рабочей переписки на русском, простым текстом без markdown, разделы: Главное, Решения, Задачи (с @исполнителями), Открытые вопросы. Пустые разделы пропускай. Не более 3500 символов.", transcript);
  await sendMessage(chatId, String(text).trim().slice(0, 4000) || "Не удалось составить саммари.");
}

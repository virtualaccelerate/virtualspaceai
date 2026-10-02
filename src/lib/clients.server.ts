// Client Database: Space table is the source of truth, mirrored to one Google Sheet per workspace.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function requireClientManager(userId: string, teamspaceId: string) {
  const db = await admin();
  const { data: m } = await db.from("teamspace_members").select("id")
    .eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!m) throw new Error("Нет доступа к рабочему пространству");
  const { isWorkspaceManager } = await import("./roles.server");
  if (!(await isWorkspaceManager(userId, teamspaceId))) throw new Error("База клиентов доступна владельцу и администраторам");
}

export function normPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) d = "996" + d.slice(1); // KG local 0555…
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);   // RU/KZ 8…
  return d.length >= 9 ? d : null;
}

const PHONE_RE = /\+?\d[\d\s\-().]{7,}\d/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

export function hasClientSignals(text: string) {
  const phones = (text.match(PHONE_RE) ?? []).filter((p) => normPhone(p));
  return phones.length > 0 || EMAIL_RE.test(text);
}

type Extracted = { name?: string; phone?: string; email?: string; company?: string; notes?: string };

async function aiExtract(text: string, teamEmails: string[]): Promise<Extracted[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return [];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      reasoning_effort: "low",
      messages: [
        { role: "system", content:
          "Извлеки из текста задачи данные ВНЕШНИХ клиентов (не сотрудников). Верни только JSON: " +
          '{"clients":[{"name":"","phone":"","email":"","company":"","notes":"коротко: что нужно клиенту"}]}. ' +
          "Если клиентов нет — {\"clients\":[]}. Не выдумывай данные. Сотрудники (их email): " + teamEmails.join(", ") },
        { role: "user", content: text.slice(0, 4000) },
      ],
    }),
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = j.choices?.[0]?.message?.content ?? "";
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw) as { clients?: Extracted[] };
    return Array.isArray(parsed.clients) ? parsed.clients : [];
  } catch { return []; }
}

/** Find an existing client by phone, then email, then exact name. */
async function findExisting(teamspaceId: string, c: Extracted) {
  const db = await admin();
  const phone = normPhone(c.phone);
  if (phone) {
    const { data } = await db.from("clients").select("*").eq("teamspace_id", teamspaceId).eq("phone_norm", phone).maybeSingle();
    if (data) return data;
  }
  if (c.email) {
    const { data } = await db.from("clients").select("*").eq("teamspace_id", teamspaceId).ilike("email", c.email.trim()).limit(1);
    if (data?.[0]) return data[0];
  }
  if (!phone && !c.email && c.name?.trim()) {
    const { data } = await db.from("clients").select("*").eq("teamspace_id", teamspaceId).ilike("name", c.name.trim()).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

export async function upsertClient(teamspaceId: string, c: Extracted, taskId?: string) {
  const db = await admin();
  const phone = normPhone(c.phone);
  if (!phone && !c.email?.trim() && !c.name?.trim()) return null;
  const existing = await findExisting(teamspaceId, c);
  const clean = (v?: string) => (v && v.trim() ? v.trim() : null);
  if (existing) {
    const patch: { name?: string; phone?: string | null; phone_norm?: string; email?: string; company?: string; notes?: string; source_task_ids?: string[] } = {};
    if (clean(c.name) && !existing.name) patch.name = clean(c.name)!;
    if (phone && !existing.phone_norm) { patch.phone = clean(c.phone); patch.phone_norm = phone; }
    if (clean(c.email) && clean(c.email) !== existing.email) patch.email = clean(c.email)!;
    if (clean(c.company) && clean(c.company) !== existing.company) patch.company = clean(c.company)!;
    if (clean(c.notes) && !(existing.notes ?? "").includes(clean(c.notes)!)) patch.notes = [existing.notes, clean(c.notes)].filter(Boolean).join("\n").slice(-2000);
    if (taskId && !existing.source_task_ids.includes(taskId)) patch.source_task_ids = [...existing.source_task_ids, taskId];
    if (Object.keys(patch).length) await db.from("clients").update(patch).eq("id", existing.id);
    return { id: existing.id, created: false, changed: Object.keys(patch).length > 0 };
  }
  const { data, error } = await db.from("clients").insert({
    teamspace_id: teamspaceId, name: clean(c.name) ?? "", phone: clean(c.phone), phone_norm: phone,
    email: clean(c.email), company: clean(c.company), notes: clean(c.notes), source_task_ids: taskId ? [taskId] : [],
  }).select("id").single();
  if (error) {
    // Race on the unique phone index — treat as existing.
    if (error.code === "23505") return upsertClient(teamspaceId, c, taskId);
    throw new Error(error.message);
  }
  return { id: data.id, created: true, changed: true };
}

/** Called after a task is created/updated. Cheap regex gate before any AI call. */
export async function syncClientsFromTask(taskId: string) {
  const db = await admin();
  const { data: t } = await db.from("tasks").select("id, title, description, teamspace_id, project").eq("id", taskId).maybeSingle();
  if (!t?.teamspace_id) return { found: 0 };
  const text = `${t.title}\n${t.description ?? ""}`;
  if (!hasClientSignals(text)) return { found: 0 };
  const { data: mem } = await db.from("teamspace_members").select("user_id").eq("teamspace_id", t.teamspace_id);
  const { data: profs } = await db.from("profiles").select("email").in("id", (mem ?? []).map((m) => m.user_id));
  const teamEmails = (profs ?? []).map((p) => (p.email ?? "").toLowerCase()).filter(Boolean);
  let list = await aiExtract(`Задача: ${t.title}${t.project ? ` [проект ${t.project}]` : ""}\n${t.description ?? ""}`, teamEmails);
  if (!list.length) {
    // Fallback without AI: phones found by regex, name unknown.
    list = (text.match(PHONE_RE) ?? []).filter((p) => normPhone(p)).map((p) => ({ phone: p, notes: t.title }));
  }
  list = list.filter((c) => !c.email || !teamEmails.includes(c.email.toLowerCase()));
  let changed = 0;
  for (const c of list) {
    const r = await upsertClient(t.teamspace_id, c, t.id);
    if (r?.changed) changed++;
  }
  if (changed) await syncSheet(t.teamspace_id).catch(() => {});
  return { found: list.length, changed };
}

/** Process task-triggered client extraction outside the user-visible save path. */
export async function processClientSyncQueue(limit = 10) {
  const db = await admin();
  const { data: queued } = await db
    .from("client_sync_queue")
    .select("task_id")
    .order("queued_at", { ascending: true })
    .limit(limit);
  let processed = 0;
  let failed = 0;
  for (const item of queued ?? []) {
    try {
      await syncClientsFromTask(item.task_id);
      await db.from("client_sync_queue").delete().eq("task_id", item.task_id);
      processed++;
    } catch {
      failed++;
    }
  }
  return { processed, failed, pending: Math.max(0, (queued?.length ?? 0) - processed) };
}

export async function listClients(userId: string, teamspaceId: string) {
  await requireClientManager(userId, teamspaceId);
  const db = await admin();
  const [{ data: clients }, { data: settings }] = await Promise.all([
    db.from("clients").select("id, name, phone, email, company, notes, status, source_task_ids, updated_at")
      .eq("teamspace_id", teamspaceId).order("updated_at", { ascending: false }),
    db.from("client_db_settings").select("sheet_url, doc_url, last_sync_at, last_error").eq("teamspace_id", teamspaceId).maybeSingle(),
  ]);
  return { clients: clients ?? [], settings: settings ?? null };
}

export async function saveClient(userId: string, teamspaceId: string, c: { id?: string; name: string; phone?: string | null; email?: string | null; company?: string | null; notes?: string | null; status?: string | null }) {
  await requireClientManager(userId, teamspaceId);
  const db = await admin();
  const phone_norm = normPhone(c.phone);
  if (phone_norm) {
    const { data: dup } = await db.from("clients").select("id, name").eq("teamspace_id", teamspaceId).eq("phone_norm", phone_norm).maybeSingle();
    if (dup && dup.id !== c.id) throw new Error(`Этот номер уже есть у клиента «${dup.name || "без имени"}»`);
  }
  const row = { name: c.name.trim(), phone: c.phone?.trim() || null, phone_norm, email: c.email?.trim() || null,
    company: c.company?.trim() || null, notes: c.notes?.trim() || null, status: c.status?.trim() || null };
  if (c.id) await db.from("clients").update(row).eq("id", c.id).eq("teamspace_id", teamspaceId);
  else await db.from("clients").insert({ ...row, teamspace_id: teamspaceId });
  await syncSheet(teamspaceId).catch(() => {});
  return { ok: true };
}

export async function deleteClient(userId: string, teamspaceId: string, id: string) {
  await requireClientManager(userId, teamspaceId);
  const db = await admin();
  await db.from("clients").delete().eq("id", id).eq("teamspace_id", teamspaceId);
  await syncSheet(teamspaceId).catch(() => {});
  return { ok: true };
}

export async function scanTasks(userId: string, teamspaceId: string) {
  await requireClientManager(userId, teamspaceId);
  const db = await admin();
  const { data: tasks } = await db.from("tasks").select("id, title, description").eq("teamspace_id", teamspaceId)
    .order("updated_at", { ascending: false }).limit(500);
  const hits = (tasks ?? []).filter((t) => hasClientSignals(`${t.title}\n${t.description ?? ""}`)).slice(0, 60);
  let changed = 0;
  for (const t of hits) changed += (await syncClientsFromTask(t.id)).changed ?? 0;
  await syncSheet(teamspaceId).catch(() => {});
  return { scanned: tasks?.length ?? 0, with_contacts: hits.length, changed };
}

// ---------- Google Sheet mirror ----------
const HEADERS = ["Имя", "Телефон", "Email", "Компания", "Статус", "Заметки", "Задачи-источники", "Обновлено"];
const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function buildCsv(teamspaceId: string) {
  const db = await admin();
  const { data } = await db.from("clients").select("name, phone, email, company, status, notes, source_task_ids, updated_at")
    .eq("teamspace_id", teamspaceId).order("name");
  const ids = [...new Set((data ?? []).flatMap((c) => c.source_task_ids))];
  const { data: tasks } = ids.length ? await db.from("tasks").select("id, title").in("id", ids) : { data: [] as { id: string; title: string }[] };
  const rows = (data ?? []).map((c) => [c.name, c.phone, c.email, c.company, c.status, c.notes,
    c.source_task_ids.map((id) => tasks?.find((t) => t.id === id)?.title).filter(Boolean).join("; "), c.updated_at.slice(0, 16).replace("T", " ")]);
  return [HEADERS, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

export async function syncSheet(teamspaceId: string) {
  const db = await admin();
  const { data: s } = await db.from("client_db_settings").select("*").eq("teamspace_id", teamspaceId).maybeSingle();
  if (!s?.sheet_id) return { skipped: true };
  const { driveFetch } = await import("./google-drive.server");
  const csv = await buildCsv(teamspaceId);
  const res = await driveFetch(s.owner_user_id, `/upload/drive/v3/files/${s.sheet_id}?uploadType=media`, {
    method: "PATCH", headers: { "Content-Type": "text/csv; charset=UTF-8" }, body: csv,
  });
  if (!res.ok) {
    const t = await res.text();
    await db.from("client_db_settings").update({ last_error: `Google Sheets [${res.status}]: ${t.slice(0, 200)}` }).eq("teamspace_id", teamspaceId);
    throw new Error(`Google Sheets sync failed [${res.status}]`);
  }
  await db.from("client_db_settings").update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("teamspace_id", teamspaceId);
  return { ok: true };
}

const GUIDE = (sheetUrl: string) => `База клиентов — методичка

Ссылка на Google Таблицу: ${sheetUrl}

Как работает база:
1. Единый источник — раздел «Клиенты» в Space. Google Таблица обновляется автоматически после каждого изменения.
2. Если в задаче Task Tracker (в названии или описании) есть номер телефона или email клиента, AI определяет клиента и добавляет его в базу или обновляет существующую запись.
3. Дубликаты не создаются: сначала сверяется номер телефона (в любом формате: +996 555 12-34-56, 0555123456), затем email.
4. У каждого клиента видны задачи, из которых пришли данные.
5. Править данные лучше в Space (раздел «Клиенты») — ручные правки в Google Таблице перезапишутся при следующей синхронизации.
6. Чат-помощник отвечает на вопросы о клиентах по этой базе: «Найди клиента с номером…», «Какие клиенты у компании X?», «Что нужно клиенту Y?».

Как добавить клиента: укажите в задаче имя и телефон (например «Позвонить Айбеку +996 555 123 456 по договору») или добавьте строку в разделе «Клиенты».`;

export async function setupClientDatabase(userId: string, teamspaceId: string) {
  await requireClientManager(userId, teamspaceId);
  const db = await admin();
  const { data: existing } = await db.from("client_db_settings").select("sheet_url").eq("teamspace_id", teamspaceId).maybeSingle();
  if (existing?.sheet_url) return { sheet_url: existing.sheet_url };
  const { driveFetch, createDocWithContent } = await import("./google-drive.server");
  const { data: ts } = await db.from("teamspaces").select("name").eq("id", teamspaceId).single();
  const title = `База клиентов — ${ts?.name ?? "Space"}`;

  const boundary = `vsb${Math.random().toString(36).slice(2)}`;
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: title, mimeType: "application/vnd.google-apps.spreadsheet" }) +
    `\r\n--${boundary}\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n${await buildCsv(teamspaceId)}\r\n--${boundary}--`;
  const res = await driveFetch(userId, "/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Не удалось создать Google Таблицу [${res.status}]: ${txt.slice(0, 200)}`);
  const sheet = JSON.parse(txt) as { id: string; webViewLink: string };

  let docUrl: string | null = null;
  try {
    const doc = await createDocWithContent(userId, `База клиентов — методичка (${ts?.name ?? "Space"})`, GUIDE(sheet.webViewLink));
    docUrl = doc.webViewLink ?? null;
  } catch { /* the guide is also stored in the Knowledge Base text below */ }

  await db.from("client_db_settings").upsert({ teamspace_id: teamspaceId, owner_user_id: userId, sheet_id: sheet.id,
    sheet_url: sheet.webViewLink, doc_url: docUrl, last_sync_at: new Date().toISOString() });

  const docs = [
    { name: "База клиентов", url: docUrl ?? sheet.webViewLink, link_kind: docUrl ? "google_docs" : "google_sheets", text: GUIDE(sheet.webViewLink) },
    { name: "База клиентов — Google Таблица", url: sheet.webViewLink, link_kind: "google_sheets", text: `Google Таблица базы клиентов: ${sheet.webViewLink}` },
  ];
  for (const d of docs) {
    await db.from("documents").insert({ teamspace_id: teamspaceId, user_id: userId, name: d.name, storage_path: "",
      mime_type: "text/uri-list", size_bytes: 0, url: d.url, link_kind: d.link_kind, tags: ["clients", "company"],
      extracted_text: d.text, extract_status: "ready" });
  }
  return { sheet_url: sheet.webViewLink, doc_url: docUrl };
}

/** Compact context for the chat assistant. */
export async function clientsContext(teamspaceId: string, limit = 300) {
  const db = await admin();
  const { data } = await db.from("clients").select("name, phone, email, company, status, notes, source_task_ids")
    .eq("teamspace_id", teamspaceId).order("updated_at", { ascending: false }).limit(limit);
  if (!data?.length) return "";
  const lines = data.map((c) => `- ${c.name || "без имени"} | тел: ${c.phone ?? "—"} | email: ${c.email ?? "—"} | компания: ${c.company ?? "—"}${c.status ? ` | статус: ${c.status}` : ""}${c.notes ? ` | заметки: ${c.notes.replace(/\n/g, "; ").slice(0, 200)}` : ""} | задач: ${c.source_task_ids.length}`);
  return `\n\nБАЗА КЛИЕНТОВ (${data.length}). Отвечай на вопросы о клиентах только по этим данным, указывай телефон/email/компанию:\n${lines.join("\n")}\n`;
}

/** Personal assistant «Виэй» + client reminders from Google Sheets — server only. */
import {
  MAP_FIELDS, addDays, bishkekToday, evaluateTab, heuristicTabMap, isArchiveTab, ymdKey,
  type Cell, type RowHit, type TabMap, type Ymd,
} from "./reminders-core";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const SKILLS = ["meetings", "calendar", "tasks", "agreements", "clients", "reminders"] as const;

async function requireMember(userId: string, teamspaceId: string) {
  const db = await admin();
  const { data } = await db.from("teamspace_members").select("id").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Нет доступа к пространству");
}

export async function getAssistant(userId: string, teamspaceId: string) {
  await requireMember(userId, teamspaceId);
  const db = await admin();
  const { data: a } = await db.from("personal_assistants").select("*").eq("user_id", userId).eq("teamspace_id", teamspaceId).maybeSingle();
  if (!a) return { assistant: null, sources: [] };
  const { data: sources } = await db.from("reminder_sources").select("*").eq("assistant_id", a.id).order("created_at");
  return { assistant: a, sources: sources ?? [] };
}

export async function saveAssistant(userId: string, teamspaceId: string, input: { name: string; skills: string[] }) {
  await requireMember(userId, teamspaceId);
  const db = await admin();
  const skills = input.skills.filter((s) => (SKILLS as readonly string[]).includes(s));
  const { data, error } = await db.from("personal_assistants")
    .upsert({ user_id: userId, teamspace_id: teamspaceId, name: input.name.trim().slice(0, 40) || "Виэй", skills }, { onConflict: "user_id,teamspace_id" })
    .select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

async function ownAssistant(userId: string, teamspaceId: string) {
  const { assistant } = await getAssistant(userId, teamspaceId);
  if (!assistant) throw new Error("Сначала создайте ассистента");
  return assistant;
}
async function ownSource(userId: string, sourceId: string) {
  const db = await admin();
  const { data: s } = await db.from("reminder_sources").select("*, personal_assistants!inner(user_id, teamspace_id, id)").eq("id", sourceId).maybeSingle();
  const a = (s as unknown as { personal_assistants?: { user_id: string } } | null)?.personal_assistants;
  if (!s || a?.user_id !== userId) throw new Error("Источник не найден");
  return s;
}

// ---------- reading ----------
export type Workbook = { title: string; tabs: { name: string; rows: Cell[][] }[] };

export async function readWorkbook(sheetUrl: string): Promise<Workbook> {
  const m = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) throw new Error("Это не ссылка на Google Таблицу");
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=xlsx`, { redirect: "follow" });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || ct.includes("text/html")) throw new Error("Таблица недоступна — откройте доступ «Любой, у кого есть ссылка».");
  const XLSX = await import("xlsx");
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array", cellDates: false });
  const tabs = wb.SheetNames.map((name) => {
    const sh = wb.Sheets[name];
    const rows = sh ? (XLSX.utils.sheet_to_json<Cell[]>(sh, { header: 1, raw: true, defval: "", blankrows: true }) as Cell[][]) : [];
    return { name, rows: rows.slice(0, 3000) };
  });
  const title = (res.headers.get("content-disposition") || "").match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1];
  return { title: title ? decodeURIComponent(title).replace(/\.xlsx$/i, "") : "Google Таблица", tabs };
}

/** AI proposes the mapping per tab (header row may be lower than row 1); heuristic fallback. */
export async function aiMapping(tabs: Workbook["tabs"]): Promise<Record<string, TabMap>> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key || !tabs.length) return {};
  const sample = tabs.map((t) => ({
    tab: t.name,
    rows: t.rows.slice(0, 25).map((r, i) => `${i}: ${r.slice(0, 16).map((c) => String(c ?? "").slice(0, 25)).join(" | ")}`).join("\n"),
  }));
  const fieldProps = Object.fromEntries(MAP_FIELDS.map((f) => [f, { type: "integer" }]));
  const schema = {
    type: "object", additionalProperties: false, required: ["tabs"],
    properties: { tabs: { type: "array", items: { type: "object", additionalProperties: false, required: ["tab", "header_row", ...MAP_FIELDS], properties: { tab: { type: "string" }, header_row: { type: "integer" }, ...fieldProps } } } },
  };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        response_format: { type: "json_schema", json_schema: { name: "mapping", strict: true, schema } },
        messages: [
          { role: "system", content: "You map spreadsheet columns of a client list. For each tab find the 0-based header row index (it may not be the first row; -1 if the tab has no client table) and the 0-based column index of: name (client full name/ФИО), phone (contacts), birthday, sub_start (subscription/classes start), sub_end (subscription/classes end), followup (next contact date), responsible (administrator/trainer/manager), comment. Use -1 when absent. Columns are separated by ' | ' and numbered from 0." },
          { role: "user", content: sample.map((s) => `### TAB: ${s.tab}\n${s.rows}`).join("\n\n").slice(0, 60000) },
        ],
      }),
    });
    if (!res.ok) { console.error("[assistant] mapping AI", res.status, (await res.text()).slice(0, 200)); return {}; }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as { tabs?: (TabMap & { tab: string })[] };
    const out: Record<string, TabMap> = {};
    for (const t of parsed.tabs ?? []) if (t.header_row >= 0 && (t.name ?? -1) >= 0) { const { tab, ...map } = t; out[tab] = map; }
    return out;
  } catch (e) {
    console.error("[assistant] mapping AI failed", e);
    return {};
  }
}

export async function proposeSource(userId: string, teamspaceId: string, sheetUrl: string, useAi = true) {
  await ownAssistant(userId, teamspaceId);
  const wb = await readWorkbook(sheetUrl);
  const active = wb.tabs.filter((t) => !isArchiveTab(t.name));
  const ai = useAi ? await aiMapping(active) : {};
  const tabs = wb.tabs.map((t) => {
    const map = ai[t.name] ?? heuristicTabMap(t.rows);
    const start = map ? map.header_row : 0;
    return {
      name: t.name,
      archive: isArchiveTab(t.name),
      map,
      source: ai[t.name] ? "ai" : map ? "heuristic" : "none",
      preview: t.rows.slice(start, start + 6).map((r) => r.slice(0, 16).map((c) => String(c ?? "").slice(0, 40))),
      columns: Math.max(0, ...t.rows.slice(start, start + 20).map((r) => r.length)),
    };
  });
  return { title: wb.title, tabs };
}

export async function saveSource(userId: string, teamspaceId: string, input: { id?: string; sheet_url: string; title?: string; tabs: string[]; column_map: Record<string, TabMap>; enabled?: boolean }) {
  const a = await ownAssistant(userId, teamspaceId);
  const db = await admin();
  const row = { assistant_id: a.id, teamspace_id: teamspaceId, sheet_url: input.sheet_url, title: input.title ?? null, tabs: input.tabs, column_map: input.column_map, enabled: input.enabled ?? true };
  if (input.id) {
    await ownSource(userId, input.id);
    const { data, error } = await db.from("reminder_sources").update(row).eq("id", input.id).select("*").single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await db.from("reminder_sources").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSource(userId: string, sourceId: string) {
  await ownSource(userId, sourceId);
  const db = await admin();
  await db.from("reminder_sources").delete().eq("id", sourceId);
}

// ---------- evaluation ----------
type Member = { id: string; name: string; email: string | null };
type SourceRow = { id: string; sheet_url: string; tabs: unknown; column_map: unknown; teamspace_id: string };
export type PlannedItem = RowHit & { tab: string; day: string; recipient_id: string; recipient_name: string; matched: boolean; in_client_db: boolean | null };

async function teamMembers(teamspaceId: string): Promise<Member[]> {
  const db = await admin();
  const { data: ms } = await db.from("teamspace_members").select("user_id").eq("teamspace_id", teamspaceId);
  const ids = (ms ?? []).map((m) => m.user_id);
  if (!ids.length) return [];
  const { data: ps } = await db.from("profiles").select("id, full_name, email").in("id", ids);
  return (ps ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email || "", email: p.email }));
}

/** Computes reminders for the given days from one source. Never sends anything. */
export async function planSource(source: SourceRow, ownerId: string, days: Ymd[], opts: { checkClients: boolean; wb?: Workbook }) {
  const wb = opts.wb ?? (await readWorkbook(source.sheet_url));
  const tabs = Array.isArray(source.tabs) ? (source.tabs as string[]) : [];
  const maps = (source.column_map ?? {}) as Record<string, TabMap>;
  const members = await teamMembers(source.teamspace_id);
  const owner = members.find((m) => m.id === ownerId);
  const { matchMember } = await import("./task-import.server");
  const { normPhone } = await import("./clients.server");
  const items: PlannedItem[] = [];
  let invalid = 0;
  for (const t of wb.tabs) {
    const map = maps[t.name];
    if (!tabs.includes(t.name) || !map) continue;
    for (const day of days) {
      const r = evaluateTab(t.name, t.rows, map, day);
      if (day === days[0]) invalid += r.invalid;
      for (const h of r.hits) {
        const who = h.responsible ? matchMember(h.responsible, members) : null;
        items.push({ ...h, tab: t.name, day: ymdKey(day), recipient_id: who?.id ?? ownerId, recipient_name: who?.name ?? owner?.name ?? "Владелец", matched: !!who, in_client_db: null });
      }
    }
  }
  if (opts.checkClients && items.length) {
    const db = await admin();
    const phones = [...new Set(items.map((i) => normPhone(i.phone)).filter(Boolean))] as string[];
    const known = new Set<string>();
    for (let i = 0; i < phones.length; i += 200) {
      const { data } = await db.from("clients").select("phone_norm").eq("teamspace_id", source.teamspace_id).in("phone_norm", phones.slice(i, i + 200));
      (data ?? []).forEach((c) => c.phone_norm && known.add(c.phone_norm));
    }
    for (const it of items) { const p = normPhone(it.phone); it.in_client_db = p ? known.has(p) : false; }
  }
  return { items, invalid };
}

export async function previewReminders(userId: string, teamspaceId: string, sourceId?: string) {
  const a = await ownAssistant(userId, teamspaceId);
  const db = await admin();
  let q = db.from("reminder_sources").select("*").eq("assistant_id", a.id).eq("enabled", true);
  if (sourceId) q = q.eq("id", sourceId);
  const { data: sources } = await q;
  const { isWorkspaceManager } = await import("./roles.server");
  const checkClients = await isWorkspaceManager(userId, teamspaceId);
  const today = bishkekToday();
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));
  const items: PlannedItem[] = [];
  let invalid = 0;
  const errors: string[] = [];
  for (const s of sources ?? []) {
    try { const r = await planSource(s, userId, days, { checkClients }); items.push(...r.items); invalid += r.invalid; }
    catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
  }
  return { today: ymdKey(today), items, invalid, errors };
}

const KIND_TITLE: Record<string, string> = { birthday: "🎂 Дни рождения", subscription_end: "⏳ Абонементы", followup: "📞 Follow-up" };

export function formatDigest(items: PlannedItem[]) {
  const lines: string[] = [];
  for (const kind of ["birthday", "subscription_end", "followup"]) {
    const group = items.filter((i) => i.kind === kind);
    if (!group.length) continue;
    lines.push(KIND_TITLE[kind]);
    for (const i of group) {
      const db = i.in_client_db === null ? "" : i.in_client_db ? " · есть в базе клиентов" : " · нет в базе — добавить?";
      lines.push(`• ${i.name} — ${i.reason}${i.phone ? ` · +${i.phone}` : ""} · лист «${i.tab}»${db}\n  Текст: ${i.message}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

/** Daily 09:00 Bishkek run: one digest per employee, deduplicated by reminder_log. Never messages clients. */
export async function runClientReminders(opts: { dryRun?: boolean } = {}) {
  const db = await admin();
  const { data: sources } = await db.from("reminder_sources").select("*, personal_assistants!inner(user_id, skills)").eq("enabled", true);
  const today = bishkekToday();
  const { isWorkspaceManager } = await import("./roles.server");
  const { deliver } = await import("./agent-automation.server");
  const perRecipient = new Map<string, { teamspaceId: string; actorId: string; items: PlannedItem[] }>();
  let checked = 0;
  for (const s of sources ?? []) {
    const a = (s as unknown as { personal_assistants: { user_id: string; skills: string[] } }).personal_assistants;
    if (!a.skills?.includes("reminders")) continue;
    try {
      const { items } = await planSource(s, a.user_id, [today], { checkClients: await isWorkspaceManager(a.user_id, s.teamspace_id) });
      checked++;
      if (!opts.dryRun && items.length) {
        // Claim first: the unique constraint makes concurrent runs deliver each item once.
        const { data: claimed } = await db.from("reminder_log")
          .upsert(items.map((i) => ({ source_id: s.id, row_key: i.log_key, kind: i.kind, event_date: i.event_date, notified_user_id: i.recipient_id })), { onConflict: "source_id,row_key,kind,event_date", ignoreDuplicates: true })
          .select("row_key, kind, event_date");
        const fresh = new Set((claimed ?? []).map((c) => `${c.row_key}|${c.kind}|${c.event_date}`));
        for (const i of items) {
          if (!fresh.has(`${i.log_key}|${i.kind}|${i.event_date}`)) continue;
          const k = `${s.teamspace_id}:${i.recipient_id}`;
          const e = perRecipient.get(k) ?? { teamspaceId: s.teamspace_id, actorId: a.user_id, items: [] };
          e.items.push(i);
          perRecipient.set(k, e);
        }
      }
      await db.from("reminder_sources").update({ last_checked_at: new Date().toISOString(), last_error: null }).eq("id", s.id);
    } catch (e) {
      await db.from("reminder_sources").update({ last_checked_at: new Date().toISOString(), last_error: (e instanceof Error ? e.message : String(e)).slice(0, 300) }).eq("id", s.id);
    }
  }
  let sent = 0;
  for (const [k, e] of perRecipient) {
    try {
      await deliver({ userId: k.split(":")[1], teamspaceId: e.teamspaceId, actorId: e.actorId, title: "🔔 Напоминания по клиентам на сегодня", body: formatDigest(e.items).slice(0, 3800) });
      sent++;
    } catch (err) { console.error("[client-reminders] deliver", err); }
  }
  return { checked, digests: sent };
}

/** Compact context for the personal chat: who to greet / whose subscription ends (today + 7 days). */
export async function assistantChatContext(userId: string, teamspaceId: string) {
  const { assistant, sources } = await getAssistant(userId, teamspaceId);
  if (!assistant) return { preamble: "", allowClients: false };
  const { isWorkspaceManager } = await import("./roles.server");
  const allowClients = await isWorkspaceManager(userId, teamspaceId);
  let reminders = "";
  if (assistant.skills.includes("reminders") && sources.length) {
    try {
      const p = await previewReminders(userId, teamspaceId);
      reminders = "\nCLIENT REMINDERS FROM SHEETS (today and next 7 days, Asia/Bishkek):\n" +
        (p.items.slice(0, 80).map((i) => `- ${i.day}: ${i.name} — ${i.reason}; phone ${i.phone || "—"}; tab «${i.tab}»; responsible ${i.recipient_name}`).join("\n") || "- none");
    } catch { /* sheet unavailable */ }
  }
  const preamble =
    `ACTIVE AGENT MODE: You are «${assistant.name}» (mascot Виэй), the user's personal assistant. Be friendly, warm, very short and simple; reply in the user's language. ` +
    `Skills the user enabled: ${assistant.skills.join(", ") || "none"}. Focus on the user's own tasks, meetings and clients. ` +
    "Never send anything to clients yourself; only draft texts for the user or the responsible employee. Create tasks and messages only with the existing action tokens so the user confirms them." +
    reminders + "\n\n";
  return { preamble, allowClients };
}

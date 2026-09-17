/** Parse a table (xlsx/csv/Google Sheet/knowledge-base file) into task rows — server only. */
import type { ImportRow, PreviewResult, PreviewRow, PreviewTasksInput } from "./task-import.schemas";

type Sheet = { name: string; rows: string[][] };
type Priority = "low" | "medium" | "high" | "urgent";
type Status = "backlog" | "in_progress" | "review" | "done";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === "," || c === ";" || c === "\t") { row.push(cell); cell = ""; continue; }
    if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (c === "\r") continue;
    cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim()));
}

function sheetsFromText(text: string): Sheet[] {
  if (/^##\s*SHEET:/m.test(text)) {
    const parts = text.split(/^##\s*SHEET:\s*/m).filter((p) => p.trim());
    return parts.map((p) => {
      const nl = p.indexOf("\n");
      const name = (nl === -1 ? p : p.slice(0, nl)).trim() || "Sheet";
      const body = nl === -1 ? "" : p.slice(nl + 1);
      return { name, rows: parseCsv(body) };
    });
  }
  return [{ name: "Sheet1", rows: parseCsv(text) }];
}

async function sheetsFromBytes(bytes: Uint8Array): Promise<Sheet[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(bytes, { type: "array", cellDates: true });
  return wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return { name, rows: [] as string[][] };
    const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: false, dateNF: "yyyy-mm-dd" });
    const rows = json.map((r) => (r ?? []).map((c) => (c == null ? "" : String(c))));
    return { name, rows: rows.filter((r) => r.some((v) => v.trim())) };
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const HEADERS: Record<string, RegExp> = {
  title: /^(задач|название|заголовок|тема|что сделать|title|task|name|summary|subject)/i,
  description: /^(опис|детал|коммент|подроб|следующ|результат|критер|description|details|notes?|comment|next step)/i,
  priority: /^(приоритет|важн|срочност|срочн|priority|prio|urgency)/i,
  status: /^(статус|состояние|этап|колонка|status|state|stage|column)/i,
  due_date: /^(срок|дедлайн|дата|до|due|deadline|date)/i,
  assignee:
    /^(исполнит|ответствен|отвеч|назнач|кому|кто|сотрудник|участник|команда|лид|куратор|менеджер|assignee|owner|responsible|assigned|who|lead|person|member|team)/i,
};

function detectHeader(rows: string[][]) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const map: Partial<Record<keyof typeof HEADERS, number>> = {};
    row.forEach((cell, idx) => {
      const v = cell.trim();
      if (!v) return;
      for (const key of Object.keys(HEADERS) as (keyof typeof HEADERS)[]) {
        if (map[key] === undefined && HEADERS[key].test(v)) map[key] = idx;
      }
    });
    if (map.title !== undefined) return { index: i, map };
  }
  return null;
}

function normPriority(v: string): Priority | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (/^(urgent|critical|blocker|asap|срочн|критич|блок|экстрен|немедлен|горит|p0|4)$/.test(s)) return "urgent";
  if (/^(high|major|высок|важн|высший|очень высок|p1|3)$/.test(s)) return "high";
  if (/^(medium|normal|mid|средн|обычн|норм|стандарт|p2|2)$/.test(s)) return "medium";
  if (/^(low|minor|trivial|низк|мелк|не срочн|можно позже|желател|p3|1)$/.test(s)) return "low";
  if (/не ?срочн|не горит/.test(s)) return "low";
  if (/срочн|urgent|critical|asap|критич|🔴|🔥|!!!|экстрен/.test(s)) return "urgent";
  if (/высок|high|major|важн|🟠|!!/.test(s)) return "high";
  if (/низк|low|minor|неспеш|🟢/.test(s)) return "low";
  if (/средн|medium|normal|🟡/.test(s)) return "medium";
  return undefined;
}

function normStatus(v: string): Status | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (/^(не |not |ещё не|еще не)/.test(s) || /(ожида|not started|новая|new)/.test(s)) return "backlog";
  if (/(done|complete|готов|заверш|выполн|сделан|закрыт)/.test(s)) return "done";
  if (/(review|проверк|ревью|на согласован|тест)/.test(s)) return "review";
  if (/(progress|в работе|в процессе|делаю|начат|doing)/.test(s)) return "in_progress";
  if (/(backlog|todo|to do|бэклог|беклог|очеред|план|新)/.test(s)) return "backlog";
  return undefined;
}

function normDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86_400_000);
    return d.toISOString().slice(0, 10);
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya", ү: "u", ө: "o", ң: "n", ұ: "u", қ: "k", ә: "a", і: "i",
};

/** Cyrillic and Latin spellings of the same name compared on one alphabet. */
function latinKey(v: string) {
  return v
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/kh/g, "h")
    .replace(/[aeiouy]/g, "")
    .trim();
}

function matchMember(raw: string, members: { id: string; name: string; email: string | null }[]) {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const key = latinKey(s);
  if (key.length > 1) {
    const byKey = members.find((m) => {
      const parts = [latinKey(m.name), latinKey((m.email ?? "").split("@")[0] ?? "")];
      return parts.some((p) => p && (p === key || p.split(" ").includes(key) || p.startsWith(key)));
    });
    if (byKey) return byKey;
  }
  const exact = members.find(
    (m) => m.name.toLowerCase() === s || (m.email ?? "").toLowerCase() === s,
  );
  if (exact) return exact;
  const partial = members.find((m) => {
    const name = m.name.toLowerCase();
    const first = name.split(/\s+/)[0];
    const mail = (m.email ?? "").toLowerCase().split("@")[0];
    return (
      (name && (name.includes(s) || s.includes(name))) ||
      (first && first.length > 2 && (first === s || s.startsWith(`${first} `))) ||
      (mail && mail.length > 2 && mail === s)
    );
  });
  return partial ?? null;
}

async function loadSheets(userId: string, input: PreviewTasksInput): Promise<Sheet[]> {
  if (input.file_base64) {
    const bytes = b64ToBytes(input.file_base64);
    const name = input.file_name ?? "";
    if (/\.(xlsx|xls|xlsm|xlsb|ods)$/i.test(name)) return sheetsFromBytes(bytes);
    return sheetsFromText(new TextDecoder().decode(bytes));
  }
  if (input.sheet_url) {
    const m = input.sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) throw new Error("Это не ссылка на Google Таблицу");
    const gid = input.sheet_url.match(/[#&?]gid=(\d+)/)?.[1] ?? null;
    // Try the exact sheet tab first, then the default export, then the gviz endpoint.
    const urls = [
      gid ? `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}` : null,
      `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`,
      `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ""}`,
    ].filter(Boolean) as string[];

    for (const url of urls) {
      const res = await fetch(url, { redirect: "follow" });
      const csv = await res.text();
      if (res.ok && !/<html/i.test(csv.slice(0, 200)) && csv.trim()) {
        return sheetsFromText(csv);
      }
    }
    throw new Error("Таблица недоступна — откройте доступ «Любой, у кого есть ссылка».");
  }
  if (input.document_id) {
    const db = await admin();
    const { data } = await db
      .from("documents")
      .select("name, extracted_text, teamspace_id")
      .eq("id", input.document_id)
      .eq("teamspace_id", input.teamspace_id)
      .maybeSingle();
    if (!data) throw new Error("Файл не найден в этом пространстве.");
    if (!data.extracted_text) throw new Error("У файла ещё нет прочитанного текста — переиндексируйте его.");
    return sheetsFromText(data.extracted_text);
  }
  if (input.drive_file_id) {
    const gd = await import("./google-drive.server");
    const driveUser = await gd.resolveDriveUserId(userId);
    if (!driveUser) throw new Error("Google Drive не подключён");
    const doc = await gd.readFile(driveUser, input.drive_file_id);
    return sheetsFromText(String(doc.content ?? ""));
  }
  throw new Error("Не передан источник таблицы");
}

export async function previewTasksFromTable(
  userId: string,
  input: PreviewTasksInput,
): Promise<PreviewResult> {
  const { listMembersForUser } = await import("./tasks.server");
  const rawMembers = await listMembersForUser(userId, input.teamspace_id);
  const members = rawMembers.map((m) => ({
    id: m.id,
    name: m.full_name || m.email || "Участник",
    email: m.email,
  }));

  const sheets = await loadSheets(userId, input);
  const db = await admin();
  const { data: existing } = await db
    .from("tasks")
    .select("title")
    .eq("teamspace_id", input.teamspace_id)
    .limit(1000);
  const existingTitles = new Set((existing ?? []).map((t) => t.title.trim().toLowerCase()));

  const out: PreviewRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  const usedSheets: string[] = [];

  for (const sheet of sheets) {
    const header = detectHeader(sheet.rows);
    if (!header) {
      skipped += sheet.rows.length;
      continue;
    }
    usedSheets.push(sheet.name);
    const { map } = header;
    for (let i = header.index + 1; i < sheet.rows.length; i++) {
      const cells = sheet.rows[i];
      const at = (key: keyof typeof HEADERS) => {
        const idx = map[key];
        return idx === undefined ? "" : (cells[idx] ?? "").trim();
      };
      const title = at("title");
      if (!title || /^(итого|total|всего)/i.test(title)) { skipped++; continue; }
      const key = title.toLowerCase();
      const duplicate = existingTitles.has(key) || seen.has(key);
      seen.add(key);
      const assigneeRaw = at("assignee");
      const matched = assigneeRaw ? matchMember(assigneeRaw, members) : null;
      out.push({
        sheet: sheet.name,
        row_number: i + 1,
        title: title.slice(0, 300),
        description: at("description").slice(0, 4000) || null,
        status: normStatus(at("status")) ?? "backlog",
        priority: normPriority(at("priority")) ?? "medium",
        due_date: normDate(at("due_date")),
        assignee_id: matched?.id ?? null,
        assignee_raw: assigneeRaw || null,
        assignee_matched: !!matched,
        duplicate,
        include: !duplicate,
      });
      if (out.length >= 1000) break;
    }
    if (out.length >= 1000) break;
  }

  return {
    rows: out,
    skipped,
    sheets: usedSheets,
    members: members.map((m) => ({ id: m.id, name: m.name })),
  };
}

export async function createTasksBulkForUser(
  userId: string,
  teamspaceId: string,
  rows: ImportRow[],
) {
  const { createTaskForUser } = await import("./tasks.server");
  const { ensurePendingMember } = await import("./pending-members.server");
  const created: { id: string; title: string }[] = [];
  const failed: { title: string; error: string }[] = [];
  const pending = new Set<string>();
  for (const row of rows) {
    try {
      const { assignee_raw, ...rest } = row;
      let assigneeName: string | null = null;
      if (!rest.assignee_id && assignee_raw?.trim()) {
        assigneeName = await ensurePendingMember(userId, teamspaceId, assignee_raw);
        if (assigneeName) pending.add(assigneeName);
      }
      const task = await createTaskForUser(userId, {
        ...rest,
        teamspace_id: teamspaceId,
        assignee_name: assigneeName,
      });
      created.push({ id: task.id, title: task.title });
    } catch (e) {
      failed.push({ title: row.title, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { created, failed, pending_members: Array.from(pending) };
}

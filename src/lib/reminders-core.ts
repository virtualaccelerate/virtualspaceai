/** Pure, browser-safe logic for client reminders from sheets: dates, header detection, rules, dedupe keys. */

export type Ymd = { y: number; m: number; d: number };
export type ReminderKind = "birthday" | "subscription_end" | "followup";
export const MAP_FIELDS = ["name", "parent", "phone", "birthday", "sub_start", "sub_end", "followup", "responsible", "comment"] as const;
export type MapField = (typeof MAP_FIELDS)[number];
/** Per-tab mapping: header row index (0-based) and column index per field (-1 = none). */
export type TabMap = { header_row: number } & Partial<Record<MapField, number>>;
export type Cell = string | number | null | undefined;

function valid(y: number, m: number, d: number): Ymd | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return { y, m, d };
}

/** Parses dd.mm.yyyy, dd/mm/yyyy, dd.mm.yy, yyyy-mm-dd and spreadsheet serial numbers. Returns null for junk ("13 лет", year 1018). */
export function parseSheetDate(v: Cell): Ymd | null {
  if (v == null) return null;
  if (typeof v === "number" || /^\d{5}(\.\d+)?$/.test(String(v).trim())) {
    const n = Math.floor(Number(v));
    if (n < 2 || n > 80000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return valid(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  if (m) {
    let y = +m[3];
    if (m[3].length === 2) y += y <= 40 ? 2000 : 1900;
    else if (m[3].length !== 4) return null;
    return valid(y, +m[2], +m[1]);
  }
  return null;
}

export const ymdKey = (x: Ymd) => `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`;
export const fmtRu = (x: Ymd) => `${String(x.d).padStart(2, "0")}.${String(x.m).padStart(2, "0")}.${x.y}`;
export function addDays(x: Ymd, n: number): Ymd {
  const dt = new Date(Date.UTC(x.y, x.m - 1, x.d) + n * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
/** Today's date in Asia/Bishkek (UTC+6). */
export function bishkekToday(now = new Date()): Ymd {
  const dt = new Date(now.getTime() + 6 * 3600000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function cellText(v: Cell): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v).replace(/\s+/g, " ").trim();
}
export function normDigits(v: Cell): string {
  const s = typeof v === "number" ? Math.round(v).toString() : String(v ?? "");
  return s.replace(/\D/g, "");
}

const HEAD: Record<MapField, RegExp> = {
  parent: /(родител|мама|папа|parent|guardian)/i,
  name: /^(фио|ф\.и\.о|имя|клиент|ученик|name|client)/i,
  phone: /(контакт|телефон|тел\.?|phone|номер|whatsapp)/i,
  birthday: /(дата рожд|день рожд|д\.р|др$|birth)/i,
  sub_start: /(дата начала|начало абон|start)/i,
  sub_end: /(дата оконч|окончание|конец абон|end date|expire)/i,
  followup: /(follow|следующ|созвон|перезвон|напомн)/i,
  responsible: /(администратор|ответствен|тренер|менеджер|responsible|manager|trainer)/i,
  comment: /(коммент|примеч|comment|note)/i,
};

/** Heuristic mapping of one header row. */
export function guessFromHeader(row: Cell[]): Partial<Record<MapField, number>> {
  const out: Partial<Record<MapField, number>> = {};
  row.forEach((c, i) => {
    const t = cellText(c).toLowerCase();
    if (!t) return;
    for (const f of ["parent", ...MAP_FIELDS.filter((x) => x !== "parent")] as MapField[]) if (out[f] === undefined && HEAD[f].test(t)) { out[f] = i; break; }
  });
  return out;
}

/** Finds the header row (may not be the first). Needs a name column plus one more known field. */
export function detectHeaderRow(rows: Cell[][], scan = 40): number {
  for (let i = 0; i < Math.min(rows.length, scan); i++) {
    const g = guessFromHeader(rows[i] ?? []);
    if (g.name !== undefined && Object.keys(g).length >= 2) return i;
  }
  return -1;
}

export function heuristicTabMap(rows: Cell[][]): TabMap | null {
  const h = detectHeaderRow(rows);
  if (h < 0) return null;
  return { header_row: h, ...guessFromHeader(rows[h]) };
}

export const isArchiveTab = (name: string) => /^\s*архив/i.test(name);

const ROLE_WORDS = /^(мама|папа|мать|отец|родитель|бабушка|дедушка|mom|dad)$/i;
/** «Фамилия Имя [Отчество]» → «Имя»; a single word is used as is. Role words like «мама» are skipped. */
export function firstName(full: string): string {
  const words = full.split(/[\s,]+/).filter((w) => /^\p{L}[\p{L}'’-]*$/u.test(w) && !ROLE_WORDS.test(w));
  if (!words.length) return "";
  return words.length >= 2 ? words[1] : words[0];
}

export function rowKey(tab: string, name: string, phone: string): string {
  const n = name.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return `${tab.trim().toLowerCase()}|${phone || n}`;
}
/** Dedupe key matching the reminder_log unique constraint. */
export function dedupeKey(sourceId: string, key: string, kind: ReminderKind, eventDate: string) {
  return `${sourceId}::${key}::${kind}::${eventDate}`;
}

export type RowHit = {
  kind: ReminderKind;
  stage: "today" | "soon";
  event_date: string;
  /** row_key with stage suffix, used in reminder_log */
  log_key: string;
  name: string;
  phone: string;
  responsible: string;
  comment: string;
  reason: string;
  message: string;
};

const get = (row: Cell[], i: number | undefined) => (i === undefined || i < 0 ? undefined : row[i]);

/** Rules for a single day: birthday today / tomorrow; subscription ends today / in 3 days; follow-up today. */
export function evaluateRow(tab: string, row: Cell[], map: TabMap, day: Ymd): { hits: RowHit[]; invalid: boolean } {
  const name = cellText(get(row, map.name));
  if (!name || name.length > 120) return { hits: [], invalid: false };
  const phone = normDigits(get(row, map.phone));
  const responsible = cellText(get(row, map.responsible));
  const comment = cellText(get(row, map.comment)).slice(0, 200);
  const key = rowKey(tab, name, phone);
  const hits: RowHit[] = [];
  let invalid = false;
  const first = firstName(name);
  const parent = firstName(cellText(get(row, map.parent)));
  const hi = parent ? `Здравствуйте, ${parent}!` : `Здравствуйте, ${first}!`;
  const base = { name, phone, responsible, comment };
  const read = (f: MapField) => {
    const raw = get(row, map[f]);
    if (raw == null || cellText(raw) === "" || cellText(raw) === "-") return null;
    const p = parseSheetDate(raw);
    if (!p) invalid = true;
    return p;
  };
  const bd = read("birthday");
  if (bd && bd.y <= day.y) {
    for (const [stage, off] of [["today", 0], ["soon", 1]] as const) {
      const target = addDays(day, off);
      if (bd.m === target.m && bd.d === target.d) {
        const age = target.y - bd.y;
        hits.push({ ...base, kind: "birthday", stage, event_date: ymdKey(target), log_key: `${key}#${stage}`,
          reason: stage === "today" ? `ДР сегодня${age > 0 && age < 120 ? ` (${age})` : ""}` : `ДР завтра, ${fmtRu(target)}`,
          message: parent
            ? `${parent}, здравствуйте! Поздравляем ${first} с днём рождения! 🎉 Желаем здоровья, сил и новых побед. Ждём на тренировках!`
            : `${first}, с днём рождения! 🎉 Желаем здоровья, сил и новых побед. Ждём вас на тренировках!` });
      }
    }
  }
  const end = read("sub_end");
  if (end) {
    for (const [stage, off] of [["today", 0], ["soon", 3]] as const) {
      if (ymdKey(end) === ymdKey(addDays(day, off))) {
        hits.push({ ...base, kind: "subscription_end", stage, event_date: ymdKey(end), log_key: `${key}#${stage}`,
          reason: stage === "today" ? `абонемент заканчивается сегодня (${fmtRu(end)})` : `абонемент заканчивается ${fmtRu(end)}`,
          message: parent ? `${hi} Абонемент ${first} заканчивается ${fmtRu(end)}. Продлеваем?` : `${hi} Ваш абонемент заканчивается ${fmtRu(end)}. Продлеваем?` });
      }
    }
  }
  read("sub_start");
  const fu = read("followup");
  if (fu && ymdKey(fu) === ymdKey(day)) {
    hits.push({ ...base, kind: "followup", stage: "today", event_date: ymdKey(fu), log_key: `${key}#today`,
      reason: "follow-up сегодня", message: `${hi} Хотели уточнить, как у вас дела и удобно ли продолжить занятия?` });
  }
  return { hits, invalid };
}

/** Evaluates all data rows after the header; repeated header rows are skipped. */
export function evaluateTab(tab: string, rows: Cell[][], map: TabMap, day: Ymd) {
  const hits: RowHit[] = [];
  let invalid = 0;
  const headerSig = (rows[map.header_row] ?? []).map(cellText).join("|");
  for (let i = map.header_row + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (row.map(cellText).join("|") === headerSig) continue;
    const r = evaluateRow(tab, row, map, day);
    if (r.invalid) invalid++;
    hits.push(...r.hits);
  }
  return { hits, invalid };
}

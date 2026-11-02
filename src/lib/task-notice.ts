/**
 * One formatter for every task notification (bell + Telegram share the same lines).
 * Pure and browser-safe: no I/O, so it is unit-tested directly.
 */
export type NoticeLang = "ru" | "en" | "ky" | "kk" | "uz" | "tg";
export type NoticeKind =
  | "assigned" | "updated" | "status" | "deleted"
  | "deadline_3h" | "deadline_1h" | "deadline" | "overdue"
  | "external_update" | "external_done";
export type ChangeField = "status" | "due_date" | "assignee" | "priority" | "title" | "archived";
/** `named` = values are already human names (tracker column names), not status codes. */
export type NoticeChange = { field: ChangeField; from: string | null; to: string | null; named?: boolean };
export type NoticeTask = {
  id: string; title: string; project?: string | null; space?: string | null;
  status?: string | null; priority?: string | null; due_date?: string | null;
  external_source?: string | null; external_url?: string | null;
};
export type NoticeInput = {
  kind: NoticeKind; task: NoticeTask; lang?: string | null;
  actor?: string | null; tracker?: string | null; changes?: NoticeChange[];
  tz?: string; now?: number; appUrl?: string;
};
export type FormattedNotice = {
  title: string; lines: string[]; body: string; html: string;
  buttons: { text: string; url: string }[];
};

export const DEFAULT_TZ = "Asia/Bishkek";
const DEADLINE_LOCAL = "18:00";

type Dict = {
  heads: Record<NoticeKind, string>; overdue: (n: number) => string;
  who: string; changed: string; due: string; priority: string; source: string;
  late: (n: number) => string; inTracker: (t: string) => string;
  open: string; openIn: (t: string) => string; none: string;
  fields: Record<ChangeField, string>; status: Record<string, string>; prio: Record<string, string>;
  archived: string; restored: string;
};

const D: Record<NoticeLang, Dict> = {
  ru: {
    heads: { assigned: "📌 Вам назначена задача", updated: "✏️ Задача обновлена", status: "🔄 Статус задачи изменён", deleted: "🗑 Задача удалена", deadline_3h: "⏰ До дедлайна 3 часа", deadline_1h: "⏰ До дедлайна 1 час", deadline: "⏰ Наступил дедлайн задачи", overdue: "🔴 Задача просрочена", external_update: "🔄 Задача обновлена", external_done: "✅ Задача выполнена" },
    overdue: (n) => `🔴 Задача просрочена на ${n} дн.`,
    who: "Кто", changed: "Что изменилось", due: "Срок", priority: "Приоритет", source: "Источник",
    late: (n) => `просрочено на ${n} дн.`, inTracker: (t) => `в ${t}`,
    open: "Открыть задачу", openIn: (t) => `Открыть в ${t}`, none: "—",
    fields: { status: "Статус", due_date: "Срок", assignee: "Исполнитель", priority: "Приоритет", title: "Название", archived: "Трекер" },
    status: { backlog: "Бэклог", in_progress: "В работе", review: "На проверке", done: "Готово" },
    prio: { low: "Низкий", medium: "Средний", high: "Высокий", urgent: "Срочный" },
    archived: "архивирована", restored: "восстановлена",
  },
  en: {
    heads: { assigned: "📌 A task was assigned to you", updated: "✏️ Task updated", status: "🔄 Task status changed", deleted: "🗑 Task deleted", deadline_3h: "⏰ 3 hours until the deadline", deadline_1h: "⏰ 1 hour until the deadline", deadline: "⏰ Task deadline reached", overdue: "🔴 Task overdue", external_update: "🔄 Task updated", external_done: "✅ Task completed" },
    overdue: (n) => `🔴 Task overdue by ${n} d.`,
    who: "By", changed: "What changed", due: "Due", priority: "Priority", source: "Source",
    late: (n) => `overdue by ${n} d.`, inTracker: (t) => `in ${t}`,
    open: "Open task", openIn: (t) => `Open in ${t}`, none: "—",
    fields: { status: "Status", due_date: "Due", assignee: "Assignee", priority: "Priority", title: "Title", archived: "Tracker" },
    status: { backlog: "Backlog", in_progress: "In progress", review: "In review", done: "Done" },
    prio: { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" },
    archived: "archived", restored: "restored",
  },
  ky: {
    heads: { assigned: "📌 Сизге тапшырма берилди", updated: "✏️ Тапшырма жаңыртылды", status: "🔄 Тапшырманын статусу өзгөрдү", deleted: "🗑 Тапшырма өчүрүлдү", deadline_3h: "⏰ Мөөнөткө 3 саат калды", deadline_1h: "⏰ Мөөнөткө 1 саат калды", deadline: "⏰ Тапшырманын мөөнөтү келди", overdue: "🔴 Тапшырма кечикти", external_update: "🔄 Тапшырма жаңыртылды", external_done: "✅ Тапшырма аткарылды" },
    overdue: (n) => `🔴 Тапшырма ${n} күнгө кечикти`,
    who: "Ким", changed: "Эмне өзгөрдү", due: "Мөөнөт", priority: "Артыкчылык", source: "Булак",
    late: (n) => `${n} күнгө кечикти`, inTracker: (t) => `${t} ичинде`,
    open: "Тапшырманы ачуу", openIn: (t) => `${t} ичинде ачуу`, none: "—",
    fields: { status: "Статус", due_date: "Мөөнөт", assignee: "Аткаруучу", priority: "Артыкчылык", title: "Аталыш", archived: "Трекер" },
    status: { backlog: "Бэклог", in_progress: "Иштелүүдө", review: "Текшерүүдө", done: "Даяр" },
    prio: { low: "Төмөн", medium: "Орточо", high: "Жогору", urgent: "Шашылыш" },
    archived: "архивделди", restored: "калыбына келтирилди",
  },
  kk: {
    heads: { assigned: "📌 Сізге тапсырма берілді", updated: "✏️ Тапсырма жаңартылды", status: "🔄 Тапсырма күйі өзгерді", deleted: "🗑 Тапсырма жойылды", deadline_3h: "⏰ Мерзімге 3 сағат қалды", deadline_1h: "⏰ Мерзімге 1 сағат қалды", deadline: "⏰ Тапсырма мерзімі келді", overdue: "🔴 Тапсырма кешікті", external_update: "🔄 Тапсырма жаңартылды", external_done: "✅ Тапсырма орындалды" },
    overdue: (n) => `🔴 Тапсырма ${n} күнге кешікті`,
    who: "Кім", changed: "Не өзгерді", due: "Мерзім", priority: "Басымдық", source: "Дереккөз",
    late: (n) => `${n} күнге кешікті`, inTracker: (t) => `${t} ішінде`,
    open: "Тапсырманы ашу", openIn: (t) => `${t} ішінде ашу`, none: "—",
    fields: { status: "Күйі", due_date: "Мерзім", assignee: "Орындаушы", priority: "Басымдық", title: "Атауы", archived: "Трекер" },
    status: { backlog: "Бэклог", in_progress: "Жұмыста", review: "Тексеруде", done: "Дайын" },
    prio: { low: "Төмен", medium: "Орташа", high: "Жоғары", urgent: "Шұғыл" },
    archived: "мұрағатталды", restored: "қалпына келтірілді",
  },
  uz: {
    heads: { assigned: "📌 Sizga vazifa berildi", updated: "✏️ Vazifa yangilandi", status: "🔄 Vazifa holati o‘zgardi", deleted: "🗑 Vazifa o‘chirildi", deadline_3h: "⏰ Muddatgacha 3 soat qoldi", deadline_1h: "⏰ Muddatgacha 1 soat qoldi", deadline: "⏰ Vazifa muddati keldi", overdue: "🔴 Vazifa kechikdi", external_update: "🔄 Vazifa yangilandi", external_done: "✅ Vazifa bajarildi" },
    overdue: (n) => `🔴 Vazifa ${n} kunga kechikdi`,
    who: "Kim", changed: "Nima o‘zgardi", due: "Muddat", priority: "Muhimlik", source: "Manba",
    late: (n) => `${n} kunga kechikdi`, inTracker: (t) => `${t}da`,
    open: "Vazifani ochish", openIn: (t) => `${t}da ochish`, none: "—",
    fields: { status: "Holat", due_date: "Muddat", assignee: "Ijrochi", priority: "Muhimlik", title: "Nomi", archived: "Treker" },
    status: { backlog: "Bekklog", in_progress: "Jarayonda", review: "Tekshiruvda", done: "Tayyor" },
    prio: { low: "Past", medium: "O‘rta", high: "Yuqori", urgent: "Shoshilinch" },
    archived: "arxivlandi", restored: "tiklandi",
  },
  tg: {
    heads: { assigned: "📌 Ба шумо вазифа супорида шуд", updated: "✏️ Вазифа нав шуд", status: "🔄 Ҳолати вазифа иваз шуд", deleted: "🗑 Вазифа нест карда шуд", deadline_3h: "⏰ То мӯҳлат 3 соат монд", deadline_1h: "⏰ То мӯҳлат 1 соат монд", deadline: "⏰ Мӯҳлати вазифа расид", overdue: "🔴 Вазифа гузашт", external_update: "🔄 Вазифа нав шуд", external_done: "✅ Вазифа иҷро шуд" },
    overdue: (n) => `🔴 Вазифа ${n} рӯз гузашт`,
    who: "Кӣ", changed: "Чӣ иваз шуд", due: "Мӯҳлат", priority: "Афзалият", source: "Манбаъ",
    late: (n) => `${n} рӯз гузашт`, inTracker: (t) => `дар ${t}`,
    open: "Кушодани вазифа", openIn: (t) => `Кушодан дар ${t}`, none: "—",
    fields: { status: "Ҳолат", due_date: "Мӯҳлат", assignee: "Иҷрокунанда", priority: "Афзалият", title: "Ном", archived: "Трекер" },
    status: { backlog: "Бэклог", in_progress: "Дар кор", review: "Дар санҷиш", done: "Тайёр" },
    prio: { low: "Паст", medium: "Миёна", high: "Баланд", urgent: "Фаврӣ" },
    archived: "бойгонӣ шуд", restored: "барқарор шуд",
  },
};

export function noticeLang(l?: string | null): NoticeLang {
  const code = (l ?? "").toLowerCase().slice(0, 2);
  return (code in D ? code : "ru") as NoticeLang;
}

export function statusName(code: string | null | undefined, lang?: string | null) {
  if (!code) return D[noticeLang(lang)].none;
  return D[noticeLang(lang)].status[code] ?? code;
}
export function priorityName(code: string | null | undefined, lang?: string | null) {
  if (!code) return D[noticeLang(lang)].none;
  return D[noticeLang(lang)].prio[code] ?? code;
}

function localYmd(ms: number, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}
function dmy(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

/** "03.11.2026, 18:00" — date-only deadlines end at 18:00 local; timestamps are shown in the workspace zone. */
export function formatDue(due: string, tz = DEFAULT_TZ) {
  if (!due.includes("T")) return `${dmy(due.slice(0, 10))}, ${DEADLINE_LOCAL}`;
  const ms = Date.parse(due);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);
  return `${dmy(localYmd(ms, tz))}, ${time}`;
}

/** Whole local days past the due date (0 when not overdue). */
export function overdueDays(due: string, now: number, tz = DEFAULT_TZ) {
  const dueDay = due.includes("T") ? localYmd(Date.parse(due), tz) : due.slice(0, 10);
  const today = localYmd(now, tz);
  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueDay}T00:00:00Z`)) / 86_400_000);
  return Math.max(0, diff);
}

function changeValue(c: NoticeChange, v: string | null, d: Dict, lang: NoticeLang, tz: string) {
  if (v == null || v === "") return d.none;
  if (c.field === "status") return c.named ? v : statusName(v, lang);
  if (c.field === "priority") return priorityName(v, lang);
  if (c.field === "due_date") return formatDue(v, tz);
  return v;
}

export function changeLine(c: NoticeChange, lang?: string | null, tz = DEFAULT_TZ) {
  const l = noticeLang(lang);
  const d = D[l];
  if (c.field === "archived") return `${d.fields.archived}: ${c.to === "true" ? d.archived : d.restored}`;
  return `${d.fields[c.field]}: ${changeValue(c, c.from, d, l, tz)} → ${changeValue(c, c.to, d, l, tz)}`;
}

/** Keeps only real differences, so "updated" never lists untouched fields. */
export function diffChanges(before: Partial<Record<ChangeField, string | null>>, after: Partial<Record<ChangeField, string | null>>): NoticeChange[] {
  const out: NoticeChange[] = [];
  for (const field of ["title", "status", "assignee", "due_date", "priority"] as ChangeField[]) {
    if (!(field in after)) continue;
    const a = (before[field] ?? null) || null;
    const b = (after[field] ?? null) || null;
    if ((a ?? "").trim() !== (b ?? "").trim()) out.push({ field, from: a, to: b });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function taskLink(appUrl: string, taskId: string) {
  return `${appUrl.replace(/\/$/, "")}/app/tasks?task=${encodeURIComponent(taskId)}`;
}

export function formatTaskNotice(input: NoticeInput): FormattedNotice {
  const lang = noticeLang(input.lang);
  const d = D[lang];
  const tz = input.tz || DEFAULT_TZ;
  const now = input.now ?? Date.now();
  const { task } = input;
  const late = input.kind === "overdue" && task.due_date ? overdueDays(task.due_date, now, tz) : 0;
  const title = input.kind === "overdue" && late > 0 ? d.overdue(late) : d.heads[input.kind];

  const where = [task.project, task.space].map((v) => v?.trim()).filter(Boolean).join(" · ");
  const who = input.actor?.trim() || (input.tracker ? d.inTracker(input.tracker) : "");
  const changes = (input.changes ?? []).map((c) => changeLine(c, lang, tz));
  const due = task.due_date ? `${formatDue(task.due_date, tz)}${late > 0 ? ` (${d.late(late)})` : ""}` : "";
  const prio = task.priority === "high" || task.priority === "urgent" ? priorityName(task.priority, lang) : "";

  const rows: { text: string; key?: string }[] = [
    { text: task.title.trim(), key: "title" },
    where ? { text: `📁 ${where}` } : null,
    who ? { text: `👤 ${d.who}: ${who}` } : null,
    ...(changes.length ? [{ text: `🔄 ${d.changed}: ${changes.join("; ")}` }] : []),
    due ? { text: `📅 ${d.due}: ${due}` } : null,
    prio ? { text: `⚡ ${d.priority}: ${prio}` } : null,
    input.tracker ? { text: `🔗 ${d.source}: ${input.tracker}` } : null,
  ].filter((r): r is { text: string; key?: string } => Boolean(r && r.text));

  const lines = rows.map((r) => r.text);
  const html = `${esc(title)}\n\n${rows.map((r) => (r.key === "title" ? `<b>${esc(r.text)}</b>` : esc(r.text))).join("\n")}`;
  const buttons: { text: string; url: string }[] = [];
  if (input.kind !== "deleted" && input.appUrl) buttons.push({ text: d.open, url: taskLink(input.appUrl, task.id) });
  if (input.tracker && task.external_url && /^https:\/\//.test(task.external_url)) buttons.push({ text: d.openIn(input.tracker), url: task.external_url });
  return { title, lines, body: lines.join("\n"), html, buttons };
}

import { describe, expect, test } from "bun:test";
import { formatTaskNotice, diffChanges, overdueDays, formatDue, changeLine } from "./task-notice";

const task = { id: "t1", title: "Отчёт по продажам", project: "Lucky Socks", space: "Nova Clinic", status: "in_progress", priority: "urgent", due_date: "2026-11-03" };
const NOW = Date.parse("2026-11-05T06:00:00Z"); // 12:00 in Bishkek

describe("task notice formatter", () => {
  test("status codes become human names, old → new", () => {
    expect(changeLine({ field: "status", from: "in_progress", to: "done" }, "ru")).toBe("Статус: В работе → Готово");
    expect(changeLine({ field: "status", from: "in_progress", to: "done" }, "en")).toBe("Status: In progress → Done");
    expect(changeLine({ field: "priority", from: "medium", to: "urgent" }, "ru")).toBe("Приоритет: Средний → Срочный");
  });

  test("tracker column names stay as names", () => {
    expect(changeLine({ field: "status", from: "Чолпон ЗАДАЧИ", to: "done" }, "ru")).toBe("Статус: Чолпон ЗАДАЧИ → Готово");
  });

  test("only changed fields are listed", () => {
    const c = diffChanges({ title: "A", status: "backlog", priority: "high", due_date: "2026-11-03" }, { title: "A", status: "done", priority: "high", due_date: "2026-11-03" });
    expect(c).toEqual([{ field: "status", from: "backlog", to: "done" }]);
    expect(diffChanges({ title: "A", status: "done" }, { title: "A ", status: "done" })).toEqual([]);
  });

  test("overdue counts whole local days and puts them in the title", () => {
    expect(overdueDays("2026-11-03", NOW)).toBe(2);
    // 23:30 Bishkek on Nov 3 is still the due day there, though it's Nov 3 17:30 UTC
    expect(overdueDays("2026-11-03", Date.parse("2026-11-03T17:30:00Z"))).toBe(0);
    // 00:30 Bishkek on Nov 4 is already one day late even though UTC is still Nov 3
    expect(overdueDays("2026-11-03", Date.parse("2026-11-03T18:30:00Z"))).toBe(1);
    const f = formatTaskNotice({ kind: "overdue", task, lang: "ru", now: NOW });
    expect(f.title).toBe("🔴 Задача просрочена на 2 дн.");
    expect(f.lines).toContain("📅 Срок: 03.11.2026, 18:00 (просрочено на 2 дн.)");
  });

  test("timestamps are shown in the workspace timezone", () => {
    expect(formatDue("2026-11-03T12:00:00Z")).toBe("03.11.2026, 18:00");
    expect(formatDue("2026-11-03T20:15:00Z")).toBe("04.11.2026, 02:15");
    expect(formatDue("2026-11-03T12:00:00Z", "UTC")).toBe("03.11.2026, 12:00");
  });

  test("empty values are skipped, priority only when high/urgent", () => {
    const f = formatTaskNotice({ kind: "assigned", task: { id: "t2", title: "Позвонить", priority: "medium" }, lang: "ru" });
    expect(f.lines).toEqual(["Позвонить"]);
    const g = formatTaskNotice({ kind: "assigned", task, actor: "Saltanat", lang: "ru", appUrl: "https://ai-virtualspace.com" });
    expect(g.lines).toEqual(["Отчёт по продажам", "📁 Lucky Socks · Nova Clinic", "👤 Кто: Saltanat", "📅 Срок: 03.11.2026, 18:00", "⚡ Приоритет: Срочный"]);
    expect(g.buttons).toEqual([{ text: "Открыть задачу", url: "https://ai-virtualspace.com/app/tasks?task=t1" }]);
    expect(g.html).toContain("<b>Отчёт по продажам</b>");
  });

  test("tracker source, fallback actor and tracker button", () => {
    const f = formatTaskNotice({ kind: "external_done", task: { ...task, external_url: "https://trello.com/c/x" }, tracker: "Trello", lang: "ru", appUrl: "https://a.com", changes: [{ field: "status", from: "in_progress", to: "done" }] });
    expect(f.lines).toContain("👤 Кто: в Trello");
    expect(f.lines).toContain("🔗 Источник: Trello");
    expect(f.buttons.map((b) => b.text)).toEqual(["Открыть задачу", "Открыть в Trello"]);
  });

  test("deleted tasks get no open button; HTML is escaped", () => {
    const f = formatTaskNotice({ kind: "deleted", task: { id: "t3", title: "<a>&b" }, lang: "en", appUrl: "https://a.com" });
    expect(f.buttons).toEqual([]);
    expect(f.html).toContain("<b>&lt;a&gt;&amp;b</b>");
  });

  test("unknown languages fall back to Russian", () => {
    expect(formatTaskNotice({ kind: "deadline_1h", task, lang: "de" }).title).toBe("⏰ До дедлайна 1 час");
    expect(formatTaskNotice({ kind: "deadline_1h", task, lang: "ky" }).title).toBe("⏰ Мөөнөткө 1 саат калды");
  });
});

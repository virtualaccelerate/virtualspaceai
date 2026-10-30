import { describe, it } from "node:test";
import { deepStrictEqual, notStrictEqual, strictEqual } from "node:assert";
import { dedupeKey, detectHeaderRow, evaluateRow, firstName, parseSheetDate, rowKey, type TabMap } from "./reminders-core";

describe("parseSheetDate", () => {
  it("parses supported formats", () => {
    deepStrictEqual(parseSheetDate("27.07.2015"), { y: 2015, m: 7, d: 27 });
    deepStrictEqual(parseSheetDate("05/03/2020"), { y: 2020, m: 3, d: 5 });
    deepStrictEqual(parseSheetDate("05.03.20"), { y: 2020, m: 3, d: 5 });
    deepStrictEqual(parseSheetDate("2026-11-02"), { y: 2026, m: 11, d: 2 });
    deepStrictEqual(parseSheetDate(46052), { y: 2026, m: 1, d: 30 });
  });
  it("rejects junk", () => {
    strictEqual(parseSheetDate("13 лет"), null);
    strictEqual(parseSheetDate("27.07.1018"), null);
    strictEqual(parseSheetDate("31.02.2020"), null);
  });
});

const map: TabMap = { header_row: 0, name: 0, phone: 1, birthday: 2, sub_end: 3, followup: 4, responsible: 5 };
const today = { y: 2026, m: 10, d: 30 };

describe("rules", () => {
  it("birthday today and heads-up tomorrow", () => {
    deepStrictEqual(evaluateRow("T", ["Айгерим", "", "30.10.2010"], map, today).hits.map((h) => [h.kind, h.stage]), [["birthday", "today"]]);
    deepStrictEqual(evaluateRow("T", ["Айгерим", "", "31.10.2010"], map, today).hits.map((h) => h.stage), ["soon"]);
  });
  it("subscription ends today and in 3 days, not in 2", () => {
    strictEqual(evaluateRow("T", ["A", "", "", "30.10.2026"], map, today).hits[0]?.stage, "today");
    strictEqual(evaluateRow("T", ["A", "", "", "02.11.2026"], map, today).hits[0]?.stage, "soon");
    strictEqual(evaluateRow("T", ["A", "", "", "01.11.2026"], map, today).hits.length, 0);
  });
  it("follow-up today; bad values counted as invalid without crashing", () => {
    strictEqual(evaluateRow("T", ["A", "", "", "", "30.10.2026"], map, today).hits[0]?.kind, "followup");
    deepStrictEqual(evaluateRow("T", ["A", "", "13 лет"], map, today), { hits: [], invalid: true });
  });
});

describe("dedupe keys", () => {
  it("prefer phone, normalise names", () => {
    strictEqual(rowKey("Лист", "Иван  Пётр", "996555"), "лист|996555");
    strictEqual(rowKey("Лист", "Иван  Пётр", ""), rowKey("лист ", "иван петр", ""));
    notStrictEqual(dedupeKey("s", "k", "birthday", "2026-10-30"), dedupeKey("s", "k", "birthday", "2026-10-31"));
  });
  it("finds header row below title rows", () => {
    strictEqual(detectHeaderRow([["АКТУАЛЬНЫЕ:"], [], ["ДАТА", "ФИО", "дата рождения", "контакты"]]), 2);
  });
});

describe("greeting name", () => {
  it("uses the 2nd word of «Фамилия Имя Отчество», or the single word", () => {
    strictEqual(firstName("Тилектешев Нурэль"), "Нурэль");
    strictEqual(firstName("Иванова Анна Петровна"), "Анна");
    strictEqual(firstName("Айбек"), "Айбек");
  });
  it("addresses the client by first name", () => {
    const r = evaluateRow("T", ["Тилектешев Нурэль", "996555", "30.10.2014"], { header_row: 0, name: 0, phone: 1, birthday: 2 }, today);
    strictEqual(r.hits[0].message.startsWith("Нурэль, с днём рождения"), true);
  });
  it("addresses the parent when a parent column is filled", () => {
    const r = evaluateRow("T", ["Тилектешев Нурэль", "996555", "30.10.2014", "Жанайым"], { header_row: 0, name: 0, phone: 1, birthday: 2, parent: 3 }, today);
    strictEqual(r.hits[0].message.startsWith("Жанайым, "), true);
    strictEqual(r.hits[0].message.includes("Нурэль"), true);
  });
});

import { describe, expect, it } from "vitest";
import { dedupeKey, detectHeaderRow, evaluateRow, parseSheetDate, rowKey, type TabMap } from "./reminders-core";

describe("parseSheetDate", () => {
  it("parses supported formats", () => {
    expect(parseSheetDate("27.07.2015")).toEqual({ y: 2015, m: 7, d: 27 });
    expect(parseSheetDate("05/03/2020")).toEqual({ y: 2020, m: 3, d: 5 });
    expect(parseSheetDate("05.03.20")).toEqual({ y: 2020, m: 3, d: 5 });
    expect(parseSheetDate("2026-11-02")).toEqual({ y: 2026, m: 11, d: 2 });
    expect(parseSheetDate(46052)).toEqual({ y: 2026, m: 1, d: 30 });
  });
  it("rejects junk", () => {
    expect(parseSheetDate("13 лет")).toBeNull();
    expect(parseSheetDate("27.07.1018")).toBeNull();
    expect(parseSheetDate("31.02.2020")).toBeNull();
  });
});

const map: TabMap = { header_row: 0, name: 0, phone: 1, birthday: 2, sub_end: 3, followup: 4, responsible: 5 };
const today = { y: 2026, m: 10, d: 30 };

describe("rules", () => {
  it("birthday today and heads-up tomorrow", () => {
    expect(evaluateRow("T", ["Айгерим", "", "30.10.2010"], map, today).hits.map((h) => [h.kind, h.stage])).toEqual([["birthday", "today"]]);
    expect(evaluateRow("T", ["Айгерим", "", "31.10.2010"], map, today).hits.map((h) => h.stage)).toEqual(["soon"]);
  });
  it("subscription ends today and in 3 days, not in 2", () => {
    expect(evaluateRow("T", ["A", "", "", "30.10.2026"], map, today).hits[0]?.stage).toBe("today");
    expect(evaluateRow("T", ["A", "", "", "02.11.2026"], map, today).hits[0]?.stage).toBe("soon");
    expect(evaluateRow("T", ["A", "", "", "01.11.2026"], map, today).hits).toHaveLength(0);
  });
  it("follow-up today; bad values counted as invalid without crashing", () => {
    expect(evaluateRow("T", ["A", "", "", "", "30.10.2026"], map, today).hits[0]?.kind).toBe("followup");
    expect(evaluateRow("T", ["A", "", "13 лет"], map, today)).toEqual({ hits: [], invalid: true });
  });
});

describe("dedupe keys", () => {
  it("prefer phone, normalise names", () => {
    expect(rowKey("Лист", "Иван  Пётр", "996555")).toBe("лист|996555");
    expect(rowKey("Лист", "Иван  Пётр", "")).toBe(rowKey("лист ", "иван петр", ""));
    expect(dedupeKey("s", "k", "birthday", "2026-10-30")).not.toBe(dedupeKey("s", "k", "birthday", "2026-10-31"));
  });
  it("finds header row below title rows", () => {
    expect(detectHeaderRow([["АКТУАЛЬНЫЕ:"], [], ["ДАТА", "ФИО", "дата рождения", "контакты"]])).toBe(2);
  });
});

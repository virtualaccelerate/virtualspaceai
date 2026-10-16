import { describe, expect, it } from "bun:test";
import { resolveMember } from "./member-resolution";

const roster = [
  { id: "z", name: "Zuhra Sadykova", email: "zuhra@example.test" },
  { id: "a", name: "Айзада Бердибекова", email: null },
  { id: "b", name: "Бермет Асанова", email: null },
  { id: "d", name: "Данияр Абдыев", email: null },
];
describe("safe member resolution", () => {
  it.each(["Зухра", "Зухре", "Зухры", "Зухру", "Зухрой", "Zuhra", "zuhra@example.test", "z"])("resolves %s", (name: string) => {
    expect(resolveMember(name, roster)).toEqual({ match: roster[0] });
  });
  it.each(["Айзада", "Айзаде", "Aizada", "Aizade"])("resolves %s", (name: string) => {
    expect(resolveMember(name, roster)).toEqual({ match: roster[1] });
  });
  it.each(["Бермет", "Бермету", "Bermet", "Берметке"])("resolves %s", (name: string) => {
    expect(resolveMember(name, roster)).toEqual({ match: roster[2] });
  });
  it("never confuses Dana with Daniyar", () => expect(resolveMember("Дана", roster)).toEqual({ none: true }));
  it("does not guess an unknown name", () => expect(resolveMember("Пете", roster)).toEqual({ none: true }));
  it("returns every matching first name instead of the first hit", () => {
    const other = { id: "z2", name: "Зухра Иванова", email: null };
    expect(resolveMember("Зухре", [...roster, other])).toEqual({ candidates: [roster[0], other] });
  });
});
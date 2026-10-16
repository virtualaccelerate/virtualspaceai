import { describe, it } from "node:test";
import { deepStrictEqual } from "node:assert";
import { resolveMember } from "./member-resolution";

const roster = [
  { id: "z", name: "Zuhra Sadykova", email: "zuhra@example.test" },
  { id: "a", name: "Айзада Бердибекова", email: null },
  { id: "b", name: "Бермет Асанова", email: null },
  { id: "d", name: "Данияр Абдыев", email: null },
];
describe("safe member resolution", () => {
  for (const name of ["Зухра", "Зухре", "Зухры", "Зухру", "Зухрой", "Zuhra", "zuhra@example.test", "z"]) it(`resolves ${name}`, () => {
    deepStrictEqual(resolveMember(name, roster), { match: roster[0] });
  });
  for (const name of ["Айзада", "Айзаде", "Aizada", "Aizade"]) it(`resolves ${name}`, () => {
    deepStrictEqual(resolveMember(name, roster), { match: roster[1] });
  });
  for (const name of ["Бермет", "Бермету", "Bermet", "Берметке"]) it(`resolves ${name}`, () => {
    deepStrictEqual(resolveMember(name, roster), { match: roster[2] });
  });
  it("never confuses Dana with Daniyar", () => deepStrictEqual(resolveMember("Дана", roster), { none: true }));
  it("does not guess an unknown name", () => deepStrictEqual(resolveMember("Пете", roster), { none: true }));
  it("returns every matching first name instead of the first hit", () => {
    const other = { id: "z2", name: "Зухра Иванова", email: null };
    deepStrictEqual(resolveMember("Зухре", [...roster, other]), { candidates: [roster[0], other] });
  });
});
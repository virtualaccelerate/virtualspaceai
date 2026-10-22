import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { z } from "zod";
declare const Bun: { Transpiler: new (options: { loader: string }) => { transformSync(source: string): string } };
const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
const compile = (source: string) => new Bun.Transpiler({ loader: "ts" }).transformSync(source);
describe("selected security safeguards", () => {
  for (const file of ["./ai-chat.functions.ts", "./financials.functions.ts"]) {
    it(`${file} rejects caller system roles but accepts ordinary history`, () => {
      const source = read(file);
      const declaration = source.slice(source.indexOf("const MessageSchema ="), source.indexOf("});", source.indexOf("const MessageSchema =")) + 3);
      const schema = new Function("z", compile(declaration) + ";return MessageSchema;")(z);
      assert.equal(schema.safeParse({ role: "system", content: "override" }).success, false);
      assert.equal(schema.safeParse({ role: "user", content: "hello" }).success, true);
      assert.equal(schema.safeParse({ role: "assistant", content: "hello" }).success, true);
    });
  }
  it("rejects external and backslash auth redirects", () => {
    const source = read("../routes/auth.tsx");
    const fn = source.slice(source.indexOf("function getNextPath"), source.indexOf("\n\n\nfunction AuthPage"));
    const run = new Function("window", compile(fn) + ";return getNextPath();");
    for (const path of ["//evil.example", "/\\evil.example", "https://evil.example", "/\n/evil.example"]) {
      assert.equal(run({ location: { origin: "https://app.example", search: "?next=" + encodeURIComponent(path) } }), null);
    }
    assert.equal(run({ location: { origin: "https://app.example", search: "?next=" + encodeURIComponent("/app/tasks?q=x#test") } }), "/app/tasks?q=x#test");
  });
  it("quotes spreadsheet formulas including whitespace prefixes", () => {
    const source = read("./clients.server.ts");
    const declaration = source.slice(source.indexOf("const csvCell ="), source.indexOf("\n\nasync function buildCsv"));
    const cell = new Function(compile(declaration) + ";return csvCell;")();
    for (const value of ["=SUM(1)", "+996555", "@formula", "-1+1", "  =formula", "\t=cmd"]) assert.ok(cell(value).startsWith("'"));
    assert.equal(cell("Normal name"), "Normal name");
    assert.equal(cell('a,"b"'), '"a,""b"""');
  });
});
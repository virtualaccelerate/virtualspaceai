import { describe, it } from "node:test";
import { strictEqual } from "node:assert";
import { readFileSync } from "node:fs";

declare const Bun: { Transpiler: new (options: { loader: string }) => { transformSync(source: string): string } };

// Exercise the actual token parser without importing the browser and server UI graph.
const source = readFileSync(new URL("../components/ChatPanel.tsx", import.meta.url), "utf8");
const start = source.indexOf("function parseTaskTokens(");
const end = source.indexOf("\nfunction MessageContent(", start);
const parser = new Bun.Transpiler({ loader: "tsx" }).transformSync(
  source.slice(start, end).replace("function parseTaskTokens", "export function parseTaskTokens"),
);
const { parseTaskTokens } = await import(`data:text/javascript,${encodeURIComponent(
  `const TASK_TOKEN = /\\[\\[task:([^\\]]+?)\\]\\]/gi;
   const TASK_UPDATE_TOKEN = /\\[\\[task-update:([^\\]]+?)\\]\\]/gi;
   const MEETING_TOKEN = /\\[\\[meeting:([^\\]]+?)\\]\\]/gi;
   const UUID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   ${parser}`,
)}`);
const id = "00000000-0000-4000-8000-000000000001";
describe("AI task edit assignment intent", () => {
  for (const edit of ["status=done", "due_date=2026-10-30"]) {
    it(`${edit} omits assignee id and name, preserving the current assignment`, () => {
      const update = parseTaskTokens(`[[task-update:${id}||${edit}]]`).updates[0];
      strictEqual(Object.hasOwn(update, "assignee_id"), false);
      strictEqual(Object.hasOwn(update, "assignee_name"), false);
      strictEqual(update.assignee_query, undefined);
    });
  }
  it("explicit unassignment retains null", () => {
    strictEqual(parseTaskTokens(`[[task-update:${id}||assignee=none]]`).updates[0].assignee_id, null);
  });
  it("an explicit name requires the member picker", () => {
    strictEqual(parseTaskTokens(`[[task-update:${id}||assignee=Бермету]]`).updates[0].assignee_query, "Бермету");
  });
});
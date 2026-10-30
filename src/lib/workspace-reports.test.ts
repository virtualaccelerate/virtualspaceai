import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wrappers = readFileSync(new URL("./admin.functions.ts", import.meta.url), "utf8");
for (const name of ["adminListWorkspaceReports", "adminGenerateWorkspaceReport"]) {
  test(`${name} rejects requests without application-admin session before loading report data`, async () => {
    const start = wrappers.indexOf(`export const ${name} =`);
    const end = wrappers.indexOf("\n  });", start);
    const block = wrappers.slice(start, end);
    const body = block.slice(block.indexOf(".handler(async ({ data }) => {") + ".handler(async ({ data }) => {".length);
    const handler = new Function("requireAdmin", `return async (data) => { ${body} };`)(async () => { throw new Error("Unauthorized"); });
    await assert.rejects(handler({ workspace_id: "workspace" }), /Unauthorized/);
  });
}

const server = readFileSync(new URL("./admin-analytics.server.ts", import.meta.url), "utf8");
const start = server.indexOf("export async function generateWorkspaceReport");
const end = server.indexOf("\ntype Bucket", start);
const code = new Bun.Transpiler({ loader: "ts" }).transformSync(server.slice(start, end).replace("export async function", "async function"));

function harness(events: string[], status = 200) {
  let saved: unknown = null;
  let request: { model: string; messages: { content: string }[] } | null = null;
  const db = {
    rpc: async () => ({ data: { period: { days: 30 }, ai_chat: { recent_prompt_sample: [] } }, error: null }),
    from: () => ({ insert: (value: unknown) => { saved = value; return { select: () => ({ single: async () => ({ data: { id: "report", ...value as object }, error: null }) }) }; } }),
  };
  const fetch = async (_url: string, init: { body: string }) => {
    request = JSON.parse(init.body);
    const text = events.join("");
    const body = new ReadableStream({ start(controller) { for (let i = 0; i < text.length; i += 3) controller.enqueue(new TextEncoder().encode(text.slice(i, i + 3))); controller.close(); } });
    return new Response(body, { status });
  };
  const generate = new Function("admin", "fetch", "process", "getRequestHeader", "setResponseHeader", "setResponseStatus", `${code}; return generateWorkspaceReport;`)(async () => db, fetch, { env: { LOVABLE_API_KEY: "test" } }, () => undefined, () => {}, () => {});
  return { generate, saved: () => saved, request: () => request };
}

test("split streaming frames produce a saved Russian report using the requested model", async () => {
  const h = harness(['data: {"choices":[{"delta":{"content":"Отчет"}}]}\n\n', 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n']);
  await h.generate("workspace", "application-admin");
  assert.deepEqual(h.saved(), { workspace_id: "workspace", content: "Отчет", created_by: "application-admin" });
  assert.equal(h.request()?.model, "google/gemini-3-flash-preview");
});

test("refused output is not saved", async () => {
  const h = harness(['data: {"choices":[{"delta":{"refusal":"Denied"}}]}\n\n']);
  await assert.rejects(h.generate("workspace", "admin"), /Denied/);
  assert.equal(h.saved(), null);
});

test("interrupted output is not saved", async () => {
  const h = harness(['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n']);
  await assert.rejects(h.generate("workspace", "admin"), /REPORT_AI_INCOMPLETE/);
  assert.equal(h.saved(), null);
});
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createYouGileRequest } from "./yougile-request.server";

describe("bounded YouGile transport", () => {
  test("aborts a hung headers request and returns within its budget", async () => {
    let signal: AbortSignal | null | undefined;
    const scope = createYouGileRequest({ requestMs: 20, budgetMs: 100, fetch: (async (_, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => {});
    }) as typeof fetch });
    const start = Date.now();
    await assert.rejects(scope.request("test", "/projects"), /YouGile временно недоступен/);
    assert.equal(signal?.aborted, true);
    assert.ok(Date.now() - start < 300);
  });
  test("body reads are also timed out", async () => {
    const scope = createYouGileRequest({ requestMs: 20, fetch: (async () => new Response(new ReadableStream({ start() {} }))) as typeof fetch });
    await assert.rejects(scope.request("test", "/projects"), /YouGile временно недоступен/);
  });
  test("503 backoff cannot exceed the total operation budget", async () => {
    let calls = 0;
    const scope = createYouGileRequest({ budgetMs: 100, fetch: (async () => { calls++; return new Response("no available server", { status: 503 }); }) as typeof fetch });
    await assert.rejects(scope.request("test", "/projects"), /YouGile временно недоступен/);
    assert.equal(calls, 1);
  });
  test("a long Retry-After ends the operation without immediate retry", async () => {
    let calls = 0;
    const scope = createYouGileRequest({ fetch: (async () => { calls++; return new Response("rate limited", { status: 429, headers: { "Retry-After": "120" } }); }) as typeof fetch });
    await assert.rejects(scope.request("test", "/projects"));
    assert.equal(calls, 1);
  });
  test("successful reads preserve the response shape and authentication", async () => {
    let auth = "";
    const scope = createYouGileRequest({ fetch: (async (_, init) => {
      auth = new Headers(init?.headers).get("Authorization") ?? "";
      return Response.json({ content: [{ id: "project" }] });
    }) as typeof fetch });
    assert.deepEqual(await scope.request("test", "/projects"), { content: [{ id: "project" }] });
    assert.equal(auth, "Bearer test");
  });
  test("a different invocation does not wait for a stalled request", async () => {
    const slow = createYouGileRequest({ requestMs: 20, fetch: (async () => new Promise<Response>(() => {})) as typeof fetch });
    const pending = slow.request("test", "/projects").catch(() => null);
    const fast = createYouGileRequest({ fetch: (async () => Response.json([])) as typeof fetch });
    assert.deepEqual(await fast.request("test", "/projects"), []);
    await pending;
  });
});
describe("YouGile sync budget", () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  test("700 tasks with slow local writes between pages finish within an HTTP-only budget", async () => {
    // 7 columns × 100 tasks; each page is fast to fetch, but saving it takes longer than the whole budget.
    const scope = createYouGileRequest({ budgetMs: 2_000, fetch: (async (url: string) => {
      const offset = Number(new URL(url).searchParams.get("offset"));
      return Response.json({ content: offset === 0 ? Array.from({ length: 100 }, (_, i) => ({ id: `t${i}` })) : [] });
    }) as typeof fetch });
    const started = Date.now();
    let total = 0;
    for (let column = 0; column < 7; column++) {
      const page = await scope.request<{ content: unknown[] }>("k", `/task-list?columnId=c${column}&limit=100&offset=0`);
      total += page.content.length;
      await sleep(400); // simulated batched DB upsert, not counted against YouGile time
    }
    scope.check();
    assert.equal(total, 700);
    assert.ok(Date.now() - started > 2_000, "wall time exceeded the budget, HTTP time did not");
  });
  test("exhausted budget reports a 'continue automatically' message, not an outage", async () => {
    const scope = createYouGileRequest({ budgetMs: 30, requestMs: 1_000, fetch: (async () => new Promise<Response>(() => {})) as typeof fetch });
    await assert.rejects(scope.request("k", "/projects"), /Синхронизация не успела завершиться, продолжим автоматически/);
    assert.throws(() => scope.check(), /продолжим автоматически/);
  });
  test("each source gets its own budget", async () => {
    const hung = createYouGileRequest({ budgetMs: 30, requestMs: 1_000, fetch: (async () => new Promise<Response>(() => {})) as typeof fetch });
    await assert.rejects(hung.request("k", "/projects"));
    const next = createYouGileRequest({ budgetMs: 30, fetch: (async () => Response.json([{ id: "p" }])) as typeof fetch });
    assert.deepEqual(await next.request("k", "/projects"), [{ id: "p" }]);
  });
  test("401/403 keep the real message", async () => {
    const scope = createYouGileRequest({ fetch: (async () => new Response("no", { status: 403 })) as typeof fetch });
    await assert.rejects(scope.request("k", "/projects"), /YouGile отклонил API-ключ/);
  });
});

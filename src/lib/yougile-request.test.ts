import { describe, expect, test } from "bun:test";
import { createYouGileRequest } from "./yougile-request.server";

describe("bounded YouGile transport", () => {
  test("aborts a hung headers request and returns within its budget", async () => {
    let signal: AbortSignal | null | undefined;
    const scope = createYouGileRequest({ requestMs: 20, budgetMs: 100, fetch: (async (_, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => {});
    }) as typeof fetch });
    const start = Date.now();
    await expect(scope.request("test", "/projects")).rejects.toThrow("YouGile временно недоступен");
    expect(signal?.aborted).toBe(true);
    expect(Date.now() - start).toBeLessThan(300);
  });
  test("body reads are also timed out", async () => {
    const scope = createYouGileRequest({ requestMs: 20, fetch: (async () => new Response(new ReadableStream({ start() {} }))) as typeof fetch });
    await expect(scope.request("test", "/projects")).rejects.toThrow("YouGile временно недоступен");
  });
  test("503 backoff cannot exceed the total operation budget", async () => {
    let calls = 0;
    const scope = createYouGileRequest({ budgetMs: 100, fetch: (async () => { calls++; return new Response("no available server", { status: 503 }); }) as typeof fetch });
    await expect(scope.request("test", "/projects")).rejects.toThrow("YouGile временно недоступен");
    expect(calls).toBe(1);
  });
  test("a long Retry-After ends the operation without immediate retry", async () => {
    let calls = 0;
    const scope = createYouGileRequest({ fetch: (async () => { calls++; return new Response("rate limited", { status: 429, headers: { "Retry-After": "120" } }); }) as typeof fetch });
    await expect(scope.request("test", "/projects")).rejects.toThrow();
    expect(calls).toBe(1);
  });
  test("successful reads preserve the response shape and authentication", async () => {
    let auth = "";
    const scope = createYouGileRequest({ fetch: (async (_, init) => {
      auth = new Headers(init?.headers).get("Authorization") ?? "";
      return Response.json({ content: [{ id: "project" }] });
    }) as typeof fetch });
    expect(await scope.request("test", "/projects")).toEqual({ content: [{ id: "project" }] });
    expect(auth).toBe("Bearer test");
  });
  test("a different invocation does not wait for a stalled request", async () => {
    const slow = createYouGileRequest({ requestMs: 20, fetch: (async () => new Promise<Response>(() => {})) as typeof fetch });
    const pending = slow.request("test", "/projects").catch(() => null);
    const fast = createYouGileRequest({ fetch: (async () => Response.json([])) as typeof fetch });
    expect(await fast.request("test", "/projects")).toEqual([]);
    await pending;
  });
});
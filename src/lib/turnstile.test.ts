import { describe, test } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { isTestHost, pickKeys, safeRedirect, TEST_SITE_KEY } from "./turnstile";

describe("turnstile rules", () => {
  test("preview and localhost use test keys", () => {
    strictEqual(isTestHost("localhost:8080"), true);
    strictEqual(isTestHost("id-preview--b3923ecf-a6ef.lovable.app"), true);
    strictEqual(pickKeys("localhost", undefined, undefined)?.siteKey, TEST_SITE_KEY);
  });
  test("published hosts never use test keys", () => {
    strictEqual(isTestHost("ai-virtualspace.com"), false);
    strictEqual(isTestHost("virtualspaceai.lovable.app"), false);
  });
  test("off until both real keys are set", () => {
    strictEqual(pickKeys("ai-virtualspace.com", "site", undefined), null);
    strictEqual(pickKeys("ai-virtualspace.com", undefined, "sec"), null);
    deepStrictEqual(pickKeys("ai-virtualspace.com", "site", "sec"), { siteKey: "site", secret: "sec" });
  });
  test("redirects only to same origin", () => {
    strictEqual(safeRedirect("https://evil.com/x", "https://ai-virtualspace.com"), undefined);
    strictEqual(safeRedirect("https://ai-virtualspace.com/app", "https://ai-virtualspace.com"), "https://ai-virtualspace.com/app");
  });
});

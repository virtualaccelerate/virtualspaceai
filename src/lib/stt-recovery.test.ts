import { describe, it } from "node:test";
import { strictEqual, rejects } from "node:assert";
import { classifySttPause, recoverSttPause } from "./stt-recovery";

describe("explicit global voice recovery", () => {
  it("rejects unauthorized recovery without a probe or clear", async () => {
    let calls = 0;
    await rejects(recoverSttPause({ authorized: false, kind: "workspace", confirmed: true, probe: async () => { calls++; }, clear: async () => { calls++; } }), /Unauthorized/);
    strictEqual(calls, 0);
  });
  it("checks credits once and clears only after success", async () => {
    const calls: string[] = [];
    await recoverSttPause({ authorized: true, kind: "workspace", confirmed: false, probe: async () => { calls.push("probe"); }, clear: async () => { calls.push("clear"); } });
    strictEqual(calls.join(","), "probe,clear");
  });
  it("a failed credit check retains the pause", async () => {
    let cleared = false;
    await rejects(recoverSttPause({ authorized: true, kind: "workspace", confirmed: true, probe: async () => { throw new Error("402"); }, clear: async () => { cleared = true; } }), /402/);
    strictEqual(cleared, false);
  });
  for (const kind of ["provider", "unknown"] as const) {
    it(`${kind} access stays blocked without explicit restored-access confirmation`, async () => {
      let calls = 0;
      await rejects(recoverSttPause({ authorized: true, kind, confirmed: false, probe: async () => { calls++; }, clear: async () => { calls++; } }));
      strictEqual(calls, 0);
    });
    it(`${kind} confirmed recovery clears without probing or replaying audio`, async () => {
      let probes = 0, clears = 0;
      await recoverSttPause({ authorized: true, kind, confirmed: true, probe: async () => { probes++; }, clear: async () => { clears++; } });
      strictEqual(probes, 0); strictEqual(clears, 1);
    });
  }
  it("distinguishes credit pauses and keeps unrecognized 403 denials conservative", () => {
    strictEqual(classifySttPause(402), "workspace");
    strictEqual(classifySttPause(403, "credit_limit_reached"), "workspace");
    strictEqual(classifySttPause(403, "permission_error"), "provider");
    strictEqual(classifySttPause(403), "provider");
  });
});
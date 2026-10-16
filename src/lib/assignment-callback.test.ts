import { it } from "node:test";
import { deepStrictEqual, strictEqual, ok, throws } from "node:assert";
import { assignmentCallback, parseAssignmentCallback } from "./assignment-callback";
const task = "67b184f9-329e-49b8-a388-2ff53556a011";
const member = "f77ef039-050d-49db-a0ba-9ccdcc7e8d85";
it("fits Telegram and round-trips stable member IDs", () => {
  const data = assignmentCallback(task, member);
  ok(new TextEncoder().encode(data).length <= 64);
  deepStrictEqual(parseAssignmentCallback(data, member), { id: task, assignee_id: member });
});
it("supports self/unassigned", () => {
  strictEqual(parseAssignmentCallback(assignmentCallback(task, "self"), member).assignee_id, member);
  strictEqual(parseAssignmentCallback(assignmentCallback(task, "none"), member).assignee_id, null);
});
it("rejects malformed callbacks", () => throws(() => parseAssignmentCallback("asg:bad:bad", member)));
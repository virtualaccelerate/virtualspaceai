import { expect, it } from "bun:test";
import { assignmentCallback, parseAssignmentCallback } from "./assignment-callback";
const task = "67b184f9-329e-49b8-a388-2ff53556a011";
const member = "f77ef039-050d-49db-a0ba-9ccdcc7e8d85";
it("fits Telegram and round-trips stable member IDs", () => {
  const data = assignmentCallback(task, member);
  expect(new TextEncoder().encode(data).length).toBeLessThanOrEqual(64);
  expect(parseAssignmentCallback(data, member)).toEqual({ id: task, assignee_id: member });
});
it("supports self/unassigned", () => {
  expect(parseAssignmentCallback(assignmentCallback(task, "self"), member).assignee_id).toBe(member);
  expect(parseAssignmentCallback(assignmentCallback(task, "none"), member).assignee_id).toBeNull();
});
it("rejects malformed callbacks", () => expect(() => parseAssignmentCallback("asg:bad:bad", member)).toThrow());
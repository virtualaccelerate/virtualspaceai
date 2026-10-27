import { it } from "node:test";
import assert from "node:assert/strict";
import { canEditComment, commentRecipients } from "./task-comment-rules";
it("notifies creator, assignee and mentions once, never the author or outsiders", () => {
  assert.deepEqual(commentRecipients("a", "b", "c", ["a", "b", "d", "outsider"], ["a", "b", "c", "d"]), ["b", "c", "d"]);
});
it("only author can edit a live local comment, not history or tracker chat", () => {
  const event = {kind: "comment", source: "virtual_space", actor_id: "a"};
  assert.equal(canEditComment(event, "a"), true);
  assert.equal(canEditComment(event, "b"), false);
  assert.equal(canEditComment({...event, deleted_at: "2026-10-27"}, "a"), false);
  assert.equal(canEditComment({...event, source: "yougile"}, "a"), false);
  assert.equal(canEditComment({...event, kind: "created"}, "a"), false);
});
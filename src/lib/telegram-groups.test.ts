import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canLinkGroup, groupCompletionStatus, isAfterBotAdded, isDuplicateTask, isMigrationTarget, normalizeGroupCode, pendingMessages, shouldProcess } from "./telegram-groups";

describe("telegram group rules", () => {
  it("only workspace owners/admins can link a group", () => {
    assert.equal(canLinkGroup("owner"), true);
    assert.equal(canLinkGroup("admin"), true);
    assert.equal(canLinkGroup("member"), false);
    assert.equal(canLinkGroup(null), false);
  });
  it("ignores messages sent before the bot was added", () => {
    const added = "2026-10-27T12:00:00.000Z";
    const sec = Date.parse(added) / 1000;
    assert.equal(isAfterBotAdded(sec - 1, added), false);
    assert.equal(isAfterBotAdded(sec, added), true);
    assert.equal(isAfterBotAdded(sec + 60, added), true);
  });
  it("normalizes typed codes", () => {
    assert.equal(normalizeGroupCode(" ab cd-23 "), "ABCD23");
  });
  it("does not create the same task twice", () => {
    assert.equal(isDuplicateTask("Подготовить отчёт!", ["подготовить  отчёт"]), true);
    assert.equal(isDuplicateTask("Позвонить клиенту", ["Подготовить отчёт"]), false);
  });
  it("only processes messages after bot join and last pass", () => {
    const added = "2026-10-27T12:00:00.000Z";
    const msgs = [{ sent_at: "2026-10-27T11:59:00.000Z" }, { sent_at: "2026-10-27T12:05:00.000Z" }, { sent_at: "2026-10-27T12:10:00.000Z" }];
    assert.equal(pendingMessages(msgs, added, null).length, 2);
    assert.equal(pendingMessages(msgs, added, "2026-10-27T12:05:00.000Z").length, 1);
  });
  it("completion from non-managers goes to approval", () => {
    assert.equal(groupCompletionStatus(true), "done");
    assert.equal(groupCompletionStatus(false), "review");
  });
  it("skips a lone message unless it reports done", () => {
    assert.equal(shouldProcess(["привет"]), false);
    assert.equal(shouldProcess(["сделал отчёт"]), true);
    assert.equal(shouldProcess(["a", "b"]), true);
  });
  it("processes one pending message at fifteen minutes, not before", () => {
    const sent = "2026-10-27T12:00:00Z";
    assert.equal(shouldProcess(["Подготовить отчёт"], sent, Date.parse(sent) + 899999), false);
    assert.equal(shouldProcess(["Подготовить отчёт"], sent, Date.parse(sent) + 900000), true);
    assert.equal(shouldProcess([], sent, Date.parse(sent) + 900000), false);
  });
  it("accepts only a verified old-to-new migration, never a same-title guess", () => {
    assert.equal(isMigrationTarget(-5148556816, -1004334550244, -1004334550244), true);
    assert.equal(isMigrationTarget(-5148556816, undefined, -1004334550244), false);
    assert.equal(isMigrationTarget(-5148556816, -100999, -1004334550244), false);
  });
});

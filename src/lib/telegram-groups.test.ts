import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canLinkGroup, isAfterBotAdded, normalizeGroupCode } from "./telegram-groups";

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
});

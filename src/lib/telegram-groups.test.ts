import { describe, expect, it } from "vitest";
import { canLinkGroup, isAfterBotAdded, normalizeGroupCode } from "./telegram-groups";

describe("telegram group rules", () => {
  it("only workspace owners/admins can link a group", () => {
    expect(canLinkGroup("owner")).toBe(true);
    expect(canLinkGroup("admin")).toBe(true);
    expect(canLinkGroup("member")).toBe(false);
    expect(canLinkGroup(null)).toBe(false);
  });
  it("ignores messages sent before the bot was added", () => {
    const added = "2026-10-27T12:00:00.000Z";
    const sec = Date.parse(added) / 1000;
    expect(isAfterBotAdded(sec - 1, added)).toBe(false);
    expect(isAfterBotAdded(sec, added)).toBe(true);
    expect(isAfterBotAdded(sec + 60, added)).toBe(true);
  });
  it("normalizes typed codes", () => {
    expect(normalizeGroupCode(" ab cd-23 ")).toBe("ABCD23");
  });
});

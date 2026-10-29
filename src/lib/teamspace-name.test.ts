import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTeamspaceName } from "./teamspaces.server";

describe("normalizeTeamspaceName", () => {
  test("trims surrounding spaces", () => assert.equal(normalizeTeamspaceName("  Startup lab  "), "Startup lab"));
  test("collapses inner whitespace", () => assert.equal(normalizeTeamspaceName("Startup   lab\t2"), "Startup lab 2"));
  test("rejects an empty name", () => assert.throws(() => normalizeTeamspaceName("   "), /не может быть пустым/));
  test("caps the name at 80 characters", () => assert.equal(normalizeTeamspaceName("a".repeat(120)).length, 80));
});

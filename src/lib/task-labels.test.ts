import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cleanTaskLabel } from "./projects.server";

describe("cleanTaskLabel", () => {
  test("strips a leading pipe", () => assert.equal(cleanTaskLabel("|Startup lab"), "Startup lab"));
  test("drops leaked workspace ids", () => assert.equal(cleanTaskLabel("|ec8e74c9-3fc0-4ea8-9f9f-abbf10f14e11"), null));
  test("keeps normal names", () => assert.equal(cleanTaskLabel(" Marketing "), "Marketing"));
});

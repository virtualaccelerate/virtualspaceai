import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { taskLabelDisplay } from "./task-label-display";

describe("task label identifiers", () => {
  test("hides a UUID", () => assert.equal(taskLabelDisplay("ec8e74c9-3fc0-4ea8-9f9f-abbf10f14e11"), null));
  test("hides a pipe-prefixed UUID", () => assert.equal(taskLabelDisplay(" |EC8E74C9-3FC0-4EA8-9F9F-ABBF10F14E11 "), null));
  test("preserves human labels", () => assert.equal(taskLabelDisplay("Startup lab"), "Startup lab"));
});
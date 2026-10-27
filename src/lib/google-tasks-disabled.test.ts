import { test } from "node:test";
import assert from "node:assert/strict";
import { isTasksApiDisabledError } from "./google-calendar.server";
test("403 'API not used/disabled' pauses Tasks", () => {
  assert.equal(isTasksApiDisabledError(403, '{"error":{"message":"Google Tasks API has not been used in project 606658056274 before or it is disabled.","details":[{"reason":"SERVICE_DISABLED"}]}}'), true);
});
test("scope 403 and other statuses are not treated as disabled API", () => {
  assert.equal(isTasksApiDisabledError(403, "ACCESS_TOKEN_SCOPE_INSUFFICIENT"), false);
  assert.equal(isTasksApiDisabledError(500, "SERVICE_DISABLED"), false);
});

import { test, expect } from "bun:test";
import { isTasksApiDisabledError } from "./google-calendar.server";
test("403 'API not used/disabled' pauses Tasks", () => {
  expect(isTasksApiDisabledError(403, '{"error":{"status":"PERMISSION_DENIED","message":"Google Tasks API has not been used in project 606658056274 before or it is disabled.","details":[{"reason":"SERVICE_DISABLED"}]}}')).toBe(true);
});
test("scope 403 and other statuses are not treated as disabled API", () => {
  expect(isTasksApiDisabledError(403, "ACCESS_TOKEN_SCOPE_INSUFFICIENT")).toBe(false);
  expect(isTasksApiDisabledError(500, "SERVICE_DISABLED")).toBe(false);
});

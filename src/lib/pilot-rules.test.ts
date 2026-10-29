import { test } from "node:test";
import assert from "node:assert/strict";
import { canChangePilotItem, pilotPassed } from "./pilot-rules";

test("quick start 1–5 plus complete onboarding 6–10 passes", () => assert.equal(pilotPassed([1,2,3,4,5,6,7,8,9,10]), true));
test("quick start 1–5 plus complete finance 11–15 passes", () => assert.equal(pilotPassed([1,2,3,4,5,11,12,13,14,15]), true));
test("each of quick start items 1–5 is mandatory", () => {
  for (let i=1; i<=5; i++) assert.equal(pilotPassed(Array.from({length:15}, (_, n) => n+1).filter(n => n!==i)), false);
});
test("partial onboarding and partial finance cannot be combined", () => assert.equal(pilotPassed([1,2,3,4,5,6,7,8,9,11,12,13,14]), false));
test("members can check each item 1–10", () => {
  for (let i=1; i<=10; i++) assert.equal(canChangePilotItem(false,i,true), true);
});
test("members cannot uncheck", () => assert.equal(canChangePilotItem(false,5,false), false));
test("all five finance items are manager-only", () => {
  for (let i=11; i<=15; i++) assert.equal(canChangePilotItem(false,i,true), false);
});
test("managers can check and uncheck all 15 items", () => {
  for (let i=1; i<=15; i++) for (const checked of [true,false]) assert.equal(canChangePilotItem(true,i,checked), true);
});
test("no sixteenth or fractional checklist item", () => {
  for (const i of [0,16,3.5]) assert.equal(canChangePilotItem(true,i,true), false);
});
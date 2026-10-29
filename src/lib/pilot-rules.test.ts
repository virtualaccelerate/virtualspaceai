import { test } from "node:test";
import assert from "node:assert/strict";
import { canChangePilotItem, pilotPassed } from "./pilot-rules";

const core = [1,2,3,4,5,6,7,8,9,10,17,18];
test("steps 1,2,3,6 plus onboarding step 4 passes", () => assert.equal(pilotPassed([...core,11,12,13]), true));
test("steps 1,2,3,6 plus finance step 5 passes", () => assert.equal(pilotPassed([...core,14,15,16]), true));
test("each core item is mandatory", () => {
  for (const i of core) assert.equal(pilotPassed(Array.from({length:18},(_,n)=>n+1).filter(n=>n!==i)), false);
});
test("partial onboarding and partial finance cannot be combined", () => assert.equal(pilotPassed([...core,11,12,14,15]), false));
test("members can check non-finance items", () => {
  for (const i of [...core,11,12,13]) assert.equal(canChangePilotItem(false,i,true), true);
});
test("members cannot uncheck", () => assert.equal(canChangePilotItem(false,5,false), false));
test("finance items 14–16 are manager-only", () => {
  for (let i=14; i<=16; i++) assert.equal(canChangePilotItem(false,i,true), false);
});
test("managers can check and uncheck all 18", () => {
  for (let i=1; i<=18; i++) for (const c of [true,false]) assert.equal(canChangePilotItem(true,i,c), true);
});
test("no nineteenth item", () => { for (const i of [0,19,3.5]) assert.equal(canChangePilotItem(true,i,true), false); });

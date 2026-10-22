import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { completionFacts, meaningfulUpdate, shouldNotifyRestoration, type FactTask } from './notification-facts';
const task: FactTask = { id:'a', title:'Task', assignee_id:null, assignee_name:null,user_id:'u',external_source:'yougile',external_updated_at:'2026-10-19T10:00:00Z',updated_at:'2026-10-22T01:00:00Z',created_at:'2026-09-01T00:00:00Z',reviewed_at:null,status:'done' };
describe('notification facts', () => {
 test('sync bumps are not completions', () => assert.deepEqual(completionFacts([task],[],new Set(['done']),'2026-10-21T01:00:00Z','2026-10-22T01:00:00Z'), []));
 test('real status transition counts once despite duplicate events', () => { const event={task_id:'a',from_value:'review',to_value:'done',created_at:'2026-10-21T22:00:00Z',kind:'external_update'}; assert.equal(completionFacts([task],[event,event],new Set(['done']),'2026-10-21T01:00:00Z','2026-10-22T01:00:00Z').length, 1); });
 test('importing a done task is not a completion', () => assert.deepEqual(completionFacts([task],[{task_id:'a',from_value:null,to_value:'done',created_at:'2026-10-22T00:00:00Z',kind:'imported'}],new Set(['done']),'2026-10-21T01:00:00Z','2026-10-22T01:00:00Z'), []));
 test('tracker inactivity uses external timestamp', () => assert.equal(meaningfulUpdate(task), '2026-10-19T10:00:00Z'));
 test('local inactivity keeps local timestamp', () => assert.equal(meaningfulUpdate({...task,external_source:null}), '2026-10-22T01:00:00Z'));
 test('restoration within 24 hours is suppressed', () => assert.equal(shouldNotifyRestoration('2026-10-21T12:00:00Z', Date.parse('2026-10-22T01:00:00Z')), false));
 test('24-hour-old archive can notify', () => assert.equal(shouldNotifyRestoration('2026-10-21T01:00:00Z', Date.parse('2026-10-22T01:00:00Z')), true));
 test('legacy archive without provenance never floods', () => assert.equal(shouldNotifyRestoration(null), false));
});

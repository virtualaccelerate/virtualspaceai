import { describe, test, expect } from 'bun:test';
import { completionFacts, meaningfulUpdate, shouldNotifyRestoration, type FactTask } from './notification-facts';
const task: FactTask = { id:'a', title:'Task', assignee_id:null, assignee_name:null,user_id:'u',external_source:'yougile',external_updated_at:'2026-10-19T10:00:00Z',updated_at:'2026-10-22T01:00:00Z',created_at:'2026-09-01T00:00:00Z',reviewed_at:null,status:'done' };
describe('notification facts', () => {
 test('sync bumps are not completions', () => expect(completionFacts([task],[],new Set(['done']),'2026-10-21T01:00:00Z','2026-10-22T01:00:00Z')).toEqual([]));
 test('real status transition counts once despite duplicate events', () => { const event={task_id:'a',from_value:'review',to_value:'done',created_at:'2026-10-21T22:00:00Z',kind:'external_update'}; expect(completionFacts([task],[event,event],new Set(['done']),'2026-10-21T01:00:00Z','2026-10-22T01:00:00Z')).toHaveLength(1); });
 test('importing a done task is not a completion', () => expect(completionFacts([task],[{task_id:'a',from_value:null,to_value:'done',created_at:'2026-10-22T00:00:00Z',kind:'imported'}],new Set(['done']),'2026-10-21T01:00:00Z','2026-10-22T01:00:00Z')).toEqual([]));
 test('tracker inactivity uses external timestamp', () => expect(meaningfulUpdate(task)).toBe('2026-10-19T10:00:00Z'));
 test('local inactivity keeps local timestamp', () => expect(meaningfulUpdate({...task,external_source:null})).toBe('2026-10-22T01:00:00Z'));
 test('restoration within 24 hours is suppressed', () => expect(shouldNotifyRestoration('2026-10-21T12:00:00Z', Date.parse('2026-10-22T01:00:00Z'))).toBe(false));
 test('24-hour-old archive can notify', () => expect(shouldNotifyRestoration('2026-10-21T01:00:00Z', Date.parse('2026-10-22T01:00:00Z'))).toBe(true));
 test('legacy archive without provenance never floods', () => expect(shouldNotifyRestoration(null)).toBe(false));
});

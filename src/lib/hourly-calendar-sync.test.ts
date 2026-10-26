import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHourlyCalendarSync } from '../routes/api/public/hooks/tasks-daily';

test('hourly Calendar sync is registered once without waiting for Worker completion', async () => {
  const pending: Promise<unknown>[] = [];
  const request = Object.assign(new Request('https://example.test'), {
    waitUntil(work: Promise<unknown>) { assert.equal(this, request); pending.push(work); },
  });
  let calls = 0;
  let finish: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  await runHourlyCalendarSync(request, async () => { calls++; await gate; });
  assert.equal(calls, 1);
  assert.equal(pending.length, 1);
  finish?.();
  await pending[0];
});

test('Calendar sync is awaited outside Workers', async () => {
  let completed = false;
  await runHourlyCalendarSync(new Request('https://example.test'), async () => {
    await Promise.resolve();
    completed = true;
  });
  assert.equal(completed, true);
});

test('Calendar errors are logged without stopping the hourly callback', async () => {
  const original = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => { logged.push(args); };
  const failure = new Error('Calendar unavailable');
  try {
    await runHourlyCalendarSync(new Request('https://example.test'), async () => { throw failure; });
    assert.deepEqual(logged, [['[google-calendar-sync]', failure]]);
  } finally { console.error = original; }
});
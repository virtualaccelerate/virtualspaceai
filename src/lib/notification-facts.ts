export type FactTask = { id: string; title: string; assignee_id: string | null; assignee_name: string | null; user_id: string; external_source: string | null; external_updated_at: string | null; updated_at: string; created_at: string; reviewed_at: string | null; status: string };
export type StatusEvent = { task_id: string; from_value: string | null; to_value: string | null; created_at: string; kind: string };
export function completionFacts(tasks: FactTask[], events: StatusEvent[], doneValues: Set<string>, since: string, until: string) {
  const closed = new Map<string, string>();
  for (const event of events) {
    if (event.created_at < since || event.created_at > until) continue;
    if (event.kind !== 'imported' && doneValues.has(event.to_value ?? '') && !doneValues.has(event.from_value ?? '')) {
      const old = closed.get(event.task_id);
      if (!old || old < event.created_at) closed.set(event.task_id, event.created_at);
    }
  }
  for (const task of tasks) {
    if (!task.external_source && task.status === 'done' && task.reviewed_at && task.reviewed_at >= since && task.reviewed_at <= until) closed.set(task.id, task.reviewed_at);
  }
  return tasks.filter(t => closed.has(t.id)).map(t => ({ ...t, completed_at: closed.get(t.id) ?? since }));
}
export function meaningfulUpdate(task: Pick<FactTask, 'external_source' | 'external_updated_at' | 'updated_at'>) {
  return task.external_source ? task.external_updated_at : task.updated_at;
}
export function shouldNotifyRestoration(archivedAt: string | null | undefined, now = Date.now()) {
  return !!archivedAt && now - new Date(archivedAt).getTime() >= 24 * 3600_000;
}

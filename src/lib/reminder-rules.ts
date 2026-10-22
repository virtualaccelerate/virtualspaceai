export function deadlineReminderWindow(due: string, now: number) {
  const deadline = Date.parse(`${due}T12:00:00.000Z`);
  const hours = (deadline - now) / 3600_000;
  if (hours > 2 && hours <= 3) return { kind: `h3:${due}`, heading: "⏰ До дедлайна 3 часа" };
  if (hours > 0 && hours <= 1) return { kind: `h1:${due}`, heading: "⏰ До дедлайна 1 час" };
  const today = new Date(now + 6 * 3600_000).toISOString().slice(0, 10);
  if (hours <= 0) return today === due
    ? { kind: `deadline:${due}`, heading: "⏰ Наступил дедлайн задачи" }
    : { kind: `overdue:${today}`, heading: "🔴 Задача просрочена" };
  return null;
}

export function suppressAiReminder(type: string, taskIds: string[], reminded: Set<string>) {
  return (type === "deadline" || type === "overdue") &&
    (!taskIds.length || taskIds.some(id => reminded.has(id)));
}

export function canSetupWorkspaceBot(role: string | null | undefined) {
  return role === "owner";
}
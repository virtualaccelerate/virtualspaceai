/**
 * Task history.
 *
 * Every meaningful change — local, from Telegram, or coming back from Trello /
 * YouGile — is written here so the task card can show a readable timeline.
 */

export type TaskEventInput = {
  taskId: string;
  teamspaceId: string | null;
  actorId?: string | null;
  actorName?: string | null;
  source?: "virtual_space" | "telegram" | "trello" | "yougile";
  kind: string;
  field?: string | null;
  from?: string | null;
  to?: string | null;
  note?: string | null;
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function recordTaskEvent(input: TaskEventInput) {
  if (!input.taskId) return;
  const admin = await db();
  await admin
    .from("task_events")
    .insert({
      task_id: input.taskId,
      teamspace_id: input.teamspaceId,
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      source: input.source ?? "virtual_space",
      kind: input.kind,
      field: input.field ?? null,
      from_value: input.from ?? null,
      to_value: input.to ?? null,
      note: input.note ?? null,
    })
    .then(() => undefined, () => undefined);
}

export async function recordTaskEvents(events: TaskEventInput[]) {
  for (const event of events) await recordTaskEvent(event);
}

export async function listTaskEventsForUser(userId: string, taskId: string) {
  const admin = await db();
  const { data: task } = await admin
    .from("tasks")
    .select("id, teamspace_id, title, description, status, priority, due_date, assignee_id, assignee_name, project, department, created_at, updated_at, external_source, external_url, external_project, external_board, external_archived, status_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) throw new Error("Задача не найдена");
  if (task.teamspace_id) {
    const { data: membership } = await admin
      .from("teamspace_members")
      .select("id")
      .eq("teamspace_id", task.teamspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) throw new Error("Нет доступа к задаче");
  } else if (task.assignee_id !== userId) {
    throw new Error("Нет доступа к задаче");
  }
  const { data: events } = await admin
    .from("task_events")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(200);
  let statusName: string | null = null;
  if (task.status_id) {
    const { data: status } = await admin.from("teamspace_statuses").select("name").eq("id", task.status_id).maybeSingle();
    statusName = status?.name ?? null;
  }
  // Discussion that happens inside the tracker is shown next to local history.
  let chat: Record<string, unknown>[] = [];
  if (task.external_source === "yougile" && task.teamspace_id) {
    const { data: external } = await admin.from("tasks").select("external_id").eq("id", taskId).maybeSingle();
    if (external?.external_id) {
      const { listYouGileTaskChat } = await import("./yougile.server");
      chat = (await listYouGileTaskChat(task.teamspace_id, external.external_id).catch(() => [])) as Record<string, unknown>[];
    }
  }
  const merged = [...(events ?? []), ...chat].sort(
    (a, b) => new Date(String(b['created_at'])).getTime() - new Date(String(a['created_at'])).getTime(),
  );
  return { task: { ...task, status_name: statusName }, events: merged };

}

/** Recent activity across both trackers, for the workspace board and the bot. */
export async function listWorkspaceActivity(teamspaceId: string, limit = 20) {
  const admin = await db();
  const { data } = await admin
    .from("task_events")
    .select("id, task_id, kind, field, from_value, to_value, actor_name, source, created_at")
    .eq("teamspace_id", teamspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = [...new Set((data ?? []).map((row) => row.task_id))];
  const { data: tasks } = ids.length
    ? await admin.from("tasks").select("id, title").in("id", ids)
    : { data: [] as { id: string; title: string }[] };
  const titles = new Map((tasks ?? []).map((row) => [row.id, row.title]));
  return (data ?? []).map((row) => ({ ...row, task_title: titles.get(row.task_id) ?? "Задача" }));
}

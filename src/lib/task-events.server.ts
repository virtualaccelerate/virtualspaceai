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
    .select("id, teamspace_id, user_id, title, description, status, priority, due_date, assignee_id, assignee_name, project, department, created_at, updated_at, external_source, external_url, external_project, external_board, external_archived, status_id, source_group_id")
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
    const { isWorkspaceManager } = await import("./roles.server");
    const isManager = await isWorkspaceManager(userId, task.teamspace_id);
    const { taskBelongsTo, viewerIdentity } = await import("./task-visibility.server");
    if (!isManager && !taskBelongsTo(task, await viewerIdentity(userId))) {
      throw new Error("Нет доступа к задаче");
    }
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
  const creation = (events ?? []).some((e) => e.kind === "created") ? [] : [{id: `created-${task.id}`, kind: "created", field: null, from_value: null, to_value: null, note: null, actor_id: task.user_id, actor_name: null, source: task.source_group_id ? "telegram_group" : task.external_source ?? "virtual_space", created_at: task.created_at}];
  const merged = [...(events ?? []), ...chat, ...creation].sort(
    (a, b) => new Date(String(b['created_at'])).getTime() - new Date(String(a['created_at'])).getTime(),
  );
  const { data: membershipRows } = task.teamspace_id ? await admin.from("teamspace_members").select("user_id").eq("teamspace_id", task.teamspace_id) : { data: [] };
  const ids = [...new Set([...(membershipRows ?? []).map((m) => m.user_id), ...(events ?? []).flatMap((e) => e.actor_id ? [e.actor_id] : [])])];
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id, full_name, email, avatar_url").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return { task: { ...task, status_name: statusName }, viewer_id: userId,
    members: (membershipRows ?? []).map((m) => ({ id: m.user_id, name: byId.get(m.user_id)?.full_name || byId.get(m.user_id)?.email || "Team member" })),
    events: merged.map((e: any) => ({ ...e, actor_avatar: byId.get(e.actor_id)?.avatar_url ?? null })) };

}

export async function saveCommentForUser(userId: string, input: {task_id: string; comment_id?: string; body: string; mentions: string[]}) {
  const { task, members } = await listTaskEventsForUser(userId, input.task_id);
  if (!task.teamspace_id) throw new Error("No workspace");
  const admin = await db();
  const { canEditComment, commentRecipients } = await import("./task-comment-rules");
  const mentions = [...new Set(input.mentions)].filter((id) => members.some((m) => m.id === id));
  const { displayName } = await import("./notifications.server");
  if (input.comment_id) {
    const { data: event } = await admin.from("task_events").select("*").eq("id", input.comment_id).eq("task_id", input.task_id).maybeSingle();
    if (!event || !canEditComment(event, userId)) throw new Error("Comment access denied");
    const { error } = await admin.from("task_events").update({note: input.body, mentions, edited_at: new Date().toISOString()}).eq("id", event.id).eq("actor_id", userId).is("deleted_at", null);
    if (error) throw error;
  } else {
    const { error } = await admin.from("task_events").insert({task_id: task.id, teamspace_id: task.teamspace_id, actor_id: userId, actor_name: await displayName(userId), source: "virtual_space", kind: "comment", note: input.body, mentions});
    if (error) throw error;
    const { deliver } = await import("./agent-automation.server");
    for (const recipient of commentRecipients(userId, task.user_id, task.assignee_id, mentions, members.map((m) => m.id))) {
      try { await deliver({userId: recipient, teamspaceId: task.teamspace_id, actorId: userId, taskId: task.id, title: mentions.includes(recipient) ? "Вас упомянули в комментарии" : "Новый комментарий к задаче", body: `${task.title}\n${input.body}`}); }
      catch (error) { console.error("[task-comment] notification failed", error instanceof Error ? error.message : "delivery error"); }
    }
  }
  return { ok: true };
}

export async function deleteCommentForUser(userId: string, taskId: string, commentId: string) {
  await listTaskEventsForUser(userId, taskId);
  const admin = await db();
  const { data: event } = await admin.from("task_events").select("*").eq("id", commentId).eq("task_id", taskId).maybeSingle();
  const { canEditComment } = await import("./task-comment-rules");
  if (!event || !canEditComment(event, userId)) throw new Error("Comment access denied");
  const { error } = await admin.from("task_events").update({deleted_at: new Date().toISOString()}).eq("id", commentId).eq("actor_id", userId).is("deleted_at", null);
  if (error) throw error;
  return { ok: true };
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

/** Readable activity feed. Managers see the whole workspace, members only their own tasks. */
export async function listActivityFeedForUser(userId: string, teamspaceId: string, limit = 200) {
  const { getWorkspaceRole, isManagerRole } = await import("./roles.server");
  const role = await getWorkspaceRole(userId, teamspaceId);
  if (!role) throw new Error("Нет доступа к пространству");
  const admin = await db();
  const { data } = await admin
    .from("task_events")
    .select("id, task_id, kind, field, from_value, to_value, note, actor_name, source, created_at")
    .eq("teamspace_id", teamspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = [...new Set((data ?? []).map((r) => r.task_id))];
  const { data: tasks } = ids.length
    ? await admin.from("tasks").select("id, title, project, assignee_id, assignee_name, user_id").in("id", ids)
    : { data: [] as any[] };
  const byId = new Map((tasks ?? []).map((t: any) => [t.id, t]));
  let visible = (data ?? []).filter((r) => byId.has(r.task_id));
  if (!isManagerRole(role)) {
    const { viewerIdentity, taskBelongsTo } = await import("./task-visibility.server");
    const viewer = await viewerIdentity(userId);
    visible = visible.filter((r) => taskBelongsTo(byId.get(r.task_id), viewer));
  }
  const ids2 = [...new Set(visible.flatMap((r) => [r.from_value, r.to_value]).filter((v): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v)))];
  const { data: statuses } = ids2.length
    ? await admin.from("teamspace_statuses").select("id, name").in("id", ids2)
    : { data: [] as any[] };
  const statusNames = new Map((statuses ?? []).map((s: any) => [s.id, s.name]));
  const label = (v: string | null) => (v ? statusNames.get(v) ?? v : v);
  return visible.map((r) => {
    const t: any = byId.get(r.task_id);
    return { ...r, from_value: label(r.from_value), to_value: label(r.to_value), task_title: t.title, project: t.project };
  });
}

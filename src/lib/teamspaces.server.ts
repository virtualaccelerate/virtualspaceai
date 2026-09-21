export async function deleteTeamspaceForUser(userId: string, teamspaceId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: teamspace, error: teamspaceError } = await supabaseAdmin
    .from("teamspaces")
    .select("id, name, owner_id, logo_path")
    .eq("id", teamspaceId)
    .maybeSingle();
  if (teamspaceError) throw new Error(teamspaceError.message);
  if (!teamspace) throw new Error("Рабочее пространство не найдено");
  if (teamspace.owner_id !== userId) throw new Error("Удалить пространство может только владелец");

  const { data: documents } = await supabaseAdmin
    .from("documents")
    .select("storage_path")
    .eq("teamspace_id", teamspaceId);

  // Detach user-level references that must survive the workspace.
  const [profilesResult, telegramResult] = await Promise.all([
    supabaseAdmin.from("profiles").update({ current_teamspace_id: null }).eq("current_teamspace_id", teamspaceId),
    supabaseAdmin.from("telegram_links").update({ teamspace_id: null }).eq("teamspace_id", teamspaceId),
  ]);
  const referenceError = [profilesResult, telegramResult].find((result) => result.error)?.error;
  if (referenceError) throw new Error(referenceError.message);

  // Remove everything that belongs to the workspace, deepest dependencies first.
  const { data: taskRows } = await supabaseAdmin
    .from("tasks")
    .select("id")
    .eq("teamspace_id", teamspaceId);
  const taskIds = (taskRows ?? []).map((row) => row.id);

  for (let index = 0; index < taskIds.length; index += 200) {
    const chunk = taskIds.slice(index, index + 200);
    const [remindersResult, calendarResult] = await Promise.all([
      supabaseAdmin.from("task_reminders").delete().in("task_id", chunk),
      supabaseAdmin.from("google_calendar_links").delete().in("task_id", chunk),
    ]);
    const taskChildError = [remindersResult, calendarResult].find((result) => result.error)?.error;
    if (taskChildError) throw new Error(taskChildError.message);
  }

  const scopedTables = [
    "notifications",
    "ai_notification_log",
    "activity_events",
    "chat_messages",
    "chat_conversations",
    "financial_chat_messages",
    "financial_sources",
    "documents",
    "pending_members",
    "task_sync_sources",
    "tasks",
    "teamspace_members",
  ] as const;

  for (const table of scopedTables) {
    const { error } = await supabaseAdmin.from(table).delete().eq("teamspace_id", teamspaceId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }


  const { error: deleteError } = await supabaseAdmin.from("teamspaces").delete().eq("id", teamspaceId);
  if (deleteError) throw new Error(deleteError.message);

  const storagePaths = [
    teamspace.logo_path,
    ...((documents ?? []).map((document) => document.storage_path)),
  ].filter((path): path is string => Boolean(path));
  if (storagePaths.length) {
    await Promise.all([
      teamspace.logo_path
        ? supabaseAdmin.storage.from("workspace-logos").remove([teamspace.logo_path])
        : Promise.resolve(),
      documents?.length
        ? supabaseAdmin.storage.from("documents").remove(documents.map((document) => document.storage_path))
        : Promise.resolve(),
    ]);
  }

  const { data: nextMembership } = await supabaseAdmin
    .from("teamspace_members")
    .select("teamspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (nextMembership?.teamspace_id) {
    await supabaseAdmin
      .from("profiles")
      .update({ current_teamspace_id: nextMembership.teamspace_id })
      .eq("id", userId);
  }

  return { deleted: true, nextTeamspaceId: nextMembership?.teamspace_id ?? null };
}
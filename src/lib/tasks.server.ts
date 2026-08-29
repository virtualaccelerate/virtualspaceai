import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.schemas";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function activeTeamspace(userId: string, requested?: string) {
  const db = await admin();
  let teamspaceId = requested;
  if (!teamspaceId) {
    const { data } = await db.from("profiles").select("current_teamspace_id").eq("id", userId).maybeSingle();
    teamspaceId = data?.current_teamspace_id ?? undefined;
  }
  if (!teamspaceId) throw new Error("No active workspace");
  const { data: membership } = await db
    .from("teamspace_members")
    .select("id")
    .eq("teamspace_id", teamspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) throw new Error("Workspace access denied");
  return teamspaceId;
}

async function assigneeName(teamspaceId: string, assigneeId?: string | null) {
  if (!assigneeId) return null;
  const db = await admin();
  const { data: member } = await db
    .from("teamspace_members")
    .select("user_id")
    .eq("teamspace_id", teamspaceId)
    .eq("user_id", assigneeId)
    .maybeSingle();
  if (!member) throw new Error("Assignee is not a workspace member");
  const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", assigneeId).maybeSingle();
  return profile?.full_name || profile?.email || "Team member";
}

export async function createTaskForUser(userId: string, data: CreateTaskInput) {
  const db = await admin();
  const teamspaceId = await activeTeamspace(userId, data.teamspace_id);
  const status = data.status ?? "backlog";
  const name = await assigneeName(teamspaceId, data.assignee_id);
  const { count } = await db.from("tasks").select("id", { count: "exact", head: true }).eq("teamspace_id", teamspaceId).eq("status", status);
  const { data: row, error } = await db.from("tasks").insert({
    user_id: userId,
    teamspace_id: teamspaceId,
    title: data.title,
    description: data.description ?? null,
    status,
    priority: data.priority ?? "medium",
    assignee_id: data.assignee_id ?? null,
    assignee_name: name,
    due_date: data.due_date ?? null,
    position: (count ?? 0) * 1000,
  }).select("*").single();
  if (error) throw new Error(error.message);
  const { notifyTaskAssignee } = await import("./telegram.server");
  await notifyTaskAssignee({ assigneeId: row.assignee_id, actorId: userId, kind: "assigned", title: row.title, status: row.status, priority: row.priority, dueDate: row.due_date }).catch(() => {});
  return row;
}

export async function updateTaskForUser(userId: string, data: UpdateTaskInput) {
  const db = await admin();
  const { data: current } = await db.from("tasks").select("*").eq("id", data.id).maybeSingle();
  if (!current) throw new Error("Task not found");
  await activeTeamspace(userId, current.teamspace_id);
  const patch: Record<string, unknown> = { ...data };
  delete patch.id;
  if (Object.prototype.hasOwnProperty.call(data, "assignee_id")) {
    patch.assignee_name = await assigneeName(current.teamspace_id, data.assignee_id);
  }
  const { data: row, error } = await db.from("tasks").update(patch).eq("id", data.id).select("*").single();
  if (error) throw new Error(error.message);
  const newlyAssigned = row.assignee_id && row.assignee_id !== current.assignee_id;
  const changed = row.title !== current.title || row.status !== current.status || row.priority !== current.priority || row.due_date !== current.due_date;
  if (newlyAssigned || (changed && row.assignee_id)) {
    const { notifyTaskAssignee } = await import("./telegram.server");
    await notifyTaskAssignee({ assigneeId: row.assignee_id, actorId: userId, kind: newlyAssigned ? "assigned" : "updated", title: row.title, status: row.status, priority: row.priority, dueDate: row.due_date }).catch(() => {});
  }
  return row;
}

export async function deleteTaskForUser(userId: string, id: string) {
  const db = await admin();
  const { data: current } = await db.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!current) throw new Error("Task not found");
  await activeTeamspace(userId, current.teamspace_id);
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (current.assignee_id) {
    const { notifyTaskAssignee } = await import("./telegram.server");
    await notifyTaskAssignee({ assigneeId: current.assignee_id, actorId: userId, kind: "deleted", title: current.title }).catch(() => {});
  }
  return { ok: true };
}

export async function listMembersForUser(userId: string, teamspaceId: string) {
  await activeTeamspace(userId, teamspaceId);
  const db = await admin();
  const { data: memberships, error } = await db.from("teamspace_members").select("user_id, role").eq("teamspace_id", teamspaceId);
  if (error) throw new Error(error.message);
  const ids = (memberships ?? []).map((m) => m.user_id);
  if (!ids.length) return [];
  const { data: profiles } = await db.from("profiles").select("id, full_name, email, avatar_url").in("id", ids);
  return (memberships ?? []).map((m) => {
    const profile = profiles?.find((p) => p.id === m.user_id);
    return { id: m.user_id, role: m.role, full_name: profile?.full_name ?? null, email: profile?.email ?? null, avatar_url: profile?.avatar_url ?? null };
  });
}
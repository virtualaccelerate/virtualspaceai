/**
 * Workspace roles.
 *
 * owner  — created the workspace, full control (including deleting it).
 * admin  — assigns tasks to anyone and gets the full team daily report.
 * member — only sees tasks assigned to them and only gets a report on their own work.
 *
 * Server-only.
 */

export type WorkspaceRole = "owner" | "admin" | "member";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Role of the user inside the workspace, or null when they are not a member. */
export async function getWorkspaceRole(
  userId: string,
  teamspaceId: string,
): Promise<WorkspaceRole | null> {
  const db = await admin();
  const { data } = await db
    .from("teamspace_members")
    .select("role")
    .eq("teamspace_id", teamspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const role = data.role as string;
  return role === "owner" || role === "admin" ? role : "member";
}

/** Owners and admins manage the workspace: assign tasks, edit anyone's task, bulk actions. */
export function isManagerRole(role: WorkspaceRole | string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export async function isWorkspaceManager(userId: string, teamspaceId: string): Promise<boolean> {
  return isManagerRole(await getWorkspaceRole(userId, teamspaceId));
}

export async function requireManager(userId: string, teamspaceId: string, action = "выполнить это действие") {
  if (!(await isWorkspaceManager(userId, teamspaceId))) {
    throw new Error(`Только владелец или администратор может ${action}`);
  }
}

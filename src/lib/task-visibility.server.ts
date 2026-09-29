/**
 * Which tasks a plain member may see.
 *
 * Imported tracker tasks (YouGile / Trello) often carry only an assignee name,
 * so ownership is matched by id first and by profile name / email login second.
 * Mirrors private.task_belongs_to_user in the database.
 */

export type VisibilityTask = {
  assignee_id?: string | null;
  assignee_name?: string | null;
  user_id?: string | null;
};

export type ViewerIdentity = { id: string; names: string[] };

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

export async function viewerIdentity(userId: string): Promise<ViewerIdentity> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  const names = [norm(data?.full_name), norm(data?.email?.split("@")[0] ?? null)].filter(Boolean);
  return { id: userId, names };
}

export function taskBelongsTo(task: VisibilityTask, viewer: ViewerIdentity): boolean {
  if (task.assignee_id === viewer.id) return true;
  if (task.user_id === viewer.id) return true;
  if (!task.assignee_id && task.assignee_name) {
    return viewer.names.includes(norm(task.assignee_name));
  }
  return false;
}

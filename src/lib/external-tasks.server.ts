/** Shared helpers for tasks mirrored from an external tracker (YouGile, Trello). */

export const EXTERNAL_TASK_SOURCES = ["yougile", "trello"] as const;
export type ExternalTaskSource = (typeof EXTERNAL_TASK_SOURCES)[number];

export type ManagedStatus = "backlog" | "in_progress" | "review" | "done";

export function isExternalTask(source: unknown): source is ExternalTaskSource {
  return typeof source === "string" && (EXTERNAL_TASK_SOURCES as readonly string[]).includes(source);
}

export function externalLabel(source: unknown): string {
  return source === "trello" ? "Trello" : source === "yougile" ? "YouGile" : "";
}

/** Pushes a Virtual Space status change back into the tracker that owns the task. */
export async function pushExternalStatus(source: unknown, taskId: string, status: ManagedStatus, actorId: string) {
  if (source === "yougile") {
    const { updateYouGileTaskStatus } = await import("./yougile.server");
    return updateYouGileTaskStatus(taskId, status, actorId);
  }
  if (source === "trello") {
    const { updateTrelloTaskStatus } = await import("./trello.server");
    return updateTrelloTaskStatus(taskId, status, actorId);
  }
  return null;
}

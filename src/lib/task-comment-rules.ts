export function commentRecipients(author: string, creator: string, assignee: string | null, mentions: string[], members: string[]) {
  const allowed = new Set(members);
  return [...new Set([creator, assignee, ...mentions])].filter((id): id is string => !!id && id !== author && allowed.has(id));
}

export function canEditComment(event: { kind: string; source: string | null; actor_id: string | null; deleted_at?: string | null }, userId: string) {
  return event.kind === "comment" && event.source === "virtual_space" && event.actor_id === userId && !event.deleted_at;
}
/** Stateless Telegram callback IDs (49 ASCII bytes at most). Never roster indexes. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function compact(id: string): string {
  if (!UUID.test(id)) throw new Error("Invalid assignment id");
  const hex = id.replace(/-/g, "");
  const bytes = hex.match(/../g) ?? [];
  return btoa(String.fromCharCode(...bytes.map((part) => parseInt(part, 16)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function expand(id: string): string {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) throw new Error("Invalid assignment button");
  const bytes = atob(id.replace(/-/g, "+").replace(/_/g, "/") + "==");
  if (bytes.length !== 16) throw new Error("Invalid assignment button");
  const hex = Array.from(bytes, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  if (compact(uuid) !== id) throw new Error("Invalid assignment button");
  return uuid;
}
export function assignmentCallback(taskId: string, member: string | "self" | "none") {
  return `asg:${compact(taskId)}:${member === "self" || member === "none" ? member : compact(member)}`;
}
export function parseAssignmentCallback(data: string, userId: string) {
  const [action, task, member, extra] = data.split(":");
  if (action !== "asg" || !task || !member || extra !== undefined) throw new Error("Invalid assignment button");
  return { id: expand(task), assignee_id: member === "none" ? null : member === "self" ? userId : expand(member) };
}
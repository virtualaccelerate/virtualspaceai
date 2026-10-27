// Browser-safe rules for Telegram group linking (shared by server code and tests).

export function isGroupChat(chat: { type?: string } | null | undefined): boolean {
  return chat?.type === "group" || chat?.type === "supergroup";
}

/** Only messages sent after the bot joined are tracked. Telegram `date` is unix seconds. */
export function isAfterBotAdded(messageDateSec: number, botAddedAt: string | Date): boolean {
  const added = new Date(botAddedAt).getTime();
  return Number.isFinite(added) && messageDateSec * 1000 >= Math.floor(added / 1000) * 1000;
}

/** Linking a group to a workspace is reserved for its owners/admins. */
export function canLinkGroup(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function newGroupLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function normalizeGroupCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const normTitle = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** A proposed task duplicates an open task (or an earlier proposal) when titles match after normalization. */
export function isDuplicateTask(title: string, existing: string[]): boolean {
  const t = normTitle(title);
  return !t || existing.some((e) => normTitle(e) === t);
}

/** Group-reported completion: managers close tasks, everyone else (or unknown authors) sends them to review. */
export function groupCompletionStatus(authorIsManager: boolean): "done" | "review" {
  return authorIsManager ? "done" : "review";
}

/** Messages newer than both the bot join time and the last processing pass. */
export function pendingMessages<T extends { sent_at: string }>(messages: T[], botAddedAt: string, lastProcessedAt: string | null): T[] {
  const since = Math.max(Date.parse(botAddedAt) || 0, lastProcessedAt ? Date.parse(lastProcessedAt) || 0 : 0);
  return messages.filter((m) => Date.parse(m.sent_at) > since || (!lastProcessedAt && Date.parse(m.sent_at) >= since));
}

const DONE_RE = /(сделал|сделала|сделано|готово|выполнил|выполнила|закрыл|закрыла|\bdone\b|\bfinished\b)/i;
/** Saves AI credits: one lone message is processed only when it reports completion. */
export function shouldProcess(texts: string[]): boolean {
  return texts.length >= 2 || (texts.length === 1 && DONE_RE.test(texts[0] ?? ""));
}

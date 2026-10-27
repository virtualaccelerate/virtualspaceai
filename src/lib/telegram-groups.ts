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

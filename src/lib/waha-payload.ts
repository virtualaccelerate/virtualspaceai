// Browser-safe WAHA (WEBJS) webhook payload normalizer, ported from ZukhraAkylbek/wa-summary.
export type ParsedMessage = { id: string; chatId: string; senderJid: string | null; sender: string; body: string | null; ts: string; fromMe: boolean; mentionedJids: string[]; isGroup: boolean; isStatus: boolean; mediaType: string | null };
type Raw = { id?: string | { _serialized?: string; id?: string }; timestamp?: number; from?: string; to?: string; fromMe?: boolean; participant?: string; author?: string; body?: string; caption?: string; hasMedia?: boolean; type?: string; mentionedIds?: string[]; _data?: { notifyName?: string; pushName?: string; type?: string; caption?: string; mentionedJidList?: string[] } };

function messageId(p: Raw) { if (typeof p.id === "string") return p.id; return p.id?._serialized ?? p.id?.id ?? null; }
function chatIdFromMessageId(id: string) { const parts = id.split("_"); return parts.length >= 2 && parts[1].includes("@") ? parts[1] : null; }
export function jidPhone(jid?: string | null) { if (!jid) return null; if (!jid.endsWith("@c.us") && !jid.endsWith("@s.whatsapp.net")) return null; return jid.replace(/@.*$/, "").replace(/:\d+$/, "") || null; }
function displaySender(name: string | null, jid: string | null) { const num = jidPhone(jid); if (name && num) return `${name} (+${num})`; if (name) return name; if (num) return `+${num}`; if (jid?.endsWith("@lid")) return `lid:${jid.replace(/@.*$/, "")}`; return "unknown"; }
function bodyOf(p: Raw, mediaType: string | null) { const text = (p.body ?? p.caption ?? p._data?.caption ?? "").trim(); if (text) return text; if (p.hasMedia || mediaType) return `[${mediaType ?? "media"}]`; return null; }
function mentions(p: Raw) { return [...new Set([...(p.mentionedIds ?? []), ...(p._data?.mentionedJidList ?? [])])]; }

export function parseEvent(payload: unknown): ParsedMessage {
  const p = (payload ?? {}) as Raw; const id = messageId(p); if (!id) throw new Error("payload.id missing");
  const fromMe = Boolean(p.fromMe); const isStatus = p.from === "status@broadcast" || p.to === "status@broadcast";
  const chatId = (fromMe ? p.to : p.from) ?? chatIdFromMessageId(id); if (!chatId) throw new Error("payload.from/to missing");
  const isGroup = chatId.endsWith("@g.us"); const senderJid = fromMe ? (p.from ?? null) : isGroup ? (p.participant ?? p.author ?? null) : chatId;
  const name = p._data?.notifyName?.trim() || p._data?.pushName?.trim() || null; const rawType = p._data?.type ?? p.type ?? null; const mediaType = rawType && rawType !== "chat" ? rawType : null;
  const tsSec = typeof p.timestamp === "number" ? p.timestamp : Date.now() / 1000;
  return { id, chatId, senderJid, sender: displaySender(name, senderJid), body: bodyOf(p, mediaType), ts: new Date(tsSec * 1000).toISOString(), fromMe, mentionedJids: mentions(p), isGroup, isStatus, mediaType };
}

/** Only incoming group messages are stored. */
export function shouldStore(m: ParsedMessage) { return m.isGroup && !m.fromMe && !m.isStatus; }

/** Constant-time comparison of the ?secret= query value. */
export function checkWebhookSecret(given: string | null | undefined, expected: string | null | undefined): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Stable positive numeric id (≤ 2^48) used where the shared group logic expects numeric message ids. */
export function numericMessageId(id: string): number {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < id.length; i++) { const c = id.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 2246822519) >>> 0; }
  return (h2 & 0xffff) * 2 ** 32 + h1;
}

export function digits(v?: string | null) { return (v ?? "").replace(/\D/g, ""); }

export function whatsappWelcome(code: string) {
  return `Задачи ведутся с этого момента. Код привязки: ${code} — введите его в Virtual Space → Telegram → «Группы».`;
}

export function newWhatsappGroupRow(chatId: string, code: string, now = new Date()) {
  return { provider: "whatsapp", external_chat_id: chatId, chat_id: null, title: null, status: "pending", bot_added_at: now.toISOString(), bot_is_admin: false, link_code: code };
}

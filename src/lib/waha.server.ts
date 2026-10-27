// Server-only WAHA client. Reads env inside calls (Workers inject per request).
export function wahaConfig() {
  const url = process.env["WAHA_URL"]?.replace(/\/+$/, "");
  const key = process.env["WAHA_API_KEY"];
  const secret = process.env["WAHA_WEBHOOK_SECRET"];
  const session = process.env["WAHA_SESSION"] || "default";
  if (!url || !key || !secret) return null;
  return { url, key, secret, session };
}

export const WAHA_DISABLED = "WhatsApp-группы отключены: задайте WAHA_URL, WAHA_API_KEY и WAHA_WEBHOOK_SECRET.";

export async function sendText(chatId: string, text: string, mentions?: string[]) {
  const c = wahaConfig();
  if (!c) throw new Error(WAHA_DISABLED);
  const res = await fetch(`${c.url}/api/sendText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": c.key },
    body: JSON.stringify({ session: c.session, chatId, text, ...(mentions?.length ? { mentions } : {}) }),
  });
  if (!res.ok) throw new Error(`WAHA sendText ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** LID → phone number (digits) or null. Pass a per-run memo map. */
export async function lidToPhone(lid: string, memo: Map<string, string | null>): Promise<string | null> {
  if (memo.has(lid)) return memo.get(lid)!;
  const c = wahaConfig();
  let pn: string | null = null;
  if (c) {
    try {
      const res = await fetch(`${c.url}/api/${encodeURIComponent(c.session)}/lids/${encodeURIComponent(lid)}`, { headers: { "X-Api-Key": c.key } });
      if (res.ok) { const j = (await res.json()) as { pn?: string | null }; pn = j.pn ? j.pn.replace(/@.*$/, "").replace(/\D/g, "") || null : null; }
    } catch { /* unknown lid → name fallback */ }
  }
  memo.set(lid, pn);
  return pn;
}

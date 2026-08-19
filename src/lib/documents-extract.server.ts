/** Helpers for document text extraction — server only. */

export const TEXT_MIME =
  /^(text\/|application\/(json|xml|x-yaml|yaml|javascript|sql|csv|markdown))/i;
export const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|xml|yml|yaml|html?|log|js|ts|py|sql)$/i;

export function toBase64(bytes: Uint8Array) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function callGateway(key: string, body: unknown, attempt = 0): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    const retryAfter = Number(res.headers.get("retry-after") || 0);
    await new Promise((r) =>
      setTimeout(r, retryAfter > 0 ? retryAfter * 1000 : 1500 * (attempt + 1)),
    );
    return callGateway(key, body, attempt + 1);
  }
  if (res.status === 429) throw new Error("Слишком много запросов к ИИ — попробуйте через минуту.");
  if (res.status === 402) throw new Error("Исчерпаны AI-кредиты рабочего пространства.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI extract failed (${res.status}): ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content || "";
}

export const EXTRACT_SYSTEM_PROMPT =
  "You are a precise document text extractor. Output ONLY the document's text, verbatim, in its original language. Preserve reading order, headings, lists and table rows (tables as pipe-separated rows). Never summarize, never translate, never add commentary. If a part is unreadable, write [нечитаемо].";

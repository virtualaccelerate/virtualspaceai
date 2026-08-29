/** Helpers for document text extraction — server only. */

export const TEXT_MIME =
  /^(text\/|application\/(json|xml|x-yaml|yaml|javascript|sql|csv|markdown))/i;
export const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|xml|yml|yaml|html?|log|js|ts|py|sql)$/i;

export const SPREADSHEET_MIME =
  /application\/(vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-excel|vnd\.ms-excel\.sheet\.macroenabled\.12|vnd\.ms-excel\.sheet\.binary\.macroenabled\.12|vnd\.oasis\.opendocument\.spreadsheet)/i;
export const SPREADSHEET_EXT = /\.(xlsx|xls|xlsm|xlsb|ods)$/i;

/** Convert every workbook sheet to readable CSV while preserving displayed values. */
export async function extractSpreadsheetText(bytes: Uint8Array) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const sections: string[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      const cell = sheet[address];
      if (cell?.t === "d") {
        cell.z = "yyyy-mm-dd";
        delete cell.w;
      }
    }
    const csv = XLSX.utils.sheet_to_csv(sheet, {
      blankrows: false,
      dateNF: "yyyy-mm-dd",
    }).trim();
    const limited = csv.slice(0, 60_000);
    sections.push(
      `## SHEET: ${name}\n${limited || "[empty sheet]"}${csv.length > limited.length ? "\n[sheet truncated]" : ""}`,
    );
  }

  return sections.join("\n\n").slice(0, 200_000);
}

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

/** Helpers for document text extraction — server only. */

export const TEXT_MIME =
  /^(text\/|application\/(json|xml|x-yaml|yaml|javascript|sql|csv|markdown))/i;
export const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|xml|yml|yaml|html?|log|js|ts|py|sql)$/i;

export const SPREADSHEET_MIME =
  /application\/(vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-excel|vnd\.ms-excel\.sheet\.macroenabled\.12|vnd\.ms-excel\.sheet\.binary\.macroenabled\.12|vnd\.oasis\.opendocument\.spreadsheet)/i;
export const SPREADSHEET_EXT = /\.(xlsx|xls|xlsm|xlsb|ods)$/i;

export const PRESENTATION_MIME =
  /application\/(vnd\.openxmlformats-officedocument\.presentationml\.presentation|vnd\.ms-powerpoint|vnd\.oasis\.opendocument\.presentation)/i;
export const PRESENTATION_EXT = /\.(pptx|ppt|odp)$/i;

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Resolve an OOXML relationship Target (often relative, e.g. "../notesSlides/notesSlide1.xml") against the folder the .rels file lives in. */
function resolveOoxmlPath(baseDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = `${baseDir}/${target}`.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function relsTargets(xml: string): { id: string; type: string; target: string }[] {
  return [...xml.matchAll(/<Relationship\b[^>]*\/>/g)].map((m) => {
    const tag = m[0];
    const id = tag.match(/\bId="([^"]+)"/)?.[1] ?? "";
    const type = tag.match(/\bType="([^"]+)"/)?.[1] ?? "";
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1] ?? "";
    return { id, type, target };
  });
}

/**
 * Extract readable text from a PowerPoint (.pptx) file — slide titles, body
 * text and speaker notes, in slide order. Legacy binary .ppt / .odp are not
 * supported (not an OOXML zip) and should be rejected by the caller.
 */
export async function extractPresentationText(bytes: Uint8Array) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);

  const textRunsOf = async (path: string) => {
    const file = zip.file(path);
    if (!file) return "";
    const xml = await file.async("string");
    const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]));
    return runs.join(" ").replace(/\s+/g, " ").trim();
  };

  // The real, user-visible slide order comes from presentation.xml's sldIdLst
  // (a list of r:id refs) resolved through presentation.xml.rels — slideN.xml
  // filenames only reflect creation order, which can differ after reordering.
  let slidePaths: string[] = [];
  const presoXml = await zip.file("ppt/presentation.xml")?.async("string");
  const presoRels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");
  if (presoXml && presoRels) {
    const relMap = new Map(relsTargets(presoRels).map((r) => [r.id, r.target]));
    const rIds = [...presoXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((m) => m[1]);
    slidePaths = rIds
      .map((rId) => relMap.get(rId))
      .filter((t): t is string => !!t)
      .map((t) => resolveOoxmlPath("ppt", t));
  }
  if (!slidePaths.length) {
    // Fallback for anything unusual: sort by the numeric filename suffix.
    const numberOf = (path: string) => Number(path.match(/(\d+)\.xml$/)?.[1] ?? 0);
    slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => numberOf(a) - numberOf(b));
  }

  const sections: string[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const body = await textRunsOf(slidePath);

    // The slide's own .rels file says which notesSlideN.xml (if any) belongs
    // to it — notes file numbers don't reliably line up with slide numbers.
    const slideFileName = slidePath.split("/").pop() ?? "";
    const slideDir = slidePath.slice(0, slidePath.length - slideFileName.length - 1);
    const slideRels = await zip.file(`${slideDir}/_rels/${slideFileName}.rels`)?.async("string");
    const notesTarget = slideRels
      ? relsTargets(slideRels).find((r) => /\/notesSlide$/.test(r.type))?.target
      : undefined;
    const notes = notesTarget ? await textRunsOf(resolveOoxmlPath(slideDir, notesTarget)) : "";

    sections.push(`## SLIDE ${i + 1}\n${body || "[no text]"}${notes ? `\n[notes] ${notes}` : ""}`);
  }

  return sections.join("\n\n").slice(0, 200_000);
}

/**
 * Fetch a public web page and reduce it to readable text — used when a
 * plain "web" link is added to the knowledge base, so the AI can actually
 * read it instead of only seeing the URL.
 */
export async function fetchWebpageText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VirtualSpaceBot/1.0; +https://ai-virtualspace.com)" },
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) return null;

    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      const CAP = 2 * 1024 * 1024; // don't pull down more than 2MB of HTML
      while (bytes < CAP) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => {});
    } else {
      html = await res.text();
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeXmlEntities(titleMatch[1]).trim() : "";

    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>(?=\s*<|$)/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ");
    const text = decodeXmlEntities(body).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    if (!text) return null;
    return [title, text].filter(Boolean).join("\n\n").slice(0, 50_000);
  } catch {
    return null;
  }
}

/** Read the public page title for pre-filling a linked document name. */
export async function fetchWebpageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VirtualSpaceBot/1.0; +https://ai-virtualspace.com)" },
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return null;

    const html = (await res.text()).slice(0, 500_000);
    const metaTitle = html.match(/<meta\s+(?:[^>]*?\s)?property=["']og:title["'][^>]*?content=["']([^"']+)["'][^>]*>/i)?.[1]
      ?? html.match(/<meta\s+(?:[^>]*?\s)?content=["']([^"']+)["'][^>]*?property=["']og:title["'][^>]*>/i)?.[1];
    const htmlTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const title = decodeXmlEntities(metaTitle ?? htmlTitle ?? "").replace(/\s+/g, " ").trim();
    return title ? title.slice(0, 300) : null;
  } catch {
    return null;
  }
}

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

/** Extracts text from an uploaded file (txt / xlsx / pptx / docx / pdf) with the same helpers as the knowledge base. */
export async function extractFileText(bytes: Uint8Array, name: string, mimeType?: string | null): Promise<string> {
  const mime = (mimeType || "").toLowerCase();
  if (TEXT_MIME.test(mime) || TEXT_EXT.test(name)) return new TextDecoder().decode(bytes).slice(0, 180_000);
  if (SPREADSHEET_MIME.test(mime) || SPREADSHEET_EXT.test(name)) return extractSpreadsheetText(bytes);
  if (/\.pptx$/i.test(name) || /presentationml/i.test(mime)) return extractPresentationText(bytes);
  if (/\.docx$/i.test(name) || /wordprocessingml/i.test(mime)) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(bytes);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
    return xml
      .split(/<\/w:p>/)
      .map((p) => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => decodeXmlEntities(m[1] ?? "")).join(""))
      .filter((l) => l.trim())
      .join("\n")
      .slice(0, 180_000);
  }
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) {
    if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("Файл больше 15 МБ — разделите его на части.");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const dataUrl = `data:application/pdf;base64,${toBase64(bytes)}`;
    return (
      await callGateway(key, {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: EXTRACT_SYSTEM_PROMPT },
          { role: "user", content: [
            { type: "file", file: { filename: name, file_data: dataUrl } },
            { type: "text", text: "Extract ALL text from this document from the very beginning to the very end." },
          ] },
        ],
      })
    ).trim();
  }
  throw new Error("Формат не поддерживается (PDF, DOCX, PPTX, XLSX, TXT)");
}

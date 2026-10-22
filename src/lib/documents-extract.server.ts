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

/**
 * Extract readable text from a Word .docx file: paragraphs (keeping line
 * breaks, tabs and <w:br/>), tables row by row (cells joined with " | "),
 * plus headers, footers and footnotes when present.
 */
export async function extractWordText(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);

  // Replace structural markers with sentinels, strip every tag, then restore —
  // this keeps <w:tab/> and <w:br/> that live between <w:t> runs.
  const blockText = (xml: string) =>
    decodeXmlEntities(
      xml
        .replace(/<w:tab\s*\/>/g, "\u0001")
        .replace(/<w:br\b[^>]*\/?>/g, "\u0002")
        .replace(/<w:cr\s*\/?>/g, "\u0002")
        .replace(/<[^>]+>/g, ""),
    )
      .replace(/\u0001/g, "\t")
      .replace(/\u0002/g, "\n");

  const renderBlocks = (xml: string) => {
    const body = xml.match(/<w:body[\s>]([\s\S]*)<\/w:body>/)?.[1] ?? xml;
    const blocks = body.match(/<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const lines: string[] = [];
    for (const block of blocks) {
      if (block.startsWith("<w:tbl")) {
        for (const row of block.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? []) {
          const cells = (row.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? []).map((c) =>
            blockText(c).replace(/\s+/g, " ").trim(),
          );
          if (cells.some(Boolean)) lines.push(cells.join(" | "));
        }
      } else {
        const line = blockText(block).trimEnd();
        if (line.trim()) lines.push(line);
      }
    }
    return lines.join("\n");
  };

  const headers: string[] = [];
  const footers: string[] = [];
  let footnotes = "";
  for (const path of Object.keys(zip.files)) {
    if (/^word\/header\d+\.xml$/.test(path)) {
      const t = renderBlocks((await zip.file(path)?.async("string")) ?? "");
      if (t.trim()) headers.push(t);
    } else if (/^word\/footer\d+\.xml$/.test(path)) {
      const t = renderBlocks((await zip.file(path)?.async("string")) ?? "");
      if (t.trim()) footers.push(t);
    } else if (path === "word/footnotes.xml") {
      footnotes = renderBlocks((await zip.file(path)?.async("string")) ?? "");
    }
  }

  // The main document part is usually word/document.xml, but the package
  // relationships (_rels/.rels) are the source of truth — some producers
  // name it differently (e.g. word/document2.xml).
  let mainPath = "word/document.xml";
  const rootRels = await zip.file("_rels/.rels")?.async("string");
  if (rootRels) {
    const target = relsTargets(rootRels).find((r) => /\/officeDocument$/.test(r.type))?.target;
    if (target) mainPath = resolveOoxmlPath("", target);
  }
  const docXml = (await zip.file(mainPath)?.async("string")) ?? (await zip.file("word/document.xml")?.async("string")) ?? "";
  const parts = [...headers, renderBlocks(docXml), ...footers, footnotes].filter((p) => p.trim());
  return parts.join("\n\n").slice(0, 180_000);
}

/** Extract readable text from an OpenDocument text file (.odt) via content.xml. */
export async function extractOdtText(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const xml = (await zip.file("content.xml")?.async("string")) ?? "";
  const marked = xml
    .replace(/<text:line-break\s*\/>/g, "\u0002")
    .replace(/<text:tab\s*\/>/g, "\u0001")
    .replace(/<text:s\b[^>]*\/>/g, " ");
  const blocks =
    marked.match(/<text:(?:p|h)\b[\s\S]*?<\/text:(?:p|h)>|<table:table-row\b[\s\S]*?<\/table:table-row>/g) ?? [];
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.startsWith("<table:table-row")) {
      const cells = (block.match(/<table:table-cell\b[\s\S]*?<\/table:table-cell>/g) ?? []).map((c) =>
        decodeXmlEntities(c.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
      );
      if (cells.some(Boolean)) lines.push(cells.join(" | "));
    } else {
      const line = decodeXmlEntities(block.replace(/<[^>]+>/g, ""))
        .replace(/\u0001/g, "\t")
        .replace(/\u0002/g, "\n")
        .trimEnd();
      if (line.trim()) lines.push(line);
    }
  }
  return lines.join("\n").slice(0, 180_000);
}

/** Map a byte to a character using Windows-1251 (covers Cyrillic \'xx escapes). */
function cp1251Char(b: number): string {
  if (b >= 0xc0) return String.fromCodePoint(0x0410 + (b - 0xc0)); // А–я
  const HIGH: Record<number, string> = {
    0x80: "Ђ", 0x81: "Ѓ", 0x82: "‚", 0x83: "ѓ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
    0x88: "€", 0x89: "‰", 0x8a: "Љ", 0x8b: "‹", 0x8c: "Њ", 0x8d: "Ќ", 0x8e: "Ћ", 0x8f: "Џ",
    0x90: "ђ", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—",
    0x99: "™", 0x9a: "љ", 0x9b: "›", 0x9c: "њ", 0x9d: "ќ", 0x9e: "ћ", 0x9f: "џ",
    0xa1: "Ў", 0xa2: "ў", 0xa3: "Ј", 0xa5: "Ґ", 0xa8: "Ё", 0xaa: "Є", 0xaf: "Ї",
    0xb2: "І", 0xb3: "і", 0xb4: "ґ", 0xb8: "ё", 0xba: "є", 0xbf: "ї",
  };
  return HIGH[b] ?? String.fromCodePoint(b);
}

/** Extract plain text from an .rtf file: strips control words/groups, decodes \'xx and \uN escapes. */
export function extractRtfText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const SKIP_GROUPS = new Set([
    "fonttbl", "colortbl", "stylesheet", "info", "pict", "object",
    "themedata", "colorschememapping", "latentstyles", "datastore", "generator",
  ]);
  let out = "";
  let i = 0;
  let depth = 0;
  let skipDepth: number | null = null;
  let ucSkip = 1;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === "{") {
      const m = raw.slice(i + 1, i + 40).match(/^\\(?:\*\\)?([a-z]+)/i);
      if (m && SKIP_GROUPS.has(m[1].toLowerCase())) skipDepth = depth + 1;
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      if (skipDepth !== null && depth === skipDepth) skipDepth = null;
      depth--;
      i++;
      continue;
    }
    if (skipDepth !== null && depth >= skipDepth) {
      i++;
      continue;
    }
    if (ch === "\\") {
      const rest = raw.slice(i + 1);
      if (rest.startsWith("\\") || rest.startsWith("{") || rest.startsWith("}")) {
        out += rest[0];
        i += 2;
        continue;
      }
      const hex = rest.match(/^'([0-9a-fA-F]{2})/);
      if (hex) {
        out += cp1251Char(parseInt(hex[1], 16));
        i += 4;
        continue;
      }
      const word = rest.match(/^([a-z]+)(-?\d+)?\s?/i);
      if (word) {
        const w = word[1].toLowerCase();
        const num = word[2];
        i += 1 + word[0].length;
        if (w === "par" || w === "line") out += "\n";
        else if (w === "tab") out += "\t";
        else if (w === "bullet") out += "•";
        else if (w === "uc") ucSkip = Math.max(0, parseInt(num ?? "1", 10) || 0);
        else if (w === "u") {
          let code = parseInt(num ?? "0", 10);
          if (Number.isFinite(code)) {
            if (code < 0) code += 65536;
            out += String.fromCodePoint(code);
          }
          // Skip the \ucN fallback characters that follow the \uN word.
          let left = ucSkip;
          while (left-- > 0 && i < raw.length) {
            if (raw[i] === "\\" && raw[i + 1] === "'") i += 4;
            else if (raw[i] === "\\") i += 2;
            else i += 1;
          }
        }
        continue;
      }
      i += 2;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 180_000);
}

const ZIP_MEDIA_EXT = /\.(mp3|mp4|m4a|wav|ogg|oga|opus|mov|webm|avi|mkv|tga)$/i;
const ZIP_LIST_ONLY_EXT = /\.(pdf|png|jpe?g|webp|gif|heic|bmp|tiff?|svg)$/i;

/** Text for a supported file inside a zip archive, or null when unsupported. */
async function extractEmbeddedText(data: Uint8Array, path: string): Promise<string | null> {
  if (TEXT_EXT.test(path)) return new TextDecoder().decode(data);
  if (/\.docx$/i.test(path)) return extractWordText(data);
  if (/\.odt$/i.test(path)) return extractOdtText(data);
  if (/\.rtf$/i.test(path)) return extractRtfText(data);
  if (SPREADSHEET_EXT.test(path)) return extractSpreadsheetText(data);
  if (/\.pptx$/i.test(path)) return extractPresentationText(data);
  return null;
}

/**
 * Extract text from a .zip archive (e.g. a WhatsApp chat export with
 * `_chat.txt`). Every readable file becomes a "## FILE: <path>" section.
 * Folders, __MACOSX, hidden files, nested zips and media are skipped;
 * PDFs/images are listed by name only. Limits: 50 files, 10 MB per file,
 * 180 000 chars total.
 */
export async function extractZipText(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const sections: string[] = [];
  let total = 0;
  let count = 0;
  for (const path of Object.keys(zip.files).sort()) {
    const entry = zip.files[path];
    if (entry.dir) continue;
    const segments = path.split("/");
    if (segments[0] === "__MACOSX" || segments.some((s) => s.startsWith("."))) continue;
    if (/\.zip$/i.test(path)) continue; // no nested archives
    if (count >= 50) break;
    if (ZIP_MEDIA_EXT.test(path)) continue;
    if (ZIP_LIST_ONLY_EXT.test(path)) {
      sections.push(`## FILE: ${path}\n[PDF/изображение — загрузите отдельно, чтобы ИИ прочитал]`);
      count++;
      continue;
    }
    const declared = (entry as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof declared === "number" && declared > 10 * 1024 * 1024) continue;
    const data = await entry.async("uint8array");
    if (data.byteLength > 10 * 1024 * 1024) continue;
    const text = await extractEmbeddedText(data, path).catch(() => null);
    if (text === null) continue;
    const section = `## FILE: ${path}\n${text.trim() || "[пустой файл]"}`;
    sections.push(section.slice(0, Math.max(0, 180_000 - total)));
    total += section.length;
    count++;
    if (total >= 180_000) break;
  }
  return sections.join("\n\n").slice(0, 180_000);
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
  if (/\.docx$/i.test(name) || /wordprocessingml/i.test(mime)) return extractWordText(bytes);
  if (/\.odt$/i.test(name) || /opendocument\.text/i.test(mime)) return extractOdtText(bytes);
  if (/\.rtf$/i.test(name) || /^(application|text)\/rtf$/i.test(mime)) return extractRtfText(bytes);
  if (/\.zip$/i.test(name) || /application\/(zip|x-zip-compressed)/i.test(mime)) return extractZipText(bytes);
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
  throw new Error("Формат не поддерживается (PDF, Word .docx/.odt/.rtf, таблицы, презентации .pptx, текстовые файлы и ZIP-архивы)");
}

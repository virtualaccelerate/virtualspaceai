/** Shared, browser-safe helpers for knowledge-base links and project matching. */

export type LinkKind =
  | "google_sheets" | "google_docs" | "google_slides" | "google_drive" | "google_forms"
  | "trello" | "yougile" | "canva" | "figma" | "notion" | "miro" | "youtube" | "github" | "web";

export const LINK_LABEL: Record<LinkKind, string> = {
  google_sheets: "Google Sheets", google_docs: "Google Docs", google_slides: "Google Slides",
  google_drive: "Google Drive", google_forms: "Google Forms", trello: "Trello", yougile: "YouGile",
  canva: "Canva", figma: "Figma", notion: "Notion", miro: "Miro", youtube: "YouTube", github: "GitHub", web: "Web",
};

export function detectLinkKind(raw: string): LinkKind {
  let u: URL;
  try { u = new URL(raw); } catch { return "web"; }
  const h = u.hostname.replace(/^www\./, "");
  const p = u.pathname;
  if (h === "docs.google.com") {
    if (p.startsWith("/spreadsheets")) return "google_sheets";
    if (p.startsWith("/presentation")) return "google_slides";
    if (p.startsWith("/forms")) return "google_forms";
    return "google_docs";
  }
  if (h === "sheets.google.com") return "google_sheets";
  if (h === "drive.google.com") return "google_drive";
  if (h.endsWith("trello.com")) return "trello";
  if (h.endsWith("yougile.com")) return "yougile";
  if (h.endsWith("canva.com")) return "canva";
  if (h.endsWith("figma.com")) return "figma";
  if (h.endsWith("notion.so") || h.endsWith("notion.site")) return "notion";
  if (h.endsWith("miro.com")) return "miro";
  if (h.endsWith("youtube.com") || h === "youtu.be") return "youtube";
  if (h.endsWith("github.com")) return "github";
  return "web";
}

export function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch { return null; }
}

export const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

export function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  return [...new Set((text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;:!?]+$/, "")))];
}

export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(/[,#\n]/).map((t) => t.trim()).filter(Boolean))].slice(0, 20);
}

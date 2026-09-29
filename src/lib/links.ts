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

/**
 * Embeddable player URL for a video link (YouTube, Vimeo, Rutube, Loom,
 * Google Drive, VK). Returns null when the link cannot be embedded in an
 * iframe — callers then show a plain external link.
 */
export function videoEmbedUrl(raw: string): string | null {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;
  let u: URL;
  try { u = new URL(normalized); } catch { return null; }
  const h = u.hostname.replace(/^www\./, "");
  const p = u.pathname;

  if (h === "youtu.be") {
    const id = p.slice(1).split("/")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (h.endsWith("youtube.com") || h.endsWith("youtube-nocookie.com")) {
    if (p.startsWith("/embed/") || p.startsWith("/shorts/")) {
      const id = p.split("/")[2];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (p.startsWith("/live/")) {
      const id = p.split("/")[2];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const id = u.searchParams.get("v");
    const list = u.searchParams.get("list");
    if (id) return `https://www.youtube.com/embed/${id}${list ? `?list=${list}` : ""}`;
    if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
    return null;
  }
  if (h.endsWith("vimeo.com")) {
    const id = p.split("/").filter(Boolean)[0];
    return /^\d+$/.test(id ?? "") ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (h.endsWith("rutube.ru")) {
    const parts = p.split("/").filter(Boolean);
    const id = parts[0] === "video" ? parts[1] : null;
    return id ? `https://rutube.ru/play/embed/${id}` : null;
  }
  if (h.endsWith("loom.com")) {
    const id = p.split("/").filter(Boolean)[1];
    return id ? `https://www.loom.com/embed/${id}` : null;
  }
  if (h === "drive.google.com") {
    const id = p.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if (h.endsWith("vk.com") && p.startsWith("/video")) {
    const m = p.match(/\/video(-?\d+)_(\d+)/);
    return m ? `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}` : null;
  }
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(normalized)) return normalized;
  return null;
}


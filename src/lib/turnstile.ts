// Browser-safe Turnstile rules (no secrets here).
// Cloudflare's official always-pass test keys, used only on preview/dev hosts.
export const TEST_SITE_KEY = "1x00000000000000000000AA";
export const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

/** Preview/dev hosts: localhost and Lovable editor previews (id-preview--/preview--*.lovable.app). */
export function isTestHost(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase().split(":")[0];
  if (h === "localhost" || h === "127.0.0.1") return true;
  return /^(id-)?preview--[a-z0-9-]+\.lovable\.app$/.test(h) || h.endsWith(".lovableproject.com");
}

export type TurnstileKeys = { siteKey: string; secret: string } | null;

/** Which keys apply: test keys on preview, real keys only when BOTH are set, else off (auth works as before). */
export function pickKeys(host: string | null | undefined, site?: string, secret?: string): TurnstileKeys {
  if (isTestHost(host)) return { siteKey: TEST_SITE_KEY, secret: TEST_SECRET_KEY };
  if (site && secret) return { siteKey: site, secret };
  return null;
}

/** Only same-origin redirect URLs are passed to auth emails. */
export function safeRedirect(url: string | undefined, origin: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.origin === origin ? u.toString() : undefined;
  } catch { return undefined; }
}

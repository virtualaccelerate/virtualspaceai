import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { pickKeys, safeRedirect } from "./turnstile";

function requestHost(): { host: string; origin: string; ip: string | null } {
  const req = getRequest();
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return { host, origin: `${proto}://${host}`, ip: req.headers.get("cf-connecting-ip") };
}

function keys() {
  return pickKeys(requestHost().host, process.env["TURNSTILE_SITE_KEY"], process.env["TURNSTILE_SECRET_KEY"]);
}

/** Public: returns only the public site key (null = check switched off). */
export const getTurnstileConfig = createServerFn({ method: "GET" }).handler(async () => {
  return { siteKey: keys()?.siteKey ?? null };
});

const Input = z.object({
  action: z.enum(["signin", "signup", "forgot", "resend"]),
  email: z.string().trim().email().max(320),
  password: z.string().max(200).optional(),
  token: z.string().max(4096).optional(),
  redirectTo: z.string().max(2000).optional(),
});

type Result =
  | { ok: true; session: { access_token: string; refresh_token: string } | null }
  | { ok: false; code: string; message: string };

/** Verifies the Turnstile token with Cloudflare, then performs the auth call. */
export const authWithCaptcha = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const k = keys();
    const { origin, ip } = requestHost();
    if (k) {
      if (!data.token) return { ok: false, code: "captcha_failed", message: "captcha" };
      const body = new URLSearchParams({ secret: k.secret, response: data.token });
      if (ip) body.set("remoteip", ip);
      try {
        const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
        const v = (await r.json()) as { success?: boolean };
        if (!v.success) return { ok: false, code: "captcha_failed", message: "captcha" };
      } catch {
        return { ok: false, code: "captcha_failed", message: "captcha" };
      }
    }
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        if (ip) h.set("X-Forwarded-For", ip);
        return fetch(input, { ...init, headers: h });
      } },
    });
    const redirect = safeRedirect(data.redirectTo, origin);
    const fail = (e: { code?: string; message: string }): Result => ({ ok: false, code: e.code ?? "auth_error", message: e.message });
    if (data.action === "signin") {
      const { data: d, error } = await sb.auth.signInWithPassword({ email: data.email, password: data.password ?? "" });
      if (error) return fail(error);
      return { ok: true, session: d.session ? { access_token: d.session.access_token, refresh_token: d.session.refresh_token } : null };
    }
    if (data.action === "signup") {
      const { data: d, error } = await sb.auth.signUp({ email: data.email, password: data.password ?? "", options: { emailRedirectTo: redirect } });
      if (error) return fail(error);
      return { ok: true, session: d.session ? { access_token: d.session.access_token, refresh_token: d.session.refresh_token } : null };
    }
    if (data.action === "forgot") {
      const { error } = await sb.auth.resetPasswordForEmail(data.email, { redirectTo: redirect });
      return error ? fail(error) : { ok: true, session: null };
    }
    const { error } = await sb.auth.resend({ type: "signup", email: data.email, options: { emailRedirectTo: redirect } });
    return error ? fail(error) : { ok: true, session: null };
  });

import { createFileRoute } from "@tanstack/react-router";

/** HMAC-SHA256 helper using Web Crypto (Worker-safe). */
async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Validates Telegram WebApp initData and returns the parsed user, or null. */
async function verifyInitData(initData: string, token: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), token);
  const computed = hex(await hmac(secret, checkString));
  if (computed !== hash) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  try {
    return JSON.parse(params.get("user") ?? "null") as {
      id: number;
      username?: string;
      first_name?: string;
    } | null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/telegram/miniapp-auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return Response.json({ error: "not_configured" }, { status: 503 });

        let body: { initData?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "bad_request" }, { status: 400 });
        }
        const initData = body.initData ?? "";
        if (!initData) return Response.json({ error: "bad_request" }, { status: 400 });

        const tgUser = await verifyInitData(initData, token);
        if (!tgUser) return Response.json({ error: "invalid_init_data" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: link } = await supabaseAdmin
          .from("telegram_links")
          .select("user_id")
          .eq("chat_id", tgUser.id)
          .maybeSingle();

        if (!link?.user_id) {
          return Response.json({ error: "not_linked" }, { status: 404 });
        }

        const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(link.user_id);
        const email = userRes?.user?.email;
        if (!email) return Response.json({ error: "no_email" }, { status: 404 });

        const { data: linkRes, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        if (error || !linkRes?.properties?.hashed_token) {
          return Response.json({ error: "session_failed" }, { status: 500 });
        }

        return Response.json({ tokenHash: linkRes.properties.hashed_token, email });
      },
    },
  },
});

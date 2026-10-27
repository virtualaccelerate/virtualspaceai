import { createFileRoute } from "@tanstack/react-router";

/** WAHA posts {event, session, payload}; only message / message.any are handled. Caller is verified by ?secret=. */
export const Route = createFileRoute("/api/public/waha-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { wahaConfig, WAHA_DISABLED } = await import("@/lib/waha.server");
        const cfg = wahaConfig();
        if (!cfg) return new Response(WAHA_DISABLED, { status: 503 });
        const { checkWebhookSecret, parseEvent } = await import("@/lib/waha-payload");
        if (!checkWebhookSecret(new URL(request.url).searchParams.get("secret"), cfg.secret)) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => null)) as { event?: string; payload?: unknown } | null;
        if (!body || (body.event !== "message" && body.event !== "message.any")) return Response.json({ ok: true, ignored: true });
        let msg;
        try { msg = parseEvent(body.payload); } catch { return new Response("Invalid payload", { status: 400 }); }
        const { handleWahaMessage } = await import("@/lib/telegram-groups.server");
        try { await handleWahaMessage(msg); } catch (e) { console.error("[waha] handle failed", e instanceof Error ? e.message : e); }
        return Response.json({ ok: true });
      },
    },
  },
});

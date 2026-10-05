import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      // Meta webhook verification handshake
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && expected && token === expected) {
          return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
          return new Response("Not configured", { status: 503 });
        }
        const raw = await request.text();
        const { verifyWhatsAppSignature, handleIncoming } = await import("@/lib/whatsapp.server");
        if (!(await verifyWhatsAppSignature(raw, request.headers.get("X-Hub-Signature-256")))) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const payload = JSON.parse(raw);
          const value = payload?.entry?.[0]?.changes?.[0]?.value;
          const msg = value?.messages?.[0];
          if (msg?.type === "text" && typeof msg.from === "string" && typeof msg.text?.body === "string") {
            const name = value?.contacts?.[0]?.profile?.name ?? null;
            await handleIncoming(msg.from, msg.text.body, name);
          }
        } catch (e) {
          console.error("[whatsapp] update failed", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});

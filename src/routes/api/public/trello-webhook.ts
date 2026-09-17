import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const QuerySchema = z.object({ id: z.string().uuid(), secret: z.string().min(20).max(200) });

/**
 * Trello validates a callback URL with a HEAD request before creating the
 * webhook, then POSTs card events (create / update / move / delete).
 */
export const Route = createFileRoute("/api/public/trello-webhook")({
  server: {
    handlers: {
      HEAD: async () => new Response(null, { status: 200 }),
      GET: async () => new Response("ok"),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = QuerySchema.safeParse({ id: url.searchParams.get("id"), secret: url.searchParams.get("secret") });
        if (!parsed.success) return new Response("Unauthorized", { status: 401 });
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") return new Response("Invalid payload", { status: 400 });
        const { handleTrelloWebhook } = await import("@/lib/trello.server");
        const accepted = await handleTrelloWebhook(parsed.data.id, parsed.data.secret);
        return accepted ? Response.json({ ok: true }) : new Response("Unauthorized", { status: 401 });
      },
    },
  },
});

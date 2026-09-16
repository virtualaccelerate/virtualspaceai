import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const QuerySchema = z.object({ id: z.string().uuid(), secret: z.string().min(20).max(200) });

export const Route = createFileRoute("/api/public/yougile-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = QuerySchema.safeParse({ id: url.searchParams.get("id"), secret: url.searchParams.get("secret") });
        if (!parsed.success) return new Response("Unauthorized", { status: 401 });
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") return new Response("Invalid payload", { status: 400 });
        const { handleYouGileWebhook } = await import("@/lib/yougile.server");
        const accepted = await handleYouGileWebhook(parsed.data.id, parsed.data.secret);
        return accepted ? Response.json({ ok: true }) : new Response("Unauthorized", { status: 401 });
      },
    },
  },
});
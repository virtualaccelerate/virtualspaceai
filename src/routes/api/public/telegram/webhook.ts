import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response("Not configured", { status: 503 });

        const { webhookSecret, handleUpdate } = await import("@/lib/telegram.server");
        const expected = await webhookSecret(token);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (got !== expected) return new Response("Unauthorized", { status: 401 });

        let update: any;
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true });
        }
        if (typeof update?.update_id !== "number") return Response.json({ ok: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("telegram_updates")
          .insert({ update_id: update.update_id });
        if (error) return Response.json({ ok: true, duplicate: true }); // already processed

        try {
          await handleUpdate(update);
        } catch (e) {
          console.error("[telegram] update failed", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});

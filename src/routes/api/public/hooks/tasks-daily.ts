import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly cron sweep.
 *
 * Notifications are decided by the AI engine (`ai-notify.server`), not by
 * mechanical per-event rules: it analyses the whole workspace snapshot and
 * emits only what needs attention, to the people it affects.
 *  - every hour  -> "pulse"   (deadline / overdue / no activity / waiting /
 *                              blocked / risk / follow-up / task update)
 *  - 09:00 BISH  -> "morning" (daily brief, team brief, owner brief, project brief)
 *  - 19:00 BISH  -> "evening" (evening brief)
 */
export const Route = createFileRoute("/api/public/hooks/tasks-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!provided) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: setting } = await supabaseAdmin
          .from("app_settings")
          .select("value")
          .eq("key", "cron_secret")
          .maybeSingle();
        const expected = (setting as any)?.value ?? process.env["CRON_SECRET"];
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { runAiNotifications } = await import("@/lib/ai-notify.server");
        const { syncAllYouGileSources } = await import("@/lib/yougile.server");
        const { syncAllTrelloSources } = await import("@/lib/trello.server");

        const hourNow = new Date().getUTCHours();
        const yougile = await syncAllYouGileSources().catch(() => ({ synced: 0, failed: 1 }));
        const trello = await syncAllTrelloSources().catch(() => ({ synced: 0, failed: 1 }));

        // 09:00 Bishkek = 03:00 UTC, 19:00 Bishkek = 13:00 UTC.
        const pass = hourNow === 3 ? "morning" : hourNow === 13 ? "evening" : "pulse";
        const result = await runAiNotifications(pass).catch(() => ({ sent: 0, spaces: 0 }));

        return Response.json({ ok: true, pass, ...result, yougile });
      },
    },
  },
});

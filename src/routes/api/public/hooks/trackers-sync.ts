import { createFileRoute } from "@tanstack/react-router";

/**
 * Frequent tracker sweep (every 5 minutes).
 *
 * Trello/YouGile webhooks already push changes in near real time; this sweep
 * is the safety net for missed or unregistered webhooks so boards stay in
 * sync without anyone pressing "Sync" manually.
 */
export const Route = createFileRoute("/api/public/hooks/trackers-sync")({
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
        const expected = (setting as { value?: string } | null)?.value ?? process.env["CRON_SECRET"];
        if (!expected || provided !== expected) return new Response("Unauthorized", { status: 401 });

        const { syncAllTrelloSources } = await import("@/lib/trello.server");
        const { syncAllYouGileSources } = await import("@/lib/yougile.server");

        const trello = await syncAllTrelloSources().catch(() => ({ synced: 0, failed: 1 }));
        const yougile = await syncAllYouGileSources().catch(() => ({ synced: 0, failed: 1 }));

        return Response.json({ ok: true, trello, yougile });
      },
    },
  },
});

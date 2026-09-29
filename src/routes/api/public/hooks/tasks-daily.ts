import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly cron sweep.
 *
 * Notifications are decided by the AI engine (`ai-notify.server`), not by
 * mechanical per-event rules: it analyses the whole workspace snapshot and
 * emits only what needs attention, to the people it affects.
 *  - 10:00 BISH -> "morning" (daily brief, team brief, owner brief, project brief)
 *  - 18:00 BISH  -> "evening" (evening brief)
 * No scheduled digests on Saturday/Sunday, and no hourly pulse — only the two
 * daily briefs. Instant events (task assignment, task submission/review) are
 * sent immediately elsewhere and are unaffected by this schedule.
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

        let body: { pass?: unknown; force?: unknown } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }
        const manualPass =
          body.pass === "pulse" || body.pass === "morning" || body.pass === "evening"
            ? (body.pass as "pulse" | "morning" | "evening")
            : null;

        const { runAiNotifications } = await import("@/lib/ai-notify.server");
        const { syncAllYouGileSources } = await import("@/lib/yougile.server");
        const { syncAllTrelloSources } = await import("@/lib/trello.server");
        const { syncAllGoogleCalendars } = await import("@/lib/google-calendar.server");

        const now = new Date();
        const hourNow = now.getUTCHours();
        const yougile = await syncAllYouGileSources().catch(() => ({ synced: 0, failed: 1 }));
        const trello = await syncAllTrelloSources().catch(() => ({ synced: 0, failed: 1 }));
        const calendar = await syncAllGoogleCalendars().catch(() => ({ synced: 0, failed: 1 }));

        // 10:00 Bishkek = 04:00 UTC, 18:00 Bishkek = 12:00 UTC.
        // Only the two daily briefs — no hourly pulse. Saturday/Sunday (Bishkek
        // time) get no scheduled digests at all; instant assignment/review
        // notifications are sent elsewhere and are not affected.
        // A manual trigger may set { pass: "morning"|"evening"|"pulse",
        // force: true } to run a pass immediately (force skips dedupe).
        const bishkekDay = new Date(now.getTime() + 6 * 3600_000).getUTCDay();
        const isWeekend = bishkekDay === 0 || bishkekDay === 6;
        const scheduledPass = hourNow === 4 ? "morning" : hourNow === 12 ? "evening" : null;
        const pass = manualPass ?? scheduledPass;
        const force = body.force === true;
        const result =
          manualPass || (!isWeekend && scheduledPass)
            ? await runAiNotifications(pass as "pulse" | "morning" | "evening", undefined, {
                ignoreDedupe: force,
              }).catch(() => ({ sent: 0, spaces: 0 }))
            : { sent: 0, spaces: 0, skipped: isWeekend ? "weekend" : "not-a-brief-hour" };

        // Weekday mornings: offer assignees of overdue tasks to move the deadline.
        const reschedule =
          pass === "morning" && (manualPass || !isWeekend)
            ? await import("@/lib/task-flow.server")
                .then((m) => m.runOverdueRescheduleOffers())
                .catch(() => ({ sent: 0 }))
            : undefined;

        return Response.json({ ok: true, pass, reschedule, forced: force || undefined, ...result, yougile, trello, calendar });
      },
    },
  },
});

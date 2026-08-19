import { createFileRoute } from "@tanstack/react-router";

function esc(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function dateOnly(value: string) {
  return value.replace(/-/g, "");
}

function nextDay(value: string) {
  const d = new Date(value + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Public ICS feed of a user's tasks with deadlines.
 * Secured by an unguessable per-user calendar token (uuid) in the URL.
 */
export const Route = createFileRoute("/api/public/calendar/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = (params.token ?? "").replace(/\.ics$/i, "");
        if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("calendar_token", token)
          .maybeSingle();
        if (!profile) return new Response("Not found", { status: 404 });

        const { data: tasks } = await supabaseAdmin
          .from("tasks")
          .select("id, title, description, status, priority, due_date, updated_at")
          .eq("user_id", (profile as any).id)
          .not("due_date", "is", null);

        const now = stamp(new Date());
        const lines = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Virtual Space//Tasks//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "X-WR-CALNAME:Virtual Space — Tasks",
          "X-WR-TIMEZONE:UTC",
        ];

        for (const task of ((tasks as any[]) ?? [])) {
          const done = task.status === "done";
          lines.push(
            "BEGIN:VEVENT",
            `UID:task-${task.id}@virtualspace`,
            `DTSTAMP:${now}`,
            `DTSTART;VALUE=DATE:${dateOnly(task.due_date)}`,
            `DTEND;VALUE=DATE:${nextDay(task.due_date)}`,
            `SUMMARY:${esc(`${done ? "✅ " : ""}${task.title}`)}`,
            `DESCRIPTION:${esc(
              [task.description ?? "", `Status: ${task.status}`, `Priority: ${task.priority}`]
                .filter(Boolean)
                .join("\n"),
            )}`,
            `STATUS:${done ? "COMPLETED" : "CONFIRMED"}`,
            "BEGIN:VALARM",
            "TRIGGER:-PT9H",
            "ACTION:DISPLAY",
            `DESCRIPTION:${esc(task.title)}`,
            "END:VALARM",
            "END:VEVENT",
          );
        }
        lines.push("END:VCALENDAR");

        return new Response(lines.join("\r\n"), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});

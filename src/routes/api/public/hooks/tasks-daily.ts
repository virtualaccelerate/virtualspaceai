import { createFileRoute } from "@tanstack/react-router";

type Lang = "ru" | "en";

const PRIORITY_ICON: Record<string, string> = {
  low: "⚪️",
  medium: "🔵",
  high: "🟠",
  urgent: "🔴",
};

const STATUS_ICON: Record<string, string> = {
  backlog: "⬜️",
  in_progress: "🟪",
  review: "🟨",
};

function fmt(lang: Lang, key: string, n?: number) {
  const ru: Record<string, string> = {
    title: "📅 Задачи на сегодня",
    overdue: "🔥 Просрочено",
    today: "📌 Сегодня",
    soon: "⏳ Ближайшие дедлайны (3 дня)",
    none: "На сегодня дедлайнов нет. Активных задач: " + (n ?? 0),
    open: "Всего активных задач",
  };
  const en: Record<string, string> = {
    title: "📅 Today's tasks",
    overdue: "🔥 Overdue",
    today: "📌 Today",
    soon: "⏳ Upcoming deadlines (3 days)",
    none: "No deadlines today. Open tasks: " + (n ?? 0),
    open: "Open tasks in total",
  };
  return (lang === "en" ? en : ru)[key];
}

function line(task: { title: string; status: string; priority: string; due_date: string | null }) {
  return `${STATUS_ICON[task.status] ?? "⬜️"} ${PRIORITY_ICON[task.priority] ?? ""} ${task.title}${
    task.due_date ? ` — ${task.due_date}` : ""
  }`;
}

export const Route = createFileRoute("/api/public/hooks/tasks-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendMessage } = await import("@/lib/telegram.server");

        const hourNow = new Date().getUTCHours();
        const { data: links } = await supabaseAdmin
          .from("telegram_links")
          .select("user_id, chat_id, language, daily_digest, digest_hour")
          .not("chat_id", "is", null)
          .eq("daily_digest", true);

        const today = new Date().toISOString().slice(0, 10);
        const soonDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        let sent = 0;

        for (const link of (links as any[]) ?? []) {
          if ((link.digest_hour ?? 4) !== hourNow) continue;

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("language")
            .eq("id", link.user_id)
            .maybeSingle();
          const lang: Lang = ((profile as any)?.language ?? link.language) === "en" ? "en" : "ru";

          const { data: tasks } = await supabaseAdmin
            .from("tasks")
            .select("title, status, priority, due_date")
            .eq("user_id", link.user_id)
            .neq("status", "done")
            .order("due_date", { ascending: true });

          const rows = ((tasks as any[]) ?? []) as {
            title: string;
            status: string;
            priority: string;
            due_date: string | null;
          }[];
          const overdue = rows.filter((r) => r.due_date && r.due_date < today);
          const dueToday = rows.filter((r) => r.due_date === today);
          const soon = rows.filter((r) => r.due_date && r.due_date > today && r.due_date <= soonDate);

          const blocks: string[] = [];
          if (overdue.length) blocks.push(`${fmt(lang, "overdue")}\n${overdue.map(line).join("\n")}`);
          if (dueToday.length) blocks.push(`${fmt(lang, "today")}\n${dueToday.map(line).join("\n")}`);
          if (soon.length) blocks.push(`${fmt(lang, "soon")}\n${soon.map(line).join("\n")}`);

          const body = blocks.length
            ? blocks.join("\n\n") + `\n\n${fmt(lang, "open")}: ${rows.length}`
            : fmt(lang, "none", rows.length);

          await sendMessage(Number(link.chat_id), `${fmt(lang, "title")}\n\n${body}`);
          sent++;
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});

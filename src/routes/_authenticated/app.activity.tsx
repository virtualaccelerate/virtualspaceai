import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2 } from "lucide-react";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { getActivityFeed } from "@/lib/task-events.functions";

export const Route = createFileRoute("/_authenticated/app/activity")({
  component: ActivityFeed,
  head: () => ({
    meta: [{ title: "Лента событий — Virtual Space" }, { name: "robots", content: "noindex" }],
  }),
});

type Ev = {
  id: string;
  kind: string;
  field: string | null;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  actor_name: string | null;
  source: string;
  created_at: string;
  task_title: string;
  project: string | null;
};

const SOURCE: Record<string, string> = { yougile: "в YouGile", trello: "в Trello", telegram: "через Telegram", virtual_space: "" };
const STATUS: Record<string, string> = { backlog: "К выполнению", in_progress: "В работе", review: "На проверке", done: "Готово" };

function fmtDate(v: string | null) {
  if (!v) return "без срока";
  const d = new Date(v);
  return isNaN(+d) ? v : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function sentence(e: Ev) {
  const who = e.actor_name || (e.source === "virtual_space" ? "Кто-то" : "Трекер");
  const task = `«${e.task_title}»`;
  const st = (v: string | null) => (v ? STATUS[v] ?? v : "—");
  switch (e.field ?? e.kind) {
    case "imported":
      return `Задача ${task} добавлена`;
    case "status":
      return `${who} перевёл(а) ${task}: ${st(e.from_value)} → ${st(e.to_value)}`;
    case "archived":
      return e.to_value === "true" ? `Задача ${task} перенесена в архив` : `Задача ${task} возвращена из архива`;
    case "title":
      return `${who} переименовал(а) «${e.from_value ?? ""}» в ${task}`;
    case "due_date":
      return `${who} изменил(а) срок ${task}: ${fmtDate(e.from_value)} → ${fmtDate(e.to_value)}`;
    case "assignee":
    case "assignee_name":
      return `${who} назначил(а) ${task} на ${e.to_value ?? "—"}`;
    case "priority":
      return `${who} изменил(а) приоритет ${task} на ${e.to_value ?? "—"}`;
    case "created":
      return `${who} создал(а) задачу ${task}`;
    case "comment":
    case "external_log":
      return `${who} по ${task}: ${e.note ?? e.to_value ?? ""}`;
    default:
      return `${who} обновил(а) ${task}${e.note ? `: ${e.note}` : ""}`;
  }
}

function dayLabel(d: Date) {
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === y.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
}

function ActivityFeed() {
  const load = useServerFn(getActivityFeed);
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideImports, setHideImports] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ts = await getActiveTeamspaceId();
        if (!ts) return;
        setEvents((await load({ data: { teamspace_id: ts } })) as Ev[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = useMemo(() => {
    const list = hideImports ? events.filter((e) => e.kind !== "imported") : events;
    const map = new Map<string, Ev[]>();
    for (const e of list) {
      const k = dayLabel(new Date(e.created_at));
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [events, hideImports]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <History className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl text-foreground">Лента событий</h1>
          <p className="text-sm text-muted-foreground">Всё, что происходит с задачами — простыми словами.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={hideImports} onChange={(e) => setHideImports(e.target.checked)} />
          Скрыть импорт
        </label>
      </div>
      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}
      {loading ? (
        <div className="p-8 flex justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка…</div>
      ) : groups.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Пока никаких событий.</div>
      ) : (
        groups.map(([day, list]) => (
          <section key={day} className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{day}</h2>
            <ul className="rounded-2xl border border-border bg-card divide-y divide-border">
              {list.map((e) => (
                <li key={e.id} className="px-4 py-3 flex gap-3">
                  <span className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">
                    {new Date(e.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground">{sentence(e)}</div>
                    <div className="text-xs text-muted-foreground">
                      {[SOURCE[e.source], e.project].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

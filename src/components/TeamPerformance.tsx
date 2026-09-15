import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, Folder, Timer } from "lucide-react";
import { loadTeamPerformance } from "@/lib/team.functions";

type Perf = Awaited<ReturnType<typeof loadTeamPerformance>>;
type Member = NonNullable<Perf>["members"][number];

function initials(name?: string | null, email?: string | null) {
  return (name || email || "?").trim().slice(0, 2).toUpperCase();
}

function fmtDate(value: string | null, locale: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

function Bar({ value, tone }: { value: number; tone: "primary" | "warn" }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[color:var(--muted)] overflow-hidden">
      <div
        className={`h-full rounded-full ${tone === "primary" ? "bg-primary" : "bg-amber-500"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function MemberCard({ m }: { m: Member }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ru") ? "ru-RU" : "en-US";

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-4">
      <div className="flex items-center gap-3">
        {m.avatar_url ? (
          <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
            {initials(m.full_name, m.email)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{m.full_name || m.email || t("app.team.member", "Участник")}</div>
          <div className="text-xs text-[color:var(--muted-foreground)] capitalize truncate">{m.role}</div>
        </div>
        {m.overdue > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-500 px-2 py-1 text-xs">
            <AlertTriangle className="h-3 w-3" /> {m.overdue}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[color:var(--muted-foreground)]">{t("app.perf.completion", "Выполнено")}</span>
          <span className="font-medium">
            {m.done}/{m.total} · {m.completion_rate}%
          </span>
        </div>
        <Bar value={m.completion_rate} tone="primary" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2">
          <div className="flex items-center gap-1 text-[color:var(--muted-foreground)]">
            <TrendingUp className="h-3 w-3" /> {t("app.perf.onTime", "В срок")}
          </div>
          <div className="text-sm font-semibold">{m.on_time_rate === null ? "—" : `${m.on_time_rate}%`}</div>
        </div>
        <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2">
          <div className="flex items-center gap-1 text-[color:var(--muted-foreground)]">
            <Timer className="h-3 w-3" /> {t("app.perf.avgDays", "Среднее время")}
          </div>
          <div className="text-sm font-semibold">
            {m.avg_days_to_close === null ? "—" : `${m.avg_days_to_close} ${t("app.perf.days", "дн.")}`}
          </div>
        </div>
        <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2">
          <div className="flex items-center gap-1 text-[color:var(--muted-foreground)]">
            <CheckCircle2 className="h-3 w-3" /> {t("app.perf.week", "За неделю")}
          </div>
          <div className="text-sm font-semibold">{m.done_last_7}</div>
        </div>
        <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2">
          <div className="flex items-center gap-1 text-[color:var(--muted-foreground)]">
            <Clock className="h-3 w-3" /> {t("app.perf.inWork", "В работе")}
          </div>
          <div className="text-sm font-semibold">
            {m.in_progress + m.review}
            {m.due_soon > 0 && (
              <span className="ml-1 text-xs font-normal text-[color:var(--muted-foreground)]">
                · {t("app.perf.dueSoon", "скоро дедлайн")}: {m.due_soon}
              </span>
            )}
          </div>
        </div>
      </div>

      {m.projects.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-[color:var(--muted-foreground)]">
            {t("app.perf.projects", "По проектам")}
          </div>
          {m.projects.map((p) => (
            <div key={p.teamspace_id} className="flex items-center gap-2 text-xs">
              <Folder className="h-3 w-3 shrink-0 text-[color:var(--muted-foreground)]" />
              <span className="truncate flex-1">{p.project}</span>
              <span className="text-[color:var(--muted-foreground)] shrink-0">
                {t("app.perf.done", "готово")} {p.done} · {t("app.perf.open", "активно")} {p.open}
                {p.overdue > 0 && <span className="text-amber-500"> · {t("app.perf.late", "просрочено")} {p.overdue}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {m.recent_done.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-[color:var(--muted-foreground)]">
            {t("app.perf.recent", "Последние выполненные")}
          </div>
          {m.recent_done.map((task) => (
            <div key={task.id} className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
              <span className="flex-1 truncate">{task.title}</span>
              <span className="shrink-0 text-[color:var(--muted-foreground)]">
                {task.project} · {fmtDate(task.closed_at, locale)}
              </span>
            </div>
          ))}
        </div>
      )}

      {m.total === 0 && (
        <p className="text-xs text-[color:var(--muted-foreground)]">{t("app.perf.noTasks", "Пока нет назначенных задач.")}</p>
      )}
    </div>
  );
}

export default function TeamPerformance({ teamspaceId }: { teamspaceId?: string }) {
  const { t } = useTranslation();
  const load = useServerFn(loadTeamPerformance);
  const [data, setData] = useState<Perf>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await load({ data: teamspaceId ? { teamspace_id: teamspaceId } : {} });
        if (alive) setData(res);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamspaceId]);

  if (loading) {
    return <div className="text-sm text-[color:var(--muted-foreground)]">{t("app.common.loading", "Загрузка…")}</div>;
  }
  if (!data || data.members.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("app.perf.title", "Успеваемость сотрудников")}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.members.map((m) => (
          <MemberCard key={m.user_id} m={m} />
        ))}
      </div>
    </section>
  );
}

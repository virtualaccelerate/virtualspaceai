import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowUpRight, CheckSquare, Clock, TrendingUp, Users,
  AlertCircle, Flag, CheckCircle2, Circle, Loader2, FileText, Bell,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { loadOverview } from "@/lib/overview.functions";

export const Route = createFileRoute("/_authenticated/app/overview")({
  component: AppDashboard,
  head: () => ({
    meta: [
      { title: "Обзор рабочего пространства — Virtual Space" },
      { name: "description", content: "Живая сводка по задачам, срокам и команде вашего рабочего пространства." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Data = Awaited<ReturnType<typeof loadOverview>>;

function ago(iso: string, t: (k: string, d: string) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return t("app.overview.now", "только что");
  if (m < 60) return `${m} ${t("app.overview.min", "мин")}`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${t("app.overview.hour", "ч")}`;
  return `${Math.round(h / 24)} ${t("app.overview.day", "дн")}`;
}

function AppDashboard() {
  const { t } = useTranslation();
  const load = useServerFn(loadOverview);
  const [data, setData] = useState<Data>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [{ data: auth }, active] = await Promise.all([supabase.auth.getUser(), getActiveTeamspaceId()]);
        if (auth.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", auth.user.id)
            .maybeSingle();
          setDisplayName(profile?.full_name || (profile?.email ?? auth.user.email ?? "").split("@")[0] || "");
        }
        setData(await load({ data: active ? { teamspace_id: active } : {} }));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("app.common.loading", "Загрузка…")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-10 text-center">
        <Users className="h-8 w-8 mx-auto mb-3 text-[color:var(--muted-foreground)]" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {t("app.team.noWorkspace", "Выберите рабочее пространство, чтобы увидеть сводку.")}
        </p>
      </div>
    );
  }

  const s = data.stats;
  const stats = [
    { label: t("app.overview.openTasks", "Активные задачи"), value: s.open_tasks, sub: `${t("app.overview.unassigned", "без исполнителя")}: ${s.unassigned}`, icon: CheckSquare },
    { label: t("app.overview.overdue", "Просрочено"), value: s.overdue, sub: `${t("app.overview.dueSoon", "срок близко")}: ${s.due_soon}`, icon: Clock },
    { label: t("app.overview.doneWeek", "Закрыто за неделю"), value: s.done_last_7, sub: `${t("app.overview.completion", "выполнение")}: ${s.completion_rate}%`, icon: TrendingUp },
    { label: t("app.overview.team", "Команда"), value: s.members, sub: `${t("app.overview.documents", "документов")}: ${s.documents}`, icon: Users },
  ];

  const total = Math.max(1, data.by_status.backlog + data.by_status.in_progress + data.by_status.review + data.by_status.done);
  const bars = [
    { key: "backlog", label: t("app.tasks.status.backlog", "Бэклог"), value: data.by_status.backlog, cls: "bg-muted-foreground/50" },
    { key: "in_progress", label: t("app.tasks.status.in_progress", "В работе"), value: data.by_status.in_progress, cls: "bg-primary" },
    { key: "review", label: t("app.tasks.status.review", "На проверке"), value: data.by_status.review, cls: "bg-amber-500" },
    { key: "done", label: t("app.tasks.status.done", "Готово"), value: data.by_status.done, cls: "bg-emerald-500" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">{data.teamspace?.name}</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">
            {t("app.overview.greeting", "Привет")}{displayName ? `, ${displayName}` : ""} 👋
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            {t("app.overview.subtitle", "Сводка по вашему рабочему пространству")}
          </p>
        </div>
        <Link
          to="/app/tasks"
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
        >
          {t("app.overview.quickAction", "К задачам")}
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <card.icon className="h-4 w-4" />
            </div>
            <div className="mt-4 text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-[color:var(--muted-foreground)]">{card.label}</div>
            <div className="text-[11px] text-[color:var(--muted-foreground)] mt-1">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
            <div>
              <h2 className="font-display text-base">{t("app.overview.nextTasks", "Ближайшие задачи")}</h2>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {t("app.overview.byDeadline", "По сроку выполнения")}
              </p>
            </div>
            <Link to="/app/tasks" className="text-xs text-[color:var(--muted-foreground)] hover:text-foreground transition inline-flex items-center gap-1">
              {t("app.overview.viewAll", "Все задачи")} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="px-5 py-4 border-b border-[color:var(--border)]">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {bars.map((b) => (
                <div key={b.key} className={b.cls} style={{ width: `${(b.value / total) * 100}%` }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--muted-foreground)]">
              {bars.map((b) => (
                <span key={b.key} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${b.cls}`} /> {b.label}: {b.value}
                </span>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[color:var(--border)]">
            {data.tasks.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                {t("app.overview.noTasks", "Открытых задач нет")}
              </div>
            )}
            {data.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                {task.status === "review" ? (
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                ) : task.status === "in_progress" ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-[color:var(--muted-foreground)] shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{task.title}</span>
                <span className="hidden sm:inline text-xs text-[color:var(--muted-foreground)] truncate max-w-[130px]">
                  {task.assignee_name ?? t("app.import.unassigned", "Без исполнителя")}
                </span>
                <span className={`text-xs ${task.overdue ? "text-red-500" : "text-[color:var(--muted-foreground)]"}`}>
                  {task.due_date ?? "—"}
                </span>
                <Flag
                  className={`h-4 w-4 ${
                    task.priority === "urgent" ? "text-red-500"
                      : task.priority === "high" ? "text-amber-500"
                        : task.priority === "medium" ? "text-primary" : "text-[color:var(--muted-foreground)]"
                  }`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-display text-base">{t("app.overview.insights", "Что важно сейчас")}</h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.insights.map((ins, i) => (
              <div key={i} className="rounded-xl border border-[color:var(--border)] bg-muted/40 p-3">
                <div className="flex items-start gap-2">
                  {ins.tone === "warn"
                    ? <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    : <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm">{ins.title}</p>
                    {ins.body && <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5 break-words">{ins.body}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h2 className="font-display text-base mb-4">{t("app.overview.workload", "Загрузка команды")}</h2>
          {data.top_members.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">{t("app.overview.noAssignees", "Задачи ещё не распределены")}</p>
          ) : (
            <ul className="space-y-3">
              {data.top_members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{m.name}</div>
                    <div className="text-[11px] text-[color:var(--muted-foreground)]">
                      {t("app.team.open", "Активных")}: {m.open} · {t("app.team.done", "Готово")}: {m.done}
                      {m.overdue > 0 && <span className="text-red-500"> · {t("app.overview.overdue", "просрочено")}: {m.overdue}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h2 className="font-display text-base mb-4">{t("app.overview.activity", "Активность")}</h2>
          {data.activity.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">{t("app.overview.noActivity", "Пока нет событий")}</p>
          ) : (
            <ul className="space-y-3">
              {data.activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 text-sm min-w-0">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-[color:var(--muted-foreground)] break-words">{a.feature}</span>
                    <div className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5">{ago(a.created_at, t)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base">{t("app.overview.notifications", "Уведомления")}</h2>
            <Bell className="h-4 w-4 text-[color:var(--muted-foreground)]" />
          </div>
          {data.notifications.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">{t("app.overview.noNotifications", "Новых уведомлений нет")}</p>
          ) : (
            <ul className="space-y-3">
              {data.notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3">
                  <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.title}</p>
                    {n.body && <p className="text-[11px] text-[color:var(--muted-foreground)] line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5">{ago(n.created_at, t)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

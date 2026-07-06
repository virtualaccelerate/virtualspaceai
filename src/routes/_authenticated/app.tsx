import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowUpRight, CheckSquare, Clock, TrendingUp, Users,
  Bot, MessageSquare, FileText, CheckCircle2, Circle, AlertCircle, Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppDashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Profile = { full_name: string | null; email: string | null };

const STATS = [
  { label: "Open tasks", value: "24", delta: "+3", icon: CheckSquare, tone: "text-primary" },
  { label: "Hours tracked", value: "38.5", delta: "+12%", icon: Clock, tone: "text-accent" },
  { label: "Team velocity", value: "92%", delta: "+8%", icon: TrendingUp, tone: "text-primary" },
  { label: "Active clients", value: "7", delta: "+2", icon: Users, tone: "text-accent" },
] as const;

type Task = {
  id: string;
  title: string;
  status: "in_progress" | "todo" | "done";
  assignee: string;
  due: string;
  priority: "high" | "medium" | "low";
};

const TASKS: Task[] = [
  { id: "1", title: "Подготовить план продвижения", status: "in_progress", assignee: "AA", due: "6/24", priority: "high" },
  { id: "2", title: "Настроить таргет для запуска", status: "todo", assignee: "MK", due: "6/28", priority: "medium" },
  { id: "3", title: "Ревью onboarding-флоу", status: "in_progress", assignee: "IV", due: "6/26", priority: "medium" },
  { id: "4", title: "Обновить knowledge base по AI Agents", status: "todo", assignee: "SP", due: "7/02", priority: "low" },
  { id: "5", title: "Weekly sync с командой", status: "done", assignee: "AA", due: "6/20", priority: "low" },
];

const INSIGHTS = [
  { title: "3 задачи просрочены", body: "Zukha предлагает переназначить их на команду Product.", tone: "warn" },
  { title: "Онбординг завершён на 82%", body: "Отправить welcome-письмо 4 новым пользователям.", tone: "info" },
  { title: "Пик активности — вторник, 14:00", body: "Планируйте важные митинги в это окно.", tone: "info" },
] as const;

const ACTIVITY = [
  { who: "Anna", what: "закрыла задачу", target: "Weekly sync", when: "5 мин назад", icon: CheckCircle2 },
  { who: "Zukha AI", what: "сгенерировал отчёт", target: "Q3 Marketing", when: "22 мин назад", icon: Bot },
  { who: "Mikhail", what: "прокомментировал", target: "Landing v2", when: "1 ч назад", icon: MessageSquare },
  { who: "Irina", what: "загрузила документ", target: "Brand guidelines.pdf", when: "3 ч назад", icon: FileText },
];

const NOTIFICATIONS = [
  { title: "Новый клиент подписал контракт", when: "10 мин", dot: "bg-primary" },
  { title: "AI Agent завершил анализ конкурентов", when: "1 ч", dot: "bg-accent" },
  { title: "Приближается дедлайн: Landing v2", when: "сегодня", dot: "bg-yellow-400" },
];

function AppDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userData.user.id)
        .maybeSingle();
      setProfile({
        full_name: data?.full_name ?? null,
        email: data?.email ?? userData.user.email ?? null,
      });
    })();
  }, []);

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "there";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">Welcome back</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-white">
            Hi, {displayName} 👋
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Вот что происходит в вашем Virtual Office сегодня.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition">
            Today
          </button>
          <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition">
            This week
          </button>
          <button className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition">
            + Quick action
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className={`h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center ${s.tone}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] text-primary/80 font-medium">{s.delta}</span>
            </div>
            <div className="mt-4 text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/50">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent tasks — takes 2 cols */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:col-span-2 glass-strong rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <h2 className="font-display text-base text-white">Recent tasks</h2>
              <p className="text-xs text-white/50">Обновлено только что</p>
            </div>
            <button className="text-xs text-white/60 hover:text-white transition inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-12 px-5 py-2 text-[10px] uppercase tracking-wider text-white/40">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Assignee</div>
              <div className="col-span-2">Due</div>
              <div className="col-span-2 text-right">Priority</div>
            </div>
            {TASKS.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-12 items-center px-5 py-3 hover:bg-white/5 transition"
              >
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <StatusDot status={t.status} />
                  <span className={`text-sm truncate ${t.status === "done" ? "line-through text-white/40" : "text-white/90"}`}>
                    {t.title}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="inline-flex h-6 w-6 rounded-full bg-primary/20 text-primary items-center justify-center text-[10px] font-semibold">
                    {t.assignee}
                  </span>
                </div>
                <div className={`col-span-2 text-xs ${t.priority === "high" ? "text-red-400" : "text-white/60"}`}>
                  {t.due}
                </div>
                <div className="col-span-2 flex justify-end">
                  <PriorityFlag p={t.priority} />
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* AI Insights */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-strong rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-display text-base text-white">AI Insights</h2>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-white/40 border border-white/10 rounded-full px-2 py-0.5">
              Zukha
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {INSIGHTS.map((ins, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-start gap-2">
                  {ins.tone === "warn"
                    ? <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                    : <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm text-white">{ins.title}</p>
                    <p className="text-xs text-white/55 mt-0.5">{ins.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full text-xs text-primary hover:text-primary/80 transition font-medium">
            Спросить у Zukha →
          </button>
        </motion.section>
      </div>

      {/* Activity + Notifications */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-2 glass rounded-2xl p-5"
        >
          <h2 className="font-display text-base text-white mb-4">Activity</h2>
          <ul className="space-y-3">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <a.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 text-sm">
                  <span className="text-white font-medium">{a.who}</span>{" "}
                  <span className="text-white/55">{a.what}</span>{" "}
                  <span className="text-white">{a.target}</span>
                  <div className="text-[11px] text-white/40 mt-0.5">{a.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base text-white">Notifications</h2>
            <span className="text-[10px] text-primary font-semibold">
              {NOTIFICATIONS.length} new
            </span>
          </div>
          <ul className="space-y-3">
            {NOTIFICATIONS.map((n, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg hover:bg-white/5 -mx-2 px-2 py-2 transition">
                <span className={`h-2 w-2 rounded-full mt-1.5 ${n.dot}`} />
                <div className="flex-1">
                  <p className="text-sm text-white/90">{n.title}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{n.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Task["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />;
  if (status === "in_progress")
    return <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />;
  return <Circle className="h-4 w-4 text-white/30 shrink-0" />;
}

function PriorityFlag({ p }: { p: Task["priority"] }) {
  const color = p === "high" ? "text-red-400" : p === "medium" ? "text-yellow-400" : "text-white/30";
  return <Flag className={`h-4 w-4 ${color}`} />;
}

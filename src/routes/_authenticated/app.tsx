import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowUpRight, CheckSquare, Clock, TrendingUp, Users,
  Bot, MessageSquare, FileText, CheckCircle2, Circle, AlertCircle, Flag,
  Send, Plus, Mic, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { askZukha } from "@/lib/ai-chat.functions";
import { useTranslation } from "react-i18next";



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
  const { t } = useTranslation();
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
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">{t("app.overview.greeting")}</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-white">
            {t("app.overview.greeting")}, {displayName} 👋
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {t("app.overview.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition">
            + {t("app.overview.quickAction")}
          </button>
        </div>

      </motion.div>

      {/* Ask Zukha chat */}
      <ZukhaChat />

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

type ChatMsg = { role: "user" | "assistant"; content: string };

function ZukhaChat() {
  const { t } = useTranslation();
  const ask = useServerFn(askZukha);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const suggestionsRaw = t("app.overview.suggestions", { returnObjects: true });
  const suggestions: string[] = Array.isArray(suggestionsRaw) ? (suggestionsRaw as string[]) : [];

  // Strip any markdown formatting the model might return so replies read as plain text.
  const stripMarkdown = (s: string) =>
    s
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "• ");


  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: stripMarkdown(res.reply || "…") }]);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-strong rounded-3xl p-4 sm:p-5 border border-white/10"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{t("app.overview.askZukha")}</div>
            <div className="text-[11px] text-white/50">{t("app.overview.copilot")}</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setError(null); }}
            className="text-[11px] text-white/50 hover:text-white transition"
          >
            {t("app.overview.clear")}
          </button>
        )}

      </div>

      {messages.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2.5 text-xs text-white/80"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "text-white/90"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("app.overview.thinking")}
            </div>
          )}

        </div>
      )}

      {error && (
        <div className="mb-2 text-xs text-red-400">{error}</div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40 transition">
        <button
          type="button"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition shrink-0"
          aria-label="Attach"
        >
          <Plus className="h-4 w-4" />
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={t("app.overview.askPlaceholder")}
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none max-h-40 py-1.5"
        />
        <button
          type="button"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition shrink-0"
          aria-label="Voice"
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition disabled:opacity-50 shrink-0"
          aria-label="Send"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </motion.section>
  );
}


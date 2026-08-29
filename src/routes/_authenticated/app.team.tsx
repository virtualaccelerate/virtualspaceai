import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Copy, Check, Send, Crown, Shield, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { loadTeamOverview } from "@/lib/team.functions";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";

type Overview = Awaited<ReturnType<typeof loadTeamOverview>>;

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  return src.slice(0, 2).toUpperCase();
}

function TeamPage() {
  const { t } = useTranslation();
  const load = useServerFn(loadTeamOverview);
  const [data, setData] = useState<Overview>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tsId = await getActiveTeamspaceId();
        const res = await load({ data: tsId ? { teamspace_id: tsId } : {} });
        setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyCode = async () => {
    if (!data?.teamspace?.invite_code) return;
    await navigator.clipboard.writeText(data.teamspace.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return <div className="text-sm text-[color:var(--muted-foreground)]">{t("app.common.loading", "Загрузка…")}</div>;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-10 text-center">
        <Users className="h-8 w-8 mx-auto mb-3 text-[color:var(--muted-foreground)]" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {t("app.team.noWorkspace", "Выберите рабочее пространство, чтобы увидеть участников.")}
        </p>
      </div>
    );
  }

  const roleIcon = (role: string) =>
    role === "owner" ? <Crown className="h-3.5 w-3.5" /> : role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("app.team.title", "Команда")}</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {data.teamspace?.name} · {t("app.team.count", "участников")}: {data.members.length}
          </p>
        </div>
        {data.teamspace?.invite_code && (
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:var(--muted)] transition"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            {t("app.team.inviteCode", "Код приглашения")}: <span className="font-mono">{data.teamspace.invite_code}</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("app.team.members", "Участники"), value: data.members.length },
          { label: t("app.team.tasksTotal", "Всего задач"), value: data.total_tasks },
          { label: t("app.team.tasksUnassigned", "Без исполнителя"), value: data.unassigned_tasks },
          { label: t("app.team.telegramLinked", "С Telegram"), value: data.members.filter((m) => m.telegram_linked).length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-[color:var(--muted-foreground)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] divide-y divide-[color:var(--border)]">
        {data.members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                {initials(m.full_name, m.email)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {m.full_name || m.email || t("app.team.member", "Участник")}
                {m.id === data.current_user_id && (
                  <span className="ml-2 text-xs text-[color:var(--muted-foreground)]">({t("app.team.you", "вы")})</span>
                )}
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)] truncate">{m.email}</div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--muted)] px-2 py-1 text-xs capitalize">
              {roleIcon(m.role)} {m.role}
            </span>
            {m.telegram_linked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2 py-1 text-xs">
                <Send className="h-3 w-3" /> Telegram
              </span>
            )}
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {t("app.team.open", "Активных")}: {m.open_tasks} · {t("app.team.done", "Готово")}: {m.done_tasks}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/app/team")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Команда — Virtual Space" },
      { name: "description", content: "Участники рабочего пространства, роли и распределение задач." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

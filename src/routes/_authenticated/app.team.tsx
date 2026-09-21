import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Copy, Check, Send, Crown, Shield, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { loadTeamOverview, setMemberRole } from "@/lib/team.functions";
import { toast } from "sonner";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import TeamPerformance from "@/components/TeamPerformance";
import PendingMembers from "@/components/PendingMembers";

type Overview = Awaited<ReturnType<typeof loadTeamOverview>>;

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  return src.slice(0, 2).toUpperCase();
}

function TeamPage() {
  const { t } = useTranslation();
  const load = useServerFn(loadTeamOverview);
  const changeRole = useServerFn(setMemberRole);
  const [roleBusy, setRoleBusy] = useState<string | null>(null);
  const [data, setData] = useState<Overview>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tsId, setTsId] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const active = (await getActiveTeamspaceId()) ?? undefined;
        setTsId(active);
        const res = await load({ data: active ? { teamspace_id: active } : {} });
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

  const updateRole = async (memberId: string, role: "admin" | "member") => {
    if (!data?.teamspace?.id) return;
    setRoleBusy(memberId);
    try {
      await changeRole({ data: { teamspace_id: data.teamspace.id, user_id: memberId, role } });
      setData((prev) =>
        prev ? { ...prev, members: prev.members.map((m) => (m.id === memberId ? { ...m, role } : m)) } : prev,
      );
      toast.success(t("workspaceUi.team.roleSaved", "Роль обновлена"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setRoleBusy(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.common.loading", "Загрузка…")}</div>;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-10 text-center">
        <Users className="h-8 w-8 mx-auto mb-3 text-[color:var(--muted-foreground)]" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {t("workspaceUi.team.noWorkspace", "Выберите рабочее пространство, чтобы увидеть участников.")}
        </p>
      </div>
    );
  }

  const isOwner = data.teamspace?.owner_id === data.current_user_id;

  const roleIcon = (role: string) =>
    role === "owner" ? <Crown className="h-3.5 w-3.5" /> : role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("workspaceUi.team.title", "Команда")}</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {data.teamspace?.name} · {t("workspaceUi.team.count", "участников")}: {data.members.length}
          </p>
        </div>
        {data.teamspace?.invite_code && (
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:var(--muted)] transition"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            {t("workspaceUi.team.inviteCode", "Код приглашения")}: <span className="font-mono">{data.teamspace.invite_code}</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("workspaceUi.team.members", "Участники"), value: data.members.length },
          { label: t("workspaceUi.team.tasksTotal", "Всего задач"), value: data.total_tasks },
          { label: t("workspaceUi.team.tasksUnassigned", "Без исполнителя"), value: data.unassigned_tasks },
          { label: t("workspaceUi.team.telegramLinked", "С Telegram"), value: data.members.filter((m) => m.telegram_linked).length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-[color:var(--muted-foreground)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-xs text-[color:var(--muted-foreground)] space-y-1">
        <div className="flex items-center gap-2"><Crown className="h-3.5 w-3.5" /> {t("workspaceUi.team.legendOwner", "Владелец — создал пространство и управляет им целиком.")}</div>
        <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> {t("workspaceUi.team.legendAdmin", "Администратор — назначает задачи и получает ежедневный отчёт по всей команде.")}</div>
        <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /> {t("workspaceUi.team.legendMember", "Участник — видит только свои задачи и отчёт только о своей работе.")}</div>
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
                {m.full_name || m.email || t("workspaceUi.team.member", "Участник")}
                {m.id === data.current_user_id && (
                  <span className="ml-2 text-xs text-[color:var(--muted-foreground)]">({t("workspaceUi.team.you", "вы")})</span>
                )}
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)] truncate">{m.email}</div>
            </div>
            {isOwner && m.role !== "owner" ? (
              <select
                value={m.role === "admin" ? "admin" : "member"}
                disabled={roleBusy === m.id}
                onChange={(event) => updateRole(m.id, event.target.value as "admin" | "member")}
                className="rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 py-1 text-xs"
              >
                <option value="admin">{t("workspaceUi.team.roleAdmin", "Администратор")}</option>
                <option value="member">{t("workspaceUi.team.roleMember", "Участник")}</option>
              </select>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--muted)] px-2 py-1 text-xs capitalize">
                {roleIcon(m.role)} {m.role}
              </span>
            )}
            {m.telegram_linked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2 py-1 text-xs">
                <Send className="h-3 w-3" /> Telegram
              </span>
            )}
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {t("workspaceUi.team.open", "Активных")}: {m.open_tasks} · {t("workspaceUi.team.done", "Готово")}: {m.done_tasks}
            </span>
          </div>
        ))}
      </div>

      {isManager && <PendingMembers teamspaceId={tsId} />}

      {isManager && <TeamPerformance teamspaceId={tsId} />}
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

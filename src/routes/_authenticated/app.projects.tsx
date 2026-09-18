import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, FolderKanban, Loader2, Plug, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { listProjects } from "@/lib/projects.functions";
import { syncYouGile } from "@/lib/yougile.functions";
import { syncTrello } from "@/lib/trello.functions";

export const Route = createFileRoute("/_authenticated/app/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects — Virtual Space" },
      { name: "description", content: "Every project in your workspace with source, board, progress, owner and last synchronization." },
      { property: "og:title", content: "Projects — Virtual Space" },
      { property: "og:description", content: "Track Virtual Space, YouGile and Trello projects in one synchronized view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_CLASS: Record<string, string> = {
  backlog: "bg-white/10 text-white/70",
  in_progress: "bg-sky-500/15 text-sky-300",
  review: "bg-amber-500/15 text-amber-300",
  done: "bg-emerald-500/15 text-emerald-300",
};

function ProjectsPage() {
  const { t } = useTranslation();
  const STATUS_LABEL: Record<string, string> = {
    backlog: t("workspaceUi.projects.statusBacklog", "К выполнению"),
    in_progress: t("workspaceUi.projects.statusInProgress", "В работе"),
    review: t("workspaceUi.projects.statusReview", "На проверке"),
    done: t("workspaceUi.projects.statusDone", "Готово"),
  };
  const SOURCE_LABEL: Record<string, string> = {
    virtual_space: "Virtual Space",
    yougile: "YouGile",
    trello: "Trello",
  };
  const queryClient = useQueryClient();
  const load = useServerFn(listProjects);
  const syncYg = useServerFn(syncYouGile);
  const syncTr = useServerFn(syncTrello);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => load({ data: {} }),
  });

  const projects = (data?.projects ?? []) as any[];
  const sync = (data?.sync ?? []) as any[];

  async function runSync(provider: string) {
    if (!data?.teamspace_id) return;
    setBusy(provider);
    setError(null);
    try {
      const payload = { data: { teamspace_id: data.teamspace_id } };
      if (provider === "yougile") await syncYg(payload); else await syncTr(payload);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <FolderKanban className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl sm:text-3xl text-white">{t("workspaceUi.projects.title", "Проекты")}</h1>
          <p className="mt-1.5 text-sm text-white/60 max-w-2xl">
            {t("workspaceUi.projects.subtitle", "Все проекты пространства: собственные и импортированные из YouGile и Trello, со статусом, прогрессом и временем последней синхронизации.")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/integrations"><Plug className="h-4 w-4" /> {t("workspaceUi.projects.integrations", "Интеграции")}</Link>
        </Button>
      </header>

      {sync.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sync.map((row) => (
            <div key={row.provider} className="glass-strong rounded-xl border border-white/10 px-3 py-2 flex items-center gap-3 text-xs text-white/70">
              <span className="font-semibold text-white">{SOURCE_LABEL[row.provider] ?? row.provider}</span>
              <span>{row.last_sync_at ? new Date(row.last_sync_at).toLocaleString() : t("workspaceUi.projects.never", "ещё не синхронизировано")}</span>
              {row.last_error && <span className="text-destructive">{row.last_error}</span>}
              <Button size="sm" variant="ghost" disabled={busy === row.provider} onClick={() => runSync(row.provider)}>
                {busy === row.provider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="glass-strong rounded-2xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-white/45">
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.name", "Проект")}</th>
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.source", "Источник")}</th>
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.board", "Доска")}</th>
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.status", "Статус")}</th>
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.progress", "Прогресс")}</th>
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.owner", "Ответственный")}</th>
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.tasks", "Задачи")}</th>
              <th className="px-4 py-3 font-medium">{t("workspaceUi.projects.lastSync", "Синхронизация")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-white/50"><Loader2 className="inline h-4 w-4 animate-spin" /></td></tr>
            )}
            {!isLoading && projects.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-white/50">{t("workspaceUi.projects.empty", "Проектов пока нет — создайте задачи или подключите YouGile/Trello.")}</td></tr>
            )}
            {projects.map((project) => (
              <tr key={project.key} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{project.name}</span>
                    {project.url && (
                      <a href={project.url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-white/70">{SOURCE_LABEL[project.source] ?? project.source}</td>
                <td className="px-4 py-3 text-white/70">{project.board ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_CLASS[project.status]}`}>{STATUS_LABEL[project.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-xs text-white/60">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/70">{project.owner ?? "—"}</td>
                <td className="px-4 py-3 text-white/70">{project.done}/{project.total}</td>
                <td className="px-4 py-3 text-white/60">{project.last_sync_at ? new Date(project.last_sync_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

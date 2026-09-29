import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { BookOpen, ExternalLink, Link2, ListChecks, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getProjectMaterials } from "@/lib/projects.functions";
import { LINK_LABEL, type LinkKind } from "@/lib/links";

type Props = { projectKey: string | null; projectName: string; teamspaceId?: string | null; onClose: () => void };

export function ProjectMaterialsDialog({ projectKey, projectName, teamspaceId, onClose }: Props) {
  const { t } = useTranslation();
  const load = useServerFn(getProjectMaterials);
  const { data, isLoading, error } = useQuery({
    queryKey: ["project-materials", projectKey],
    queryFn: () => load({ data: { key: projectKey!, teamspace_id: teamspaceId ?? null } }),
    enabled: !!projectKey,
  });

  const REASON: Record<string, string> = {
    project: t("workspaceUi.projects.reasonProject", "проект"),
    tracker: t("workspaceUi.projects.reasonTracker", "трекер"),
    tag: t("workspaceUi.projects.reasonTag", "тег"),
    mention: t("workspaceUi.projects.reasonMention", "упоминание"),
  };
  const STATUS: Record<string, string> = {
    backlog: t("workspaceUi.projects.statusBacklog", "К выполнению"),
    in_progress: t("workspaceUi.projects.statusInProgress", "В работе"),
    review: t("workspaceUi.projects.statusReview", "На проверке"),
    done: t("workspaceUi.projects.statusDone", "Готово"),
  };

  const tasks = (data?.tasks ?? []) as any[];
  const links = (data?.links ?? []) as any[];
  const knowledge = ((data?.knowledge ?? []) as any[]).filter((d) => !d.url);

  const Reason = ({ r }: { r: string }) => (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{REASON[r] ?? r}</span>
  );

  const Section = ({ icon: Icon, title, count, children, empty }: any) => (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title} <span className="font-normal text-muted-foreground">({count})</span>
      </h3>
      {count === 0 ? <p className="text-xs text-muted-foreground">{empty}</p> : <ul className="divide-y divide-border rounded-xl border border-border">{children}</ul>}
    </section>
  );

  return (
    <Dialog open={!!projectKey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{projectName}</DialogTitle>
          <DialogDescription>
            {t("workspaceUi.projects.materialsHint", "Материалы подтягиваются автоматически по названию проекта, тегам (#проект) и упоминаниям.")}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></div>
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <div className="space-y-6">
            <Section icon={ListChecks} title={t("workspaceUi.projects.blockTasks", "Задачи")} count={tasks.length} empty={t("workspaceUi.projects.noTasks", "Задач пока нет")}>
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
                  {task.assignee_name && <span className="hidden sm:inline text-xs text-muted-foreground">{task.assignee_name}</span>}
                  {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
                  <span className="text-xs text-muted-foreground">{STATUS[task.status] ?? task.status}</span>
                  <Reason r={task.reason} />
                  {task.external_url && (
                    <a href={task.external_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>
                  )}
                </li>
              ))}
            </Section>

            <Section icon={Link2} title={t("workspaceUi.projects.blockLinks", "Ссылки")} count={links.length} empty={t("workspaceUi.projects.noLinks", "Ссылок пока нет — добавьте их в базу знаний с этим проектом или тегом.")}>
              {links.map((link) => (
                <li key={link.url} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{LINK_LABEL[link.kind as LinkKind] ?? "Web"}</span>
                  <a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-foreground hover:underline">{link.title}</a>
                  <span className="hidden sm:inline text-[10px] text-muted-foreground">
                    {link.origin === "task" ? t("workspaceUi.projects.fromTask", "из задачи") : t("workspaceUi.projects.fromKb", "база знаний")}
                  </span>
                  <Reason r={link.reason} />
                </li>
              ))}
            </Section>

            <Section icon={BookOpen} title={t("workspaceUi.projects.blockKnowledge", "База знаний")} count={knowledge.length} empty={t("workspaceUi.projects.noKnowledge", "Записей пока нет")}>
              {knowledge.map((doc) => (
                <li key={doc.id} className="px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-foreground">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</span>
                    <Reason r={doc.reason} />
                  </div>
                  {doc.excerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.excerpt}</p>}
                </li>
              ))}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

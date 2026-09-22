import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, History, Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getTaskHistory } from "@/lib/task-events.functions";

type EventRow = {
  id: string;
  kind: string;
  field: string | null;
  from_value: string | null;
  to_value: string | null;
  actor_name: string | null;
  source: string | null;
  note: string | null;
  created_at: string;
};

type Detail = {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    status_name: string | null;
    priority: string;
    due_date: string | null;
    assignee_name: string | null;
    project: string | null;
    department: string | null;
    external_source: string | null;
    external_url: string | null;
    external_project: string | null;
    external_board: string | null;
  };
  events: EventRow[];
};

function trackerName(source: string | null | undefined) {
  return source === "trello" ? "Trello" : source === "yougile" ? "YouGile" : null;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onEdit,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (taskId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    getTaskHistory({ data: { task_id: taskId } })
      .then((result: Detail) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  const task = detail?.task;
  const tracker = trackerName(task?.external_source);
  const locale = i18n.language === "en" ? "en-GB" : "ru-RU";

  function describe(event: EventRow) {
    const parts: string[] = [];
    if (event.field) parts.push(event.field);
    if (event.from_value || event.to_value) parts.push(`${event.from_value ?? "—"} → ${event.to_value ?? "—"}`);
    if (!parts.length) parts.push(event.kind);
    if (event.note) parts.push(event.note);
    return parts.join(" · ");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{task?.title ?? t("tasksUi.detail.title", "Task")}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {task && (
          <div className="space-y-4 text-sm">
            {task.description && <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Field label={t("tasksUi.detail.status", "Status")} value={task.status_name ?? task.status} />
              <Field label={t("tasksUi.detail.priority", "Priority")} value={task.priority} />
              <Field label={t("tasksUi.detail.assignee", "Assignee")} value={task.assignee_name ?? "—"} />
              <Field label={t("tasksUi.detail.due", "Due date")} value={task.due_date ?? "—"} />
              {(task.project || task.external_project) && (
                <Field label={t("tasksUi.detail.project", "Project")} value={task.external_project ?? task.project ?? "—"} />
              )}
              {(task.department || task.external_board) && (
                <Field label={t("tasksUi.detail.board", "Board")} value={task.external_board ?? task.department ?? "—"} />
              )}
            </dl>

            {tracker && (
              <p className="text-xs text-muted-foreground">
                {t("tasksUi.detail.managed", "Managed in {{tracker}}", { tracker })}
              </p>
            )}

            <div>
              <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
                <History className="h-3.5 w-3.5" />
                {t("tasksUi.detail.history", "History")}
              </h3>
              {detail.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("tasksUi.detail.noHistory", "No changes yet")}</p>
              ) : (
                <ol className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {detail.events.map((event) => (
                    <li key={event.id} className="rounded-lg border border-border/60 px-3 py-2">
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {event.actor_name ? ` · ${event.actor_name}` : ""}
                        {trackerName(event.source) ? ` · ${trackerName(event.source)}` : ""}
                      </div>
                      <div className="mt-0.5">{describe(event)}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {task?.external_url && (
            <Button variant="outline" onClick={() => window.open(task.external_url!, "_blank", "noreferrer")}>
              <ExternalLink className="h-4 w-4" />
              {t("tasksUi.detail.openTracker", "Open in {{tracker}}", { tracker: tracker ?? "tracker" })}
            </Button>
          )}
          {task && !tracker && onEdit && (
            <Button onClick={() => onEdit(task.id)}>
              <Pencil className="h-4 w-4" />
              {t("tasksUi.detail.edit", "Edit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

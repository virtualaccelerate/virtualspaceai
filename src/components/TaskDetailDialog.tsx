import { IconButton } from "@/components/ui/icon-button";
import { ActionConfirm } from "@/components/ui/action-confirm";
import { taskLabelDisplay } from "@/lib/task-label-display";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, History, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteTaskComment, getTaskHistory, saveTaskComment } from "@/lib/task-events.functions";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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
  actor_id: string | null;
  actor_avatar?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  mentions?: string[];
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
  viewer_id: string;
  members: {id: string; name: string}[];
};

function trackerName(source: string | null | undefined) {
  return source === "trello" ? "Trello" : source === "yougile" ? "YouGile" : null;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onEdit,
  onCommentsChange,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (taskId: string) => void;
  onCommentsChange?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [onlyComments, setOnlyComments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<{start: number; end: number; text: string} | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    setLoading(true);
    setBody(""); setMentions([]); setEditingComment(null); setOnlyComments(false); setMentionQuery(null); setLoadError(false);
    setDetail(null);
    getTaskHistory({ data: { task_id: taskId } })
      .then((result: Detail) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  async function refresh() {
    if (!taskId) return;
    setDetail(await getTaskHistory({data: {task_id: taskId}}));
    onCommentsChange?.();
  }
  async function sendComment() {
    if (!taskId || !body.trim() || saving) return;
    setSaving(true);
    try {
      await saveTaskComment({data: {task_id: taskId, comment_id: editingComment ?? undefined, body, mentions: mentions.filter((id) => {
        const member = detail?.members.find((m) => m.id === id);
        return member && body.includes(`@${member.name}`);
      })}});
      setBody(""); setMentions([]); setEditingComment(null); setMentionQuery(null);
      await refresh();
    } catch { toast.error(t("tasksUi.comments.error")); }
    finally { setSaving(false); }
  }
  async function removeComment(id: string) {
    if (!taskId || saving) return;
    setSaving(true);
    try { await deleteTaskComment({data: {task_id: taskId, comment_id: id}}); await refresh(); }
    catch { toast.error(t("tasksUi.comments.error")); }
    finally { setSaving(false); }
  }
  const candidates = mentionQuery ? (detail?.members ?? []).filter((m) => m.name.toLowerCase().includes(mentionQuery.text.toLowerCase())).slice(0, 8) : [];

  const task = detail?.task;
  const tracker = trackerName(task?.external_source);
  const locale = i18n.language;
  const statusLabel = (value: string) => t(`tasksUi.col.${value}`, { defaultValue: value });
  const priorityLabel = (value: string) => t(`tasksUi.priority.${value}`, { defaultValue: value });
  const eventValue = (field: string | null, value: string | null) => !value ? "—" : field === "status" ? statusLabel(value) : field === "priority" ? priorityLabel(value) : taskLabelDisplay(value) ?? "—";

  function describe(event: EventRow) {
    if (event.kind === "comment") return `${t("tasksUi.detail.events.comment")} · ${event.note ?? ""}`;
    const parts: string[] = [];
    if (event.field) parts.push(t(`tasksUi.detail.events.${event.field}`, { defaultValue: event.field }));
    if (event.from_value || event.to_value) parts.push(`${eventValue(event.field, event.from_value)} → ${eventValue(event.field, event.to_value)}`);
    if (!parts.length) parts.push(t(`tasksUi.detail.events.${event.kind}`, { defaultValue: event.kind }));
    if (event.note) parts.push(event.note);
    return parts.join(" · ");
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{task?.title ?? t("tasksUi.detail.title", "Task")}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {loadError && <p role="alert" className="text-sm text-destructive">{t("tasksUi.comments.error")}</p>}

        {task && (
          <div className="space-y-4 text-sm">
            {task.description && <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Field label={t("tasksUi.detail.status", "Status")} value={task.status_name ?? statusLabel(task.status)} />
              <Field label={t("tasksUi.detail.priority", "Priority")} value={priorityLabel(task.priority)} />
              <Field label={t("tasksUi.detail.assignee", "Assignee")} value={task.assignee_name ?? "—"} />
              <Field label={t("tasksUi.detail.due", "Due date")} value={task.due_date ?? "—"} />
              {(taskLabelDisplay(task.project) || taskLabelDisplay(task.external_project)) && (
                <Field label={t("tasksUi.detail.project", "Project")} value={taskLabelDisplay(task.external_project) ?? taskLabelDisplay(task.project) ?? "—"} />
              )}
              {(taskLabelDisplay(task.department) || taskLabelDisplay(task.external_board)) && (
                <Field label={t("tasksUi.detail.board", "Board")} value={taskLabelDisplay(task.external_board) ?? taskLabelDisplay(task.department) ?? "—"} />
              )}
            </dl>

            {tracker && (
              <p className="text-xs text-muted-foreground">
                {t("tasksUi.detail.managed", "Managed in {{tracker}}", { tracker })}
              </p>
            )}

            <div className="space-y-2">
              <Textarea aria-label={t("tasksUi.comments.placeholder")} placeholder={t("tasksUi.comments.placeholder")} value={body} maxLength={5000} disabled={saving} rows={3}
                onChange={(e) => {
                  setBody(e.target.value);
                  const end = e.target.selectionStart;
                  const match = /(?:^|\s)@([^@\n]*)$/.exec(e.target.value.slice(0, end));
                  setMentionQuery(match ? {start: end - (match[1]?.length ?? 0) - 1, end, text: match[1] ?? ""} : null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) { e.preventDefault(); void sendComment(); } }}
              />
              {candidates.length > 0 && <div role="listbox" aria-label={t("tasksUi.comments.mentions")} className="max-h-40 overflow-y-auto border border-border rounded-md bg-popover p-1">
                {candidates.map((member) => <Button key={member.id} role="option" aria-selected={false} variant="ghost" className="w-full justify-start h-auto whitespace-normal text-left" onClick={() => {
                  if (!mentionQuery) return;
                  setBody(body.slice(0, mentionQuery.start) + `@${member.name} ` + body.slice(mentionQuery.end));
                  setMentions((prev) => [...new Set([...prev, member.id])]); setMentionQuery(null);
                }}>{member.name}</Button>)}
              </div>}
              <div className="flex justify-end gap-2">
                {editingComment && <Button size="sm" variant="ghost" disabled={saving} onClick={() => {setEditingComment(null); setBody(""); setMentions([]);}}>{t("tasksUi.cancel")}</Button>}
                <Button size="sm" loading={saving && !deleteTarget} disabled={!body.trim() || saving} onClick={() => void sendComment()}><Send className="h-4 w-4"/>{t(editingComment ? "tasksUi.save" : "tasksUi.comments.send")}</Button>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                {t("tasksUi.comments.feed")}
              </h3>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={onlyComments} onCheckedChange={setOnlyComments} aria-label={t("tasksUi.comments.only")}/>{t("tasksUi.comments.only")}</label>
              </div>
              {detail.events.filter((event) => !onlyComments || event.kind === "comment").length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("tasksUi.detail.noHistory", "No changes yet")}</p>
              ) : (
                <ol className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {detail.events.filter((event) => !onlyComments || event.kind === "comment").map((event) => (
                    <li key={event.id} className="flex gap-2 border-b border-border/60 pb-3 last:border-0">
                      {event.kind === "comment" && <Avatar className="h-7 w-7"><AvatarImage src={event.actor_avatar ?? undefined}/><AvatarFallback className="text-xs">{event.actor_name?.slice(0, 1) ?? "?"}</AvatarFallback></Avatar>}
                      <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {event.actor_name && <span className="font-medium text-foreground">{event.actor_name}</span>}
                        {new Date(event.created_at).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {trackerName(event.source) ? ` · ${trackerName(event.source)}` : ""}
                        {event.source === "telegram_group" && <span>{t("tasksUi.comments.telegramGroup")}</span>}
                        {event.edited_at && <span>{t("tasksUi.comments.edited")}</span>}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap break-words">{event.kind === "comment" ? event.deleted_at ? <span className="italic text-muted-foreground">{t("tasksUi.comments.deleted")}</span> : <CommentText text={event.note ?? ""}/> : describe(event)}</div>
                      {event.kind === "comment" && event.source === "virtual_space" && event.actor_id === detail.viewer_id && !event.deleted_at && <div className="mt-1 flex gap-1">
                        <IconButton variant="ghost" aria-label={t("tasksUi.comments.edit")} title={t("tasksUi.comments.edit")} disabled={saving} onClick={() => {setEditingComment(event.id); setBody(event.note ?? ""); setMentions(event.mentions ?? []);}}><Pencil className="h-3.5 w-3.5"/></IconButton>
                        <IconButton variant="destructive" aria-label={t("tasksUi.comments.delete")} title={t("tasksUi.comments.delete")} disabled={saving} onClick={() => setDeleteTarget(event.id)}><Trash2 className="h-3.5 w-3.5"/></IconButton>
                      </div>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {task?.external_url && (
            <Button variant="outline" onClick={() => window.open(task.external_url ?? "", "_blank", "noreferrer")}>
              <ExternalLink className="h-4 w-4" />
              {t("tasksUi.detail.openTracker", "Open in {{tracker}}", { tracker: tracker ?? "tracker" })}
            </Button>
          )}
          {task && tracker !== "YouGile" && onEdit && (
            <Button variant="outline" onClick={() => onEdit(task.id)}>
              <Pencil className="h-4 w-4" />
              {t("tasksUi.detail.edit", "Edit")}
            </Button>
          )}
        </DialogFooter>
      <ActionConfirm open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title={t("tasksUi.comments.delete")} description={t("tasksUi.confirmDeleteBody")} label={t("tasksUi.comments.delete")} loading={saving} onConfirm={async () => { if (deleteTarget) { await removeComment(deleteTarget); setDeleteTarget(null); } }} />
      </DialogContent>
    </Dialog>
  );
}

function CommentText({text}: {text: string}) {
  return <>{text.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{part}</a> : part)}</>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}

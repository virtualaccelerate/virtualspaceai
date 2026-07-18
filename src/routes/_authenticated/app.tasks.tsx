import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarIcon, Flag, MoreHorizontal, Pencil, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logChatEvent } from "@/lib/chat-history.functions";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: TasksPage,
  head: () => ({
    meta: [
      { title: "Tasks — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type TaskStatus = "backlog" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_name: string | null;
  due_date: string | null;
  position: number;
};

const COLUMNS: {
  id: TaskStatus;
  label: string;
  accent: string;
  pill: string;
  dot: string;
  ring: string;
}[] = [
  {
    id: "backlog",
    label: "TO DO",
    accent: "bg-foreground/20",
    pill: "bg-muted text-foreground border-border",
    dot: "border-foreground/50",
    ring: "ring-foreground/10",
  },
  {
    id: "in_progress",
    label: "IN PROGRESS",
    accent: "bg-violet-500",
    pill: "bg-violet-500/15 text-violet-700 dark:text-violet-200 border-violet-500/40",
    dot: "border-violet-500 dark:border-violet-400",
    ring: "ring-violet-400/20",
  },
  {
    id: "review",
    label: "REVIEW",
    accent: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/40",
    dot: "border-amber-500 dark:border-amber-400",
    ring: "ring-amber-400/20",
  },
  {
    id: "done",
    label: "COMPLETE",
    accent: "bg-emerald-500",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/40",
    dot: "border-emerald-500 dark:border-emerald-400",
    ring: "ring-emerald-400/20",
  },
];

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low: { label: "Low", color: "text-muted-foreground border-border", dot: "bg-foreground/40" },
  medium: { label: "Medium", color: "text-sky-700 dark:text-sky-300 border-sky-500/40", dot: "bg-sky-500 dark:bg-sky-400" },
  high: { label: "High", color: "text-amber-700 dark:text-amber-300 border-amber-500/40", dot: "bg-amber-500 dark:bg-amber-400" },
  urgent: { label: "Urgent", color: "text-rose-700 dark:text-rose-300 border-rose-500/40", dot: "bg-rose-500 dark:bg-rose-400" },
};

function initialsOf(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function formatDateRange(due: string) {
  const d = new Date(due);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type TaskDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_name: string;
  due_date: string;
};

const emptyDraft = (status: TaskStatus = "backlog"): TaskDraft => ({
  title: "",
  description: "",
  status,
  priority: "medium",
  assignee_name: "",
  due_date: "",
});

function TasksPage() {
  const { t } = useTranslation();
  const logEvent = useServerFn(logChatEvent);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) return;
      if (!cancelled) setUserId(session.user.id);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("status")
        .order("position");
      if (error) {
        toast.error(error.message);
      } else if (!cancelled) {
        setTasks((data ?? []) as Task[]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  function openCreate(status: TaskStatus = "backlog") {
    setEditing(null);
    setDraft(emptyDraft(status));
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      assignee_name: task.assignee_name ?? "",
      due_date: task.due_date ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!userId) return;

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      priority: draft.priority,
      assignee_name: draft.assignee_name.trim() || null,
      due_date: draft.due_date || null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (error) return toast.error(error.message);
      setTasks((prev) => prev.map((t) => (t.id === editing.id ? (data as Task) : t)));
      toast.success("Task updated");
    } else {
      const position = (grouped[draft.status]?.length ?? 0) * 1000;
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...payload, user_id: userId, position })
        .select()
        .single();
      if (error) return toast.error(error.message);
      const created = data as Task;
      setTasks((prev) => [...prev, created]);
      toast.success("Task created");
      // Log manual task creation into chat history so the user has a record
      logEvent({
        data: {
          content: `${t("app.tasks.chatLog", "Task created manually")}: ${created.title}`,
          tasks: [{ id: created.id, title: created.title }],
        },
      }).catch(() => {});
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const prev = tasks;
    setTasks((p) => p.filter((t) => t.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      setTasks(prev);
      toast.error(error.message);
    } else {
      toast.success("Task deleted");
    }
  }

  async function moveTask(id: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    const position = (grouped[status]?.length ?? 0) * 1000;
    const prev = tasks;
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, status, position } : t)));
    const { error } = await supabase
      .from("tasks")
      .update({ status, position })
      .eq("id", id);
    if (error) {
      setTasks(prev);
      toast.error(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Канбан-доска: создавайте задачи, назначайте исполнителей и двигайте их между статусами.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2">
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="-mx-4 sm:-mx-6 overflow-x-auto pb-4">
          <div className="flex gap-4 px-4 sm:px-6 min-w-max">
            {COLUMNS.map((col) => {
              const items = grouped[col.id];
              const isOver = dragOver === col.id;
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== col.id) setDragOver(col.id);
                  }}
                  onDragLeave={() => setDragOver((s) => (s === col.id ? null : s))}
                  onDrop={() => {
                    if (dragId) moveTask(dragId, col.id);
                    setDragId(null);
                    setDragOver(null);
                  }}
                  className={cn(
                    "w-[300px] shrink-0 flex flex-col rounded-2xl border border-border bg-card/50 p-3 transition-colors",
                    isOver && "border-primary/40 bg-primary/[0.05] ring-2 ring-primary/20",
                  )}
                >
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold tracking-wider",
                          col.pill,
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full border-2 bg-transparent",
                            col.dot,
                          )}
                        />
                        {col.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">{items.length}</span>
                    </div>
                    <button
                      onClick={() => openCreate(col.id)}
                      className="text-muted-foreground hover:text-foreground transition"
                      aria-label={`Add task to ${col.label}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>


                  <div className="flex-1 space-y-2 min-h-[80px]">
                    {items.map((task) => {
                      const meta = PRIORITY_META[task.priority];
                      return (
                        <article
                          key={task.id}
                          draggable
                          onDragStart={() => setDragId(task.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setDragOver(null);
                          }}
                          onClick={() => openEdit(task)}
                          className={cn(
                            "group cursor-grab active:cursor-grabbing rounded-xl border border-border bg-card p-3 shadow-sm hover:border-primary/30 hover:bg-accent/30 transition",
                            dragId === task.id && "opacity-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[13px] font-medium text-foreground leading-snug">
                              {task.title}
                            </h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <button
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition -mr-1"
                                  aria-label="Task actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => openEdit(task)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                                  <DropdownMenuItem key={c.id} onClick={() => moveTask(task.id, c.id)}>
                                    Move to {c.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(task.id)}
                                  className="text-rose-600 dark:text-rose-300 focus:text-rose-700 dark:focus:text-rose-200"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 flex items-center gap-1.5">
                            {task.assignee_name ? (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/80 text-[10px] font-semibold text-white ring-2 ring-background"
                                title={task.assignee_name}
                              >
                                {initialsOf(task.assignee_name)}
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                                <User className="h-3 w-3" />
                              </span>
                            )}

                            {task.due_date ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-foreground/80">
                                <CalendarIcon className="h-3 w-3" />
                                {formatDateRange(task.due_date)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-border text-muted-foreground">
                                <CalendarIcon className="h-3 w-3" />
                              </span>
                            )}

                            <span
                              className={cn(
                                "inline-flex items-center justify-center h-6 w-6 rounded-md border",
                                meta.color,
                              )}
                              title={`Priority: ${meta.label}`}
                            >
                              <Flag className="h-3 w-3" />
                            </span>

                            <span
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-border text-muted-foreground"
                              aria-hidden
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => openCreate(col.id)}
                    className="mt-2 w-full flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300/80 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-accent/40 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Task
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => openCreate()}
              className="w-[220px] shrink-0 self-start flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
            >
              <Plus className="h-4 w-4" /> Add group
            </button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("app.tasks.dlgEdit", "Edit task") : t("app.tasks.dlgNew", "New task")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">{t("app.tasks.fTitle", "Title")}</Label>
              <Input
                id="task-title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder={t("app.tasks.phTitle", "Design new onboarding flow")}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">{t("app.tasks.fDesc", "Description")}</Label>
              <Textarea
                id="task-desc"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder={t("app.tasks.phDesc", "Details, acceptance criteria, links…")}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("app.tasks.fStatus", "Status")}</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft((d) => ({ ...d, status: v as TaskStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("app.tasks.fPriority", "Priority")}</Label>
                <Select
                  value={draft.priority}
                  onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as TaskPriority }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-assignee">{t("app.tasks.fAssignee", "Assignee")}</Label>
                <Input
                  id="task-assignee"
                  value={draft.assignee_name}
                  onChange={(e) => setDraft((d) => ({ ...d, assignee_name: e.target.value }))}
                  placeholder={t("app.tasks.phAssignee", "Name or email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">{t("app.tasks.fDue", "Due date")}</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <Button
                variant="ghost"
                className="text-rose-300 hover:text-rose-200 mr-auto"
                onClick={() => {
                  handleDelete(editing.id);
                  setDialogOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> {t("app.tasks.delete", "Delete")}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>{t("app.tasks.cancel", "Cancel")}</Button>
            <Button onClick={handleSave}>{editing ? t("app.tasks.save", "Save") : t("app.tasks.create", "Create task")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

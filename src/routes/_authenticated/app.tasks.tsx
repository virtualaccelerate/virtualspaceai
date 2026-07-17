import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, Flag, MoreHorizontal, Pencil, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
    accent: "bg-white/40",
    pill: "bg-white/10 text-white/80 border-white/15",
    dot: "border-white/40",
    ring: "ring-white/10",
  },
  {
    id: "in_progress",
    label: "IN PROGRESS",
    accent: "bg-violet-500",
    pill: "bg-violet-500/20 text-violet-200 border-violet-400/30",
    dot: "border-violet-400",
    ring: "ring-violet-400/20",
  },
  {
    id: "review",
    label: "REVIEW",
    accent: "bg-amber-400",
    pill: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    dot: "border-amber-400",
    ring: "ring-amber-400/20",
  },
  {
    id: "done",
    label: "COMPLETE",
    accent: "bg-emerald-500",
    pill: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    dot: "border-emerald-400",
    ring: "ring-emerald-400/20",
  },
];

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low: { label: "Low", color: "text-white/60 border-white/15", dot: "bg-white/40" },
  medium: { label: "Medium", color: "text-sky-300 border-sky-400/30", dot: "bg-sky-400" },
  high: { label: "High", color: "text-amber-300 border-amber-400/30", dot: "bg-amber-400" },
  urgent: { label: "Urgent", color: "text-rose-300 border-rose-400/30", dot: "bg-rose-400" },
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
      setTasks((prev) => [...prev, data as Task]);
      toast.success("Task created");
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
          <h1 className="font-display text-2xl sm:text-3xl text-white">Tasks</h1>
          <p className="mt-1 text-sm text-white/60">
            Канбан-доска: создавайте задачи, назначайте исполнителей и двигайте их между статусами.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2">
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-white/50">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                  "rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex flex-col min-h-[300px] transition-colors",
                  isOver && "border-primary/50 bg-primary/[0.06]",
                )}
              >
                <div className="flex items-center justify-between px-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                    <span className="text-xs font-medium uppercase tracking-wider text-white/70">
                      {col.label}
                    </span>
                    <span className="text-xs text-white/40">{items.length}</span>
                  </div>
                  <button
                    onClick={() => openCreate(col.id)}
                    className="text-white/40 hover:text-white transition"
                    aria-label={`Add task to ${col.label}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-2">
                  {items.map((task) => (
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
                        "group cursor-grab active:cursor-grabbing rounded-xl border border-white/10 bg-black/30 p-3 hover:border-white/25 transition",
                        dragId === task.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm text-white leading-snug">{task.title}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition"
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
                              className="text-rose-300 focus:text-rose-200"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {task.description && (
                        <p className="mt-1 text-xs text-white/50 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-[10px] px-1.5 py-0", PRIORITY_META[task.priority].color)}
                        >
                          <Flag className="h-3 w-3" />
                          {PRIORITY_META[task.priority].label}
                        </Badge>
                        {task.due_date && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.assignee_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-white/60 ml-auto">
                            <User className="h-3 w-3" />
                            {task.assignee_name}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                  {items.length === 0 && (
                    <button
                      onClick={() => openCreate(col.id)}
                      className="w-full rounded-xl border border-dashed border-white/10 py-6 text-xs text-white/40 hover:text-white/70 hover:border-white/25 transition"
                    >
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Design new onboarding flow"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Details, acceptance criteria, links…"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
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
                <Label>Priority</Label>
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
                <Label htmlFor="task-assignee">Assignee</Label>
                <Input
                  id="task-assignee"
                  value={draft.assignee_name}
                  onChange={(e) => setDraft((d) => ({ ...d, assignee_name: e.target.value }))}
                  placeholder="Name or email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due date</Label>
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
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Save" : "Create task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

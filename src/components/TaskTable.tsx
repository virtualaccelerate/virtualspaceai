import { memo, useMemo, useState } from "react";
import { ArrowUpDown, Flag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TableTaskStatus = "backlog" | "in_progress" | "review" | "done";
export type TableTaskPriority = "low" | "medium" | "high" | "urgent";

export type TableTask = {
  id: string;
  title: string;
  description: string | null;
  status: TableTaskStatus;
  priority: TableTaskPriority;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  created_at?: string | null;
  external_source?: string | null;
  external_url?: string | null;
};

type Column = { id: TableTaskStatus; label: string };

type SortKey = "title" | "status" | "priority" | "assignee" | "due" | "created";

const PRIORITY_ORDER: Record<TableTaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_STYLE: Record<TableTaskPriority, string> = {
  urgent: "text-rose-600 dark:text-rose-300 border-rose-500/40 bg-rose-500/10",
  high: "text-amber-600 dark:text-amber-300 border-amber-500/40 bg-amber-500/10",
  medium: "text-sky-600 dark:text-sky-300 border-sky-500/40 bg-sky-500/10",
  low: "text-muted-foreground border-border bg-muted/40",
};

const STATUS_STYLE: Record<TableTaskStatus, string> = {
  backlog: "border-border bg-muted/50 text-foreground/80",
  in_progress: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  review: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
};

function fmt(date: string | null | undefined, locale: string) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function TaskTableBase({
  tasks,
  columns,
  locale = "ru-RU",
  priorityLabel,
  onOpen,
  onMove,
  onDelete,
  labels,
}: {
  tasks: TableTask[];
  columns: Column[];
  locale?: string;
  priorityLabel: (p: TableTaskPriority) => string;
  onOpen: (task: TableTask) => void;
  onMove: (id: string, status: TableTaskStatus) => void;
  onDelete: (task: TableTask) => void;
  labels: {
    title: string;
    status: string;
    priority: string;
    assignee: string;
    due: string;
    created: string;
    empty: string;
  };
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "status", dir: 1 });

  const statusRank = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach((c, i) => (map[c.id] = i));
    return map;
  }, [columns]);

  const rows = useMemo(() => {
    const value = (t: TableTask): string | number => {
      switch (sort.key) {
        case "title":
          return t.title.toLowerCase();
        case "status":
          return statusRank[t.status] ?? 99;
        case "priority":
          return PRIORITY_ORDER[t.priority];
        case "assignee":
          return (t.assignee_name ?? "яя").toLowerCase();
        case "due":
          return t.due_date ? new Date(t.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        case "created":
          return t.created_at ? new Date(t.created_at).getTime() : 0;
      }
    };
    return [...tasks].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * sort.dir;
    });
  }, [tasks, sort, statusRank]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  const Head = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-3 py-2 text-left font-medium", className)}>
      <button
        onClick={() => toggleSort(k)}
        className={cn(
          "inline-flex items-center gap-1 text-xs uppercase tracking-wide transition",
          sort.key === k ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  if (!tasks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card/50">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <Head k="title" className="w-[38%]">{labels.title}</Head>
            <Head k="status">{labels.status}</Head>
            <Head k="priority">{labels.priority}</Head>
            <Head k="assignee">{labels.assignee}</Head>
            <Head k="due">{labels.due}</Head>
            <Head k="created">{labels.created}</Head>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => (
            <tr
              key={task.id}
              onClick={() => task.external_source && task.external_url ? window.open(task.external_url, "_blank", "noreferrer") : onOpen(task)}
              className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/30 transition-colors"
            >
              <td className="px-3 py-2.5">
                <p className="font-medium text-foreground leading-snug">{task.title}{task.external_source === "yougile" && <span className="ml-2 text-[10px] text-emerald-600">YouGile</span>}</p>
                {task.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                    STATUS_STYLE[task.status],
                  )}
                >
                  {columns.find((c) => c.id === task.status)?.label ?? task.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                    PRIORITY_STYLE[task.priority],
                  )}
                >
                  <Flag className="h-3 w-3" />
                  {priorityLabel(task.priority)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-foreground/80">{task.assignee_name ?? "—"}</td>
              <td className="px-3 py-2.5 text-foreground/80">{fmt(task.due_date, locale)}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{fmt(task.created_at, locale)}</td>
              <td className="px-2 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                {!task.external_source && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50">
                      •••
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {columns
                      .filter((c) => c.id !== task.status)
                      .map((c) => (
                        <DropdownMenuItem key={c.id} onClick={() => onMove(task.id, c.id)}>
                          {c.label}
                        </DropdownMenuItem>
                      ))}
                    <DropdownMenuItem
                      onClick={() => onDelete(task)}
                      className="text-rose-600 dark:text-rose-300"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const TaskTable = memo(TaskTableBase);

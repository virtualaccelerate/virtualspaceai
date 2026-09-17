import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { createTasksBulk, previewTasksFromTable } from "@/lib/task-import.functions";
import type { PreviewResult, PreviewRow } from "@/lib/task-import.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teamspaceId: string | null;
  onImported: () => void;
  /** Preselected source: a knowledge-base document or a Drive file. */
  source?: { document_id?: string; drive_file_id?: string; label?: string };
};

const STATUSES = ["backlog", "in_progress", "review", "done"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

export function TaskImportDialog({ open, onOpenChange, teamspaceId, onImported, source }: Props) {
  const { t } = useTranslation();
  const preview = useServerFn(previewTasksFromTable);
  const bulk = useServerFn(createTasksBulk);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);

  const reset = () => {
    setResult(null);
    setRows([]);
    setSheetUrl("");
  };

  const run = async (payload: Record<string, unknown>) => {
    if (!teamspaceId) {
      toast.error(t("app.import.noWorkspace", "No active workspace"));
      return;
    }
    setLoading(true);
    try {
      const res = (await preview({
        data: { teamspace_id: teamspaceId, ...payload },
      })) as PreviewResult;
      setResult(res);
      setRows(res.rows);
      if (res.rows.length === 0) {
        toast.error(t("app.import.noRows", "No task rows found — check the column headers."));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    await run({ file_base64: toBase64(buf), file_name: file.name });
  };

  const patch = (i: number, p: Partial<PreviewRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const selected = rows.filter((r) => r.include);

  const create = async () => {
    if (!teamspaceId || selected.length === 0) return;
    setCreating(true);
    try {
      const res = await bulk({
        data: {
          teamspace_id: teamspaceId,
          rows: selected.map((r) => ({
            title: r.title,
            description: r.description ?? null,
            status: r.status,
            priority: r.priority,
            assignee_id: r.assignee_id ?? null,
            assignee_raw: r.assignee_id ? null : r.assignee_raw ?? null,
            due_date: r.due_date ?? null,
          })),
        },
      });
      toast.success(
        `${t("app.import.done", "Created")}: ${res.created.length}` +
          (res.failed.length ? ` · ${t("app.import.failed", "skipped")}: ${res.failed.length}` : "") +
          (res.pending_members.length
            ? ` · ${t("app.import.pendingAdded", "added to the team")}: ${res.pending_members.join(", ")}`
            : ""),
      );
      onImported();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("app.import.title", "Import tasks from a table")}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(
                "app.import.hint",
                "Upload an Excel or CSV file, or paste a Google Sheet link. Columns are recognised automatically: title, description, priority, status, due date, assignee.",
              )}
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="w-full rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 transition p-8 flex flex-col items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
              <span className="text-sm font-medium text-foreground">
                {t("app.import.choose", "Choose a file")}
              </span>
              <span className="text-xs text-muted-foreground">xlsx, xlsm, csv</span>
            </button>

            <div className="flex items-center gap-2">
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
              />
              <Button
                variant="outline"
                disabled={loading || !sheetUrl.trim()}
                onClick={() => run({ sheet_url: sheetUrl.trim() })}
              >
                {t("app.import.read", "Read")}
              </Button>
            </div>

            {source && (source.document_id || source.drive_file_id) && (
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={loading}
                onClick={() => run(source)}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {source.label ?? t("app.import.fromFile", "Import from the attached file")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {t("app.import.found", "Found rows")}: {rows.length}
                {result.sheets.length > 0 && ` · ${result.sheets.join(", ")}`}
                {result.skipped > 0 && ` · ${t("app.import.skippedRows", "skipped")}: ${result.skipped}`}
                {` · ${t("app.import.selectedCount", "selected")}: ${selected.length}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = selected.length !== rows.length;
                  setRows((prev) => prev.map((r) => ({ ...r, include: next })));
                }}
              >
                {selected.length === rows.length
                  ? t("app.import.deselectAll", "Deselect all")
                  : t("app.import.selectAll", "Select all")}
              </Button>
            </div>

            <div className="rounded-xl border border-border divide-y divide-border">
              {rows.map((r, i) => (
                <div
                  key={`${r.sheet}-${r.row_number}-${i}`}
                  className={cn("p-3 space-y-2", !r.include && "opacity-50")}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => patch(i, { include: e.target.checked })}
                      className="mt-1 h-4 w-4 accent-[var(--primary)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground break-words">{r.title}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>
                      )}
                      {r.duplicate && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                          {t("app.import.duplicate", "A task with this title already exists")}
                        </div>
                      )}
                      {r.assignee_raw && !r.assignee_matched && !r.assignee_id && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                          {t("app.import.willCreateMember", "Will be added to the team as")}: {r.assignee_raw}
                          {" — "}
                          {t("app.import.addEmailLater", "add the email on the Team page")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pl-6">
                    <Select value={r.status} onValueChange={(v) => patch(i, { status: v as PreviewRow["status"] })}>
                      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{t(`app.tasks.status.${s}`, s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={r.priority} onValueChange={(v) => patch(i, { priority: v as PreviewRow["priority"] })}>
                      <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{t(`app.tasks.priority.${p}`, p)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={r.assignee_id ?? "none"}
                      onValueChange={(v) => patch(i, { assignee_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("app.import.unassigned", "No assignee")}</SelectItem>
                        {result.members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={r.due_date ?? ""}
                      onChange={(e) => patch(i, { due_date: e.target.value || null })}
                      className="h-8 w-[150px] text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {result && (
            <Button variant="ghost" onClick={reset} disabled={creating}>
              {t("app.import.back", "Choose another file")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={create} disabled={!result || creating || selected.length === 0}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("app.import.create", "Create tasks")}
            {selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

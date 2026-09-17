import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import {
  loadPendingMembers,
  removePendingMember,
  savePendingMemberEmail,
} from "@/lib/pending-members.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = Awaited<ReturnType<typeof loadPendingMembers>>[number];

/** People taken from an imported table who have no account yet — the owner fills in their email. */
export default function PendingMembers({ teamspaceId }: { teamspaceId?: string }) {
  const { t } = useTranslation();
  const load = useServerFn(loadPendingMembers);
  const save = useServerFn(savePendingMemberEmail);
  const drop = useServerFn(removePendingMember);

  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (id: string) => {
    const res = await load({ data: { teamspace_id: id } });
    setRows(res);
    setDrafts(Object.fromEntries(res.map((r) => [r.id, r.email ?? ""])));
  };

  useEffect(() => {
    if (!teamspaceId) { setLoading(false); return; }
    setLoading(true);
    refresh(teamspaceId).catch(() => {}).finally(() => setLoading(false));
  }, [teamspaceId]);

  if (loading || !teamspaceId || rows.length === 0) return null;

  const onSave = async (row: Row) => {
    setBusy(row.id);
    try {
      await save({ data: { id: row.id, email: drafts[row.id]?.trim() || null } });
      await refresh(teamspaceId);
      toast.success(t("app.team.pending.saved", "Сохранено"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (row: Row) => {
    setBusy(row.id);
    try {
      await drop({ data: { id: row.id } });
      await refresh(teamspaceId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="flex items-center gap-2 p-4 border-b border-[color:var(--border)]">
        <UserPlus className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">{t("app.team.pending.title", "Добавлены из таблицы")}</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {t("app.team.pending.hint", "Укажите почту — человек станет участником и получит свои задачи.")}
          </p>
        </div>
      </div>
      <div className="divide-y divide-[color:var(--border)]">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-semibold">
              {r.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{r.name}</div>
              <div className="text-xs text-[color:var(--muted-foreground)]">
                {t("app.team.open", "Активных")}: {r.open_tasks} · {t("app.team.done", "Готово")}: {r.done_tasks}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[color:var(--muted-foreground)]" />
              <Input
                type="email"
                value={drafts[r.id] ?? ""}
                placeholder="name@company.com"
                onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: e.target.value }))}
                className="h-9 w-[220px] text-sm"
              />
              <Button size="sm" disabled={busy === r.id} onClick={() => onSave(r)}>
                {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save", "Сохранить")}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => onDelete(r)} aria-label="delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

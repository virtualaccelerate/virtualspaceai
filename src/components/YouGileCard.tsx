import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { configureYouGile, connectYouGile, disconnectYouGile, getYouGileStatus, syncYouGile } from "@/lib/yougile.functions";

type Item = { id: string; title?: string; name?: string; email?: string; boardId?: string };
type Member = { id: string; full_name: string | null; email: string | null };
type Status = "backlog" | "in_progress" | "review" | "done";

export function YouGileCard() {
  const statusFn = useServerFn(getYouGileStatus);
  const connectFn = useServerFn(connectYouGile);
  const configureFn = useServerFn(configureYouGile);
  const syncFn = useServerFn(syncYouGile);
  const disconnectFn = useServerFn(disconnectYouGile);
  const [teamspaceId, setTeamspaceId] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [key, setKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [columnMap, setColumnMap] = useState<Record<string, Status>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (id: string) => {
    const next = await statusFn({ data: { teamspace_id: id } });
    setState(next);
    setProjectId(next.project_id ?? "");
    setColumnMap(next.column_map ?? {});
    setUserMap(next.user_map ?? {});
  };

  useEffect(() => {
    void getActiveTeamspaceId().then((id) => {
      setTeamspaceId(id);
      if (id) void load(id).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    });
  }, []);

  const columns = (state?.columns ?? []) as Item[];
  const users = (state?.users ?? []) as Item[];
  const members = (state?.members ?? []) as Member[];
  const project = useMemo(() => ((state?.projects ?? []) as Item[]).find((item) => item.id === projectId), [state, projectId]);

  async function run(action: () => Promise<unknown>) {
    if (!teamspaceId) return;
    setBusy(true);
    setError(null);
    try { await action(); await load(teamspaceId); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 font-bold text-emerald-600">Y</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-foreground">YouGile {state?.connected && <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> Подключено</span>}</div>
          <p className="text-xs text-muted-foreground">Источник задач для уведомлений и отчётов</p>
        </div>
        {state?.connected && <Button variant="ghost" size="icon" disabled={busy} onClick={() => run(() => syncFn({ data: { teamspace_id: teamspaceId ?? "" } }))} title="Синхронизировать"><RefreshCw className="h-4 w-4" /></Button>}
      </div>

      {!state?.connected ? (
        <div className="flex gap-2">
          <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="API-ключ YouGile" />
          <Button disabled={busy || !key.trim() || !teamspaceId} onClick={() => run(() => connectFn({ data: { teamspace_id: teamspaceId ?? "", api_key: key.trim() } }))}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Подключить</Button>
        </div>
      ) : (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label>Проект YouGile</Label>
            <Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Выберите один проект" /></SelectTrigger><SelectContent>{((state.projects ?? []) as Item[]).map((item) => <SelectItem key={item.id} value={item.id}>{item.title ?? item.name ?? item.id}</SelectItem>)}</SelectContent></Select>
          </div>
          {projectId && columns.length > 0 && <div className="space-y-2"><Label>Колонки и статусы</Label>{columns.map((column) => <div key={column.id} className="grid grid-cols-[1fr_180px] items-center gap-2"><span className="truncate text-sm text-foreground">{column.title ?? column.name ?? column.id}</span><Select value={columnMap[column.id] ?? "backlog"} onValueChange={(value) => setColumnMap((old) => ({ ...old, [column.id]: value as Status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="backlog">К выполнению</SelectItem><SelectItem value="in_progress">В работе</SelectItem><SelectItem value="review">На проверке</SelectItem><SelectItem value="done">Готово</SelectItem></SelectContent></Select></div>)}</div>}
          {projectId && users.length > 0 && <div className="space-y-2"><Label>Сотрудники</Label>{users.map((user) => <div key={user.id} className="grid grid-cols-[1fr_180px] items-center gap-2"><span className="truncate text-sm text-foreground">{user.name ?? user.email ?? user.id}</span><Select value={userMap[user.id] ?? "skip"} onValueChange={(value) => setUserMap((old) => ({ ...old, [user.id]: value === "skip" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Не сопоставлен" /></SelectTrigger><SelectContent><SelectItem value="skip">Не сопоставлен</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name || member.email || member.id}</SelectItem>)}</SelectContent></Select></div>)}</div>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !projectId} onClick={() => run(() => configureFn({ data: { teamspace_id: teamspaceId ?? "", project_id: projectId, project_name: project?.title ?? project?.name ?? projectId, column_map: columnMap, user_map: Object.fromEntries(Object.entries(userMap).filter(([, value]) => value)) } }))}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Сохранить и синхронизировать</Button>
            <Button variant="outline" disabled={busy} onClick={() => run(() => disconnectFn({ data: { teamspace_id: teamspaceId ?? "" } }))}><Unplug className="h-4 w-4" /> Отключить</Button>
          </div>
          {state.last_sync_at && <p className="text-xs text-muted-foreground">Последняя синхронизация: {new Date(state.last_sync_at).toLocaleString()}</p>}
        </div>
      )}
      {(error || state?.last_error) && <p className="text-sm text-destructive">{error || state.last_error}</p>}
    </div>
  );
}
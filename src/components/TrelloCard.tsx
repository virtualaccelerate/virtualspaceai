import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { configureTrello, connectTrello, disconnectTrello, getTrelloStatus, inspectTrelloBoard, syncTrello } from "@/lib/trello.functions";

type Item = { id: string; name?: string; fullName?: string; username?: string; email?: string };
type Member = { id: string; full_name: string | null; email: string | null };
type Status = "backlog" | "in_progress" | "review" | "done";

export function TrelloCard() {
  const { t } = useTranslation();
  const statusFn = useServerFn(getTrelloStatus);
  const connectFn = useServerFn(connectTrello);
  const inspectFn = useServerFn(inspectTrelloBoard);
  const configureFn = useServerFn(configureTrello);
  const syncFn = useServerFn(syncTrello);
  const disconnectFn = useServerFn(disconnectTrello);

  const [teamspaceId, setTeamspaceId] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [key, setKey] = useState("");
  const [token, setToken] = useState("");
  const [boardId, setBoardId] = useState("");
  const [columnMap, setColumnMap] = useState<Record<string, Status>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (id: string) => {
    const next = await statusFn({ data: { teamspace_id: id } });
    setState(next);
    setBoardId(next.board_id ?? "");
    setColumnMap(next.column_map ?? {});
    setUserMap(next.user_map ?? {});
  };

  useEffect(() => {
    void getActiveTeamspaceId().then((id) => {
      setTeamspaceId(id);
      if (id) void load(id).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    });
  }, []);

  const lists = (state?.lists ?? []) as Item[];
  const trelloMembers = (state?.members ?? []) as Item[];
  const team = (state?.team ?? []) as Member[];
  const board = useMemo(() => ((state?.boards ?? []) as Item[]).find((item) => item.id === boardId), [state, boardId]);

  async function run(action: () => Promise<unknown>) {
    if (!teamspaceId) return;
    setBusy(true);
    setError(null);
    try { await action(); await load(teamspaceId); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  // Inspect-only: does NOT refetch persisted status afterwards, so the
  // just-selected board's lists/members aren't clobbered by a stale load().
  async function runInspect(action: () => Promise<unknown>) {
    if (!teamspaceId) return;
    setBusy(true);
    setError(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-500/10 font-bold text-blue-600">T</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            Trello
            {state?.connected && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <Check className="h-3 w-3" /> {t("app.integrations.trello.connected", "Подключено")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("app.integrations.trello.desc", "Источник задач для уведомлений и отчётов")}</p>
        </div>
        {state?.connected && (
          <Button variant="ghost" size="icon" disabled={busy} onClick={() => run(() => syncFn({ data: { teamspace_id: teamspaceId ?? "" } }))} title={t("app.integrations.trello.sync", "Синхронизировать")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!state?.connected ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={t("app.integrations.trello.apiKey", "API-ключ Trello")} />
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={t("app.integrations.trello.apiToken", "Токен Trello")} />
          </div>
          <Button disabled={busy || !key.trim() || !token.trim() || !teamspaceId} onClick={() => run(() => connectFn({ data: { teamspace_id: teamspaceId ?? "", api_key: key.trim(), api_token: token.trim() } }))}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t("app.integrations.trello.connect", "Подключить")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("app.integrations.trello.hint", "Ключ и токен создаются на trello.com/power-ups/admin — мы храним их в зашифрованном виде и не показываем.")}</p>
        </div>
      ) : (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label>{t("app.integrations.trello.board", "Доска Trello")}</Label>
            <Select value={boardId} onValueChange={(value) => {
              setBoardId(value);
              if (teamspaceId) void runInspect(async () => {
                const structure = await inspectFn({ data: { teamspace_id: teamspaceId, board_id: value } });
                setState((old: any) => ({ ...old, ...structure }));
              });
            }}>
              <SelectTrigger><SelectValue placeholder={t("app.integrations.trello.chooseBoard", "Выберите одну доску")} /></SelectTrigger>
              <SelectContent>{((state.boards ?? []) as Item[]).map((item) => <SelectItem key={item.id} value={item.id}>{item.name ?? item.id}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {boardId && lists.length > 0 && (
            <div className="space-y-2">
              <Label>{t("app.integrations.trello.lists", "Списки и статусы")}</Label>
              {lists.map((list) => (
                <div key={list.id} className="grid grid-cols-[1fr_180px] items-center gap-2">
                  <span className="truncate text-sm text-foreground">{list.name ?? list.id}</span>
                  <Select value={columnMap[list.id] ?? "backlog"} onValueChange={(value) => setColumnMap((old) => ({ ...old, [list.id]: value as Status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">{t("app.integrations.trello.todo", "К выполнению")}</SelectItem>
                      <SelectItem value="in_progress">{t("app.integrations.trello.progress", "В работе")}</SelectItem>
                      <SelectItem value="review">{t("app.integrations.trello.review", "На проверке")}</SelectItem>
                      <SelectItem value="done">{t("app.integrations.trello.done", "Готово")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {boardId && trelloMembers.length > 0 && (
            <div className="space-y-2">
              <Label>{t("app.integrations.trello.users", "Сотрудники")}</Label>
              {trelloMembers.map((user) => (
                <div key={user.id} className="grid grid-cols-[1fr_180px] items-center gap-2">
                  <span className="truncate text-sm text-foreground">{user.fullName || user.username || user.email || user.id}</span>
                  <Select value={userMap[user.id] || "skip"} onValueChange={(value) => setUserMap((old) => ({ ...old, [user.id]: value === "skip" ? "" : value }))}>
                    <SelectTrigger><SelectValue placeholder={t("app.integrations.trello.unmatched", "Не сопоставлен")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t("app.integrations.trello.unmatched", "Не сопоставлен")}</SelectItem>
                      {team.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name || member.email || member.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !boardId} onClick={() => run(() => configureFn({ data: { teamspace_id: teamspaceId ?? "", board_id: boardId, board_name: board?.name ?? boardId, column_map: columnMap, user_map: Object.fromEntries(Object.entries(userMap).filter(([, value]) => value)) } }))}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t("app.integrations.trello.save", "Сохранить и синхронизировать")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => run(() => disconnectFn({ data: { teamspace_id: teamspaceId ?? "" } }))}>
              <Unplug className="h-4 w-4" /> {t("app.integrations.trello.disconnect", "Отключить")}
            </Button>
          </div>
          {state.last_sync_at && <p className="text-xs text-muted-foreground">{t("app.integrations.trello.lastSync", "Последняя синхронизация")}: {new Date(state.last_sync_at).toLocaleString()}</p>}
        </div>
      )}
      {(error || state?.last_error) && <p className="text-sm text-destructive">{error || state.last_error}</p>}
    </div>
  );
}

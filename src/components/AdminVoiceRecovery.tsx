import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminListVoicePauses, adminResumeVoice } from "@/lib/admin.functions";

type Pause = Awaited<ReturnType<typeof adminListVoicePauses>>[number];
export function AdminVoiceRecovery() {
  const { i18n } = useTranslation();
  const ru = i18n.language !== "en";
  const load = useServerFn(adminListVoicePauses);
  const resume = useServerFn(adminResumeVoice);
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const refresh = async () => {
    setLoading(true);
    try { setPauses(await load()); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  return <section className="mb-6 border-b border-border pb-6 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Mic className="size-4" />{ru ? "Доступ к голосовому вводу" : "Voice input access"}</h2>
      <Button variant="ghost" size="icon" aria-label={ru ? "Обновить доступ к голосу" : "Refresh voice access"} disabled={loading || Boolean(busy)} onClick={() => { setError(null); void refresh(); }}><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="text-sm text-primary">{ru ? "Пауза снята. Начните новую запись; старые записи не отправляются повторно." : "Pause cleared. Start a new recording; previous recordings are not replayed."}</p>}
    {!loading && !pauses.length && <p className="text-sm text-muted-foreground">{ru ? "Голосовой ввод не приостановлен." : "Voice input is not paused."}</p>}
    {pauses.map(pause => <div key={pause.pause_token} className="space-y-2 border-l-2 border-destructive pl-4">
      <p className="text-sm font-medium break-words">{pause.model} · {pause.status}</p>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{pause.reason}</p>
      {pause.pause_kind !== "workspace" && <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 accent-primary" checked={Boolean(confirmed[pause.pause_token])} onChange={e => setConfirmed(prev => ({ ...prev, [pause.pause_token]: e.target.checked }))} />
        <span>{ru ? "Подтверждаю: доступ к этой модели восстановлен. Автоматическая проверка не выполняется." : "I confirm access to this model has been restored. No automatic probe will be sent."}</span>
      </label>}
      <Button variant="outline" size="sm" disabled={Boolean(busy) || (pause.pause_kind !== "workspace" && !confirmed[pause.pause_token])} onClick={async () => {
        setBusy(pause.model); setError(null); setSuccess(false);
        try { await resume({ data: { model: pause.model, pause_token: pause.pause_token, confirmed: Boolean(confirmed[pause.pause_token]) } }); setSuccess(true); }
        catch (e) { setError(e instanceof Error ? e.message : "Error"); }
        finally { await refresh(); setBusy(null); }
      }}>{busy === pause.model ? <Loader2 className="animate-spin" /> : <RefreshCw />}{pause.pause_kind === "workspace" ? (ru ? "Проверить и восстановить" : "Check and restore") : (ru ? "Возобновить после восстановления доступа" : "Resume after restoring access")}</Button>
    </div>)}
  </section>;
}
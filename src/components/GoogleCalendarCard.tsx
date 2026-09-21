import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, RefreshCw, Unplug, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { completeGoogleCalendarConnect, googleCalendarDisconnect, googleCalendarList, googleCalendarSelect, googleCalendarStatus, googleCalendarSync, startGoogleCalendarConnect } from "@/lib/google-calendar.functions";

type Calendar = { id: string; summary: string; primary?: boolean };
function waitForOAuth(popup: Window) {
  return new Promise<string>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => { window.removeEventListener("message", onMessage); if (poll) window.clearInterval(poll); };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popup || event.data?.connectorId !== "google_calendar") return;
      cleanup();
      if (event.data?.type === "appUserConnectorOAuthComplete" && typeof event.data?.code === "string") resolve(event.data.code);
      else reject(new Error("OAuth connection failed"));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error("OAuth window was closed")); } }, 500);
  });
}
export function GoogleCalendarCard() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof googleCalendarStatus>> | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { const next = await googleCalendarStatus(); setStatus(next); if (next.connected) setCalendars(await googleCalendarList()); };
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : String(e))); }, []);
  const connect = async () => {
    const popup = window.open("", "google-calendar-oauth", "width=600,height=740");
    if (!popup) return setError(t("integrationsUi.popupBlocked", "Please allow pop-ups and try again."));
    setBusy(true); setError(null);
    try { const { authorizationUrl } = await startGoogleCalendarConnect(); const waiting = waitForOAuth(popup); popup.location.href = authorizationUrl; const code = await waiting; await completeGoogleCalendarConnect({ data: { code } }); await load(); }
    catch (e) { popup.close(); setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const sync = async () => { setBusy(true); setError(null); try { await googleCalendarSync(); await load(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  const disconnect = async () => { setBusy(true); try { await googleCalendarDisconnect(); setCalendars([]); await load(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  return <div className="glass-strong rounded-2xl border border-border p-4 space-y-4">
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><CalendarDays className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-semibold text-foreground">Google Calendar</span>{status?.connected && <span className="text-[10px] text-primary inline-flex items-center gap-1"><Check className="h-3 w-3" />{t("integrationsUi.connected", "Connected")}</span>}</div><p className="text-xs text-muted-foreground mt-1">{status?.email ?? t("integrationsUi.calendarDescription", "Tasks with deadlines and meetings in your personal calendar")}</p></div>
      {!status?.connected && <Button size="sm" disabled={busy} onClick={() => void connect()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("integrationsUi.connect", "Connect")}</Button>}
    </div>
    {status?.connected && <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <Select value={status.calendarId} onValueChange={(id) => { const item = calendars.find((x) => x.id === id); if (!item) return; setBusy(true); googleCalendarSelect({ data: { calendarId: id, name: item.summary } }).then(load).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setBusy(false)); }}>
        <SelectTrigger><SelectValue placeholder={t("integrationsUi.chooseCalendar", "Choose calendar")} /></SelectTrigger>
        <SelectContent>{calendars.map((calendar) => <SelectItem key={calendar.id} value={calendar.id}>{calendar.summary}{calendar.primary ? ` (${t("integrationsUi.primary", "Primary")})` : ""}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => void sync()}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />{t("integrationsUi.sync", "Sync")}</Button><Button variant="ghost" size="icon" disabled={busy} onClick={() => void disconnect()} title={t("integrationsUi.disconnect", "Disconnect")}><Unplug className="h-4 w-4" /></Button></div>
      <div className="text-[11px] text-muted-foreground sm:col-span-2">{status.lastSyncAt ? `${t("integrationsUi.lastSync", "Last sync")}: ${new Date(status.lastSyncAt).toLocaleString(i18n.language)}` : t("integrationsUi.notSynced", "Not synchronized yet")}</div>
    </div>}
    {(error || status?.lastError) && <div className="flex gap-2 text-xs text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{(error || status?.lastError)?.replace("GOOGLE_CALENDAR_RECONNECT_REQUIRED", t("integrationsUi.reconnectRequired", "Access expired. Please reconnect."))}</span></div>}
  </div>;
}

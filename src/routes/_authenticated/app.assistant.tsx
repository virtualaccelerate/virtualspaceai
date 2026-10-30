import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, MessageCircle, Send } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionConfirm } from "@/components/ui/action-confirm";
import { GoogleCalendarCard } from "@/components/GoogleCalendarCard";
import mascot from "@/assets/viey-mascot.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { deleteReminderSource, getMyAssistant, proposeReminderSource, saveMyAssistant } from "@/lib/assistant.functions";
import { googleCalendarStatus } from "@/lib/google-calendar.functions";
import { ReminderMapping, ReminderPreview, type Proposal } from "@/components/assistant/ReminderTools";
import { useOpenAssistantChat } from "@/components/assistant/AssistantHero";
import type { TabMap } from "@/lib/reminders-core";

export const Route = createFileRoute("/_authenticated/app/assistant")({
  validateSearch: (s) => z.object({ onboard: z.coerce.number().optional() }).parse(s),
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "Персональный ассистент Виэй — Virtual Space" },
      { name: "description", content: "Настройка персонального ассистента Виэй: имя, навыки, сервисы и напоминания клиентам." },
      { property: "og:title", content: "Персональный ассистент Виэй — Virtual Space" },
      { property: "og:description", content: "Виэй помогает с задачами, встречами и клиентами." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const SKILLS = ["meetings", "calendar", "tasks", "agreements", "clients", "reminders"] as const;
const SOON_SKILLS = ["mail", "proposals"] as const;
type Source = { id: string; sheet_url: string; title: string | null; tabs: unknown; column_map: unknown; last_error: string | null; last_checked_at: string | null };
type Assistant = { id: string; name: string; skills: string[] };

function Bubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <img src={mascot.url} alt="Виэй" className="h-9 w-9 rounded-full bg-primary/15 object-contain p-0.5 shrink-0" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-card border border-border px-4 py-2.5 text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}
function Mine({ children }: { children: ReactNode }) {
  return <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-sm">{children}</div></div>;
}
const chip = (on: boolean, disabled = false) =>
  `rounded-full border px-3.5 py-2 text-sm text-left transition ${disabled ? "opacity-50 cursor-not-allowed border-dashed border-border text-muted-foreground" : on ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card text-foreground hover:border-primary/60"}`;

function AssistantPage() {
  const { t } = useTranslation();
  const { onboard } = Route.useSearch();
  const getA = useServerFn(getMyAssistant);
  const [teamspaceId, setTeamspaceId] = useState<string | null>(null);
  const [userFirst, setUserFirst] = useState("");
  const [data, setData] = useState<{ assistant: Assistant | null; sources: Source[] } | null>(null);
  const load = async (ts: string) => setData(await getA({ data: { teamspace_id: ts } }) as { assistant: Assistant | null; sources: Source[] });
  useEffect(() => {
    (async () => {
      const ts = await getActiveTeamspaceId();
      setTeamspaceId(ts);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", u.user.id).maybeSingle();
        setUserFirst((p?.full_name || u.user.email || "").split(/[\s@]/)[0]);
      }
      if (ts) await load(ts);
    })().catch(() => setData({ assistant: null, sources: [] }));
  }, []);

  if (!teamspaceId && data) return <p className="text-sm text-muted-foreground">{t("assistantUi.noWorkspace")}</p>;
  if (!data || !teamspaceId) return <div className="h-40 animate-pulse rounded-3xl bg-muted/40 max-w-3xl mx-auto" />;
  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      <Link to="/app/agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" />{t("app.agents.title", "AI Agents")}</Link>
      {!data.assistant || onboard
        ? <Onboarding teamspaceId={teamspaceId} userFirst={userFirst} initial={data.assistant} onChange={() => load(teamspaceId)} />
        : <Settings teamspaceId={teamspaceId} assistant={data.assistant} sources={data.sources} reload={() => load(teamspaceId)} />}
    </div>
  );
}

function Onboarding({ teamspaceId, userFirst, initial, onChange }: { teamspaceId: string; userFirst: string; initial: Assistant | null; onChange: () => void }) {
  const { t } = useTranslation();
  const save = useServerFn(saveMyAssistant);
  const propose = useServerFn(proposeReminderSource);
  const calStatus = useServerFn(googleCalendarStatus);
  const openChat = useOpenAssistantChat();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [custom, setCustom] = useState("");
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [calendar, setCalendar] = useState<boolean | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [step, proposal]);
  useEffect(() => { if (step === 3) calStatus().then((s) => setCalendar(!!s.connected)).catch(() => setCalendar(false)); }, [step, calStatus, showCal]);

  const pickName = (n: string) => { if (!n.trim()) return; setName(n.trim()); setStep(2); };
  const wantsSheets = skills.includes("reminders");
  const finishServices = async () => {
    setBusy(true); setError(null);
    try {
      await save({ data: { teamspace_id: teamspaceId, name, skills } });
      if (wantsSheets && sheetUrl.trim()) {
        setStep(4);
        setProposal(await propose({ data: { teamspace_id: teamspaceId, sheet_url: sheetUrl.trim() } }) as Proposal);
      } else { setStep(5); onChange(); }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const services: { key: string; state: "on" | "builtin" | "soon" | "connect" | "sheet" }[] = [
    { key: "calendar", state: calendar ? "on" : "connect" },
    { key: "tasks", state: "builtin" },
    { key: "clients", state: "builtin" },
    ...(wantsSheets ? [{ key: "sheets", state: "sheet" as const }] : []),
    { key: "gmail", state: "soon" },
    { key: "slack", state: "soon" },
  ];

  return (
    <div className="rounded-3xl border border-border bg-gradient-to-b from-primary/10 to-background p-4 sm:p-6 space-y-3">
      <Bubble>{t("assistantUi.s1")}</Bubble>
      {step === 1 ? (
        <div className="pl-11 space-y-2">
          <div className="flex flex-wrap gap-2">
            {["Виэй", "Ассистент", "Помощник"].map((n, i) => (
              <button key={n} onClick={() => pickName(n)} className={chip(false)}><span className="text-muted-foreground mr-1.5">{"ABC"[i]}</span>{n}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); pickName(custom); }} className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} placeholder={t("assistantUi.namePlaceholder")} />
            <Button type="submit" size="icon" aria-label={t("assistantUi.send")} disabled={!custom.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      ) : <Mine>{name}</Mine>}

      {step >= 2 && (
        <>
          <Bubble>{t("assistantUi.s2a", { name, user: userFirst || t("assistantUi.you") })}</Bubble>
          <Bubble>{t("assistantUi.s2b")}</Bubble>
          {step === 2 ? (
            <div className="pl-11 space-y-3">
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s) => {
                  const on = skills.includes(s);
                  return <button key={s} aria-pressed={on} onClick={() => setSkills((x) => on ? x.filter((y) => y !== s) : [...x, s])} className={chip(on)}>{on && <Check className="inline h-3.5 w-3.5 mr-1 text-primary" />}{t(`assistantUi.skills.${s}`)}</button>;
                })}
                {SOON_SKILLS.map((s) => <button key={s} disabled className={chip(false, true)}>{t(`assistantUi.skills.${s}`)} · {t("assistantUi.soon")}</button>)}
              </div>
              <Button disabled={!skills.length} onClick={() => setStep(3)}>{t("assistantUi.next")}</Button>
            </div>
          ) : <Mine>{skills.map((s) => t(`assistantUi.skills.${s}`)).join(" · ")}</Mine>}
        </>
      )}

      {step >= 3 && (
        <>
          <Bubble>{t("assistantUi.s3")}</Bubble>
          <div className={`pl-11 space-y-2 ${step > 3 ? "opacity-70 pointer-events-none" : ""}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {services.map(({ key, state }) => {
                const [title, desc] = t(`assistantUi.services.${key}`, { returnObjects: true }) as unknown as [string, string];
                return (
                  <div key={key} className={`rounded-2xl border bg-card p-3 ${state === "sheet" ? "sm:col-span-2" : ""} ${state === "soon" ? "border-dashed opacity-60" : "border-border"}`}>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1"><div className="text-sm font-medium text-foreground">{title}</div><div className="text-[11px] text-muted-foreground">{desc}</div></div>
                      {state === "on" && <span className="text-xs text-primary inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" />{t("assistantUi.connected")}</span>}
                      {state === "builtin" && <span className="text-xs text-primary inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" />{t("assistantUi.builtIn")}</span>}
                      {state === "soon" && <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{t("assistantUi.soon")}</span>}
                      {state === "connect" && <Button size="sm" variant="outline" onClick={() => setShowCal((v) => !v)}>{t("assistantUi.connect")}</Button>}
                    </div>
                    {state === "sheet" && <Input className="mt-2" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder={t("assistantUi.sheetPlaceholder")} />}
                  </div>
                );
              })}
            </div>
            {showCal && !calendar && <GoogleCalendarCard />}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {step === 3 && <Button loading={busy} onClick={finishServices}>{t("assistantUi.next")}</Button>}
          </div>
        </>
      )}

      {step >= 4 && (
        <>
          <Bubble>{proposal ? t("assistantUi.s4") : t("assistantUi.reading")}</Bubble>
          {step === 4 && proposal && <div className="pl-11"><ReminderMapping teamspaceId={teamspaceId} sheetUrl={sheetUrl.trim()} proposal={proposal} onSaved={() => { setStep(5); onChange(); }} /></div>}
          {step === 4 && error && <p className="pl-11 text-xs text-destructive">{error}</p>}
        </>
      )}

      {step === 5 && (
        <>
          <Bubble><b>{t("assistantUi.s5", { name })}</b></Bubble>
          <Bubble>{t("assistantUi.intro1")}</Bubble>
          <Bubble>{t("assistantUi.intro2")}</Bubble>
          <Bubble>{t("assistantUi.intro3")}</Bubble>
          <div className="pl-11 flex flex-wrap gap-2">
            <Button loading={busy} onClick={async () => { setBusy(true); try { await openChat(teamspaceId, name); } finally { setBusy(false); } }}><MessageCircle className="h-4 w-4" />{t("assistantUi.openChat")}</Button>
            <Button variant="ghost" asChild><Link to="/app/assistant" search={{}}>{t("assistantUi.settings")}</Link></Button>
          </div>
        </>
      )}
      <div ref={end} />
    </div>
  );
}

function Settings({ teamspaceId, assistant, sources, reload }: { teamspaceId: string; assistant: Assistant; sources: Source[]; reload: () => Promise<void> }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const save = useServerFn(saveMyAssistant);
  const propose = useServerFn(proposeReminderSource);
  const del = useServerFn(deleteReminderSource);
  const openChat = useOpenAssistantChat();
  const [name, setName] = useState(assistant.name);
  const [skills, setSkills] = useState(assistant.skills);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [editing, setEditing] = useState<{ url: string; proposal: Proposal; existing?: { id: string; tabs: string[]; column_map: Record<string, TabMap> } } | null>(null);
  const [loadingSheet, setLoadingSheet] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const openMapping = async (url: string, existing?: Source) => {
    setLoadingSheet(existing?.id ?? "new"); setError(null);
    try {
      const proposal = await propose({ data: { teamspace_id: teamspaceId, sheet_url: url } }) as Proposal;
      setEditing({ url, proposal, existing: existing ? { id: existing.id, tabs: existing.tabs as string[], column_map: existing.column_map as Record<string, TabMap> } : undefined });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoadingSheet(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5">
        <img src={mascot.url} alt="Виэй" className="h-20 w-20 object-contain" />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-foreground">{t("assistantUi.settingsTitle")}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" loading={opening} onClick={async () => { setOpening(true); try { await openChat(teamspaceId, assistant.name); } finally { setOpening(false); } }}><MessageCircle className="h-4 w-4" />{t("assistantUi.openChat")}</Button>
            <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/app/assistant", search: { onboard: 1 } })}>{t("assistantUi.restart")}</Button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <label className="block text-xs text-muted-foreground">{t("assistantUi.name")}
          <Input className="mt-1" value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </label>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => { const on = skills.includes(s); return <button key={s} aria-pressed={on} onClick={() => { setSkills((x) => on ? x.filter((y) => y !== s) : [...x, s]); setSaved(false); }} className={chip(on)}>{t(`assistantUi.skills.${s}`)}</button>; })}
          {SOON_SKILLS.map((s) => <button key={s} disabled className={chip(false, true)}>{t(`assistantUi.skills.${s}`)} · {t("assistantUi.soon")}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <Button loading={saving} disabled={!name.trim()} onClick={async () => { setSaving(true); try { await save({ data: { teamspace_id: teamspaceId, name, skills } }); await reload(); setSaved(true); } finally { setSaving(false); } }}>{t("assistantUi.save")}</Button>
          {saved && <span className="text-xs text-primary">{t("assistantUi.saved")}</span>}
        </div>
      </section>

      {skills.includes("reminders") && (
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-display text-lg text-foreground">{t("assistantUi.sources")}</h2>
          {sources.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <a href={s.sheet_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground hover:underline">{s.title || s.sheet_url}</a>
                <div className="text-[11px] text-muted-foreground truncate">{(s.tabs as string[]).join(" · ")}</div>
                {s.last_error && <div className="text-[11px] text-destructive">{t("assistantUi.lastError", { e: s.last_error })}</div>}
              </div>
              <Button size="sm" variant="outline" loading={loadingSheet === s.id} onClick={() => openMapping(s.sheet_url, s)}>{t("assistantUi.editMapping")}</Button>
              <Button size="sm" variant="destructive" onClick={() => setRemoveId(s.id)}>{t("assistantUi.remove")}</Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder={t("assistantUi.sheetPlaceholder")} />
            <Button variant="outline" loading={loadingSheet === "new"} disabled={!newUrl.trim()} onClick={() => openMapping(newUrl.trim())}>{t("assistantUi.addSheet")}</Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {editing && <ReminderMapping key={editing.url} teamspaceId={teamspaceId} sheetUrl={editing.url} proposal={editing.proposal} existing={editing.existing} onSaved={async () => { setEditing(null); setNewUrl(""); await reload(); }} />}
          {sources.length > 0 && <ReminderPreview teamspaceId={teamspaceId} />}
        </section>
      )}
      <ActionConfirm open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)} title={t("assistantUi.removeConfirm")} label={t("assistantUi.remove")}
        onConfirm={async () => { if (removeId) { await del({ data: { id: removeId } }); setRemoveId(null); await reload(); } }} />
    </div>
  );
}

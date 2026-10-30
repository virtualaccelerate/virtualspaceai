import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { previewClientReminders, saveReminderSource } from "@/lib/assistant.functions";
import { MAP_FIELDS, type TabMap } from "@/lib/reminders-core";

export type ProposedTab = { name: string; archive: boolean; map: TabMap | null; preview: string[][]; columns: number };
export type Proposal = { title: string; tabs: ProposedTab[] };
const colName = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");

export function ReminderMapping({ teamspaceId, sheetUrl, proposal, existing, onSaved }: {
  teamspaceId: string; sheetUrl: string; proposal: Proposal;
  existing?: { id: string; tabs: string[]; column_map: Record<string, TabMap> };
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const save = useServerFn(saveReminderSource);
  const [showArchive, setShowArchive] = useState(false);
  const [maps, setMaps] = useState<Record<string, TabMap | null>>(() =>
    Object.fromEntries(proposal.tabs.map((tab) => [tab.name, existing?.column_map[tab.name] ?? tab.map])));
  const [included, setIncluded] = useState<Set<string>>(() =>
    new Set(existing?.tabs ?? proposal.tabs.filter((tab) => !tab.archive && tab.map).map((tab) => tab.name)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visible = useMemo(() => proposal.tabs.filter((tab) => showArchive || !tab.archive), [proposal, showArchive]);

  const setField = (tab: string, f: string, v: number) =>
    setMaps((m) => ({ ...m, [tab]: { ...(m[tab] ?? { header_row: 0 }), [f]: v } }));

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const column_map: Record<string, TabMap> = {};
      for (const n of included) { const m = maps[n]; if (m && (m.name ?? -1) >= 0) column_map[n] = m; }
      await save({ data: { teamspace_id: teamspaceId, id: existing?.id, sheet_url: sheetUrl, title: proposal.title, tabs: Object.keys(column_map), column_map } });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={showArchive} onChange={(e) => setShowArchive(e.target.checked)} className="accent-[var(--primary)]" />
        {t("assistantUi.showArchive")}
      </label>
      {visible.map((tab) => {
        const m = maps[tab.name];
        const on = included.has(tab.name);
        return (
          <div key={tab.name} className="rounded-2xl border border-border bg-card p-3">
            <label className="flex items-center gap-2 font-medium text-sm text-foreground">
              <input type="checkbox" checked={on} onChange={(e) => setIncluded((s) => { const n = new Set(s); if (e.target.checked) n.add(tab.name); else n.delete(tab.name); return n; })} className="accent-[var(--primary)]" />
              {tab.name}
              {!m && <span className="text-[11px] font-normal text-muted-foreground">· {t("assistantUi.noTable")}</span>}
            </label>
            {on && (
              <>
                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  <table className="text-[11px] min-w-full">
                    <thead><tr className="bg-muted/50">{Array.from({ length: Math.min(tab.columns, 16) }, (_, i) => <th key={i} className="px-2 py-1 text-left text-muted-foreground font-mono">{colName(i)}</th>)}</tr></thead>
                    <tbody>{tab.preview.slice(0, 4).map((r, ri) => <tr key={ri} className={ri === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}>{Array.from({ length: Math.min(tab.columns, 16) }, (_, i) => <td key={i} className="px-2 py-1 whitespace-nowrap max-w-[10rem] truncate">{r[i] ?? ""}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MAP_FIELDS.map((f) => (
                    <div key={f} className="min-w-0">
                      <div className="text-[10px] text-muted-foreground mb-0.5">{t(`assistantUi.fields.${f}`)}</div>
                      <Select value={String(m?.[f] ?? -1)} onValueChange={(v) => setField(tab.name, f, Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">{t("assistantUi.none")}</SelectItem>
                          {Array.from({ length: Math.max(tab.columns, 1) }, (_, i) => <SelectItem key={i} value={String(i)}>{colName(i)} · {(tab.preview[0]?.[i] ?? "").slice(0, 24)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button loading={saving} onClick={submit}>{t("assistantUi.saveMapping")}</Button>
    </div>
  );
}

type PreviewItem = { day: string; kind: string; name: string; reason: string; phone: string; tab: string; recipient_name: string; matched: boolean; in_client_db: boolean | null; message: string };

export function ReminderPreview({ teamspaceId }: { teamspaceId: string }) {
  const { t } = useTranslation();
  const run = useServerFn(previewClientReminders);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ today: string; items: PreviewItem[]; invalid: number; errors: string[] } | null>(null);
  const days = useMemo(() => [...new Set((res?.items ?? []).map((i) => i.day))].sort(), [res]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" loading={busy} onClick={async () => { setBusy(true); try { setRes(await run({ data: { teamspace_id: teamspaceId } })); } finally { setBusy(false); } }}>{t("assistantUi.checkNow")}</Button>
        <span className="text-xs text-muted-foreground">{t("assistantUi.previewHint")}</span>
      </div>
      {res && (
        <div className="space-y-3">
          {res.errors.map((e) => <p key={e} className="text-xs text-destructive">{t("assistantUi.lastError", { e })}</p>)}
          <p className="text-xs text-muted-foreground">{t("assistantUi.invalid", { n: res.invalid })}</p>
          {!res.items.length && <p className="text-sm text-muted-foreground">{t("assistantUi.previewEmpty")}</p>}
          {days.map((d) => (
            <div key={d} className="rounded-2xl border border-border bg-card p-3">
              <div className="text-xs font-semibold text-foreground mb-2">{d === res.today ? t("assistantUi.today") : d}</div>
              <ul className="space-y-2">
                {res.items.filter((i) => i.day === d).map((i, k) => (
                  <li key={k} className="text-xs">
                    <div className="text-foreground"><b>{i.name}</b> — {i.reason}{i.phone ? ` · +${i.phone}` : ""}</div>
                    <div className="text-muted-foreground">«{i.tab}» · {t("assistantUi.to")}: {i.recipient_name}{i.in_client_db === null ? "" : ` · ${i.in_client_db ? t("assistantUi.inDb") : t("assistantUi.notInDb")}`}</div>
                    <div className="mt-1 rounded-lg bg-muted/60 px-2 py-1 text-foreground/80">{i.message}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

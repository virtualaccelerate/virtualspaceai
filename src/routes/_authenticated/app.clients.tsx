import { ManagerOnly } from "@/components/ManagerOnly";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Loader2, Plus, Trash2, RefreshCw, ScanSearch, ExternalLink, FileSpreadsheet, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { listClientsFn, saveClientFn, deleteClientFn, scanClientTasksFn, setupClientDbFn, syncClientSheetFn } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/app/clients")({
  component: () => (
    <ManagerOnly>
      <ClientsPage />
    </ManagerOnly>
  ),
  head: () => ({ meta: [
    { title: "Client Database — Virtual Space" },
    { name: "description", content: "Manage your company client database in Virtual Space." },
    { property: "og:title", content: "Client Database — Virtual Space" },
    { property: "og:description", content: "Manage your company client database in Virtual Space." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

type Data = Awaited<ReturnType<typeof listClientsFn>>;
type Row = Data["clients"][number];
const COLS: { key: keyof Row; w: string }[] = [
  { key: "name", w: "min-w-[160px]" },
  { key: "phone", w: "min-w-[150px]" },
  { key: "email", w: "min-w-[180px]" },
  { key: "company", w: "min-w-[150px]" },
  { key: "status", w: "min-w-[110px]" },
  { key: "notes", w: "min-w-[260px]" },
];
const letter = (i: number) => String.fromCharCode(65 + i);

function ClientsPage() {
  const { t, i18n } = useTranslation();
  const list = useServerFn(listClientsFn);
  const save = useServerFn(saveClientFn);
  const del = useServerFn(deleteClientFn);
  const scan = useServerFn(scanClientTasksFn);
  const setup = useServerFn(setupClientDbFn);
  const sync = useServerFn(syncClientSheetFn);
  const [ts, setTs] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ id: string; key: keyof Row; value: string } | null>(null);

  const load = async (id = ts) => {
    if (!id) return;
    try { setData(await list({ data: { teamspace_id: id } })); setErr(null); } catch (e) { setErr((e as Error).message); }
  };
  useEffect(() => { getActiveTeamspaceId().then((id) => { setTs(id); load(id); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.clients ?? []).filter((c) => !s || [c.name, c.phone, c.email, c.company, c.notes].some((v) => (v ?? "").toLowerCase().includes(s)));
  }, [data, q]);

  const act = async (name: string, fn: () => Promise<unknown>, ok?: (r: any) => string) => {
    setBusy(name);
    try { const r = await fn(); if (ok) toast.success(ok(r)); await load(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const commit = async () => {
    if (!edit || !ts) return;
    const row = data?.clients.find((c) => c.id === edit.id);
    setEdit(null);
    if (!row || (row[edit.key] ?? "") === edit.value) return;
    await act("save", () => save({ data: { teamspace_id: ts, id: row.id, name: row.name, phone: row.phone, email: row.email, company: row.company, notes: row.notes, status: row.status, [edit.key]: edit.value } }));
  };

  if (err) return <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{err}</div>;
  if (!data || !ts) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  const s = data.settings;
  const btn = "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:border-primary/60 disabled:opacity-50";

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Users className="h-5 w-5" /></div>
          <div>
             <h1 className="font-display text-2xl text-foreground">{t("clientsUi.title")}</h1>
             <p className="text-sm text-muted-foreground">{t("clientsUi.description")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {s?.sheet_url ? (
            <>
               <a href={s.sheet_url} target="_blank" rel="noreferrer" className={btn}><FileSpreadsheet className="h-4 w-4 text-primary" />{t("clientsUi.sheet")}<ExternalLink className="h-3 w-3" /></a>
               <button className={btn} disabled={!!busy} onClick={() => act("sync", () => sync({ data: { teamspace_id: ts } }), () => t("clientsUi.sheetUpdated"))}>
                 {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t("clientsUi.sync")}
              </button>
            </>
          ) : (
             <button className={btn} disabled={!!busy} onClick={() => act("setup", () => setup({ data: { teamspace_id: ts } }), () => t("clientsUi.setupDone"))}>
               {busy === "setup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}{t("clientsUi.createSheet")}
            </button>
          )}
           <button className={btn} disabled={!!busy} onClick={() => act("scan", () => scan({ data: { teamspace_id: ts } }), (r) => t("clientsUi.scanDone", { contacts: r.with_contacts, changed: r.changed }))}>
             {busy === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}{t("clientsUi.scan")}
          </button>
        </div>
      </div>

      {!s?.sheet_url && (
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
           {t("clientsUi.driveHint")} <Link to="/app/integrations" className="text-primary underline">{t("clientsUi.integrations")}</Link>. {t("clientsUi.knowledgeHint")}
        </div>
      )}
      {s?.last_error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{s.last_error}</div>}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
           <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("clientsUi.search")} className="w-full rounded-lg bg-background border border-border pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/60" />
        </div>
         <span className="text-xs text-muted-foreground">{t("clientsUi.count", { shown: rows.length, total: data.clients.length })}</span>
         {s?.last_sync_at && <span className="text-xs text-muted-foreground ml-auto">{t("clientsUi.synced", { date: new Date(s.last_sync_at).toLocaleString(i18n.resolvedLanguage ?? i18n.language) })}</span>}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-auto max-h-[70vh]">
        <table className="text-sm border-collapse w-full">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="w-10 border border-border text-xs text-muted-foreground font-normal" />
              {COLS.map((c, i) => <th key={c.key} className="border border-border text-xs text-muted-foreground font-normal py-0.5">{letter(i)}</th>)}
              <th className="border border-border text-xs text-muted-foreground font-normal">{letter(COLS.length)}</th>
              <th className="w-8 border border-border" />
            </tr>
            <tr>
              <th className="border border-border text-xs text-muted-foreground font-normal">1</th>
               {COLS.map((c) => <th key={c.key} className={`${c.w} border border-border px-2 py-1.5 text-left font-semibold text-foreground`}>{t(`clientsUi.columns.${c.key}`)}</th>)}
               <th className="border border-border px-2 py-1.5 text-left font-semibold text-foreground min-w-[80px]">{t("clientsUi.columns.tasks")}</th>
              <th className="border border-border" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="border border-border text-center text-xs text-muted-foreground bg-muted/50">{ri + 2}</td>
                {COLS.map((c) => {
                  const active = edit?.id === r.id && edit.key === c.key;
                  return (
                    <td key={c.key} className={`border border-border p-0 align-top ${active ? "outline outline-2 outline-primary" : ""}`}
                      onClick={() => !active && setEdit({ id: r.id, key: c.key, value: String(r[c.key] ?? "") })}>
                      {active ? (
                        <input autoFocus value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} onBlur={commit}
                          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEdit(null); }}
                          className="w-full bg-background px-2 py-1.5 outline-none" />
                      ) : <div className="px-2 py-1.5 whitespace-pre-wrap line-clamp-3 cursor-cell min-h-[32px]">{String(r[c.key] ?? "")}</div>}
                    </td>
                  );
                })}
                <td className="border border-border px-2 py-1.5 text-xs text-muted-foreground">{r.source_task_ids.length || ""}</td>
                <td className="border border-border text-center">
                   <button aria-label={t("clientsUi.deleteClient")} onClick={() => confirm(t("clientsUi.deleteConfirm", { name: r.name || r.phone })) && act("del", () => del({ data: { teamspace_id: ts, id: r.id } }))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
               <tr><td colSpan={COLS.length + 3} className="border border-border p-6 text-center text-muted-foreground text-sm">{t("clientsUi.empty")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
       <button className={btn} disabled={!!busy} onClick={() => act("add", () => save({ data: { teamspace_id: ts, name: t("clientsUi.newClient") } }))}><Plus className="h-4 w-4" />{t("clientsUi.addRow")}</button>
    </div>
  );
}

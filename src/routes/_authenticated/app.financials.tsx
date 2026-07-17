import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Wallet, Link2, Upload, Trash2, Loader2, Sparkles, RefreshCw,
  TrendingUp, TrendingDown, Send, FileSpreadsheet, ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  listFinancialSources,
  addSheetSource,
  addCsvSource,
  deleteFinancialSource,
  refreshSheetSource,
  analyzeFinancials,
  askFinancials,
  listFinChat,
  clearFinChat,
} from "@/lib/financials.functions";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/app/financials")({
  component: FinancialsPage,
  head: () => ({
    meta: [{ title: "Financials — Virtual Space" }, { name: "robots", content: "noindex" }],
  }),
});

type Src = {
  id: string;
  name: string;
  kind: "sheet" | "file";
  source_url: string | null;
  analysis: Analysis | null;
  created_at: string;
};

type KPI = { label: string; value: number; format?: "money" | "number" | "percent"; delta_pct?: number | null };
type Analysis = {
  currency?: string;
  period?: string;
  summary?: string;
  kpis?: KPI[];
  monthly?: { month: string; revenue: number; expenses: number; profit: number }[];
  categories?: { name: string; value: number; type: "expense" | "revenue" }[];
  recommendations?: string[];
  report?: string;
};

type Msg = { role: "user" | "assistant"; content: string };

function fmtNumber(n: number, format?: string, currency?: string) {
  if (!Number.isFinite(n)) return "—";
  if (format === "percent") return `${n.toFixed(1)}%`;
  if (format === "money") {
    const abs = Math.abs(n);
    const compact = abs >= 1000
      ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)
      : n.toFixed(0);
    return `${currency || ""} ${compact}`.trim();
  }
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(n);
}

async function fileToCsv(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return await file.text();
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws);
    parts.push(`# Sheet: ${sheetName}\n${csv}`);
  }
  return parts.join("\n\n");
}

function FinancialsPage() {
  const { t, i18n } = useTranslation();
  const list = useServerFn(listFinancialSources);
  const addSheet = useServerFn(addSheetSource);
  const addCsv = useServerFn(addCsvSource);
  const del = useServerFn(deleteFinancialSource);
  const refresh = useServerFn(refreshSheetSource);
  const analyze = useServerFn(analyzeFinancials);
  const ask = useServerFn(askFinancials);
  const loadChat = useServerFn(listFinChat);
  const clearChat = useServerFn(clearFinChat);

  const [teamspaceId, setTeamspaceId] = useState<string | null>(null);
  const [sources, setSources] = useState<Src[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [askInput, setAskInput] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const { data: mem } = await supabase
          .from("teamspace_members")
          .select("teamspace_id")
          .eq("user_id", data.user.id)
          .limit(1)
          .maybeSingle();
        if (!mem) return;
        setTeamspaceId(mem.teamspace_id);
        const rows = (await list({ data: { teamspace_id: mem.teamspace_id } })) as Src[];
        setSources(rows);
        const cached = rows.find((r) => r.analysis)?.analysis;
        if (cached) setAnalysis(cached);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addByUrl = async () => {
    if (!teamspaceId || !url.trim()) return;
    setError(null); setAddingUrl(true);
    try {
      const row = (await addSheet({ data: { teamspace_id: teamspaceId, url: url.trim() } })) as Src;
      setSources((p) => [row, ...p]);
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add sheet");
    } finally { setAddingUrl(false); }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!teamspaceId) return;
    setError(null); setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 15 * 1024 * 1024) { setError(`${file.name}: max 15 MB`); continue; }
        const csv = (await fileToCsv(file)).slice(0, 400_000);
        if (!csv.trim()) { setError(`${file.name}: no readable data`); continue; }
        const row = (await addCsv({
          data: { teamspace_id: teamspaceId, name: file.name, csv },
        })) as Src;
        setSources((p) => [row, ...p]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeSrc = async (id: string) => {
    if (!confirm(t("app.fin.confirmDelete", "Remove this table?"))) return;
    try {
      await del({ data: { id } });
      setSources((p) => p.filter((s) => s.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
  };

  const refreshOne = async (id: string) => {
    try { await refresh({ data: { id } }); }
    catch (e) { setError(e instanceof Error ? e.message : "Refresh failed"); }
  };

  const runAnalysis = async () => {
    if (!teamspaceId) return;
    setError(null); setAnalyzing(true);
    try {
      const res = await analyze({ data: { teamspace_id: teamspaceId, language: i18n.language } });
      setAnalysis(res.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally { setAnalyzing(false); }
  };

  const sendAsk = async () => {
    if (!teamspaceId || !askInput.trim() || asking) return;
    const q = askInput.trim();
    setAskInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setAsking(true);
    try {
      const res = await ask({
        data: { teamspace_id: teamspaceId, messages: next, language: i18n.language },
      });
      setMessages([...next, { role: "assistant", content: res.reply || "…" }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: e instanceof Error ? e.message : "Error" }]);
    } finally { setAsking(false); }
  };

  const currency = analysis?.currency;
  const kpis = analysis?.kpis || [];
  const monthly = analysis?.monthly || [];
  const categories = useMemo(
    () => (analysis?.categories || []).filter((c) => c.type === "expense").slice(0, 8),
    [analysis],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-foreground">
              {t("app.fin.title", "Financials")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("app.fin.subtitle", "Connect Google Sheets or upload spreadsheets — AI builds a dashboard, report and recommendations.")}
            </p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing || sources.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-black font-semibold px-4 py-2 text-sm disabled:opacity-50 hover:opacity-90 transition"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t("app.fin.analyze", "Analyze & build dashboard")}
        </button>
      </div>

      {/* Add sources */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">{t("app.fin.sheetTitle", "Google Sheets link")}</div>
          </div>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary/60"
              onKeyDown={(e) => e.key === "Enter" && addByUrl()}
            />
            <button
              onClick={addByUrl}
              disabled={addingUrl || !url.trim()}
              className="rounded-lg bg-primary text-black text-sm font-semibold px-3 disabled:opacity-50"
            >
              {addingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : t("app.fin.add", "Add")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("app.fin.sheetHint", "Share → Anyone with the link (Viewer).")}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">{t("app.fin.uploadTitle", "Upload CSV / Excel")}</div>
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-background/40 hover:bg-background p-4 text-center text-sm"
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
              {uploading ? t("app.fin.uploading", "Uploading…") : t("app.fin.upload", "Click to upload .csv / .xlsx")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{t("app.fin.uploadHint", "Up to 15 MB per file")}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* Sources list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">
          {t("app.fin.sources", "Connected tables")} <span className="text-muted-foreground font-normal">({sources.length})</span>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("app.fin.loading", "Loading…")}
          </div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("app.fin.empty", "No tables yet. Add a Google Sheet link or upload a file above.")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {s.kind === "sheet" ? <Link2 className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.kind === "sheet" ? "Google Sheet" : "Upload"} · {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                {s.kind === "sheet" && s.source_url && (
                  <>
                    <a
                      href={s.source_url}
                      target="_blank" rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                      aria-label="Open"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => refreshOne(s.id)}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                      aria-label="Refresh"
                      title={t("app.fin.refresh", "Refresh")}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => removeSrc(s.id)}
                  className="p-2 text-muted-foreground hover:text-red-500 rounded-lg"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dashboard */}
      {analysis && (
        <>
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpis.slice(0, 4).map((k, i) => {
                const positive = (k.delta_pct ?? 0) >= 0;
                return (
                  <div key={i} className="rounded-2xl border border-border bg-card p-4">
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                    <div className="text-2xl font-display mt-1 text-foreground">
                      {fmtNumber(k.value, k.format, currency)}
                    </div>
                    {typeof k.delta_pct === "number" && (
                      <div className={`text-xs mt-1 inline-flex items-center gap-1 ${positive ? "text-emerald-500" : "text-red-500"}`}>
                        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {k.delta_pct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold mb-3">{t("app.fin.trend", "Revenue vs Expenses")}</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold mb-3">{t("app.fin.categories", "Top expense categories")}</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={90} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold mb-2">{t("app.fin.report", "Report")}</div>
              {analysis.period && <div className="text-xs text-muted-foreground mb-2">{analysis.period}</div>}
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {analysis.report || analysis.summary}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold mb-3">{t("app.fin.recs", "Recommendations")}</div>
              <ol className="space-y-2 list-decimal list-inside text-sm">
                {(analysis.recommendations || []).map((r, i) => (
                  <li key={i} className="text-foreground/90">{r}</li>
                ))}
              </ol>
            </div>
          </div>
        </>
      )}

      {/* Q&A */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("app.fin.ask", "Ask about your finances")}
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground">
              {t("app.fin.askHint", 'e.g. "Which month had the highest margin?" or "Where are we overspending?"')}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-primary/10 text-foreground ml-8"
                  : "bg-background border border-border text-foreground mr-8"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {asking && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 mr-8">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("app.fin.thinking", "Thinking…")}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendAsk()}
            placeholder={t("app.fin.askPlaceholder", "Ask a question about the tables…")}
            className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <button
            onClick={sendAsk}
            disabled={asking || !askInput.trim() || sources.length === 0}
            className="h-10 w-10 rounded-full bg-primary text-black flex items-center justify-center disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Google Sheets URL → CSV export URL ----------
function extractSheetInfo(url: string): { id: string; gid: string } | null {
  try {
    const u = new URL(url);
    if (!/docs\.google\.com$/.test(u.hostname)) return null;
    const m = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return null;
    const id = m[1];
    const gidHash = u.hash.match(/gid=(\d+)/);
    const gidQuery = u.searchParams.get("gid");
    const gid = gidHash?.[1] ?? gidQuery ?? "0";
    return { id, gid };
  } catch {
    return null;
  }
}

function csvExportUrl(id: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

// ---------- List ----------
export const listFinancialSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ teamspace_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("financial_sources")
      .select("id, name, kind, source_url, analysis, created_at, updated_at")
      .eq("teamspace_id", data.teamspace_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Add Google Sheet ----------
export const addSheetSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      teamspace_id: z.string().uuid(),
      url: z.string().url(),
      name: z.string().max(300).optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const info = extractSheetInfo(data.url);
    if (!info) throw new Error("Invalid Google Sheets URL");
    const exportUrl = csvExportUrl(info.id, info.gid);
    const res = await fetch(exportUrl, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(
        "Cannot read this sheet. Open it → Share → 'Anyone with the link (Viewer)' and try again.",
      );
    }
    const ct = res.headers.get("content-type") || "";
    const csv = await res.text();
    if (ct.includes("text/html") || /<html/i.test(csv.slice(0, 200))) {
      throw new Error(
        "Sheet is not public. Change sharing to 'Anyone with the link (Viewer)'.",
      );
    }
    const trimmed = csv.slice(0, 400_000);
    const name = data.name?.trim() || `Google Sheet (${info.id.slice(0, 6)})`;
    const { data: row, error } = await context.supabase
      .from("financial_sources")
      .insert({
        teamspace_id: data.teamspace_id,
        user_id: context.userId,
        kind: "sheet",
        name,
        source_url: data.url,
        raw_csv: trimmed,
      })
      .select("id, name, kind, source_url, analysis, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Add uploaded CSV / spreadsheet (client sends parsed CSV text) ----------
export const addCsvSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      teamspace_id: z.string().uuid(),
      name: z.string().min(1).max(300),
      csv: z.string().min(1).max(400_000),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("financial_sources")
      .insert({
        teamspace_id: data.teamspace_id,
        user_id: context.userId,
        kind: "file",
        name: data.name,
        raw_csv: data.csv,
      })
      .select("id, name, kind, source_url, analysis, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Delete ----------
export const deleteFinancialSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_sources")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Refresh a Google Sheet ----------
export const refreshSheetSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: src, error } = await context.supabase
      .from("financial_sources")
      .select("id, source_url, kind")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src || src.kind !== "sheet" || !src.source_url) {
      throw new Error("Not a Google Sheet source");
    }
    const info = extractSheetInfo(src.source_url);
    if (!info) throw new Error("Invalid Google Sheets URL");
    const res = await fetch(csvExportUrl(info.id, info.gid));
    if (!res.ok) throw new Error("Cannot re-fetch sheet (check sharing).");
    const csv = (await res.text()).slice(0, 400_000);
    const { error: upErr } = await context.supabase
      .from("financial_sources")
      .update({ raw_csv: csv })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

// ---------- Analyze (build dashboard + report) ----------
type Analysis = {
  currency: string;
  period: string;
  summary: string;
  kpis: { label: string; value: number; format?: "money" | "number" | "percent"; delta_pct?: number | null }[];
  monthly: { month: string; revenue: number; expenses: number; profit: number }[];
  categories: { name: string; value: number; type: "expense" | "revenue" }[];
  recommendations: string[];
  report: string;
};

function buildCorpus(rows: { name: string; raw_csv: string | null }[]): string {
  const CHAR_BUDGET = 120_000;
  let used = 0;
  const parts: string[] = [];
  for (const r of rows) {
    if (!r.raw_csv) continue;
    const chunk = `### TABLE: ${r.name}\n${r.raw_csv.slice(0, 40_000)}\n\n`;
    if (used + chunk.length > CHAR_BUDGET) break;
    parts.push(chunk);
    used += chunk.length;
  }
  return parts.join("");
}

// Re-fetch every Google Sheet source so answers reflect the latest values.
// Mutates rows in place; failures skip silently (stale copy stays usable).
async function refreshSheetRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rows: { id: string; name: string; kind?: string | null; source_url?: string | null; raw_csv: string | null }[],
) {
  await Promise.all(
    rows.map(async (r) => {
      if (r.kind !== "sheet" || !r.source_url) return;
      const info = extractSheetInfo(r.source_url);
      if (!info) return;
      try {
        const res = await fetch(csvExportUrl(info.id, info.gid), { redirect: "follow" });
        if (!res.ok) return;
        const ct = res.headers.get("content-type") || "";
        const csv = await res.text();
        if (ct.includes("text/html") || /<html/i.test(csv.slice(0, 200))) return;
        const trimmed = csv.slice(0, 400_000);
        if (trimmed === r.raw_csv) return;
        r.raw_csv = trimmed;
        await supabase.from("financial_sources").update({ raw_csv: trimmed }).eq("id", r.id);
      } catch {
        // keep stale copy
      }
    }),
  );
}

export const analyzeFinancials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      teamspace_id: z.string().uuid(),
      language: z.string().max(10).optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("financial_sources")
      .select("id, name, kind, source_url, raw_csv")
      .eq("teamspace_id", data.teamspace_id);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("Add a table or Google Sheet first.");
    await refreshSheetRows(context.supabase, rows);
    const corpus = buildCorpus(rows);
    if (!corpus.trim()) throw new Error("Sources have no readable data.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const lang = data.language || "en";
    const system =
      "You are a senior financial analyst. Analyze the given CSV tables (revenue, expenses, invoices, budgets, etc.). " +
      `Reply in language code: ${lang}. ` +
      "Return ONLY a compact JSON object matching this exact TypeScript type — no prose, no markdown, no code fences:\n" +
      `{"currency":string,"period":string,"summary":string,"kpis":{"label":string,"value":number,"format":"money"|"number"|"percent","delta_pct":number|null}[],"monthly":{"month":string,"revenue":number,"expenses":number,"profit":number}[],"categories":{"name":string,"value":number,"type":"expense"|"revenue"}[],"recommendations":string[],"report":string}\n` +
      "Rules: kpis MUST include Revenue, Expenses, Net Profit, Profit Margin. monthly ordered chronologically (YYYY-MM). categories: top 6 expense categories. recommendations: 4–7 concrete, prioritized actions. report: 4–8 sentences explaining trends, risks, and priorities. If data is missing infer sensibly from column headers.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Analyze these tables:\n\n${corpus}` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI error (${res.status}): ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = j.choices?.[0]?.message?.content?.trim() || "{}";
    let analysis: Analysis;
    try {
      analysis = JSON.parse(raw) as Analysis;
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      analysis = m ? (JSON.parse(m[0]) as Analysis) : ({} as Analysis);
    }

    // Persist on the most recent source so it survives page reload; also return.
    const target = rows[0];
    await context.supabase
      .from("financial_sources")
      .update({ analysis: JSON.parse(JSON.stringify(analysis)) })
      .eq("id", target.id);

    return { analysis };
  });

// ---------- Q&A over the finance tables ----------
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

export const askFinancials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      teamspace_id: z.string().uuid(),
      messages: z.array(MessageSchema).min(1).max(20),
      language: z.string().max(10).optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("financial_sources")
      .select("id, name, kind, source_url, raw_csv")
      .eq("teamspace_id", data.teamspace_id);
    if (error) throw new Error(error.message);
    if (rows && rows.length) await refreshSheetRows(context.supabase, rows);
    const corpus = rows && rows.length ? buildCorpus(rows) : "";

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const lang = data.language || "en";
    const system =
      "You are the Virtual Space Finance assistant. Answer questions strictly using the tables below. " +
      `Reply in language code: ${lang}. Plain text only — no markdown, no asterisks. ` +
      "Give numbers with currency and short reasoning. If the answer isn't in the tables, say so and suggest what column to add.\n\n" +
      (corpus ? `FINANCIAL TABLES:\n${corpus}` : "NO TABLES ATTACHED YET.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });
    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI error (${res.status}): ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = j.choices?.[0]?.message?.content ?? "";

    // Persist last user message + assistant reply to cloud
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await context.supabase.from("financial_chat_messages").insert([
        { teamspace_id: data.teamspace_id, user_id: context.userId, role: "user", content: lastUser.content },
        { teamspace_id: data.teamspace_id, user_id: context.userId, role: "assistant", content: reply || "…" },
      ]);
    }

    return { reply };
  });

// ---------- Chat history persistence ----------
export const listFinChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ teamspace_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("financial_chat_messages")
      .select("role, content, created_at")
      .eq("teamspace_id", data.teamspace_id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as { role: "user" | "assistant"; content: string; created_at: string }[];
  });

export const clearFinChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ teamspace_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_chat_messages")
      .delete()
      .eq("teamspace_id", data.teamspace_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

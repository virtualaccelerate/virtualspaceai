import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(8000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
  teamspace_id: z.string().uuid().optional(),
  agent_id: z.string().max(60).optional(),
});

const AGENT_PROMPTS: Record<string, string> = {
  contracts:
    "You are the Contract Risk Agent inside Virtual Space. " +
    "When the user provides a contract (as pasted text or as a knowledge-base file), do the following in the user's language:\n" +
    "1) Summarize the contract in 3-6 short sentences (parties, subject, term, price).\n" +
    "2) Extract KEY RISKS as a numbered list — each with: what the risk is, why it matters, and severity (low/medium/high).\n" +
    "3) Suggest concrete IMPROVEMENTS / redlines — numbered, each an actionable rewrite or clause to add.\n" +
    "Cite source files with the [[file:UUID|Name]] syntax when the analysis comes from the knowledge base. Plain text only, no markdown symbols.",
};

// ---------- Google Sheets helpers (shared with financials) ----------
function extractSheetInfo(url: string): { id: string; gid: string } | null {
  try {
    const u = new URL(url);
    if (!/docs\.google\.com$/.test(u.hostname)) return null;
    const m = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return null;
    const gidHash = u.hash.match(/gid=(\d+)/);
    const gidQuery = u.searchParams.get("gid");
    return { id: m[1], gid: gidHash?.[1] ?? gidQuery ?? "0" };
  } catch {
    return null;
  }
}

async function fetchSheetCsv(id: string, gid: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`,
      { redirect: "follow" },
    );
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    const csv = await res.text();
    if (ct.includes("text/html") || /<html/i.test(csv.slice(0, 200))) return null;
    return csv.slice(0, 40_000);
  } catch {
    return null;
  }
}

function findSheetUrls(text: string): string[] {
  const re = /https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+[^\s)]*/g;
  return Array.from(new Set(text.match(re) ?? []));
}

export const askZukha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Load knowledge base context for this teamspace
    let knowledgeBlock = "";
    if (data.teamspace_id) {
      const { data: docs } = await context.supabase
        .from("documents")
        .select("id, name, mime_type, extracted_text")
        .eq("teamspace_id", data.teamspace_id)
        .order("created_at", { ascending: false })
        .limit(40);

      if (docs && docs.length > 0) {
        const CHAR_BUDGET = 40_000;
        let used = 0;
        const parts: string[] = [];
        for (const d of docs) {
          const header = `FILE id=${d.id} name="${d.name}"${d.mime_type ? ` type=${d.mime_type}` : ""}`;
          const body = d.extracted_text ? d.extracted_text.slice(0, 12_000) : "(binary file — no text extracted; you know it exists and can reference it by id/name)";
          const chunk = `${header}\n${body}\n---\n`;
          if (used + chunk.length > CHAR_BUDGET) break;
          parts.push(chunk);
          used += chunk.length;
        }
        knowledgeBlock =
          "\n\nKNOWLEDGE BASE (files uploaded by the team — use them to answer):\n" +
          parts.join("");
      }
    }

    // Load financial sources (Google Sheets + uploaded CSV/XLSX) and refresh sheets live
    let financeBlock = "";
    if (data.teamspace_id) {
      const { data: fins } = await context.supabase
        .from("financial_sources")
        .select("id, name, kind, source_url, raw_csv")
        .eq("teamspace_id", data.teamspace_id);
      if (fins && fins.length > 0) {
        await Promise.all(
          fins.map(async (r) => {
            if (r.kind !== "sheet" || !r.source_url) return;
            const info = extractSheetInfo(r.source_url);
            if (!info) return;
            const csv = await fetchSheetCsv(info.id, info.gid);
            if (!csv) return;
            r.raw_csv = csv;
            await context.supabase
              .from("financial_sources")
              .update({ raw_csv: csv })
              .eq("id", r.id);
          }),
        );
        const FIN_BUDGET = 40_000;
        let used = 0;
        const parts: string[] = [];
        for (const r of fins) {
          if (!r.raw_csv) continue;
          const chunk = `### FIN TABLE: ${r.name}${r.source_url ? ` (${r.source_url})` : ""}\n${r.raw_csv.slice(0, 20_000)}\n\n`;
          if (used + chunk.length > FIN_BUDGET) break;
          parts.push(chunk);
          used += chunk.length;
        }
        if (parts.length) {
          financeBlock =
            "\n\nFINANCIAL SOURCES (linked in the Financials section — use for money/revenue/expense questions):\n" +
            parts.join("");
        }
      }
    }

    // If the latest user message pasted a Google Sheets URL, fetch it inline
    let inlineSheetBlock = "";
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const urls = findSheetUrls(lastUser.content).slice(0, 3);
      const fetched: string[] = [];
      for (const url of urls) {
        const info = extractSheetInfo(url);
        if (!info) continue;
        const csv = await fetchSheetCsv(info.id, info.gid);
        if (!csv) {
          fetched.push(`### SHARED SHEET (not accessible — user must set share to 'Anyone with the link · Viewer'): ${url}\n`);
        } else {
          fetched.push(`### SHARED SHEET: ${url}\n${csv.slice(0, 20_000)}\n`);
        }
      }
      if (fetched.length) {
        inlineSheetBlock =
          "\n\nSHEETS SHARED IN THIS MESSAGE (read them directly and answer):\n" +
          fetched.join("\n");
      }
    }

    const agentPreamble = data.agent_id && AGENT_PROMPTS[data.agent_id]
      ? `ACTIVE AGENT MODE: ${AGENT_PROMPTS[data.agent_id]}\n\n`
      : "";

    const systemPrompt =
      agentPreamble +
      "You are Virtual Space AI, the assistant inside Virtual Space — an AI virtual office for teams. " +
      "Be concise, warm, and practical. Reply in the user's language. " +
      "Reply as plain text only: do NOT use Markdown, asterisks (*), underscores (_), backticks, headings (#), or bullet symbols. " +
      "Write in normal sentences and short paragraphs; if you need a list, use numbers like '1.' or plain lines. " +
      "When you reference or cite a file from the KNOWLEDGE BASE, ALWAYS use this exact inline syntax: [[file:UUID|File name]] — the app will render it as a clickable link. " +
      "Never invent file ids. Only use ids that appear in the KNOWLEDGE BASE below. " +
      "If the user asks for a report, summary, or something derived from a file, produce the answer as text and cite the relevant [[file:...]] links so they can open the source.\n\n" +
      "TASK CREATION: When the user asks you to create, add, or plan a task (задача, таск, todo, task), emit ONE token per task on its own line using EXACTLY this syntax:\n" +
      "[[task:Title||priority||YYYY-MM-DD||description]]\n" +
      "Rules: priority ∈ low|medium|high|urgent (default medium). Date is optional — leave empty as ||||. Description optional. Example: [[task:Prepare Q3 report||high||2026-08-01||Draft slides and share with team]]. Confirm briefly in the user's language after the token(s). Never wrap the token in quotes or code." +
      knowledgeBlock +
      financeBlock +
      inlineSheetBlock;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up in workspace settings.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content ?? "";
    return { reply };
  });

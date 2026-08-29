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
  tasks:
    "You are the Task Planner Agent inside Virtual Space. " +
    "Turn the user's request into a concrete, actionable plan of tasks in the user's language. " +
    "For EVERY task you plan, emit the token [[task:Title||priority||YYYY-MM-DD||description]] on its own line " +
    "(priority ∈ low|medium|high|urgent; date optional — use |||| to skip). " +
    "Break large goals into small tasks, assign realistic priorities and, when a deadline is implied, a due date. " +
    "After the tokens, briefly confirm what was created in 1-2 sentences. Plain text only.",
  advisor:
    "You are the Business Advisor Agent inside Virtual Space. " +
    "The user describes a situation, dilemma, or 'what should I do' question. " +
    "Answer in the user's language with: (1) a short read of the situation, (2) 3-5 concrete recommended actions ranked by impact, " +
    "(3) risks/things to watch, (4) if useful, next steps as tasks using [[task:Title||priority||YYYY-MM-DD||description]] tokens. " +
    "Ground advice in the KNOWLEDGE BASE and FINANCIAL SOURCES when they contain relevant info, and cite files as [[file:UUID|Name]]. Plain text only.",
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

    // Load knowledge base context for this teamspace (relevance-ranked)
    let knowledgeBlock = "";
    if (data.teamspace_id) {
      const { data: docs } = await context.supabase
        .from("documents")
        .select("id, name, mime_type, extracted_text")
        .eq("teamspace_id", data.teamspace_id)
        .order("created_at", { ascending: false })
        .limit(60);

      if (docs && docs.length > 0) {
        const question = [...data.messages]
          .reverse()
          .find((m) => m.role === "user")?.content ?? "";
        const terms = Array.from(
          new Set(
            question
              .toLowerCase()
              .split(/[^\p{L}\p{N}]+/u)
              .filter((w) => w.length > 3),
          ),
        ).slice(0, 12);

        const scored = docs.map((d) => {
          const hay = `${d.name}\n${d.extracted_text ?? ""}`.toLowerCase();
          let score = 0;
          for (const t of terms) {
            if (d.name.toLowerCase().includes(t)) score += 5;
            const hits = hay.split(t).length - 1;
            score += Math.min(hits, 10);
          }
          if (d.extracted_text && d.extracted_text.length > 0) score += 1;
          return { d, score };
        });
        scored.sort((a, b) => b.score - a.score);

        const CHAR_BUDGET = 120_000;
        const PER_DOC = 60_000;
        let used = 0;
        const parts: string[] = [];
        const missing: string[] = [];
        for (const { d } of scored) {
          if (!d.extracted_text || d.extracted_text.length === 0) {
            missing.push(`"${d.name}"`);
            continue;
          }
          const header = `FILE id=${d.id} name="${d.name}"${d.mime_type ? ` type=${d.mime_type}` : ""} chars=${d.extracted_text.length}`;
          const body = d.extracted_text.slice(0, PER_DOC);
          const truncated =
            d.extracted_text.length > PER_DOC ? "\n[…текст файла обрезан…]" : "";
          const chunk = `${header}\n${body}${truncated}\n---\n`;
          if (used + chunk.length > CHAR_BUDGET) break;
          parts.push(chunk);
          used += chunk.length;
        }
        if (parts.length || missing.length) {
          knowledgeBlock =
            "\n\nKNOWLEDGE BASE (files uploaded by the team — answer strictly from this content, quote exact figures/dates, and cite the file name; if the answer is not in these files, say so explicitly instead of guessing):\n" +
            parts.join("") +
            (missing.length
              ? `\nNOTE: these files have no extracted text yet, so their content is unknown — tell the user to re-index them in Knowledge Base: ${missing.slice(0, 10).join(", ")}\n`
              : "");
        }
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

    // Tasks context (deadlines, statuses)
    let tasksBlock = "";
    {
      let tq = context.supabase
        .from("tasks")
        .select("title, status, priority, due_date, assignee_name")
        .neq("status", "done");
      if (data.teamspace_id) tq = tq.eq("teamspace_id", data.teamspace_id);
      const { data: myTasks } = await tq
        .order("due_date", { ascending: true })
        .limit(60);
      if (myTasks && myTasks.length) {
        tasksBlock =
          `\n\nCURRENT TASKS (today is ${new Date().toISOString().slice(0, 10)}; use for questions about workload and deadlines):\n` +
          myTasks
            .map(
              (x: any) =>
                `- ${x.title} [${x.status}/${x.priority}${x.due_date ? `, due ${x.due_date}` : ", no due date"}${x.assignee_name ? `, ${x.assignee_name}` : ""}]`,
            )
            .join("\n");
      }
    }

    // Google Drive context (files of the connected user)
    let driveBlock = "";
    try {
      const gd = await import("./google-drive.server");
      const driveUser = await gd.resolveDriveUserId(context.userId, data.teamspace_id ?? null);
      if (driveUser) {
        const files = await gd.listFiles(driveUser);
        if (files.length) {
          driveBlock =
            "\n\nGOOGLE DRIVE FILES (workspace-connected account — their content below is authoritative):\n" +
            files
              .slice(0, 60)
              .map((f) => `- id=${f.id} "${f.name}" (${f.mimeType})${f.webViewLink ? ` ${f.webViewLink}` : ""}`)
              .join("\n");

          // Pick files the user is likely asking about: name-word overlap,
          // plus spreadsheets when the question is about tables/numbers.
          const q = (lastUser?.content ?? "").toLowerCase();
          const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);
          const wantsSheet = /(таблиц|sheet|excel|csv|отчет|отчёт|финанс|budget|бюджет|данн)/i.test(q);
          const scored = files
            .map((f) => {
              const base = (f.name || "").toLowerCase();
              let score = 0;
              if (base && q.includes(base.split(".")[0])) score += 10;
              for (const w of words) if (base.includes(w)) score += 2;
              if (wantsSheet && /spreadsheet|excel|sheet/i.test(f.mimeType || "")) score += 3;
              return { f, score };
            })
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          for (const { f } of scored) {
            try {
              const doc = await gd.readFile(driveUser, f.id);
              const content = String(doc.content ?? "").trim();
              driveBlock += content
                ? `\n\n### DRIVE FILE: ${f.name} (id=${f.id})\n${content.slice(0, 60_000)}`
                : `\n\n### DRIVE FILE: ${f.name} (id=${f.id}) — файл пустой или нечитаемый.`;
            } catch (e) {
              driveBlock += `\n\n### DRIVE FILE: ${f.name} (id=${f.id}) — не удалось прочитать: ${
                e instanceof Error ? e.message.slice(0, 200) : "ошибка"
              }`;
            }
          }
          driveBlock +=
            "\n\nWhen a Google Sheet is included above, every tab is present as '## SHEET: <name>' — read ALL tabs before answering.";
        }
      }
    } catch {
      /* Drive not connected or unavailable — continue without it */
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
      inlineSheetBlock +
      tasksBlock +
      driveBlock;

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

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

import { AGENT_PROMPTS } from "./agents";


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
    const currentDate = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);

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

    // Team + tasks context (for assignment, editing and per-person questions)
    let teamBlock = "";
    if (data.teamspace_id) {
      const { data: members } = await context.supabase
        .from("teamspace_members")
        .select("user_id, role")
        .eq("teamspace_id", data.teamspace_id);
      const ids = (members ?? []).map((m: any) => m.user_id);
      let profiles: any[] = [];
      if (ids.length) {
        const { data: profs } = await context.supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        profiles = profs ?? [];
      }
      const { data: pending } = await context.supabase
        .from("pending_members")
        .select("name")
        .eq("teamspace_id", data.teamspace_id)
        .is("linked_user_id", null);
      const lines = (members ?? []).map((m: any) => {
        const p = profiles.find((x) => x.id === m.user_id);
        return `- id=${m.user_id} name="${p?.full_name || p?.email || "Без имени"}" role=${m.role}`;
      });
      for (const pm of pending ?? []) lines.push(`- id=none name="${pm.name}" (нет аккаунта, задача будет помечена именем)`);
      if (lines.length) {
        teamBlock =
          "\n\nTEAM MEMBERS of the active workspace (match the person the user names — including nicknames, cases and translit — to one of these; use their exact id):\n" +
          lines.join("\n");
      }
    }

    // Tasks context (deadlines, statuses, ids for editing)
    let tasksBlock = "";
    {
      let tq = context.supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, assignee_name, assignee_id, project, department")
        .neq("status", "done");
      if (data.teamspace_id) tq = tq.eq("teamspace_id", data.teamspace_id);
      const { data: myTasks } = await tq
        .order("due_date", { ascending: true })
        .limit(150);
      if (myTasks && myTasks.length) {
        tasksBlock =
          `\n\nCURRENT TASKS (today is ${currentDate}; use for workload, deadlines, per-person questions and for editing existing tasks — the id is what you put in a task-update token):\n` +
          myTasks
            .map(
              (x: any) =>
                `- id=${x.id} "${x.title}" [${x.status}/${x.priority}${x.due_date ? `, due ${x.due_date}` : ", no due date"}${x.assignee_name ? `, assignee ${x.assignee_name}` : ", no assignee"}${x.project ? `, project ${x.project}` : ""}${x.department ? `, dept ${x.department}` : ""}]`,
            )
            .join("\n");
      }
    }

    // Google Drive context (files of the connected user)
    let driveBlock = "";
    try {
      const gd = await import("./google-drive.server");
      const driveUser = await gd.resolveDriveUserId(context.userId);
      if (driveUser) {
        const files = await gd.listFiles(driveUser);
        if (files.length) {
          driveBlock =
            "\n\nGOOGLE DRIVE FILES (metadata only; do not infer file contents from this list. Only files followed by a ### DRIVE FILE content section were actually read):\n" +
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
              if (
                wantsSheet &&
                (/spreadsheet|excel|sheet/i.test(f.mimeType || "") || /\.(xlsx|xls|xlsm|xlsb|ods)$/i.test(f.name || ""))
              ) score += 3;
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

    let companyBlock = "";
    try {
      const { buildCompanyContext } = await import("./company-context.server");
      companyBlock = await buildCompanyContext(data.teamspace_id);
    } catch {
      companyBlock = "";
    }

    const systemPrompt =
      agentPreamble +
      "You are Virtual Space AI, the assistant inside Virtual Space — an AI virtual office for teams. " +
      `CURRENT DATE: ${currentDate} in Asia/Bishkek (UTC+6). This is authoritative. Never infer the current date from conversation history, examples, files, or model knowledge. When asked for today's date, use this exact date. ` +
      "Be concise, warm, and practical. Reply in the user's language. " +
      "Reply as plain text only: do NOT use Markdown, asterisks (*), underscores (_), backticks, headings (#), or bullet symbols. " +
      "Write in normal sentences and short paragraphs; if you need a list, use numbers like '1.' or plain lines. " +
      "When you reference or cite a file from the KNOWLEDGE BASE, ALWAYS use this exact inline syntax: [[file:UUID|File name]] — the app will render it as a clickable link. " +
      "STRICT: only emit a [[file:...]] token whose id AND name appear verbatim in the KNOWLEDGE BASE or GOOGLE DRIVE FILES list below. Never invent, guess, translate, or reconstruct a file id or file name. If no matching file exists, write the answer without any file token and say that the file was not found in the knowledge base. Do not claim a file exists, was created, or was uploaded unless it is listed below. " +
       "A file name or a GOOGLE DRIVE FILES list is metadata, not file content. Never infer or invent what is inside a file from its name. Only describe rows, tasks, figures, or facts that appear in an included FILE or DRIVE FILE content block. If the requested file has no content block or could not be read, say clearly that you could not read it and ask the user to reconnect or re-index it. For spreadsheets, inspect every included SHEET section before answering and preserve the exact task names from the cells. " +
      "If the user asks for a report, summary, or something derived from a file, produce the answer as text and cite the relevant [[file:...]] links so they can open the source.\n\n" +

      "TASK AGENT: You also act as the task agent of this workspace. From a plain sentence like " +
      "\"Создай задачу для Айзы: проверить билеты для спикеров, высокий приоритет\" you must infer: title, assignee, project, " +
      "department/direction, priority, due date and a short description/context. Use TEAM MEMBERS to resolve the person the user " +
      "names (nicknames, declensions, translit all count) and put their exact id in the token. Infer relative dates (сегодня, завтра, " +
      "до пятницы, на следующей неделе) from CURRENT DATE. Infer project and department from the request, the existing tasks and the " +
      "company context; leave them empty when there is no reasonable signal.\n" +
      "To create a task emit ONE token per task, each on its own line, with EXACTLY 7 fields:\n" +
      "[[task:Title||priority||YYYY-MM-DD||description||assigneeIdOrName||project||department]]\n" +
      "priority ∈ low|medium|high|urgent (default medium). The date is required and cannot be earlier than CURRENT DATE. " +
      "Leave a field empty (just ||) when it does not apply. Example: " +
      "[[task:Проверить билеты для спикеров||high||2026-09-19||Сверить брони и время прилёта||3ae11a41-84f0-4184-b328-6fc4e4d74915||Hackathon Osh||Logistics]]\n" +
      "To CHANGE an existing task (the user says перенеси, поменяй, переназначь, подними приоритет, закрой, переименуй) emit:\n" +
      "[[task-update:TASK_ID||field=value||field=value]] — allowed fields: title, priority, due_date, status (backlog|in_progress|review|done), " +
      "assignee (member id or name), project, department, description. Take TASK_ID from CURRENT TASKS. If several tasks could match, ask which one.\n" +
      "Assignee field: ALWAYS the member id from TEAM MEMBERS when the person has an account; use a bare name only for people listed as (нет аккаунта). Priority wording: срочно/горит/ASAP = urgent, важно/высокий = high, обычная = medium, потом/не срочно = low.\n" +
      "MISSING CRITICAL FIELD: if the title, the assignee or the deadline cannot be inferred with confidence, do NOT emit a token — ask ONE short " +
      "clarifying question naming only what is missing, and emit the token in the next turn once the user answers.\n" +
      "Questions about a person's tasks (\"что у Тимура\", \"задачи Айзы\") are answered from CURRENT TASKS: list their open tasks with status and deadline, " +
      "flag overdue ones, and say plainly when the person has no tasks. Confirm briefly in the user's language after the tokens. Never wrap tokens in quotes or code.\n" +
      teamBlock +
      companyBlock +
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

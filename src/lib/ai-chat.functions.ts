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
});

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

    const systemPrompt =
      "You are Virtual Space AI, the assistant inside Virtual Space — an AI virtual office for teams. " +
      "Be concise, warm, and practical. Reply in the user's language. " +
      "Reply as plain text only: do NOT use Markdown, asterisks (*), underscores (_), backticks, headings (#), or bullet symbols. " +
      "Write in normal sentences and short paragraphs; if you need a list, use numbers like '1.' or plain lines. " +
      "When you reference or cite a file from the KNOWLEDGE BASE, ALWAYS use this exact inline syntax: [[file:UUID|File name]] — the app will render it as a clickable link. " +
      "Never invent file ids. Only use ids that appear in the KNOWLEDGE BASE below. " +
      "If the user asks for a report, summary, or something derived from a file, produce the answer as text and cite the relevant [[file:...]] links so they can open the source." +
      knowledgeBlock;

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

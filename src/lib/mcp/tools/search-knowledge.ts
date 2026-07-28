import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_knowledge_base",
  title: "Search knowledge base",
  description:
    "Search the Virtual Space knowledge base (uploaded documents) by name or extracted text and return matching excerpts.",
  inputSchema: {
    query: z.string().min(1).max(200).describe("Text to search for in document names and contents."),
    limit: z.number().int().min(1).max(20).optional().describe("Max documents to return (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const escaped = query.replace(/[%,]/g, " ");
    const { data, error } = await supabaseForUser(ctx)
      .from("documents")
      .select("id, name, mime_type, extracted_text, created_at")
      .or(`name.ilike.%${escaped}%,extracted_text.ilike.%${escaped}%`)
      .limit(limit ?? 5);
    if (error) return errorResult(error.message);
    const docs = (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      mime_type: d.mime_type,
      created_at: d.created_at,
      excerpt: d.extracted_text ? d.extracted_text.slice(0, 4000) : null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(docs) }],
      structuredContent: { documents: docs },
    };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_documents",
  title: "List knowledge base documents",
  description: "List documents available in the signed-in user's Virtual Space knowledge base.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max documents to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("documents")
      .select("id, name, mime_type, size_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { documents: data ?? [] },
    };
  },
});

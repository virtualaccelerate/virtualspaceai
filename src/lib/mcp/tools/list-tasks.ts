import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description:
    "List the signed-in user's Virtual Space tasks, optionally filtered by status (backlog, in_progress, review, done).",
  inputSchema: {
    status: z
      .enum(["backlog", "in_progress", "review", "done"])
      .optional()
      .describe("Only return tasks in this status."),
    project: z.string().max(160).optional().describe("Only tasks in this project (case-insensitive name)."),
    department: z.string().max(160).optional().describe("Only tasks in this department (case-insensitive name)."),
    limit: z.number().int().min(1).max(100).optional().describe("Max tasks to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit, project, department }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("tasks")
      .select("id, title, description, status, priority, due_date, assignee_name, project, department, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);
    const esc = (v: string) => v.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
    if (project?.trim()) query = query.ilike("project", esc(project));
    if (department?.trim()) query = query.ilike("department", esc(department));
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tasks: data ?? [] },
    };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_task",
  title: "Update task",
  description:
    "Update an existing task (status, priority, title, description, due date or assignee) by its id.",
  inputSchema: {
    id: z.string().describe("Task id (UUID) returned by list_tasks."),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(4000).optional(),
    status: z.enum(["backlog", "in_progress", "review", "done"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    assignee_name: z.string().max(200).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const fields = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(fields).length === 0) return errorResult("No fields to update");
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .update(fields)
      .eq("id", id)
      .select("id, title, status, priority, due_date")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Task not found");
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { task: data },
    };
  },
});

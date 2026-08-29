import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult } from "../supabase";
import { createTaskForUser } from "@/lib/tasks.server";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description: "Create a new task on the signed-in user's Virtual Space board.",
  inputSchema: {
    title: z.string().min(1).max(300).describe("Short task title."),
    description: z.string().max(4000).optional().describe("Optional task details."),
    status: z
      .enum(["backlog", "in_progress", "review", "done"])
      .optional()
      .describe("Board column (default backlog)."),
    priority: z
      .enum(["low", "medium", "high", "urgent"])
      .optional()
      .describe("Task priority (default medium)."),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Due date as YYYY-MM-DD."),
    assignee_name: z.string().max(200).optional().describe("Who the task is assigned to."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const userId = ctx.getUserId();
    if (!userId) return errorResult("Not authenticated");
    let data;
    try {
      data = await createTaskForUser(userId, {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        due_date: input.due_date,
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : String(error));
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { task: data },
    };
  },
});

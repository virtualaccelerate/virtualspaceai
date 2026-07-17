import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusEnum = z.enum(["backlog", "in_progress", "review", "done"]);
const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

const CreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  status: StatusEnum.optional(),
  priority: PriorityEnum.optional(),
  assignee_name: z.string().max(200).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const status = data.status ?? "backlog";
    const { count } = await context.supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", status);
    const position = (count ?? 0) * 1000;

    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        status,
        priority: data.priority ?? "medium",
        assignee_name: data.assignee_name ?? null,
        due_date: data.due_date ?? null,
        position,
      })
      .select("id, title, status, priority, due_date")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

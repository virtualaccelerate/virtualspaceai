import { runAiNotifications } from "./src/lib/ai-notify.server";
import { notifyTaskAssignee } from "./src/lib/telegram.server";
const TS = "ae3dec2a-3f08-4d11-8c00-52e7424a905d";
const UID = "3ae11a41-84f0-4184-b328-6fc4e4d74915";
const { supabaseAdmin } = await import("./src/integrations/supabase/client.server");
const { data: t } = await supabaseAdmin.from("tasks").select("id,title,due_date,priority").eq("teamspace_id", TS).ilike("title", "[ТЕСТ]%").limit(1).maybeSingle();
if (t) {
  await notifyTaskAssignee({ taskId: t.id, assigneeId: UID, title: t.title, dueDate: t.due_date, priority: t.priority, actorName: "Руководитель" } as any).catch((e: any) => console.log("assignee err", e?.message));
  console.log("assign notification sent for", t.title);
}
for (const pass of ["pulse", "morning", "evening"] as const) {
  const r = await runAiNotifications(pass, TS);
  console.log(pass, JSON.stringify(r));
}

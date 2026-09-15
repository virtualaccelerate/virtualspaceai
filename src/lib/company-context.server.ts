/**
 * Builds a "company.md" style context block: who works in the workspace,
 * who owns which task, and any company.md document the team uploaded.
 * Injected into every AI prompt so the assistant stops guessing names/owners.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const STATUS_RU: Record<string, string> = {
  backlog: "бэклог",
  in_progress: "в работе",
  review: "на проверке",
  done: "готово",
};

export async function buildCompanyContext(teamspaceId: string | null | undefined): Promise<string> {
  if (!teamspaceId) return "";
  const db = await admin();

  const [tsRes, memberRes, taskRes, docRes] = await Promise.all([
    db.from("teamspaces").select("name, business_type, team_size, owner_id").eq("id", teamspaceId).maybeSingle(),
    db.from("teamspace_members").select("user_id, role").eq("teamspace_id", teamspaceId),
    db
      .from("tasks")
      .select("title, status, priority, due_date, assignee_id, assignee_name")
      .eq("teamspace_id", teamspaceId)
      .order("due_date", { ascending: true })
      .limit(200),
    db
      .from("documents")
      .select("name, extracted_text")
      .eq("teamspace_id", teamspaceId)
      .ilike("name", "%company%")
      .limit(3),
  ]);

  const ts = tsRes.data;
  const memberships = memberRes.data ?? [];
  const ids = memberships.map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const nameOf = (id: string | null) => {
    if (!id) return null;
    const p = profiles?.find((x) => x.id === id);
    return p?.full_name || p?.email || null;
  };

  const lines: string[] = [];
  lines.push("# COMPANY CONTEXT (факты о компании — используй их вместо догадок)");
  if (ts) {
    lines.push(
      `Рабочее пространство: ${ts.name} (тип: ${ts.business_type}, размер команды: ${ts.team_size}).`,
    );
    const owner = nameOf(ts.owner_id);
    if (owner) lines.push(`Владелец (утверждает задачи): ${owner}.`);
  }

  if (memberships.length) {
    lines.push("\n## Сотрудники");
    for (const m of memberships) {
      const p = profiles?.find((x) => x.id === m.user_id);
      lines.push(`- ${p?.full_name || p?.email || m.user_id} — роль: ${m.role}${p?.email ? `, email: ${p.email}` : ""}`);
    }
  }

  const tasks = taskRes.data ?? [];
  const open = tasks.filter((t) => t.status !== "done");
  if (tasks.length) {
    lines.push(`\n## Задачи (всего ${tasks.length}, открытых ${open.length})`);
    const byPerson = new Map<string, typeof tasks>();
    for (const t of open) {
      const key = t.assignee_name || nameOf(t.assignee_id) || "Без исполнителя";
      const arr = byPerson.get(key) ?? [];
      arr.push(t);
      byPerson.set(key, arr);
    }
    for (const [person, rows] of byPerson) {
      lines.push(`\n### ${person} (${rows.length})`);
      for (const r of rows.slice(0, 40)) {
        lines.push(
          `- ${r.title} [${STATUS_RU[r.status] ?? r.status} / ${r.priority}${r.due_date ? ` / срок ${r.due_date}` : ""}]`,
        );
      }
    }
  }

  for (const doc of docRes.data ?? []) {
    if (!doc.extracted_text) continue;
    lines.push(`\n## Документ «${doc.name}»\n${doc.extracted_text.slice(0, 20_000)}`);
  }

  lines.push(
    "\nСТРОГО: имена сотрудников, названия задач и исполнителей бери только из этого блока. Не придумывай людей и задачи, которых тут нет.",
  );
  return `\n\n${lines.join("\n")}\n`;
}

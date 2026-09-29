// Payroll: per-employee rules (fixed monthly / per project task / per task) computed from Task Tracker.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function requirePayrollManager(userId: string, teamspaceId: string) {
  const db = await admin();
  const { data: m } = await db.from("teamspace_members").select("id")
    .eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!m) throw new Error("Нет доступа к рабочему пространству");
  const { isWorkspaceManager } = await import("./roles.server");
  if (!(await isWorkspaceManager(userId, teamspaceId))) {
    throw new Error("Зарплаты доступны только владельцу и администраторам");
  }
}

export type RuleKind = "fixed" | "project" | "task";
export type PayrollRule = {
  id: string; user_id: string; kind: RuleKind; amount: number; currency: string;
  project: string | null; task_id: string | null; note: string | null;
};

export async function listRules(userId: string, teamspaceId: string) {
  await requirePayrollManager(userId, teamspaceId);
  const db = await admin();
  const [{ data: rules }, members, { data: tasks }, { data: projects }] = await Promise.all([
    db.from("payroll_rules").select("id, user_id, kind, amount, currency, project, task_id, note")
      .eq("teamspace_id", teamspaceId).order("created_at"),
    teamMembers(teamspaceId),
    db.from("tasks").select("id, title, project, assignee_id, status")
      .eq("teamspace_id", teamspaceId).order("created_at", { ascending: false }).limit(1000),
    db.from("projects").select("name").eq("teamspace_id", teamspaceId),
  ]);
  const projectNames = new Set<string>();
  for (const p of projects ?? []) if (p.name) projectNames.add(p.name);
  for (const t of tasks ?? []) {
    const p = t.project;
    if (p) projectNames.add(p);
  }
  return {
    rules: (rules ?? []) as PayrollRule[],
    members,
    projects: [...projectNames].sort(),
    tasks: (tasks ?? []).map((t) => ({ id: t.id, title: t.title, project: t.project, assignee_id: t.assignee_id })),
  };
}

async function teamMembers(teamspaceId: string) {
  const db = await admin();
  const { data: mem } = await db.from("teamspace_members").select("user_id, role").eq("teamspace_id", teamspaceId);
  const ids = (mem ?? []).map((m) => m.user_id);
  const { data: profs } = ids.length
    ? await db.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  return (mem ?? []).map((m) => {
    const p = profs?.find((x) => x.id === m.user_id);
    return { user_id: m.user_id, role: m.role as string, name: p?.full_name || p?.email || "Сотрудник", email: p?.email ?? null };
  });
}

export async function saveRule(userId: string, teamspaceId: string, r: {
  id?: string; user_id: string; kind: RuleKind; amount: number; currency: string;
  project?: string | null; task_id?: string | null; note?: string | null;
}) {
  await requirePayrollManager(userId, teamspaceId);
  const db = await admin();
  if (r.kind === "project" && !r.project) throw new Error("Укажите проект");
  const row = {
    teamspace_id: teamspaceId, user_id: r.user_id, kind: r.kind, amount: r.amount,
    currency: r.currency || "KGS",
    project: r.kind === "project" ? r.project ?? null : null,
    task_id: r.kind === "task" ? r.task_id ?? null : null,
    note: r.note ?? null, created_by: userId,
  };
  if (r.id) {
    const { error } = await db.from("payroll_rules").update(row).eq("id", r.id).eq("teamspace_id", teamspaceId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("payroll_rules").insert(row);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function deleteRule(userId: string, teamspaceId: string, id: string) {
  await requirePayrollManager(userId, teamspaceId);
  const db = await admin();
  await db.from("payroll_rules").delete().eq("id", id).eq("teamspace_id", teamspaceId);
  return { ok: true };
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export type PayLine = { kind: RuleKind; label: string; amount: number; currency: string; basis: string; tasks: { id: string; title: string; project: string | null; done_at: string }[] };
export type PayEmployee = { user_id: string; name: string; email: string | null; totals: Record<string, number>; lines: PayLine[]; done_tasks: { id: string; title: string; project: string | null; done_at: string }[] };

export async function computePayroll(userId: string, teamspaceId: string, from: string, to: string) {
  await requirePayrollManager(userId, teamspaceId);
  const db = await admin();
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T23:59:59Z`);
  const [{ data: rules }, members, { data: tasks }] = await Promise.all([
    db.from("payroll_rules").select("id, user_id, kind, amount, currency, project, task_id, note").eq("teamspace_id", teamspaceId),
    teamMembers(teamspaceId),
    db.from("tasks").select("id, title, project, assignee_id, status, reviewed_at, updated_at")
      .eq("teamspace_id", teamspaceId).eq("status", "done").not("assignee_id", "is", null).limit(5000),
  ]);
  const done = (tasks ?? []).map((t) => ({ ...t, done_at: (t.reviewed_at ?? t.updated_at) as string }))
    .filter((t) => { const d = new Date(t.done_at); return d >= start && d <= end; });

  // Fixed salary is prorated by calendar days of the period vs. a 30-day month.
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const monthFactor = Math.round((days / 30) * 100) / 100;

  const employees: PayEmployee[] = members.map((m) => {
    const mine = done.filter((t) => t.assignee_id === m.user_id);
    const brief = (t: typeof mine[number]) => ({ id: t.id, title: t.title, project: t.project, done_at: t.done_at.slice(0, 10) });
    const lines: PayLine[] = [];
    for (const r of (rules ?? []).filter((x) => x.user_id === m.user_id)) {
      const amt = Number(r.amount) || 0;
      if (r.kind === "fixed") {
        const f = monthFactor >= 0.93 && monthFactor <= 1.04 ? 1 : monthFactor;
        lines.push({ kind: "fixed", label: "Фиксированная зарплата", amount: Math.round(amt * f), currency: r.currency,
          basis: f === 1 ? `${amt} ${r.currency} в месяц × 1 месяц` : `${amt} ${r.currency}/мес × ${f} (${days} дн. / 30)`, tasks: [] });
      } else if (r.kind === "project") {
        const ts = mine.filter((t) => norm(t.project) === norm(r.project));
        lines.push({ kind: "project", label: `Проект «${r.project}»`, amount: Math.round(amt * ts.length), currency: r.currency,
          basis: `${ts.length} выполн. задач × ${amt} ${r.currency}`, tasks: ts.map(brief) });
      } else if (r.task_id) {
        const ts = mine.filter((t) => t.id === r.task_id);
        const title = (tasks ?? []).find((t) => t.id === r.task_id)?.title ?? "задача";
        lines.push({ kind: "task", label: `Задача «${title}»`, amount: ts.length ? amt : 0, currency: r.currency,
          basis: ts.length ? `выполнена ${ts[0].done_at.slice(0, 10)} — ${amt} ${r.currency}` : "не выполнена в периоде — 0", tasks: ts.map(brief) });
      } else {
        // Per completed task — excluding tasks already paid by a project or specific-task rule.
        const covered = new Set((rules ?? []).filter((x) => x.user_id === m.user_id && x.kind !== "fixed" && x !== r)
          .flatMap((x) => mine.filter((t) => x.kind === "project" ? norm(t.project) === norm(x.project) : t.id === x.task_id).map((t) => t.id)));
        const ts = mine.filter((t) => !covered.has(t.id));
        lines.push({ kind: "task", label: "Оплата за выполненные задачи", amount: Math.round(amt * ts.length), currency: r.currency,
          basis: `${ts.length} задач × ${amt} ${r.currency}${covered.size ? ` (без ${covered.size} уже оплаченных по проекту/задаче)` : ""}`, tasks: ts.map(brief) });
      }
    }
    const totals: Record<string, number> = {};
    for (const l of lines) totals[l.currency] = (totals[l.currency] ?? 0) + l.amount;
    return { user_id: m.user_id, name: m.name, email: m.email, totals, lines, done_tasks: mine.map(brief) };
  });
  const grand: Record<string, number> = {};
  for (const e of employees) for (const [c, v] of Object.entries(e.totals)) grand[c] = (grand[c] ?? 0) + v;
  return { from, to, days, employees, grand };
}

export function payrollCorpus(p: Awaited<ReturnType<typeof computePayroll>>) {
  const out: string[] = [`ПЕРИОД: ${p.from} — ${p.to} (${p.days} дн.)`, `ИТОГО К ВЫПЛАТЕ: ${fmtTotals(p.grand)}`];
  for (const e of p.employees) {
    out.push(`\nСОТРУДНИК: ${e.name}${e.email ? ` <${e.email}>` : ""} — итого ${fmtTotals(e.totals)}`);
    if (!e.lines.length) out.push("  (правила оплаты не настроены)");
    for (const l of e.lines) {
      out.push(`  • ${l.label}: ${l.amount} ${l.currency} — ${l.basis}`);
      for (const t of l.tasks.slice(0, 40)) out.push(`      - ${t.title}${t.project ? ` [${t.project}]` : ""} (выполнена ${t.done_at})`);
    }
    const unpaid = e.done_tasks.filter((t) => !e.lines.some((l) => l.tasks.some((x) => x.id === t.id)));
    if (unpaid.length) out.push(`  Выполнено без отдельной оплаты: ${unpaid.slice(0, 30).map((t) => `${t.title}${t.project ? ` [${t.project}]` : ""}`).join("; ")}`);
  }
  return out.join("\n");
}

function fmtTotals(t: Record<string, number>) {
  const e = Object.entries(t);
  return e.length ? e.map(([c, v]) => `${v} ${c}`).join(" + ") : "0";
}

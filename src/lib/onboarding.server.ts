/**
 * Onboarding & Training.
 *
 * A program holds materials (video / image / link / text), stages (steps) and
 * checklist items. Employees get an assignment; their progress is a row per
 * viewed material and per completed checklist item, plus an optional score.
 *
 * Server-only.
 */

export type MaterialKind = "video" | "image" | "link" | "text";
export const MATERIAL_KINDS: MaterialKind[] = ["video", "image", "link", "text"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function activeTeamspace(userId: string, requested?: string | null) {
  const db = await admin();
  let teamspaceId = requested ?? undefined;
  if (!teamspaceId) {
    const { data } = await db.from("profiles").select("current_teamspace_id").eq("id", userId).maybeSingle();
    teamspaceId = data?.current_teamspace_id ?? undefined;
  }
  if (!teamspaceId) throw new Error("Нет активного рабочего пространства");
  const { data: membership } = await db
    .from("teamspace_members").select("id").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!membership) throw new Error("Нет доступа к рабочему пространству");
  return teamspaceId;
}

async function manager(userId: string, teamspaceId: string) {
  const { isWorkspaceManager } = await import("./roles.server");
  return isWorkspaceManager(userId, teamspaceId);
}

async function requireManager(userId: string, teamspaceId: string) {
  if (!(await manager(userId, teamspaceId))) {
    throw new Error("Управлять обучением может только владелец или администратор");
  }
}

async function programOf(userId: string, programId: string) {
  const db = await admin();
  const { data } = await db.from("onboarding_programs").select("*").eq("id", programId).maybeSingle();
  if (!data) throw new Error("Обучение не найдено");
  await activeTeamspace(userId, data.teamspace_id);
  return data;
}

function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

// ---------------- reading ----------------

export async function listProgramsForUser(userId: string, requested?: string | null) {
  const teamspaceId = await activeTeamspace(userId, requested);
  const db = await admin();
  const isManager = await manager(userId, teamspaceId);

  const { data: programs } = await db
    .from("onboarding_programs")
    .select("*")
    .eq("teamspace_id", teamspaceId)
    .order("created_at", { ascending: false });

  const ids = (programs ?? []).map((p) => p.id);
  const [{ data: items }, { data: materials }, { data: assignments }, { data: progress }] = await Promise.all([
    ids.length ? db.from("onboarding_items").select("id, program_id").in("program_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from("onboarding_materials").select("id, program_id").in("program_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from("onboarding_assignments").select("id, program_id, user_id, status").in("program_id", ids) : Promise.resolve({ data: [] as any[] }),
    db.from("onboarding_progress").select("assignment_id, ref_kind, done").eq("teamspace_id", teamspaceId),
  ]);

  const rows = (programs ?? []).map((p) => {
    const total = (items ?? []).filter((i) => i.program_id === p.id).length;
    const mine = (assignments ?? []).filter((a) => a.program_id === p.id);
    const percents = mine.map((a) => {
      const done = (progress ?? []).filter((x) => x.assignment_id === a.id && x.ref_kind === "item" && x.done).length;
      return pct(done, total);
    });
    const myAssignment = mine.find((a) => a.user_id === userId) ?? null;
    return {
      ...p,
      steps_total: total,
      materials_total: (materials ?? []).filter((m) => m.program_id === p.id).length,
      assigned: isManager ? mine.length : 0,
      completed: isManager ? mine.filter((a) => a.status === "completed").length : 0,
      avg_progress: isManager && percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0,
      my_progress: myAssignment
        ? pct((progress ?? []).filter((x) => x.assignment_id === myAssignment.id && x.ref_kind === "item" && x.done).length, total)
        : null,
    };
  });

  return { teamspace_id: teamspaceId, is_manager: isManager, programs: rows };
}

export async function getProgramForUser(userId: string, programId: string) {
  const program = await programOf(userId, programId);
  const db = await admin();
  const teamspaceId = program.teamspace_id;
  const isManager = await manager(userId, teamspaceId);

  const [{ data: materials }, { data: steps }, { data: items }, { data: assignments }] = await Promise.all([
    db.from("onboarding_materials").select("*").eq("program_id", programId).order("position"),
    db.from("onboarding_steps").select("*").eq("program_id", programId).order("position"),
    db.from("onboarding_items").select("*").eq("program_id", programId).order("position"),
    db.from("onboarding_assignments").select("*").eq("program_id", programId),
  ]);

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: progress } = assignmentIds.length
    ? await db.from("onboarding_progress").select("*").in("assignment_id", assignmentIds)
    : { data: [] as any[] };

  const userIds = (assignments ?? []).map((a) => a.user_id);
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds)
    : { data: [] as any[] };

  const totalItems = (items ?? []).length;
  const totalMaterials = (materials ?? []).length;

  const people = (assignments ?? []).map((a) => {
    const mine = (progress ?? []).filter((p) => p.assignment_id === a.id && p.done);
    const doneItems = mine.filter((p) => p.ref_kind === "item").map((p) => p.ref_id);
    const viewed = mine.filter((p) => p.ref_kind === "material").map((p) => p.ref_id);
    const profile = (profiles ?? []).find((p) => p.id === a.user_id);
    return {
      assignment_id: a.id,
      user_id: a.user_id,
      name: profile?.full_name ?? profile?.email ?? "Участник",
      email: profile?.email ?? null,
      avatar_url: profile?.avatar_url ?? null,
      status: a.status,
      score: a.score,
      due_date: a.due_date,
      completed_at: a.completed_at,
      done_items: doneItems,
      viewed_materials: viewed,
      progress: pct(doneItems.length, totalItems),
      materials_progress: pct(viewed.length, totalMaterials),
    };
  });

  const me = people.find((p) => p.user_id === userId) ?? null;
  // Members never see other employees' progress or quiz results.
  const visiblePeople = isManager ? people : me ? [me] : [];

  return {
    program,
    is_manager: isManager,
    materials: materials ?? [],
    steps: (steps ?? []).map((s) => ({ ...s, items: (items ?? []).filter((i) => i.step_id === s.id) })),
    people: visiblePeople.sort((a, b) => a.name.localeCompare(b.name)),
    me,
    totals: { items: totalItems, materials: totalMaterials },
  };
}

/** Training status per team member, used by the Team page and member cards. */
export async function trainingProgressForTeam(userId: string, requested?: string | null) {
  const teamspaceId = await activeTeamspace(userId, requested);
  const db = await admin();
  const isManager = await manager(userId, teamspaceId);

  const assignmentQuery = db
    .from("onboarding_assignments")
    .select("id, user_id, program_id, status, score")
    .eq("teamspace_id", teamspaceId);

  const [{ data: assignments }, { data: items }, { data: programs }] = await Promise.all([
    isManager ? assignmentQuery : assignmentQuery.eq("user_id", userId),
    db.from("onboarding_items").select("id, program_id").eq("teamspace_id", teamspaceId),
    db.from("onboarding_programs").select("id, title").eq("teamspace_id", teamspaceId),
  ]);
  const ids = (assignments ?? []).map((a) => a.id);
  const { data: progress } = ids.length
    ? await db.from("onboarding_progress").select("assignment_id, ref_kind, done").in("assignment_id", ids)
    : { data: [] as any[] };

  const byUser: Record<string, { programs: number; completed: number; progress: number; details: { title: string; progress: number; status: string; score: number | null }[] }> = {};
  for (const a of assignments ?? []) {
    const total = (items ?? []).filter((i) => i.program_id === a.program_id).length;
    const done = (progress ?? []).filter((p) => p.assignment_id === a.id && p.ref_kind === "item" && p.done).length;
    const percent = pct(done, total);
    const entry = (byUser[a.user_id] ??= { programs: 0, completed: 0, progress: 0, details: [] });
    entry.programs += 1;
    if (a.status === "completed") entry.completed += 1;
    entry.details.push({
      title: (programs ?? []).find((p) => p.id === a.program_id)?.title ?? "Обучение",
      progress: percent,
      status: a.status,
      score: a.score ?? null,
    });
  }
  for (const entry of Object.values(byUser)) {
    entry.progress = entry.details.length
      ? Math.round(entry.details.reduce((sum, d) => sum + d.progress, 0) / entry.details.length)
      : 0;
  }
  return { teamspace_id: teamspaceId, by_user: byUser };
}

// ---------------- writing ----------------

export async function createProgramForUser(
  userId: string,
  input: { title: string; description?: string | null; audience?: string | null; teamspace_id?: string | null },
) {
  const teamspaceId = await activeTeamspace(userId, input.teamspace_id ?? null);
  await requireManager(userId, teamspaceId);
  const db = await admin();
  const { data, error } = await db
    .from("onboarding_programs")
    .insert({
      teamspace_id: teamspaceId,
      title: input.title,
      description: input.description ?? null,
      audience: input.audience ?? null,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProgramForUser(
  userId: string,
  input: { program_id: string; title?: string; description?: string | null; audience?: string | null; published?: boolean },
) {
  const program = await programOf(userId, input.program_id);
  await requireManager(userId, program.teamspace_id);
  const db = await admin();
  const patch: {
    title?: string;
    description?: string | null;
    audience?: string | null;
    published?: boolean;
  } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.audience !== undefined) patch.audience = input.audience;
  if (input.published !== undefined) patch.published = input.published;
  const { error } = await db.from("onboarding_programs").update(patch).eq("id", program.id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteProgramForUser(userId: string, programId: string) {
  const program = await programOf(userId, programId);
  await requireManager(userId, program.teamspace_id);
  const db = await admin();
  const { error } = await db.from("onboarding_programs").delete().eq("id", program.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function addMaterialForUser(
  userId: string,
  input: { program_id: string; kind: MaterialKind; title: string; url?: string | null; content?: string | null },
) {
  const program = await programOf(userId, input.program_id);
  await requireManager(userId, program.teamspace_id);
  const db = await admin();
  const { count } = await db
    .from("onboarding_materials").select("id", { count: "exact", head: true }).eq("program_id", program.id);
  const { data, error } = await db
    .from("onboarding_materials")
    .insert({
      program_id: program.id,
      teamspace_id: program.teamspace_id,
      kind: input.kind,
      title: input.title,
      url: input.url ?? null,
      content: input.content ?? null,
      position: count ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMaterialForUser(userId: string, materialId: string) {
  const db = await admin();
  const { data: material } = await db.from("onboarding_materials").select("*").eq("id", materialId).maybeSingle();
  if (!material) throw new Error("Материал не найден");
  await activeTeamspace(userId, material.teamspace_id);
  await requireManager(userId, material.teamspace_id);
  const { error } = await db.from("onboarding_materials").delete().eq("id", materialId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function addStepForUser(userId: string, input: { program_id: string; title: string; description?: string | null }) {
  const program = await programOf(userId, input.program_id);
  await requireManager(userId, program.teamspace_id);
  const db = await admin();
  const { count } = await db.from("onboarding_steps").select("id", { count: "exact", head: true }).eq("program_id", program.id);
  const { data, error } = await db
    .from("onboarding_steps")
    .insert({
      program_id: program.id,
      teamspace_id: program.teamspace_id,
      title: input.title,
      description: input.description ?? null,
      position: count ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addItemForUser(
  userId: string,
  input: { step_id: string; title: string; kind?: string; material_id?: string | null },
) {
  const db = await admin();
  const { data: step } = await db.from("onboarding_steps").select("*").eq("id", input.step_id).maybeSingle();
  if (!step) throw new Error("Этап не найден");
  await activeTeamspace(userId, step.teamspace_id);
  await requireManager(userId, step.teamspace_id);
  const { count } = await db.from("onboarding_items").select("id", { count: "exact", head: true }).eq("step_id", step.id);
  const { data, error } = await db
    .from("onboarding_items")
    .insert({
      step_id: step.id,
      program_id: step.program_id,
      teamspace_id: step.teamspace_id,
      title: input.title,
      kind: input.kind ?? "task",
      material_id: input.material_id ?? null,
      position: count ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteStepForUser(userId: string, stepId: string) {
  const db = await admin();
  const { data: step } = await db.from("onboarding_steps").select("*").eq("id", stepId).maybeSingle();
  if (!step) return { ok: true };
  await activeTeamspace(userId, step.teamspace_id);
  await requireManager(userId, step.teamspace_id);
  await db.from("onboarding_steps").delete().eq("id", stepId);
  return { ok: true };
}

export async function deleteItemForUser(userId: string, itemId: string) {
  const db = await admin();
  const { data: item } = await db.from("onboarding_items").select("*").eq("id", itemId).maybeSingle();
  if (!item) return { ok: true };
  await activeTeamspace(userId, item.teamspace_id);
  await requireManager(userId, item.teamspace_id);
  await db.from("onboarding_items").delete().eq("id", itemId);
  return { ok: true };
}

export async function assignProgramForUser(
  userId: string,
  input: { program_id: string; user_ids: string[]; due_date?: string | null },
) {
  const program = await programOf(userId, input.program_id);
  await requireManager(userId, program.teamspace_id);
  const db = await admin();
  const rows = input.user_ids.map((id) => ({
    program_id: program.id,
    teamspace_id: program.teamspace_id,
    user_id: id,
    assigned_by: userId,
    status: "in_progress",
    due_date: input.due_date ?? null,
    started_at: new Date().toISOString(),
  }));
  if (!rows.length) return { ok: true, assigned: 0 };
  const { error } = await db.from("onboarding_assignments").upsert(rows, { onConflict: "program_id,user_id" });
  if (error) throw new Error(error.message);

  try {
    const { deliver } = await import("./agent-automation.server");
    for (const id of input.user_ids) {
      if (id === userId) continue;
      await deliver({
        userId: id,
        teamspaceId: program.teamspace_id,
        actorId: userId,
        title: "🎓 Назначено обучение",
        body: `${program.title}${input.due_date ? ` · до ${input.due_date}` : ""}`,
      });
    }
  } catch (e) {
    console.error("onboarding assign notify failed", e);
  }
  return { ok: true, assigned: rows.length };
}

export async function unassignProgramForUser(userId: string, assignmentId: string) {
  const db = await admin();
  const { data: a } = await db.from("onboarding_assignments").select("*").eq("id", assignmentId).maybeSingle();
  if (!a) return { ok: true };
  await activeTeamspace(userId, a.teamspace_id);
  await requireManager(userId, a.teamspace_id);
  await db.from("onboarding_assignments").delete().eq("id", assignmentId);
  return { ok: true };
}

/** Mark a checklist item done / a material viewed. Employees update their own row. */
export async function setProgressForUser(
  userId: string,
  input: { assignment_id: string; ref_kind: "item" | "material"; ref_id: string; done: boolean },
) {
  const db = await admin();
  const { data: a } = await db.from("onboarding_assignments").select("*").eq("id", input.assignment_id).maybeSingle();
  if (!a) throw new Error("Назначение не найдено");
  await activeTeamspace(userId, a.teamspace_id);
  if (a.user_id !== userId) await requireManager(userId, a.teamspace_id);

  if (input.done) {
    const { error } = await db
      .from("onboarding_progress")
      .upsert(
        { assignment_id: a.id, teamspace_id: a.teamspace_id, ref_kind: input.ref_kind, ref_id: input.ref_id, done: true },
        { onConflict: "assignment_id,ref_kind,ref_id" },
      );
    if (error) throw new Error(error.message);
  } else {
    await db
      .from("onboarding_progress")
      .delete()
      .eq("assignment_id", a.id)
      .eq("ref_kind", input.ref_kind)
      .eq("ref_id", input.ref_id);
  }

  const [{ count: totalItems }, { count: doneItems }] = await Promise.all([
    db.from("onboarding_items").select("id", { count: "exact", head: true }).eq("program_id", a.program_id),
    db.from("onboarding_progress").select("id", { count: "exact", head: true })
      .eq("assignment_id", a.id).eq("ref_kind", "item").eq("done", true),
  ]);
  const complete = (totalItems ?? 0) > 0 && (doneItems ?? 0) >= (totalItems ?? 0);
  await db
    .from("onboarding_assignments")
    .update({
      status: complete ? "completed" : "in_progress",
      completed_at: complete ? new Date().toISOString() : null,
      started_at: a.started_at ?? new Date().toISOString(),
    })
    .eq("id", a.id);

  if (complete && a.status !== "completed" && a.assigned_by && a.assigned_by !== a.user_id) {
    try {
      const { deliver } = await import("./agent-automation.server");
      const { data: program } = await db.from("onboarding_programs").select("title").eq("id", a.program_id).maybeSingle();
      const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", a.user_id).maybeSingle();
      await deliver({
        userId: a.assigned_by,
        teamspaceId: a.teamspace_id,
        actorId: a.user_id,
        title: "🎓 Обучение завершено",
        body: `${profile?.full_name ?? profile?.email ?? "Сотрудник"} прошёл «${program?.title ?? "обучение"}»`,
      });
    } catch (e) {
      console.error("onboarding complete notify failed", e);
    }
  }

  return { ok: true, progress: pct(doneItems ?? 0, totalItems ?? 0), completed: complete };
}

export async function setScoreForUser(userId: string, input: { assignment_id: string; score: number | null }) {
  const db = await admin();
  const { data: a } = await db.from("onboarding_assignments").select("*").eq("id", input.assignment_id).maybeSingle();
  if (!a) throw new Error("Назначение не найдено");
  await activeTeamspace(userId, a.teamspace_id);
  await requireManager(userId, a.teamspace_id);
  const { error } = await db.from("onboarding_assignments").update({ score: input.score }).eq("id", a.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ---------------- AI structuring ----------------

type GeneratedStep = { title: string; description?: string; items?: { title: string; kind?: string }[] };
type Generated = { title?: string; description?: string; audience?: string; steps?: GeneratedStep[] };

async function askAi(system: string, user: string): Promise<Generated> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI недоступен: нет ключа");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Слишком много запросов к AI, попробуйте через минуту");
  if (res.status === 402) throw new Error("Закончились AI-кредиты рабочего пространства");
  if (!res.ok) throw new Error(`AI недоступен (${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI вернул неожиданный ответ");
  return JSON.parse(match[0]) as Generated;
}

const SYSTEM =
  "Ты методолог по онбордингу. По описанию и материалам построй структурированный процесс обучения. " +
  "Ответь ТОЛЬКО валидным JSON без markdown: " +
  '{"title":"...","description":"...","audience":"...","steps":[{"title":"Этап","description":"зачем этот этап","items":[{"title":"пункт чек-листа","kind":"task|read|watch|quiz"}]}]}. ' +
  "От 3 до 6 этапов, в каждом 3-6 конкретных пунктов чек-листа. Пункты — проверяемые действия. " +
  "Последний этап всегда содержит проверку знаний (kind=quiz). Пиши на языке запроса пользователя.";

/**
 * Builds (or rebuilds) the structure of a program with AI. When `program_id`
 * is given, the existing materials are used as context and steps are appended.
 */
export async function generateProgramForUser(
  userId: string,
  input: { prompt: string; program_id?: string | null; teamspace_id?: string | null },
) {
  const db = await admin();
  let program = input.program_id ? await programOf(userId, input.program_id) : null;
  const teamspaceId = program?.teamspace_id ?? (await activeTeamspace(userId, input.teamspace_id ?? null));
  await requireManager(userId, teamspaceId);

  let context = "";
  if (program) {
    const { data: materials } = await db
      .from("onboarding_materials").select("kind, title, url, content").eq("program_id", program.id).order("position");
    context = (materials ?? [])
      .map((m) => `- [${m.kind}] ${m.title}${m.url ? ` (${m.url})` : ""}${m.content ? `: ${String(m.content).slice(0, 600)}` : ""}`)
      .join("\n");
  }

  const generated = await askAi(
    SYSTEM,
    [
      `Запрос: ${input.prompt}`,
      program ? `Текущее обучение: ${program.title}${program.description ? ` — ${program.description}` : ""}` : "",
      context ? `Материалы:\n${context}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  if (!program) {
    const { data, error } = await db
      .from("onboarding_programs")
      .insert({
        teamspace_id: teamspaceId,
        title: (generated.title ?? input.prompt).slice(0, 160),
        description: generated.description ?? null,
        audience: generated.audience ?? null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    program = data;
  }

  const { count } = await db.from("onboarding_steps").select("id", { count: "exact", head: true }).eq("program_id", program.id);
  let position = count ?? 0;
  for (const step of (generated.steps ?? []).slice(0, 10)) {
    if (!step.title) continue;
    const { data: created, error } = await db
      .from("onboarding_steps")
      .insert({
        program_id: program.id,
        teamspace_id: program.teamspace_id,
        title: step.title.slice(0, 200),
        description: step.description ?? null,
        position: position++,
      })
      .select("id")
      .single();
    if (error || !created) continue;
    const items = (step.items ?? []).slice(0, 12).filter((i) => i.title);
    if (items.length) {
      await db.from("onboarding_items").insert(
        items.map((item, index) => ({
          step_id: created.id,
          program_id: program!.id,
          teamspace_id: program!.teamspace_id,
          title: item.title.slice(0, 300),
          kind: item.kind ?? "task",
          position: index,
        })),
      );
    }
  }

  return { program_id: program.id, title: program.title };
}

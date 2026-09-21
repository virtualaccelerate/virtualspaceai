/**
 * AI notification engine.
 *
 * Instead of firing a message for every event, we hand the model a compact
 * snapshot of the workspace (tasks, deadlines, statuses, people, roles,
 * activity, review queue) and let it decide WHETHER something deserves a
 * notification, WHO should receive it, HOW important it is and WHAT the short
 * human text says. Delivery is deduplicated through `ai_notification_log`.
 *
 * Server-only.
 */

const BISHKEK_OFFSET_HOURS = 6;
const MODEL = "google/gemini-3-flash-preview";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function bishkekDate(now = new Date()): string {
  return new Date(now.getTime() + BISHKEK_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

export type NotifyPass = "pulse" | "morning" | "evening";

type MemberInfo = {
  user_id: string;
  role: string;
  name: string;
  chat_id: number | null;
};

type AiNotification = {
  type: string;
  user_id: string;
  importance: "high" | "medium" | "low";
  title: string;
  text: string;
  task_ids?: string[];
  dedupe_key: string;
};

const PASS_TYPES: Record<NotifyPass, string> = {
  pulse:
    "deadline, overdue, no_activity, waiting, blocked, risk, follow_up, task_update",
  morning: "daily_brief, team_brief, owner_brief, project_brief",
  evening: "evening_brief",
};

const PASS_RULES: Record<NotifyPass, string> = {
  pulse: [
    "Это часовой проход. Большинство часов не требует НИ ОДНОГО уведомления — это нормально, верни пустой список.",
    "deadline: только если дедлайн реально близко и задача не готова; учитывай приоритет и статус (задача в review обычно не требует пинка исполнителю).",
    "overdue: не эскалируй каждую просрочку. Руководителю пиши только про важное, системное или давно висящее.",
    "no_activity: задача без движения дольше, чем ожидаемо для её срока и приоритета.",
    "waiting: задача ждёт чужого ответа/проверки — определи, кого пингануть (например, проверяющего, у которого висит review).",
    "blocked: покажи первопричину блокировки, а не симптом.",
    "risk: анализируй зависимости и последовательность задач, перегруз людей, накопление дедлайнов в один день.",
    "follow_up: кому нужно написать и короткий готовый текст обращения.",
    "task_update: уведомляй только тех, на кого изменение реально влияет.",
  ].join("\n"),
  morning: [
    "Это утренний проход (09:00).",
    "daily_brief — каждому активному участнику: что сегодня требует его внимания. Не перечисляй все задачи, только 1–3 главных пункта и вывод.",
    "team_brief — руководителям (owner/admin): только проблемы, риски и действия команды.",
    "owner_brief — владельцу: только важные изменения и риски.",
    "project_brief — владельцу/админам: состояние проекта и проблемы, если есть о чём сказать.",
    "Если у человека нечего выделить — не отправляй ему ничего.",
  ].join("\n"),
  evening: [
    "Это вечерний проход (19:00).",
    "evening_brief — подведи итоги дня и скажи, что требует внимания завтра. Только людям, у которых день был содержательным или завтра есть риск.",
  ].join("\n"),
};

const SYSTEM = [
  "Ты — AI-диспетчер уведомлений в рабочем пространстве команды.",
  "Тебе дают снимок пространства. Ты решаешь, требует ли ситуация уведомления, кому его отправить и насколько оно важно.",
  "",
  "ПРАВИЛА ТЕКСТА:",
  "- Пиши по-русски, коротко и по-человечески, как внимательный коллега.",
  "- 1–3 предложения. Никаких списков всех задач и никакой воды.",
  "- Давай инсайт (почему это важно / что произойдёт), а не сухой факт.",
  "- Заканчивай тем, что человеку сделать, если действие требуется.",
  "- Не выдумывай задачи, людей и факты, которых нет в данных.",
  "",
  "РОЛИ:",
  "- owner — создал пространство: только важные изменения, риски и состояние проекта целиком.",
  "- admin — распределяет задачи: полный ежедневный отчёт по команде, проблемы и риски всех участников.",
  "- member — исполнитель: пиши ему ТОЛЬКО про задачи, где он назначен исполнителем, и отчёт только о его собственной работе. Никогда не рассказывай ему про задачи и результаты других людей.",
  "",
  "ПРАВИЛА ОТБОРА:",
  "- Молчание лучше шума. Если ничего важного — верни пустой список.",
  "- Один человек получает максимум 3 уведомления за проход.",
  "- Не дублируй смысл в разных уведомлениях.",
  "- importance: high — нужно действие сегодня; medium — стоит знать; low — фон.",
  "",
  "ФОРМАТ ОТВЕТА — только JSON, без пояснений:",
  '{"notifications":[{"type":"deadline","user_id":"<uuid участника>","importance":"high","title":"Короткий заголовок","text":"1–3 предложения","task_ids":["<uuid задачи>"],"dedupe_key":"deadline:<uuid задачи>"}]}',
  "dedupe_key — стабильный ключ смысла уведомления (тип + объект), чтобы не повторяться.",
].join("\n");

async function snapshot(teamspaceId: string) {
  const db = await admin();
  const today = bishkekDate();
  const since48 = new Date(Date.now() - 48 * 3600_000).toISOString();
  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [tsRes, memberRes, taskRes, actRes] = await Promise.all([
    db.from("teamspaces").select("id, name, owner_id, business_type").eq("id", teamspaceId).maybeSingle(),
    db.from("teamspace_members").select("user_id, role").eq("teamspace_id", teamspaceId),
    db
      .from("tasks")
      .select(
        "id, title, description, status, priority, due_date, assignee_id, assignee_name, user_id, created_at, updated_at, submitted_at",
      )
      .eq("teamspace_id", teamspaceId)
      .eq("external_archived", false)
      .order("due_date", { ascending: true })
      .limit(180),
    db
      .from("activity_events")
      .select("user_id, feature, created_at")
      .eq("teamspace_id", teamspaceId)
      .gte("created_at", since48)
      .limit(400),
  ]);

  const ts = tsRes.data;
  if (!ts) return null;

  const memberships = memberRes.data ?? [];
  const ids = memberships.map((m) => m.user_id);
  const [{ data: profiles }, { data: links }] = await Promise.all([
    ids.length
      ? db.from("profiles").select("id, full_name, email").in("id", ids)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
    ids.length
      ? db.from("telegram_links").select("user_id, chat_id").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; chat_id: string | number | null }[] }),
  ]);

  const members: MemberInfo[] = memberships.map((m) => {
    const p = profiles?.find((x) => x.id === m.user_id);
    const l = links?.find((x) => x.user_id === m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      name: p?.full_name || p?.email || "Участник",
      chat_id: l?.chat_id ? Number(l.chat_id) : null,
    };
  });

  const nameOf = (id: string | null) => members.find((m) => m.user_id === id)?.name ?? null;

  const all = taskRes.data ?? [];
  const open = all.filter((t) => t.status !== "done");
  const tasks = open.slice(0, 120).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    days_to_due: t.due_date ? daysBetween(t.due_date, today) : null,
    assignee_id: t.assignee_id,
    assignee: t.assignee_name || nameOf(t.assignee_id) || "не назначен",
    creator_id: t.user_id,
    days_since_update: t.updated_at ? daysBetween(today, bishkekDate(new Date(t.updated_at))) : null,
    waiting_review_since: t.submitted_at ?? null,
  }));

  const activity = new Map<string, number>();
  for (const a of actRes.data ?? []) {
    if (!a.user_id) continue;
    activity.set(a.user_id, (activity.get(a.user_id) ?? 0) + 1);
  }

  const closedRecently = all.filter(
    (t) => t.status === "done" && t.updated_at && t.updated_at >= since24,
  ).length;

  return {
    ts,
    members,
    payload: {
      today,
      workspace: { name: ts.name, type: ts.business_type },
      members: members.map((m) => ({
        user_id: m.user_id,
        name: m.name,
        role: m.role,
        events_48h: activity.get(m.user_id) ?? 0,
        open_tasks: tasks.filter((t) => t.assignee_id === m.user_id).length,
      })),
      totals: {
        open: open.length,
        overdue: tasks.filter((t) => t.days_to_due !== null && t.days_to_due < 0).length,
        in_review: open.filter((t) => t.status === "review").length,
        closed_last_24h: closedRecently,
      },
      tasks,
    },
  };
}

async function askModel(payload: unknown, pass: NotifyPass): Promise<AiNotification[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return [];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            `ДОСТУПНЫЕ ТИПЫ: ${PASS_TYPES[pass]}`,
            PASS_RULES[pass],
            "",
            "СНИМОК ПРОСТРАНСТВА (JSON):",
            JSON.stringify(payload),
          ].join("\n"),
        },
      ],
    }),
  });

  if (!res.ok) return [];
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as {
      notifications?: AiNotification[];
    };
    return Array.isArray(parsed.notifications) ? parsed.notifications : [];
  } catch {
    return [];
  }
}

/** Insert the dedupe row; false means this exact notification was already delivered. */
async function claim(input: {
  teamspaceId: string;
  userId: string;
  kind: string;
  dedupeKey: string;
  importance: string;
}): Promise<boolean> {
  const db = await admin();
  const { error } = await db.from("ai_notification_log").insert({
    teamspace_id: input.teamspaceId,
    user_id: input.userId,
    kind: input.kind,
    dedupe_key: input.dedupeKey,
    importance: input.importance,
  });
  return !error;
}

const TYPE_ICON: Record<string, string> = {
  daily_brief: "☀️",
  evening_brief: "🌆",
  team_brief: "👥",
  owner_brief: "🏢",
  project_brief: "📊",
  deadline: "⏳",
  overdue: "🔥",
  no_activity: "💤",
  waiting: "⌛️",
  blocked: "⛔️",
  risk: "⚠️",
  follow_up: "✉️",
  task_update: "🔄",
};

/**
 * Runs one AI pass over every workspace that has open tasks.
 * `pulse` is hourly, `morning` at 09:00 and `evening` at 19:00 Bishkek time.
 */
export async function runAiNotifications(
  pass: NotifyPass,
  onlyTeamspaceId?: string,
  opts?: { onlyUserId?: string; forceChatId?: number; ignoreDedupe?: boolean },
): Promise<{ sent: number; spaces: number }> {
  const db = await admin();
  const spacesQuery = db.from("teamspaces").select("id").limit(200);
  const { data: spaces } = onlyTeamspaceId
    ? await spacesQuery.eq("id", onlyTeamspaceId)
    : await spacesQuery;
  const today = bishkekDate();
  let sent = 0;
  let scanned = 0;

  for (const space of spaces ?? []) {
    const snap = await snapshot(space.id).catch(() => null);
    if (!snap || !snap.payload.tasks.length || !snap.members.length) continue;
    scanned++;

    const items = await askModel(snap.payload, pass).catch(() => [] as AiNotification[]);
    const perUser = new Map<string, number>();

    for (const item of items) {
      const member = snap.members.find((m) => m.user_id === item.user_id);
      if (!member || !item.title || !item.text) continue;
      if (opts?.onlyUserId && member.user_id !== opts.onlyUserId) continue;

      // Role scope: managers see the team, a member only ever hears about their own tasks.
      const isManager = member.role === "owner" || member.role === "admin";
      if (!isManager && MANAGER_ONLY_TYPES.has(item.type)) continue;
      if (item.type === "owner_brief" && member.role !== "owner") continue;
      if (!isManager) {
        const referenced = (item.task_ids ?? [])
          .map((id) => snap.payload.tasks.find((task) => task.id === id))
          .filter(Boolean) as { assignee_id: string | null }[];
        if (referenced.length && !referenced.some((task) => task.assignee_id === member.user_id)) continue;
      }

      const count = perUser.get(member.user_id) ?? 0;
      if (count >= 3) continue;

      const importance: AiNotification["importance"] =
        item.importance === "high" || item.importance === "low" ? item.importance : "medium";
      const key = `${today}:${pass}:${item.dedupe_key || `${item.type}:${item.title}`}`.slice(0, 200);
      const ok = opts?.ignoreDedupe
        ? true
        : await claim({
            teamspaceId: space.id,
            userId: member.user_id,
            kind: item.type,
            dedupeKey: key,
            importance,
          });
      if (!ok) continue;

      const icon = TYPE_ICON[item.type] ?? "🔔";
      const taskId = item.task_ids?.length === 1 ? item.task_ids[0] : null;

      const { createNotification } = await import("./notifications.server");
      await createNotification({
        userId: member.user_id,
        teamspaceId: space.id,
        kind: item.type,
        title: `${icon} ${item.title}`,
        body: item.text,
        taskId,
      }).catch(() => {});

      const isBrief = item.type.endsWith("_brief");
      const chatId = opts?.forceChatId ?? member.chat_id;
      if (chatId && (isBrief || importance !== "low")) {
        const { sendMessage } = await import("./telegram.server");
        let reply_markup: unknown = undefined;
        if (taskId) {
          const task = snap.payload.tasks.find((t) => t.id === taskId);
          if (task && task.assignee_id === member.user_id) {
            const { assigneeKeyboard } = await import("./task-flow.server");
            reply_markup = assigneeKeyboard(task.id, task.status);
          }
        }
        await sendMessage(
          chatId,
          `${icon} ${item.title}\n\n${item.text}\n\n🏢 ${snap.ts.name}`,
          reply_markup ? ({ reply_markup } as never) : undefined,
        ).catch(() => {});
      }

      perUser.set(member.user_id, count + 1);
      sent++;
    }
  }

  return { sent, spaces: scanned };
}

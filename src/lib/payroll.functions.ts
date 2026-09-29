import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computePayroll, deleteRule, listRules, payrollCorpus, saveRule } from "./payroll.server";

const Ts = z.object({ teamspace_id: z.string().uuid() });
const Period = Ts.extend({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export const listPayrollRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.parse(d))
  .handler(({ data, context }) => listRules(context.userId, data.teamspace_id));

export const savePayrollRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.extend({
    id: z.string().uuid().optional(),
    user_id: z.string().uuid(),
    kind: z.enum(["fixed", "project", "task"]),
    amount: z.number().min(0).max(1e10),
    currency: z.string().min(1).max(8),
    project: z.string().max(200).nullable().optional(),
    task_id: z.string().uuid().nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  }).parse(d))
  .handler(({ data, context }) => {
    const { teamspace_id, ...rule } = data;
    return saveRule(context.userId, teamspace_id, rule);
  });

export const deletePayrollRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.extend({ id: z.string().uuid() }).parse(d))
  .handler(({ data, context }) => deleteRule(context.userId, data.teamspace_id, data.id));

export const calculatePayroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Period.parse(d))
  .handler(({ data, context }) => computePayroll(context.userId, data.teamspace_id, data.from, data.to));

export const askPayroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Period.extend({
    language: z.string().max(10).optional(),
    messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(20),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await computePayroll(context.userId, data.teamspace_id, data.from, data.to);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const system =
      "Ты — помощник руководителя по зарплатам в Virtual Space. Отвечай ТОЛЬКО по данным расчёта ниже — это реальные сотрудники, правила оплаты и выполненные задачи из Task Tracker. " +
      `Язык ответа: ${data.language || "ru"}. Пиши простым текстом без markdown и звёздочек, списки через «•» или «-». ` +
      "Всегда показывай обоснование: из чего складывается сумма (фикс, проекты, задачи), формулу (кол-во × ставка) и перечень выполненных задач с проектами. " +
      "Если спрашивают про другой период — скажи, что расчёт сделан за указанный период, и предложи сменить период сверху. " +
      "Если сотрудника нет или правила не настроены — так и скажи. Ничего не выдумывай.\n\nРАСЧЁТ:\n" + payrollCorpus(p);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: system }, ...data.messages] }),
    });
    if (res.status === 429) throw new Error("Слишком много запросов — попробуйте чуть позже.");
    if (res.status === 402) throw new Error("Закончились AI-кредиты.");
    if (!res.ok) throw new Error(`AI error (${res.status})`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { reply: j.choices?.[0]?.message?.content ?? "" };
  });

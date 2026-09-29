import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2, Send, ChevronDown, ChevronRight, Calculator } from "lucide-react";
import { toast } from "sonner";
import { listPayrollRules, savePayrollRule, deletePayrollRule, calculatePayroll, askPayroll } from "@/lib/payroll.functions";

type Rules = Awaited<ReturnType<typeof listPayrollRules>>;
type Calc = Awaited<ReturnType<typeof calculatePayroll>>;
type Msg = { role: "user" | "assistant"; content: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const money = (t: Record<string, number>) =>
  Object.entries(t).length ? Object.entries(t).map(([c, v]) => `${v.toLocaleString("ru-RU")} ${c}`).join(" + ") : "0";
const KIND_LABEL = { fixed: "Фикс / месяц", project: "За задачу в проекте", task: "За задачу" } as const;
const input = "rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary/60";

export function PayrollPanel({ teamspaceId, language }: { teamspaceId: string; language: string }) {
  const listFn = useServerFn(listPayrollRules);
  const saveFn = useServerFn(savePayrollRule);
  const delFn = useServerFn(deletePayrollRule);
  const calcFn = useServerFn(calculatePayroll);
  const askFn = useServerFn(askPayroll);

  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))));
  const [to, setTo] = useState(iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0))));
  const [rules, setRules] = useState<Rules | null>(null);
  const [calc, setCalc] = useState<Calc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: "", kind: "fixed" as "fixed" | "project" | "task", amount: "", currency: "KGS", project: "", task_id: "" });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);

  const load = async () => {
    try {
      const [r, c] = await Promise.all([
        listFn({ data: { teamspace_id: teamspaceId } }),
        calcFn({ data: { teamspace_id: teamspaceId, from, to } }),
      ]);
      setRules(r); setCalc(c); setErr(null);
    } catch (e) { setErr((e as Error).message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [teamspaceId, from, to]);

  const memberTasks = useMemo(() => (rules?.tasks ?? []).filter((t) => !form.user_id || t.assignee_id === form.user_id), [rules, form.user_id]);

  const add = async () => {
    if (!form.user_id || !form.amount) return toast.error("Выберите сотрудника и сумму");
    try {
      await saveFn({ data: { teamspace_id: teamspaceId, user_id: form.user_id, kind: form.kind, amount: Number(form.amount),
        currency: form.currency, project: form.project || null, task_id: form.task_id || null } });
      setForm((f) => ({ ...f, amount: "", project: "", task_id: "" }));
      toast.success("Правило сохранено");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const ask = async (text?: string) => {
    const content = (text ?? q).trim();
    if (!content) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next); setQ(""); setAsking(true);
    try {
      const r = await askFn({ data: { teamspace_id: teamspaceId, from, to, language, messages: next.slice(-12) } });
      setMsgs([...next, { role: "assistant", content: r.reply || "…" }]);
    } catch (e) { toast.error((e as Error).message); } finally { setAsking(false); }
  };

  if (err) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{err}</div>;
  if (!rules || !calc) return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  const nameOf = (id: string) => rules.members.find((m) => m.user_id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">С<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} block mt-1`} /></label>
        <label className="text-xs text-muted-foreground">По<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${input} block mt-1`} /></label>
        <div className="ml-auto text-right">
          <div className="text-xs text-muted-foreground">Итого к выплате за период</div>
          <div className="font-display text-2xl text-foreground">{money(calc.grand)}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" />Расчёт по сотрудникам</h3>
        <div className="divide-y divide-border">
          {calc.employees.map((e) => (
            <div key={e.user_id} className="py-3">
              <button onClick={() => setOpen(open === e.user_id ? null : e.user_id)} className="w-full flex items-center gap-2 text-left">
                {open === e.user_id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-foreground flex-1">{e.name}</span>
                <span className="text-xs text-muted-foreground">{e.done_tasks.length} задач выполнено</span>
                <span className="font-semibold text-foreground min-w-[110px] text-right">{money(e.totals)}</span>
              </button>
              {open === e.user_id && (
                <div className="mt-3 ml-6 space-y-3 text-sm">
                  {!e.lines.length && <p className="text-muted-foreground">Правила оплаты не настроены.</p>}
                  {e.lines.map((l, i) => (
                    <div key={i} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex justify-between gap-2"><span className="font-medium">{l.label}</span><span>{l.amount.toLocaleString("ru-RU")} {l.currency}</span></div>
                      <div className="text-xs text-muted-foreground">{l.basis}</div>
                      {l.tasks.length > 0 && (
                        <ul className="mt-2 text-xs space-y-0.5">
                          {l.tasks.map((t) => <li key={t.id}>• {t.title}{t.project ? ` · ${t.project}` : ""} <span className="text-muted-foreground">({t.done_at})</span></li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    {rules.rules.filter((r) => r.user_id === e.user_id).map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                        {KIND_LABEL[r.kind]}{r.project ? `: ${r.project}` : ""}{r.task_id ? `: ${rules.tasks.find((t) => t.id === r.task_id)?.title ?? "задача"}` : ""} — {r.amount} {r.currency}
                        <button aria-label="Удалить правило" onClick={async () => { await delFn({ data: { teamspace_id: teamspaceId, id: r.id } }); load(); }}><Trash2 className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Добавить правило оплаты</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select className={input} value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value, task_id: "" })}>
            <option value="">Сотрудник…</option>
            {rules.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
          </select>
          <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
            <option value="fixed">Фиксированная зарплата (в месяц)</option>
            <option value="project">Оплата по проекту (за каждую выполненную задачу)</option>
            <option value="task">Оплата за задачи / объём</option>
          </select>
          {form.kind === "project" && (
            <select className={input} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
              <option value="">Проект…</option>
              {rules.projects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {form.kind === "task" && (
            <select className={input} value={form.task_id} onChange={(e) => setForm({ ...form, task_id: e.target.value })}>
              <option value="">Любая выполненная задача (ставка за штуку)</option>
              {memberTasks.map((t) => <option key={t.id} value={t.id}>{t.title}{t.project ? ` · ${t.project}` : ""}</option>)}
            </select>
          )}
          <input className={input} type="number" min={0} placeholder="Сумма" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select className={input} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {["KGS", "KZT", "UZS", "TJS", "RUB", "USD", "EUR"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <button onClick={add} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 text-sm hover:opacity-90">
            <Plus className="h-4 w-4" />Добавить
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Подтверждение работы — задачи в статусе «Готово» в Task Tracker, закрытые в выбранном периоде. Фиксированная зарплата пересчитывается пропорционально дням, если период не равен месяцу.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Помощник по зарплатам</h3>
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {["Кому и сколько нужно выплатить?", `Покажи расчёт зарплаты ${calc.employees[0]?.name ?? "сотрудника"}`, `Какие проекты и задачи выполнил ${calc.employees[0]?.name ?? "сотрудник"}?`].map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/60">{s}</button>
            ))}
          </div>
        )}
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm w-fit" : "text-sm whitespace-pre-wrap text-foreground"}>{m.content}</div>
          ))}
          {asking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder={`Например: сколько выплатить ${nameOf(calc.employees[0]?.user_id ?? "")} за этот месяц?`} className={`${input} flex-1`} />
          <button onClick={() => ask()} disabled={asking || !q.trim()} aria-label="Отправить" className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

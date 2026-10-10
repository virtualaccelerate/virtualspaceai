import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteQuizQuestion, generateQuiz, getQuiz, submitQuiz } from "@/lib/onboarding.functions";

type Result = { question_id: string; question: string; options: string[]; answer_index: number; correct_index: number; correct: boolean; explanation: string | null };

export function OnboardingQuiz({ programId, materials = [], onSubmitted }: { programId: string; materials?: { id: string; title: string }[]; onSubmitted?: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const load = useServerFn(getQuiz);
  const gen = useServerFn(generateQuiz);
  const drop = useServerFn(deleteQuizQuestion);
  const submit = useServerFn(submitQuiz);
  const key = ["onboarding-quiz", programId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => load({ data: { program_id: programId } }) });
  const [busy, setBusy] = useState<string | null>(null);
  const [scope, setScope] = useState("");
  const [count, setCount] = useState(7);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; results: Result[] } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  if (isLoading || !data) return null;
  const questions = (data.questions ?? []) as any[];
  const card = "rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4";

  if (data.is_manager) {
    return (
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("workspaceUi.quiz.title", "Тест")}</h2>
          <div className="flex flex-wrap items-center gap-2">
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-sm">
            <option value="">{t("workspaceUi.quiz.allProgram", "Вся программа")}</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <label className="flex items-center gap-1 text-sm text-[color:var(--muted-foreground)]">
            {t("workspaceUi.quiz.count", "Вопросов")}
            <input type="number" min={3} max={30} value={count} onChange={(e) => setCount(Math.min(30, Math.max(3, Number(e.target.value) || 7)))} className="h-9 w-16 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-sm" />
          </label>
          <Button size="sm" disabled={busy === "gen"} onClick={() => run("gen", async () => {
            const r = await gen({ data: { program_id: programId, material_id: scope || null, count } });
            toast.success(`${t("workspaceUi.quiz.generated", "Вопросов создано")}: ${r.count}`);
            await refresh();
          })}>
            {busy === "gen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("workspaceUi.quiz.generate", "Сгенерировать тест")}
          </Button>
          </div>
        </div>
        {!questions.length && <p className="text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.quiz.empty", "Теста пока нет. AI составит вопросы по материалам и этапам.")}</p>}
        {questions.map((q, i) => (
          <div key={q.id} className={`${card} space-y-2`}>
            <div className="flex items-start gap-2">
              <div className="flex-1 font-medium">
                {i + 1}. {q.question}
                {q.material_id && <div className="text-xs font-normal text-[color:var(--muted-foreground)]">{materials.find((m) => m.id === q.material_id)?.title}</div>}
              </div>
              <Button size="icon" variant="ghost" disabled={busy === q.id} onClick={() => run(q.id, async () => { await drop({ data: { question_id: q.id } }); await refresh(); })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {q.options.map((o: string, j: number) => (
                <li key={j} className={j === q.correct_index ? "text-primary font-medium" : "text-[color:var(--muted-foreground)]"}>
                  {j === q.correct_index ? "✓ " : "• "}{o}
                </li>
              ))}
            </ul>
            {q.explanation && <p className="text-xs text-[color:var(--muted-foreground)]">{q.explanation}</p>}
          </div>
        ))}
      </section>
    );
  }

  if (!questions.length || !data.assignment_id) return null;

  if (result) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("workspaceUi.quiz.title", "Тест")}</h2>
        <div className={`${card} text-center`}>
          <div className="text-3xl font-semibold">{result.score}%</div>
          <div className="text-sm text-[color:var(--muted-foreground)]">
            {t("workspaceUi.quiz.correct", "Верных ответов")}: {result.results.filter((r) => r.correct).length} / {result.results.length}
          </div>
        </div>
        {result.results.map((r, i) => (
          <div key={r.question_id} className={`${card} space-y-1`}>
            <div className="flex items-start gap-2 font-medium">
              {r.correct ? <Check className="h-4 w-4 mt-0.5 text-primary" /> : <X className="h-4 w-4 mt-0.5 text-destructive" />}
              <span>{i + 1}. {r.question}</span>
            </div>
            {!r.correct && (
              <div className="text-sm">
                <span className="text-[color:var(--muted-foreground)]">{t("workspaceUi.quiz.rightAnswer", "Правильный ответ")}: </span>{r.options[r.correct_index]}
              </div>
            )}
            {r.explanation && <p className="text-xs text-[color:var(--muted-foreground)]">{r.explanation}</p>}
          </div>
        ))}
        <Button variant="outline" onClick={() => { setResult(null); setAnswers({}); setStep(0); setStarted(true); }}>
          {t("workspaceUi.quiz.retry", "Пройти ещё раз")}
        </Button>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("workspaceUi.quiz.title", "Тест")}</h2>
        <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <div className="text-sm text-[color:var(--muted-foreground)]">
            {t("workspaceUi.quiz.questions", "Вопросов")}: {questions.length}
            {data.last_attempt && <> · {t("workspaceUi.quiz.lastScore", "Последний результат")}: {data.last_attempt.score}%</>}
          </div>
          <Button onClick={() => setStarted(true)}>{t("workspaceUi.quiz.start", "Начать тест")}</Button>
        </div>
      </section>
    );
  }

  const q = questions[step];
  const last = step === questions.length - 1;
  const chosen = answers[q.id];
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("workspaceUi.quiz.title", "Тест")}</h2>
      <div className={`${card} space-y-3`}>
        <div className="text-xs text-[color:var(--muted-foreground)]">{step + 1} / {questions.length}</div>
        <div className="font-medium">{q.question}</div>
        <div className="grid gap-2">
          {q.options.map((o: string, j: number) => (
            <button key={j} type="button" onClick={() => setAnswers((p) => ({ ...p, [q.id]: j }))}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${chosen === j ? "border-primary bg-primary/10 text-primary" : "border-[color:var(--border)]"}`}>
              {o}
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t("workspaceUi.quiz.back", "Назад")}</Button>
          {last ? (
            <Button disabled={chosen === undefined || busy === "submit"} onClick={() => run("submit", async () => {
              const r = await submit({ data: { assignment_id: data.assignment_id, answers: questions.map((x) => ({ question_id: x.id, answer_index: answers[x.id] ?? -1 })) } });
              setResult(r);
              setStarted(false);
              await refresh();
              onSubmitted?.();
            })}>
              {busy === "submit" && <Loader2 className="h-4 w-4 animate-spin" />}{t("workspaceUi.quiz.finish", "Завершить")}
            </Button>
          ) : (
            <Button disabled={chosen === undefined} onClick={() => setStep((s) => s + 1)}>{t("workspaceUi.quiz.next", "Далее")}</Button>
          )}
        </div>
      </div>
    </section>
  );
}

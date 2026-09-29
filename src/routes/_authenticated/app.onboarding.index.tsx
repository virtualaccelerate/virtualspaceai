import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createOnboardingProgram,
  deleteOnboardingProgram,
  generateOnboarding,
  listOnboarding,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/app/onboarding/")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Onboarding & Training — Virtual Space" },
      { name: "description", content: "Build onboarding programs from videos, images, links and instructions, and track every employee's training progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function OnboardingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const load = useServerFn(listOnboarding);
  const create = useServerFn(createOnboardingProgram);
  const generate = useServerFn(generateOnboarding);
  const remove = useServerFn(deleteOnboardingProgram);

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["onboarding"], queryFn: () => load({ data: {} }) });
  const programs = (data?.programs ?? []) as any[];
  const isManager = Boolean(data?.is_manager);

  async function addProgram() {
    if (!title.trim()) return;
    setBusy("create");
    try {
      await create({ data: { title: title.trim() } });
      setTitle("");
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      toast.success(t("workspaceUi.onboarding.created", "Обучение создано"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function generateProgram() {
    if (prompt.trim().length < 3) return;
    setBusy("ai");
    try {
      const res = await generate({ data: { prompt: prompt.trim() } });
      setPrompt("");
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      toast.success(t("workspaceUi.onboarding.generated", "AI собрал обучение: {{title}}", { title: res.title }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function deleteProgram(id: string) {
    setBusy(id);
    try {
      await remove({ data: { program_id: id } });
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{t("workspaceUi.onboarding.title", "Онбординг и обучение")}</h1>
          <p className="mt-1.5 text-sm text-[color:var(--muted-foreground)] max-w-2xl">
            {t(
              "workspaceUi.onboarding.subtitle",
              "Соберите обучение из видео, фото, ссылок и инструкций — AI превратит материалы в этапы и чек-листы, а вы увидите прогресс каждого сотрудника.",
            )}
          </p>
        </div>
      </header>

      {isManager && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3">
            <div className="text-sm font-medium">{t("workspaceUi.onboarding.newTitle", "Новое обучение")}</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addProgram()}
              placeholder={t("workspaceUi.onboarding.newPh", "Например: Онбординг нового менеджера")}
            />
            <Button size="sm" onClick={addProgram} disabled={busy === "create" || !title.trim()}>
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("workspaceUi.onboarding.add", "Создать")}
            </Button>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("workspaceUi.onboarding.aiTitle", "Собрать с помощью AI")}
            </div>
            <Textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("workspaceUi.onboarding.aiPh", "Создай onboarding для нового менеджера по продажам")}
            />
            <Button size="sm" onClick={generateProgram} disabled={busy === "ai" || prompt.trim().length < 3}>
              {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("workspaceUi.onboarding.generate", "Сгенерировать")}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <div className="text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.common.loading", "Загрузка…")}</div>}

      {!isLoading && programs.length === 0 && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-10 text-center text-sm text-[color:var(--muted-foreground)]">
          {t("workspaceUi.onboarding.empty", "Обучений пока нет.")}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {programs.map((p) => (
          <div key={p.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Link to="/app/onboarding/$programId" params={{ programId: p.id }} className="min-w-0 flex-1">
                <div className="font-medium truncate hover:text-primary">{p.title}</div>
                {p.audience && <div className="text-xs text-[color:var(--muted-foreground)] truncate">{p.audience}</div>}
              </Link>
              {isManager && (
                <button
                  onClick={() => deleteProgram(p.id)}
                  disabled={busy === p.id}
                  className="text-[color:var(--muted-foreground)] hover:text-destructive"
                  aria-label={t("workspaceUi.onboarding.delete", "Удалить")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {p.description && <p className="text-xs text-[color:var(--muted-foreground)] line-clamp-2">{p.description}</p>}
            <div className="text-xs text-[color:var(--muted-foreground)] flex flex-wrap gap-x-3 gap-y-1">
              <span>{t("workspaceUi.onboarding.itemsCount", "Пунктов")}: {p.steps_total}</span>
              <span>{t("workspaceUi.onboarding.materialsCount", "Материалов")}: {p.materials_total}</span>
              <span>{t("workspaceUi.onboarding.assignedCount", "Назначено")}: {p.assigned}</span>
              <span>{t("workspaceUi.onboarding.completedCount", "Прошли")}: {p.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-[color:var(--muted)] overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${p.my_progress ?? p.avg_progress}%` }} />
              </div>
              <span className="text-xs text-[color:var(--muted-foreground)]">
                {p.my_progress ?? p.avg_progress}%
                {p.my_progress !== null ? ` · ${t("workspaceUi.onboarding.mine", "вы")}` : ` · ${t("workspaceUi.onboarding.team", "команда")}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

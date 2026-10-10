import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ExternalLink, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { videoEmbedUrl, detectLinkKind, LINK_LABEL } from "@/lib/links";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { loadTeamOverview } from "@/lib/team.functions";
import {
  addOnboardingItem,
  addOnboardingMaterial,
  addOnboardingStep,
  assignOnboarding,
  deleteOnboardingItem,
  deleteOnboardingMaterial,
  deleteOnboardingStep,
  generateOnboarding,
  getOnboardingProgram,
  setOnboardingProgress,
  setOnboardingScore,
  unassignOnboarding,
} from "@/lib/onboarding.functions";
import { getLinkDocumentTitle } from "@/lib/documents.functions";
import { OnboardingQuiz } from "@/components/OnboardingQuiz";

export const Route = createFileRoute("/_authenticated/app/onboarding/$programId")({
  component: ProgramPage,
  head: () => ({
    meta: [
      { title: "Training program — Virtual Space" },
      { name: "description", content: "Stages, checklists, materials and per-employee training progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type MaterialKind = "video" | "image" | "link" | "text" | "file";

function MaterialView({ material }: { material: any }) {
  const embed = material.url ? videoEmbedUrl(material.url) : null;
  if (material.kind === "video" && embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={embed}
          title={material.title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }
  if (material.kind === "image" && material.url) {
    return <img src={material.url} alt={material.title} loading="lazy" className="max-h-80 w-full rounded-lg object-contain bg-[color:var(--muted)]" />;
  }
  if (material.kind === "text") {
    return <p className="whitespace-pre-wrap text-sm text-[color:var(--muted-foreground)]">{material.content}</p>;
  }
  return null;
}

function ProgramPage() {
  const { programId } = Route.useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const load = useServerFn(getOnboardingProgram);
  const loadTeam = useServerFn(loadTeamOverview);
  const addMaterial = useServerFn(addOnboardingMaterial);
  const dropMaterial = useServerFn(deleteOnboardingMaterial);
  const addStep = useServerFn(addOnboardingStep);
  const dropStep = useServerFn(deleteOnboardingStep);
  const addItem = useServerFn(addOnboardingItem);
  const dropItem = useServerFn(deleteOnboardingItem);
  const assign = useServerFn(assignOnboarding);
  const unassign = useServerFn(unassignOnboarding);
  const setProgress = useServerFn(setOnboardingProgress);
  const setScore = useServerFn(setOnboardingScore);
  const generate = useServerFn(generateOnboarding);

  const [busy, setBusy] = useState<string | null>(null);
  const [kind, setKind] = useState<MaterialKind>("video");
  const [mTitle, setMTitle] = useState("");
  const [mUrl, setMUrl] = useState("");
  const [mTitleLoading, setMTitleLoading] = useState(false);
  const fetchLinkTitle = useServerFn(getLinkDocumentTitle);
  const [mText, setMText] = useState("");
  const [mFile, setMFile] = useState<File | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState("");
  const [assignee, setAssignee] = useState("");
  const [teamspaceId, setTeamspaceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    void (async () => setTeamspaceId((await getActiveTeamspaceId()) ?? undefined))();
  }, []);

  useEffect(() => {
    const url = mUrl.trim();
    if (kind === "text" || kind === "file" || !url || mTitle.trim()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setMTitleLoading(true);
      try {
        const res = await fetchLinkTitle({ data: { url } });
        const title = typeof res === "string" ? res : res?.title;
        if (!cancelled && title) setMTitle((cur) => (cur.trim() ? cur : title));
      } catch {
        // ignore — title stays manual
      } finally {
        if (!cancelled) setMTitleLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mUrl, kind, mTitle, fetchLinkTitle]);

  const key = ["onboarding", "program", programId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => load({ data: { program_id: programId } }) });
  const { data: team } = useQuery({
    queryKey: ["team-overview", teamspaceId],
    queryFn: () => loadTeam({ data: teamspaceId ? { teamspace_id: teamspaceId } : {} }),
    enabled: Boolean(data?.is_manager),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <div className="text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.common.loading", "Загрузка…")}</div>;
  if (!data) return <div className="text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.onboarding.notFound", "Обучение не найдено")}</div>;

  const program = data.program as any;
  const isManager = Boolean(data.is_manager);
  const materials = (data.materials ?? []) as any[];
  const steps = (data.steps ?? []) as any[];
  const people = (data.people ?? []) as any[];
  const me = data.me as any | null;

  const doneItems = new Set<string>(me?.done_items ?? []);
  const viewedMaterials = new Set<string>(me?.viewed_materials ?? []);

  const memberOptions = ((team?.members ?? []) as any[]).filter((m) => !people.some((p) => p.user_id === m.id));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/onboarding"><ArrowLeft className="h-4 w-4" /> {t("workspaceUi.onboarding.back", "Все обучения")}</Link>
      </Button>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{program.title}</h1>
        {program.audience && <div className="text-sm text-[color:var(--muted-foreground)]">{program.audience}</div>}
        {program.description && <p className="text-sm text-[color:var(--muted-foreground)]">{program.description}</p>}
        {me && (
          <div className="flex items-center gap-2 pt-1">
            <div className="h-1.5 w-48 rounded-full bg-[color:var(--muted)] overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${me.progress}%` }} />
            </div>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {t("workspaceUi.onboarding.myProgress", "Ваш прогресс")}: {me.progress}%
            </span>
          </div>
        )}
      </header>

      {/* ---------- materials ---------- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("workspaceUi.onboarding.materials", "Материалы")}</h2>

        {isManager && (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["video", "image", "link", "text", "file"] as MaterialKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`rounded-lg px-3 py-1.5 text-xs border ${kind === k ? "border-primary text-primary bg-primary/10" : "border-[color:var(--border)] text-[color:var(--muted-foreground)]"}`}
                >
                  {k === "video" ? t("workspaceUi.onboarding.kindVideo", "Видео") :
                    k === "image" ? t("workspaceUi.onboarding.kindImage", "Фото") :
                    k === "link" ? t("workspaceUi.onboarding.kindLink", "Ссылка") :
                    k === "file" ? t("workspaceUi.onboarding.kindFile", "Файл") :
                    t("workspaceUi.onboarding.kindText", "Инструкция")}
                </button>
              ))}
            </div>
            <div className="relative">
              <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder={t("workspaceUi.onboarding.mTitle", "Название материала")} className={mTitleLoading ? "pr-9" : undefined} />
              {mTitleLoading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[color:var(--muted-foreground)]" />
              )}
            </div>
            {kind === "file" ? (
              <Input
                type="file"
                accept=".pdf,.docx,.pptx,.xlsx,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setMFile(f);
                  if (f && !mTitle.trim()) setMTitle(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
            ) : kind !== "text" ? (
              <Input
                value={mUrl}
                onChange={(e) => setMUrl(e.target.value)}
                placeholder={kind === "video" ? "https://youtube.com/watch?v=…" : "https://…"}
              />
            ) : (
              <Textarea rows={4} value={mText} onChange={(e) => setMText(e.target.value)} placeholder={t("workspaceUi.onboarding.mText", "Текст инструкции")} />
            )}
            <Button
              size="sm"
              disabled={busy === "material" || !mTitle.trim() || (kind === "text" ? !mText.trim() : kind === "file" ? !mFile : !mUrl.trim())}
              onClick={() =>
                run("material", async () => {
                  if (kind === "file") {
                    if (!mFile) return;
                    if (mFile.size > 25 * 1024 * 1024) throw new Error(t("workspaceUi.onboarding.fileTooBig", "Файл больше 25 МБ"));
                    const { supabase } = await import("@/integrations/supabase/client");
                    const path = `${program.teamspace_id}/onboarding/${crypto.randomUUID()}-${mFile.name.replace(/[^\w.\- ]/g, "_")}`;
                    const { error: upErr } = await supabase.storage.from("documents").upload(path, mFile, { contentType: mFile.type || undefined, upsert: false });
                    if (upErr) throw new Error(upErr.message);
                    await addMaterial({ data: { program_id: programId, kind, title: mTitle.trim(), url: path, content: null, mime_type: mFile.type || null, file_name: mFile.name } });
                    setMTitle(""); setMFile(null);
                    return;
                  }
                  await addMaterial({
                    data: {
                      program_id: programId,
                      kind,
                      title: mTitle.trim(),
                      url: kind === "text" ? null : mUrl.trim(),
                      content: kind === "text" ? mText.trim() : null,
                    },
                  });
                  setMTitle(""); setMUrl(""); setMText("");
                })
              }
            >
              {busy === "material" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("workspaceUi.onboarding.addMaterial", "Добавить материал")}
            </Button>
          </div>
        )}

        {materials.length === 0 && (
          <p className="text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.onboarding.noMaterials", "Материалов пока нет.")}</p>
        )}

        <div className="grid gap-3">
          {materials.map((m) => (
            <div key={m.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{m.title}</div>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--muted-foreground)] hover:text-primary inline-flex items-center gap-1 truncate">
                      {LINK_LABEL[detectLinkKind(m.url)]} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {me && (
                  <button
                    onClick={() =>
                      run(`mat-${m.id}`, () =>
                        setProgress({ data: { assignment_id: me.assignment_id, ref_kind: "material", ref_id: m.id, done: !viewedMaterials.has(m.id) } }),
                      )
                    }
                    className={`rounded-lg border px-2 py-1 text-xs inline-flex items-center gap-1 ${viewedMaterials.has(m.id) ? "border-primary text-primary" : "border-[color:var(--border)] text-[color:var(--muted-foreground)]"}`}
                  >
                    <Check className="h-3 w-3" />
                    {viewedMaterials.has(m.id) ? t("workspaceUi.onboarding.viewed", "Просмотрено") : t("workspaceUi.onboarding.markViewed", "Отметить")}
                  </button>
                )}
                {isManager && (
                  <button onClick={() => run(`dm-${m.id}`, () => dropMaterial({ data: { material_id: m.id } }))} className="text-[color:var(--muted-foreground)] hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <MaterialView material={m} />
            </div>
          ))}
        </div>
      </section>

      {/* ---------- stages & checklists ---------- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("workspaceUi.onboarding.stages", "Этапы и чек-листы")}</h2>

        {isManager && (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} placeholder={t("workspaceUi.onboarding.stepPh", "Новый этап")} />
              <Button
                size="sm"
                disabled={busy === "step" || !stepTitle.trim()}
                onClick={() => run("step", async () => { await addStep({ data: { program_id: programId, title: stepTitle.trim() } }); setStepTitle(""); })}
              >
                <Plus className="h-4 w-4" /> {t("workspaceUi.onboarding.addStep", "Добавить этап")}
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t("workspaceUi.onboarding.aiStructure", "Собери чек-лист по этим материалам")}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "ai" || prompt.trim().length < 3}
                onClick={() => run("ai", async () => { await generate({ data: { prompt: prompt.trim(), program_id: programId } }); setPrompt(""); })}
              >
                {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t("workspaceUi.onboarding.aiBuild", "Собрать AI")}
              </Button>
            </div>
          </div>
        )}

        {steps.length === 0 && (
          <p className="text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.onboarding.noSteps", "Этапов пока нет — добавьте вручную или попросите AI.")}</p>
        )}

        {steps.map((s, index) => (
          <div key={s.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{index + 1}. {s.title}</div>
                {s.description && <div className="text-xs text-[color:var(--muted-foreground)]">{s.description}</div>}
              </div>
              {isManager && (
                <button onClick={() => run(`ds-${s.id}`, () => dropStep({ data: { step_id: s.id } }))} className="text-[color:var(--muted-foreground)] hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <ul className="space-y-1.5">
              {(s.items ?? []).map((item: any) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!me || busy === `it-${item.id}`}
                    checked={doneItems.has(item.id)}
                    onChange={(e) =>
                      me &&
                      run(`it-${item.id}`, () =>
                        setProgress({ data: { assignment_id: me.assignment_id, ref_kind: "item", ref_id: item.id, done: e.target.checked } }),
                      )
                    }
                    className="h-4 w-4 accent-[color:var(--primary)]"
                  />
                  <span className={doneItems.has(item.id) ? "line-through text-[color:var(--muted-foreground)]" : ""}>{item.title}</span>
                  {item.kind === "quiz" && (
                    <span className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">{t("workspaceUi.onboarding.quiz", "проверка")}</span>
                  )}
                  {isManager && (
                    <button onClick={() => run(`di-${item.id}`, () => dropItem({ data: { item_id: item.id } }))} className="ml-auto text-[color:var(--muted-foreground)] hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {isManager && (
              <div className="flex gap-2">
                <Input
                  value={itemDrafts[s.id] ?? ""}
                  onChange={(e) => setItemDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder={t("workspaceUi.onboarding.itemPh", "Пункт чек-листа")}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!(itemDrafts[s.id] ?? "").trim() || busy === `add-${s.id}`}
                  onClick={() =>
                    run(`add-${s.id}`, async () => {
                      await addItem({ data: { step_id: s.id, title: (itemDrafts[s.id] ?? "").trim() } });
                      setItemDrafts((prev) => ({ ...prev, [s.id]: "" }));
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </section>

      <OnboardingQuiz programId={program.id} materials={materials} onSubmitted={refresh} />

      {/* ---------- people ---------- */}
      {isManager && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("workspaceUi.onboarding.people", "Сотрудники и прогресс")}</h2>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm"
            >
              <option value="">{t("workspaceUi.onboarding.pickMember", "Выберите сотрудника")}</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!assignee || busy === "assign"}
              onClick={() => run("assign", async () => { await assign({ data: { program_id: programId, user_ids: [assignee] } }); setAssignee(""); })}
            >
              {t("workspaceUi.onboarding.assign", "Назначить обучение")}
            </Button>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] divide-y divide-[color:var(--border)]">
            {people.length === 0 && (
              <div className="p-6 text-center text-sm text-[color:var(--muted-foreground)]">{t("workspaceUi.onboarding.noPeople", "Пока никому не назначено.")}</div>
            )}
            {people.map((p) => (
              <div key={p.assignment_id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-[color:var(--muted-foreground)]">
                    {t("workspaceUi.onboarding.checklist", "Чек-лист")}: {p.progress}% · {t("workspaceUi.onboarding.materialsSeen", "Материалы")}: {p.materials_progress}%
                    {p.status === "completed" && ` · ${t("workspaceUi.onboarding.done", "завершено")}`}
                  </div>
                </div>
                <div className="h-1.5 w-28 rounded-full bg-[color:var(--muted)] overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                </div>
                <label className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-1">
                  {t("workspaceUi.onboarding.score", "Оценка")}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={p.score ?? ""}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const value = raw === "" ? null : Math.max(0, Math.min(100, Number(raw)));
                      if (value === (p.score ?? null)) return;
                      void run(`sc-${p.assignment_id}`, () => setScore({ data: { assignment_id: p.assignment_id, score: value } }));
                    }}
                    className="w-16 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 py-1"
                  />
                </label>
                <button onClick={() => run(`ua-${p.assignment_id}`, () => unassign({ data: { assignment_id: p.assignment_id } }))} className="text-[color:var(--muted-foreground)] hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Check, CheckCircle2, ChevronDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { loadPilot, updatePilot } from "@/lib/pilot.functions";
import { PILOT_AUTO, PILOT_RESULT_ITEM, PILOT_STEPS, PILOT_TOTAL, pilotPassed, type PilotCheck, type PilotState } from "@/lib/pilot-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import mascot from "@/assets/pilot-mascot.webp";

const pilotQuery = (teamspace_id: string) => queryOptions({
  queryKey: ["pilot-checklist", teamspace_id],
  queryFn: () => loadPilot({ data: { teamspace_id } }),
  staleTime: 0,
  refetchOnMount: "always",
});

export const Route = createFileRoute("/_authenticated/app/pilot")({
  loader: async ({ context }) => {
    const teamspaceId = await getActiveTeamspaceId();
    if (!teamspaceId) throw new Error("PILOT_NO_WORKSPACE");
    await context.queryClient.fetchQuery(pilotQuery(teamspaceId));
    return { teamspaceId };
  },
  component: PilotPage,
  pendingComponent: PilotLoading,
  errorComponent: PilotError,
  head: () => ({
    meta: [
      { title: "Pilot checklist — Virtual Space" },
      { name: "description", content: "Track your team's Virtual Space pilot in six steps: setup, tasks, AI, onboarding, finance and wrap-up." },
      { property: "og:title", content: "Pilot checklist — Virtual Space" },
      { property: "og:description", content: "Track your team's Virtual Space pilot in six steps: setup, tasks, AI, onboarding, finance and wrap-up." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" }],
  }),
});

function PilotLoading() {
  const { t } = useTranslation();
  return <p className="p-6 text-muted-foreground" role="status">{t("pilot.loading")}</p>;
}

function PilotError() {
  const { t } = useTranslation();
  const router = useRouter();
  return <div className="p-6 space-y-4" role="alert">
    <p>{t("pilot.error")}</p>
    <Button variant="outline" onClick={() => void router.invalidate()}><RefreshCw className="h-4 w-4" />{t("pilot.retry")}</Button>
  </div>;
}

function ItemLink({ item }: { item: number }) {
  const { t } = useTranslation();
  const cls = "inline-flex items-center gap-1 text-sm font-bold text-[var(--pilot-accent)] hover:underline";
  const body = <>{t("pilot.open")}<ArrowUpRight className="h-4 w-4" /></>;
  if (item <= 2) return <Link to={item === 1 ? "/app/settings" : "/app/team"} className={cls}>{body}</Link>;
  if (item <= 4) return <Link to="/app/telegram" className={cls}>{body}</Link>;
  if (item <= 6) return <Link to="/app/tasks" className={cls}>{body}</Link>;
  if (item === 7) return <Link to="/app/docs" className={cls}>{body}</Link>;
  if (item <= 10) return <Link to="/app/agents" className={cls}>{body}</Link>;
  if (item <= 13) return <Link to="/app/docs" search={{ tab: "onboarding" }} className={cls}>{body}</Link>;
  if (item <= 16) return <Link to="/app/financials" search={{ tab: item === 14 ? "metrics" : "payroll" }} className={cls}>{body}</Link>;
  if (item === 17) return <Link to="/app/team" className={cls}>{body}</Link>;
  return null;
}

type Vars = { item: number; checked: boolean; result_percent?: number | null };

function PilotPage() {
  const { t, i18n } = useTranslation();
  const { teamspaceId } = Route.useLoaderData();
  const query = pilotQuery(teamspaceId);
  const { data } = useSuspenseQuery(query);
  const qc = useQueryClient();
  const save = useServerFn(updatePilot);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const mutation = useMutation({
    mutationFn: (v: Vars) => save({ data: { teamspace_id: teamspaceId, ...v } }),
    onMutate: async (v: Vars) => {
      await qc.cancelQueries({ queryKey: query.queryKey });
      const previous = qc.getQueryData<PilotState>(query.queryKey);
      if (previous) {
        const old = previous.checks.find(c => c.item === v.item);
        const next: PilotCheck = { item: v.item, checked: v.checked, automatic: false,
          checked_at: old && old.checked === v.checked ? old.checked_at : new Date().toISOString(),
          checked_by: old?.checked_by ?? null, checker_name: old && old.checked === v.checked ? old.checker_name : null,
          result_percent: v.result_percent !== undefined ? v.result_percent : old?.result_percent ?? null };
        const checks = [...previous.checks.filter(c => c.item !== v.item), next].sort((a, b) => a.item - b.item);
        const on = checks.filter(c => c.checked).map(c => c.item);
        qc.setQueryData<PilotState>(query.queryKey, { ...previous, checks, total: on.length, passed: pilotPassed(on) });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(query.queryKey, ctx.previous); toast.error(t("pilot.saveError")); },
    onSettled: () => qc.invalidateQueries({ queryKey: query.queryKey }),
  });
  const byItem = new Map(data.checks.map(c => [c.item, c]));
  const fmt = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
  const tags = ["var(--pilot-tag-1)", "var(--pilot-tag-2)", "var(--pilot-tag-3)"];
  const toggle = (item: number) => setOpen(s => { const n = new Set(s); n.has(item) ? n.delete(item) : n.add(item); return n; });

  return <div className="pilot-sheet -m-4 sm:-m-6 min-h-full px-4 py-6 sm:px-8 sm:py-10">
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-start justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--pilot-accent)]">{t("pilot.label")}</p>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">{t("pilot.title")}</h1>
          <p className="text-[var(--pilot-muted)]">{t("pilot.subtitle")}</p>
        </div>
        <img src={mascot} alt="" width={80} height={86} className="h-20 w-auto shrink-0" />
      </header>

      {PILOT_STEPS.map((items, si) => {
        const step = si + 1;
        if (step === 5 && !data.isManager) return null;
        return <section key={step} className="pilot-card overflow-hidden" aria-labelledby={`pilot-step-${step}`}>
          <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-3">
            <h2 id={`pilot-step-${step}`} className="text-lg font-extrabold">{t(`pilot.steps.${step}`)}</h2>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: tags[si % 3] }}>{t("pilot.step", { n: step })}</span>
            <span className="ml-auto text-sm text-[var(--pilot-muted)]">
              {step === 5 && `${t("pilot.managerOnly")} · `}{items.filter(i => byItem.get(i)?.checked).length}/{items.length}
            </span>
          </div>
          <ul>
            {items.map(item => {
              const check = byItem.get(item);
              const checked = check?.checked ?? false;
              const locked = checked && !data.isManager;
              const expanded = open.has(item);
              return <li key={item} className="border-t border-[var(--pilot-line)] px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <button type="button" role="checkbox" aria-checked={checked} aria-label={t(`pilot.items.${item}.title`)}
                    disabled={locked} title={locked ? t("pilot.forbidden") : undefined}
                    onClick={() => mutation.mutate({ item, checked: !checked })}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border-2 border-[var(--pilot-accent)] transition-colors disabled:cursor-not-allowed ${checked ? "bg-[var(--pilot-accent)] text-primary-foreground" : "bg-transparent"}`}>
                    {checked && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                  <button type="button" onClick={() => toggle(item)} aria-expanded={expanded} aria-controls={`pilot-guide-${item}`}
                    className="min-w-0 flex-1 text-left">
                    <span className="flex items-baseline gap-2">
                      <span className="font-extrabold text-[var(--pilot-accent)]">{item}</span>
                      <span className={`font-bold break-words ${checked ? "opacity-70" : ""}`}>{t(`pilot.items.${item}.title`)}</span>
                    </span>
                    <span className="block text-sm text-[var(--pilot-muted)]">{PILOT_AUTO.has(item) ? t("pilot.autoHint") : t("pilot.manualHint")}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {checked && check?.checked_at && <span className="hidden sm:block text-right text-xs leading-tight text-[var(--pilot-muted)]">
                      {fmt.format(new Date(check.checked_at))}<br />{check.automatic ? t("pilot.automatic") : check.checker_name || "—"}
                    </span>}
                    <button type="button" onClick={() => toggle(item)} aria-label={t("pilot.guide")} aria-expanded={expanded}
                      className="rounded-md p-1 text-[var(--pilot-muted)] hover:bg-[var(--pilot-line)]">
                      <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>
                {expanded && <div id={`pilot-guide-${item}`} className="ml-9 mt-3 space-y-2 rounded-lg bg-[var(--pilot-bg)] p-3 text-sm">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--pilot-muted)]">{t("pilot.guide")}</p>
                  <p className="break-words">{t(`pilot.items.${item}.guide`)}</p>
                  <ItemLink item={item} />
                </div>}
                {item === PILOT_RESULT_ITEM && <div className="ml-9 mt-3 flex flex-wrap items-center gap-3">
                  <label htmlFor="pilot-result" className="text-sm text-[var(--pilot-muted)]">{t("pilot.result")}</label>
                  <Input key={`${teamspaceId}-${check?.result_percent ?? "empty"}`} id="pilot-result" type="number" min={0} max={100} step="any"
                    defaultValue={check?.result_percent ?? ""} disabled={!checked && !data.isManager} className="w-24 bg-[var(--pilot-card)]"
                    onBlur={e => {
                      const raw = e.currentTarget.value;
                      const value = raw === "" ? null : Number(raw);
                      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) { toast.error(t("pilot.invalidResult")); return; }
                      if (value !== (check?.result_percent ?? null)) mutation.mutate({ item, checked, result_percent: value });
                    }} />
                </div>}
              </li>;
            })}
          </ul>
        </section>;
      })}

      <section className="rounded-[14px] bg-[var(--pilot-dark)] p-6 text-[var(--pilot-dark-fg)] space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-2xl font-black">{t("pilot.progress", { count: data.total })}</p>
          {data.passed && <span className="inline-flex items-center gap-2 rounded-full bg-[var(--pilot-accent)] px-3 py-1 text-sm font-bold text-primary-foreground" role="status">
            <CheckCircle2 className="h-4 w-4" />{t("pilot.passed")}</span>}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--pilot-dark-fg)_15%,transparent)]" role="progressbar"
          aria-valuemin={0} aria-valuemax={PILOT_TOTAL} aria-valuenow={data.total}>
          <div className="h-full rounded-full bg-[var(--pilot-accent)] transition-all" style={{ width: `${data.total / PILOT_TOTAL * 100}%` }} />
        </div>
        <p className="text-sm opacity-90">
          {t("pilot.rule.0")}<b className="text-[var(--pilot-accent)] brightness-150">{t("pilot.rule.1")}</b>{t("pilot.rule.2")}<b className="text-[var(--pilot-accent)] brightness-150">{t("pilot.rule.3")}</b>{t("pilot.rule.4")}
        </p>
      </section>
    </div>
  </div>;
}

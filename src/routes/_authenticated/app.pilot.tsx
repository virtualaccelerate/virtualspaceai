import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, ArrowUpRight, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";
import { loadPilot, updatePilot } from "@/lib/pilot.functions";
import { type PilotCheck } from "@/lib/pilot-rules";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const pilotQuery = (teamspace_id: string) => queryOptions({
  queryKey: ["pilot-checklist", teamspace_id],
  queryFn: () => loadPilot({ data: { teamspace_id } }),
  staleTime: 0,
});

export const Route = createFileRoute("/_authenticated/app/pilot")({
  loader: async ({ context }) => {
    const teamspaceId = await getActiveTeamspaceId();
    if (!teamspaceId) throw new Error("PILOT_NO_WORKSPACE");
    await context.queryClient.ensureQueryData(pilotQuery(teamspaceId));
    return { teamspaceId };
  },
  component: PilotPage,
  pendingComponent: PilotLoading,
  errorComponent: PilotError,
  head: () => ({ meta: [
    { title: "Pilot checklist — Virtual Space" },
    { name: "description", content: "Track your team's Virtual Space pilot across setup, onboarding and finance." },
    { property: "og:title", content: "Pilot checklist — Virtual Space" },
    { property: "og:description", content: "Track your team's Virtual Space pilot across setup, onboarding and finance." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
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

function ItemLink({ item, label }: { item: number; label: string }) {
  const { t } = useTranslation();
  const content = <><span className="sr-only">{t("pilot.open")}: {label}</span><ArrowUpRight className="h-4 w-4" /></>;
  const className = "shrink-0 text-muted-foreground";
  if (item === 1) return <Button asChild variant="ghost" size="icon" className={className}><Link to="/app/settings">{content}</Link></Button>;
  if (item === 2) return <Button asChild variant="ghost" size="icon" className={className}><Link to="/app/team">{content}</Link></Button>;
  if (item === 3 || item === 4) return <Button asChild variant="ghost" size="icon" className={className}><Link to="/app/telegram">{content}</Link></Button>;
  if (item === 5) return <Button asChild variant="ghost" size="icon" className={className}><Link to="/app/tasks">{content}</Link></Button>;
  if (item <= 10) return <Button asChild variant="ghost" size="icon" className={className}><Link to="/app/docs" search={{ tab: "onboarding" }}>{content}</Link></Button>;
  return <Button asChild variant="ghost" size="icon" className={className}><Link to="/app/financials" search={{ tab: item >= 14 ? "payroll" : "metrics" }}>{content}</Link></Button>;
}

function PilotPage() {
  const { t, i18n } = useTranslation();
  const { teamspaceId } = Route.useLoaderData();
  const query = pilotQuery(teamspaceId);
  const { data } = useSuspenseQuery(query);
  const qc = useQueryClient();
  const save = useServerFn(updatePilot);
  const mutation = useMutation({
    mutationFn: (value: { item: number; checked: boolean; result_percent?: number | null }) => save({ data: { teamspace_id: teamspaceId, ...value } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: query.queryKey }); },
    onError: () => toast.error(t("pilot.saveError")),
  });
  const blocks = [{ key: "start", start: 1 }, { key: "onboarding", start: 6 }, ...(data.isManager ? [{ key: "finance", start: 11 }] : [])];
  const byItem = new Map(data.checks.map(check => [check.item, check]));
  const checkedInfo = (check: PilotCheck) => {
    const date = check.checked_at ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(check.checked_at)) : "";
    return `${t("pilot.checkedBy")}: ${check.checker_name || "—"} · ${date}${check.automatic ? ` · ${t("pilot.automatic")}` : ""}`;
  };
  return <div className="max-w-5xl mx-auto space-y-7">
    <header className="flex flex-wrap items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><ClipboardCheck className="h-5 w-5" /></div>
      <h1 className="font-display text-2xl sm:text-3xl text-foreground">{t("pilot.title")}</h1>
      {data.passed && <span className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-3 py-1 text-sm font-semibold text-primary" role="status"><CheckCircle2 className="h-4 w-4" />{t("pilot.passed")}</span>}
    </header>
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground" aria-live="polite">{t("pilot.progress", { count: data.total })}</p>
      <Progress value={data.total / 15 * 100} aria-label={t("pilot.progress", { count: data.total })} className="h-2" />
    </div>
    {blocks.map(block => <section key={block.key} aria-labelledby={`pilot-block-${block.key}`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`pilot-block-${block.key}`} className="font-display text-xl text-foreground">{t(`pilot.blocks.${block.key}`)}</h2>
        <span className="text-sm text-muted-foreground">{block.key === "finance" && `${t("pilot.manager")} · `}{Array.from({ length: 5 }, (_, i) => byItem.get(block.start + i)?.checked).filter(Boolean).length}/5</span>
      </div>
      {Array.from({ length: 5 }, (_, index) => {
        const item = block.start + index;
        const check = byItem.get(item);
        const checked = check?.checked ?? false;
        const title = t(`pilot.items.${item}.title`);
        const disabled = mutation.isPending || (checked && !data.isManager);
        return <Card key={item} className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Checkbox id={`pilot-item-${item}`} checked={checked} disabled={disabled}
              title={checked && !data.isManager ? t("pilot.forbidden") : undefined}
              onCheckedChange={value => mutation.mutate({ item, checked: value === true })} className="mt-1 h-5 w-5" />
            <div className="min-w-0 flex-1 space-y-1">
              <label htmlFor={`pilot-item-${item}`} className="block font-semibold text-foreground break-words">{item}. {title}</label>
              <p className="text-sm text-muted-foreground break-words">{t(`pilot.items.${item}.hint`)}</p>
              {checked && check && <p className="pt-1 text-xs text-muted-foreground break-words">{checkedInfo(check)}</p>}
              {item === 10 && <div className="pt-3 flex flex-wrap items-center gap-3">
                <label htmlFor="pilot-result" className="text-sm text-muted-foreground">{t("pilot.result")}</label>
                <Input key={`${teamspaceId}-${check?.result_percent ?? "empty"}`} id="pilot-result" type="number" min={0} max={100} step="any"
                  defaultValue={check?.result_percent ?? ""} disabled={mutation.isPending || (!checked && !data.isManager)} className="w-24"
                  onBlur={event => {
                    const raw = event.currentTarget.value;
                    const value = raw === "" ? null : Number(raw);
                    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) { toast.error(t("pilot.invalidResult")); return; }
                    if (value !== (check?.result_percent ?? null)) mutation.mutate({ item: 10, checked, result_percent: value });
                  }} />
              </div>}
            </div>
            <ItemLink item={item} label={title} />
          </div>
        </Card>;
      })}
    </section>)}
  </div>;
}
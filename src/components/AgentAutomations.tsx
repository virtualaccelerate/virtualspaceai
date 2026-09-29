import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Repeat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAgentAutomations, cancelAgentAutomation } from "@/lib/agent-automation.functions";

const SCHEDULE: Record<string, string> = { once: "один раз", hourly: "каждый час", daily: "каждый день", weekdays: "по будням", weekly: "каждую неделю" };

export function AgentAutomations({ teamspaceId }: { teamspaceId: string | null }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const list = useServerFn(listAgentAutomations);
  const cancel = useServerFn(cancelAgentAutomation);
  const { data } = useQuery({
    queryKey: ["agent-automations", teamspaceId],
    queryFn: () => list({ data: { teamspace_id: teamspaceId! } }),
    enabled: !!teamspaceId,
  });
  const rows = (data ?? []).filter((r: any) => r.active);

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Repeat className="h-4 w-4 text-primary" /> {t("app.agents.autoTitle", "Автоматизации агента")}
        <span className="font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      <p className="text-xs text-muted-foreground">
        {t("app.agents.autoHint", "Напишите в чат или Telegram: «напиши Айзе про договор и напомни завтра в 10», «каждый день в 9 спрашивай Тимура о статусе» — агент выполнит сам.")}
      </p>
      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((r: any) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate text-foreground">{r.message}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.kind === "followup" ? "Follow-up" : SCHEDULE[r.schedule] ?? r.schedule} → {r.target_name ?? "—"}
                  {r.next_run_at && ` · ${new Date(r.next_run_at).toLocaleString()}`}
                  {r.runs > 0 && ` · ${t("app.agents.autoRuns", "выполнено")}: ${r.runs}`}
                  {r.last_error && ` · ${r.last_error}`}
                </div>
              </div>
              <Button size="icon" variant="ghost" aria-label="Cancel" onClick={async () => {
                await cancel({ data: { id: r.id } });
                await qc.invalidateQueries({ queryKey: ["agent-automations"] });
              }}><X className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

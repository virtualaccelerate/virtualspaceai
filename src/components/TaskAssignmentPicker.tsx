import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { loadAssignmentPicker } from "@/lib/tasks.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function TaskAssignmentPicker({ teamspaceId, taskId, raw, onChange }: {
  teamspaceId?: string;
  taskId?: string;
  raw?: string;
  onChange: (id: string | null | undefined, ready: boolean, workspace: string) => void;
}) {
  const { i18n } = useTranslation();
  const ru = i18n.language !== "en";
  const load = useServerFn(loadAssignmentPicker);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [value, setValue] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    load({ data: { teamspace_id: teamspaceId, task_id: taskId, assignee: raw } }).then((result) => {
      if (!live) return;
      setMembers(result.members);
      setWorkspace(result.teamspace_id);
      setValue(result.needs_selection ? "" : result.assignee_id ?? "none");
      onChange(result.needs_selection ? undefined : result.assignee_id, !result.needs_selection, result.teamspace_id);
    }).catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : "Error"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // onChange writes parent card state; changes to that state must not reset a manual choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamspaceId, taskId, raw, load, retry]);
  return <div className="mt-2 space-y-1 whitespace-normal">
    <span className="text-[11px] text-muted-foreground">{ru ? "Исполнитель" : "Assignee"}</span>
    <Select value={value} disabled={loading || Boolean(error)} onValueChange={(next) => {
      setValue(next);
      onChange(next === "none" ? null : next, true, workspace);
    }}>
      <SelectTrigger aria-label={ru ? "Исполнитель" : "Assignee"} aria-invalid={!loading && !value} className={`h-8 text-xs ${!loading && !value ? "border-destructive" : ""}`}>
        <SelectValue placeholder={loading ? (ru ? "Загрузка…" : "Loading…") : (ru ? "Выберите исполнителя" : "Choose an assignee")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{ru ? "Без исполнителя" : "Unassigned"}</SelectItem>
        {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
      </SelectContent>
    </Select>
    {!loading && !value && !error && <p className="text-[11px] text-destructive">{ru ? "Выберите исполнителя" : "Choose an assignee"}</p>}
    {error && <div className="text-[11px] text-destructive">{error}<Button size="sm" variant="ghost" onClick={() => setRetry((n) => n + 1)}>{ru ? "Повторить" : "Retry"}</Button></div>}
  </div>;
}
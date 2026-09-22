/**
 * Workspace columns (statuses).
 *
 * Every workspace keeps four base columns. When a Trello board or YouGile
 * project is connected, its own columns are created here as well, so the
 * tracker shows exactly what the external board shows. Each column still maps
 * to one of the four base statuses, which reports, reminders and AI
 * notifications keep using.
 */

export type BaseStatus = "backlog" | "in_progress" | "review" | "done";

export type TeamspaceStatus = {
  id: string;
  teamspace_id: string;
  name: string;
  base_status: BaseStatus;
  position: number;
  is_default: boolean;
  source: string | null;
  external_column_id: string | null;
};

const BASE_COLUMNS: { name: string; base: BaseStatus }[] = [
  { name: "К выполнению", base: "backlog" },
  { name: "В работе", base: "in_progress" },
  { name: "На проверке", base: "review" },
  { name: "Готово", base: "done" },
];

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Best guess of the base status behind an external column name. */
export function guessBaseStatus(name: string): BaseStatus {
  const text = name.toLowerCase();
  if (/done|готов|заверш|выполн|closed|complete|архив/.test(text)) return "done";
  if (/review|провер|согласов|qa|тест|approval/.test(text)) return "review";
  if (/progress|работ|делаю|doing|current|в процессе|разработ/.test(text)) return "in_progress";
  return "backlog";
}

export async function ensureBaseStatuses(teamspaceId: string): Promise<TeamspaceStatus[]> {
  const admin = await db();
  const { data: existing } = await admin.from("teamspace_statuses").select("*").eq("teamspace_id", teamspaceId);
  const rows = (existing ?? []) as TeamspaceStatus[];
  const missing = BASE_COLUMNS.filter((column) => !rows.some((row) => row.base_status === column.base && row.is_default));
  if (missing.length) {
    // The unique index is on lower(name), so duplicates are simply ignored.
    await admin.from("teamspace_statuses").insert(
      missing.map((column, index) => ({
        teamspace_id: teamspaceId,
        name: column.name,
        base_status: column.base,
        position: index,
        is_default: true,
        source: "virtual_space",
      })),
    ).then(() => undefined, () => undefined);
  }
  return listStatuses(teamspaceId);
}

export async function listStatuses(teamspaceId: string): Promise<TeamspaceStatus[]> {
  const admin = await db();
  const { data } = await admin
    .from("teamspace_statuses")
    .select("*")
    .eq("teamspace_id", teamspaceId)
    .order("position", { ascending: true });
  return (data ?? []) as TeamspaceStatus[];
}

/**
 * Makes sure every external column exists as a workspace column and returns
 * a map from the external column id to the workspace status row.
 */
export async function ensureStatusesForColumns(
  teamspaceId: string,
  source: string,
  columns: { id: string; name: string }[],
): Promise<Map<string, TeamspaceStatus>> {
  await ensureBaseStatuses(teamspaceId);
  const admin = await db();
  const existing = await listStatuses(teamspaceId);
  const byName = new Map(existing.map((row) => [row.name.trim().toLowerCase(), row]));
  const nextPosition = existing.reduce((max, row) => Math.max(max, row.position), 0) + 1;

  const missing = columns.filter((column) => column.name.trim() && !byName.has(column.name.trim().toLowerCase()));
  const unique = [...new Map(missing.map((column) => [column.name.trim().toLowerCase(), column])).values()];
  if (unique.length) {
    for (const [index, column] of unique.entries()) {
      await admin.from("teamspace_statuses").insert({
        teamspace_id: teamspaceId,
        name: column.name.trim(),
        base_status: guessBaseStatus(column.name),
        position: nextPosition + index,
        is_default: false,
        source,
        external_column_id: column.id,
      }).then(() => undefined, () => undefined);
    }
  }

  const refreshed = await listStatuses(teamspaceId);
  const refreshedByName = new Map(refreshed.map((row) => [row.name.trim().toLowerCase(), row]));
  const result = new Map<string, TeamspaceStatus>();
  for (const column of columns) {
    const row = refreshedByName.get(column.name.trim().toLowerCase());
    if (row) result.set(column.id, row);
  }
  return result;
}

/** Workspace column matching a base status — used when no external column applies. */
export async function defaultStatusId(teamspaceId: string, base: BaseStatus): Promise<string | null> {
  const rows = await ensureBaseStatuses(teamspaceId);
  return rows.find((row) => row.is_default && row.base_status === base)?.id ?? null;
}

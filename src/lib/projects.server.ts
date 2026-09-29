/**
 * Project roll-up for /app/projects.
 *
 * A project is a real project: locally created tasks group by `project`,
 * imported tasks group by their tracker project (YouGile project / Trello
 * board owner). Boards inside a project — in YouGile these are usually month
 * timelines — are filters, not separate projects, together with a month
 * filter built from task deadlines.
 */

export type ProjectSource = "virtual_space" | "yougile" | "trello";
export type ProjectStatus = "backlog" | "in_progress" | "review" | "done";

export type ProjectRow = {
  key: string;
  name: string;
  source: ProjectSource;
  boards: string[];
  status: ProjectStatus;
  progress: number;
  owner: string | null;
  done: number;
  total: number;
  last_sync_at: string | null;
  url: string | null;
};

export type ProjectFilters = { board?: string | null; month?: string | null };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function activeTeamspace(userId: string, requested?: string | null) {
  const db = await admin();
  let teamspaceId = requested ?? undefined;
  if (!teamspaceId) {
    const { data } = await db.from("profiles").select("current_teamspace_id").eq("id", userId).maybeSingle();
    teamspaceId = data?.current_teamspace_id ?? undefined;
  }
  if (!teamspaceId) throw new Error("Нет активного рабочего пространства");
  const { data: membership } = await db
    .from("teamspace_members").select("id").eq("teamspace_id", teamspaceId).eq("user_id", userId).maybeSingle();
  if (!membership) throw new Error("Нет доступа к рабочему пространству");
  return teamspaceId;
}

function rollUpStatus(counts: Record<ProjectStatus, number>, total: number): ProjectStatus {
  if (total > 0 && counts.done === total) return "done";
  if (counts.in_progress > 0) return "in_progress";
  if (counts.review > 0) return "review";
  return "backlog";
}

export async function listProjectsForUser(userId: string, teamspaceId?: string | null, filters: ProjectFilters = {}) {
  const spaceId = await activeTeamspace(userId, teamspaceId);
  const db = await admin();

  const [{ data: tasks }, { data: sources }, { data: docProjects }, { data: savedProjects }] = await Promise.all([
    db
      .from("tasks")
      .select("status, project, due_date, updated_at, assignee_name, external_source, external_project, external_board, external_url, external_archived")
      .eq("teamspace_id", spaceId)
      .eq("external_archived", false)
      .limit(5000),
    db
      .from("task_sync_sources")
      .select("provider, project_name, last_sync_at, last_error")
      .eq("teamspace_id", spaceId),
    db.from("documents").select("project").eq("teamspace_id", spaceId).not("project", "is", null).limit(2000),
    db.from("projects").select("name, tag").eq("teamspace_id", spaceId).order("created_at"),
  ]);

  const syncByProvider = new Map((sources ?? []).map((row) => [row.provider as string, row]));

  type Bucket = ProjectRow & { counts: Record<ProjectStatus, number>; owners: Map<string, number>; boardSet: Set<string> };
  const buckets = new Map<string, Bucket>();
  const allBoards = new Set<string>();
  const allMonths = new Set<string>();

  for (const task of tasks ?? []) {
    const source = (task.external_source === "yougile" || task.external_source === "trello"
      ? task.external_source
      : "virtual_space") as ProjectSource;
    const name = source === "virtual_space"
      ? (task.project?.trim() || "Без проекта")
      : (task.external_project?.trim() || "Импортированный проект");
    const board = source === "virtual_space" ? null : (task.external_board?.trim() || null);
    const month = (task.due_date ?? task.updated_at ?? "").slice(0, 7) || null;

    if (board) allBoards.add(board);
    if (month) allMonths.add(month);
    if (filters.board && board !== filters.board) continue;
    if (filters.month && month !== filters.month) continue;

    const key = `${source}::${name}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        name,
        source,
        boards: [],
        status: "backlog",
        progress: 0,
        owner: null,
        done: 0,
        total: 0,
        last_sync_at: source === "virtual_space" ? null : syncByProvider.get(source)?.last_sync_at ?? null,
        url: null,
        counts: { backlog: 0, in_progress: 0, review: 0, done: 0 },
        owners: new Map(),
        boardSet: new Set<string>(),
      };
      buckets.set(key, bucket);
    }

    const status = (["backlog", "in_progress", "review", "done"] as ProjectStatus[]).includes(task.status as ProjectStatus)
      ? (task.status as ProjectStatus)
      : "backlog";
    bucket.counts[status] += 1;
    bucket.total += 1;
    if (status === "done") bucket.done += 1;
    if (board) bucket.boardSet.add(board);
    if (task.assignee_name) bucket.owners.set(task.assignee_name, (bucket.owners.get(task.assignee_name) ?? 0) + 1);
    if (!bucket.url && task.external_url) bucket.url = task.external_url;
  }

  // Projects that so far exist only in the knowledge base.
  if (!filters.board && !filters.month) {
    const known = new Set([...buckets.values()].map((b) => b.name.trim().toLowerCase()));
    for (const d of [...(savedProjects ?? []).map((p) => ({ project: p.name })), ...(docProjects ?? [])]) {
      const n = d.project?.trim();
      if (!n || known.has(n.toLowerCase())) continue;
      known.add(n.toLowerCase());
      const key = `virtual_space::${n}`;
      buckets.set(key, {
        key, name: n, source: "virtual_space", boards: [], status: "backlog", progress: 0, owner: null,
        done: 0, total: 0, last_sync_at: null, url: null,
        counts: { backlog: 0, in_progress: 0, review: 0, done: 0 }, owners: new Map(), boardSet: new Set<string>(),
      });
    }
  }

  const rows: ProjectRow[] = [...buckets.values()].map((bucket) => {
    const owner = [...bucket.owners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const { counts, owners, boardSet, ...rest } = bucket;
    void owners;
    return {
      ...rest,
      boards: [...boardSet].sort(),
      owner,
      status: rollUpStatus(counts, bucket.total),
      progress: bucket.total ? Math.round((bucket.done / bucket.total) * 100) : 0,
    };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return {
    teamspace_id: spaceId,
    projects: rows,
    saved: (savedProjects ?? []).map((p) => ({ name: p.name, tag: p.tag })),
    boards: [...allBoards].sort(),
    months: [...allMonths].sort().reverse(),
    sync: (sources ?? []).map((row) => ({
      provider: row.provider as string,
      project_name: row.project_name,
      last_sync_at: row.last_sync_at,
      last_error: row.last_error,
    })),
  };
}


// ---------------------------------------------------------------------------
// Project → related materials (tasks / links / knowledge base).
// Matching is automatic: explicit project field, tracker project, tags and
// #hashtags, or the project name appearing in the title/description/content.
// ---------------------------------------------------------------------------

const GENERIC_NAMES = new Set(["без проекта", "импортированный проект"]);

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

function hashtags(text: string | null | undefined): string[] {
  return [...(text ?? "").matchAll(/#([\p{L}\p{N}_\-]{2,60})/gu)].map((m) => m[1].toLowerCase());
}

function mentions(haystack: string | null | undefined, needle: string) {
  if (!haystack || needle.length < 3) return false;
  const h = haystack.toLowerCase();
  const idx = h.indexOf(needle);
  if (idx < 0) return false;
  // Avoid matching inside a longer word ("ai" in "said").
  const before = idx === 0 ? " " : h[idx - 1];
  const after = h[idx + needle.length] ?? " ";
  return !/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after);
}

function tagMatch(tags: string[] | null | undefined, name: string) {
  const slug = name.replace(/\s+/g, "");
  return (tags ?? []).some((t) => {
    const n = norm(t).replace(/^#/, "");
    return n === name || n.replace(/\s+/g, "") === slug;
  });
}

export async function getProjectMaterialsForUser(userId: string, key: string, teamspaceId?: string | null) {
  const spaceId = await activeTeamspace(userId, teamspaceId);
  const db = await admin();
  const sep = key.indexOf("::");
  const source = (sep > 0 ? key.slice(0, sep) : "virtual_space") as ProjectSource;
  const rawName = sep > 0 ? key.slice(sep + 2) : key;
  const name = norm(rawName);
  const generic = GENERIC_NAMES.has(name);
  const slug = name.replace(/\s+/g, "");

  const [{ data: tasks }, { data: docs }] = await Promise.all([
    db.from("tasks")
      .select("id, title, description, status, priority, due_date, assignee_name, project, tags, proof_url, external_source, external_project, external_url, updated_at")
      .eq("teamspace_id", spaceId).eq("external_archived", false).limit(5000),
    db.from("documents")
      .select("id, name, url, link_kind, project, tags, mime_type, size_bytes, created_at, extracted_text")
      .eq("teamspace_id", spaceId).order("created_at", { ascending: false }).limit(2000),
  ]);

  type Reason = "project" | "tracker" | "tag" | "mention";
  const matchedTasks: any[] = [];
  for (const t of tasks ?? []) {
    const tSource = t.external_source === "yougile" || t.external_source === "trello" ? t.external_source : "virtual_space";
    let reason: Reason | null = null;
    if (tSource === "virtual_space" && norm(t.project || "без проекта") === name && (source === "virtual_space" || !generic)) reason = "project";
    else if (tSource !== "virtual_space" && norm(t.external_project || "импортированный проект") === name && (tSource === source || !generic)) reason = "tracker";
    else if (!generic && norm(t.project) === name) reason = "project";
    else if (!generic && (tagMatch(t.tags, name) || hashtags(`${t.title} ${t.description ?? ""}`).includes(slug))) reason = "tag";
    else if (!generic && (mentions(t.title, name) || mentions(t.description, name))) reason = "mention";
    if (!reason) continue;
    const { description, tags, proof_url, ...rest } = t;
    void tags;
    matchedTasks.push({ ...rest, reason, _description: description, _proof: proof_url });
  }

  const links: { url: string; title: string; kind: string | null; origin: "knowledge" | "task"; ref_id: string; reason: Reason; created_at: string | null }[] = [];
  const knowledge: any[] = [];
  const seen = new Set<string>();

  for (const d of docs ?? []) {
    let reason: Reason | null = null;
    if (norm(d.project) === name) reason = "project";
    else if (!generic && tagMatch(d.tags, name)) reason = "tag";
    else if (!generic && (mentions(d.name, name) || hashtags(d.extracted_text?.slice(0, 20000)).includes(slug) || mentions(d.extracted_text?.slice(0, 20000), name))) reason = "mention";
    if (!reason) continue;
    if (d.url) {
      seen.add(d.url);
      links.push({ url: d.url, title: d.name, kind: d.link_kind, origin: "knowledge", ref_id: d.id, reason, created_at: d.created_at });
    }
    const { extracted_text, ...rest } = d;
    knowledge.push({ ...rest, reason, excerpt: extracted_text ? extracted_text.slice(0, 240) : null });
  }

  const { extractUrls, detectLinkKind } = await import("./links");
  for (const t of matchedTasks) {
    const urls = [...extractUrls(t._description), ...(t._proof ? [t._proof] : [])];
    for (const url of urls) {
      if (seen.has(url)) continue;
      seen.add(url);
      links.push({ url, title: t.title, kind: detectLinkKind(url), origin: "task", ref_id: t.id, reason: t.reason, created_at: t.updated_at });
    }
    delete t._description;
    delete t._proof;
  }

  return { key, name: rawName, source, tasks: matchedTasks, links, knowledge };
}

export function projectTag(name: string) {
  return name.trim().replace(/^#/, "").replace(/[^\p{L}\p{N}_-]+/gu, "");
}

export async function createProjectForUser(userId: string, name: string, teamspaceId?: string | null) {
  const spaceId = await activeTeamspace(userId, teamspaceId);
  const db = await admin();
  const clean = name.trim();
  const tag = projectTag(clean);
  if (!clean || !tag) throw new Error("Укажите название проекта");
  const { data: existing } = await db.from("projects").select("name, tag").eq("teamspace_id", spaceId).ilike("name", clean).maybeSingle();
  if (existing) return existing;
  const { data, error } = await db.from("projects").insert({ teamspace_id: spaceId, name: clean, tag, created_by: userId }).select("name, tag").single();
  if (error) throw new Error(error.message);
  return data;
}

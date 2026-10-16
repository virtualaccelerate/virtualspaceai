/** Pure, shared name resolution. No fuzzy prefixes: ambiguity always needs a picker. */
export type AssignmentMember = { id: string; name: string; email: string | null };
export type MemberResolution<T extends AssignmentMember = AssignmentMember> =
  | { match: T }
  | { candidates: T[] }
  | { none: true };

const translit: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya", ү: "u", ө: "o", ң: "n", ұ: "u", қ: "k", ә: "a", і: "i",
};
const norm = (s: string) => s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const key = (s: string) => norm(s).split("").map((c) => translit[c] ?? c).join("").replace(/kh/g, "h");

/** Generate explicit first-name case forms, retaining every vowel. */
function firstNameForms(first: string): Set<string> {
  const base = key(first);
  const forms = new Set([base]);
  if (base.endsWith("a")) {
    const stem = base.slice(0, -1);
    for (const ending of ["e", "u", "y", "oi", "oy", "oyu", "ei", "ey"]) forms.add(stem + ending);
  } else if (base.endsWith("ya")) {
    const stem = base.slice(0, -2);
    for (const ending of ["i", "e", "yu", "ei", "ey"]) forms.add(stem + ending);
  } else if (base) {
    for (const ending of ["u", "a", "om", "e"]) forms.add(base + ending);
  }
  // Kyrgyz case endings; explicit suffixes rather than prefix/stem guesses.
  for (const ending of ["ga", "ge", "go", "gu", "ka", "ke", "ko", "ku", "ny", "ni", "nu", "nyn", "nin", "nun"]) forms.add(base + ending);
  return forms;
}

export function resolveMember<T extends AssignmentMember>(raw: string, members: T[]): MemberResolution<T> {
  const input = norm(raw);
  if (!input) return { none: true };
  const unique = [...new Map(members.map((m) => [m.id, m])).values()];
  const result = (found: T[]): MemberResolution<T> => found.length === 1 && found[0]
    ? { match: found[0] } : found.length > 1 ? { candidates: found } : { none: true };
  const exact = unique.filter((m) => norm(m.id) === input || norm(m.email ?? "") === input || norm(m.name) === input);
  if (exact.length) return result(exact);
  const canonical = key(input);
  const full = unique.filter((m) => key(m.name) === canonical);
  if (full.length) return result(full);
  return result(unique.filter((m) => firstNameForms(norm(m.name).split(" ")[0] ?? "").has(canonical)));
}
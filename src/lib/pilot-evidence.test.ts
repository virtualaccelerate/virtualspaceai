import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../drizzle/migrations/0051_pilot_checklist.sql", import.meta.url), "utf8");
// Execute the exact database evidence predicates against isolated fixture rows.
// The live database is never written by these tests.
import { spawnSync } from "node:child_process";
const script = `
import sqlite3, json, sys
db=sqlite3.connect(':memory:')
fixture=json.loads(sys.argv[1]); query=sys.argv[2]
for table, value in fixture.items():
 columns=value['columns']; rows=value['rows']
 db.execute('CREATE TABLE '+table+' ('+','.join(columns)+')')
 db.executemany('INSERT INTO '+table+' VALUES ('+','.join('?' for _ in columns)+')',rows)
print(int(db.execute(query).fetchone()[0]))
`;
function evaluate(item: number, fixtures: Record<string, { columns: string[]; rows: unknown[][] }>) {
  const predicate = migration.split("\n").find(line => line.includes(`array_append(evidence,${item})`));
  assert.ok(predicate);
  const sql = predicate.slice(predicate.indexOf("IF ") + 3, predicate.indexOf(" THEN"))
    .replaceAll("public.", "").replaceAll("p_teamspace", "'space'")
    .replaceAll("auth.uid()", "'viewer'").replace(/^manager AND /, "");
  const result = spawnSync("python3", ["-c", script, JSON.stringify(fixtures), `SELECT ${sql}`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() === "1";
}
const fixture = (columns: string[], rows: unknown[][]) => ({ columns, rows });
test("auto 1 requires this workspace's nonempty logo", () => {
  for (const logo of [null, "", "logo.png"]) assert.equal(evaluate(1, { teamspaces: fixture(["id", "logo_path"], [["space", logo]]) }), Boolean(logo));
});
test("auto 2 requires at least two workspace members", () => {
  for (const count of [1,2]) assert.equal(evaluate(2, { teamspace_members: fixture(["teamspace_id"], Array.from({length:count}, () => ["space"])) }), count>=2);
});
test("auto 3 requires the current user's linked Telegram", () => {
  for (const user of ["other", "viewer"]) assert.equal(evaluate(3, { telegram_links: fixture(["user_id","chat_id","linked_at"], [[user,12,"today"]]) }), user==="viewer");
});
test("auto 4 requires a linked Telegram group with a project", () => {
  for (const provider of ["telegram","whatsapp"]) assert.equal(evaluate(4, { telegram_groups: fixture(["teamspace_id","provider","status","project"], [["space",provider,"linked","Project"]]) }), provider==="telegram");
});
test("auto 6 requires a program in this workspace", () => {
  for (const space of ["other","space"]) assert.equal(evaluate(6, { onboarding_programs: fixture(["teamspace_id"], [[space]]) }), space==="space");
});
test("auto 8 requires five questions in one program", () => {
  for (const count of [4,5]) assert.equal(evaluate(8, { onboarding_quiz_questions: fixture(["teamspace_id","program_id"], Array.from({length:count}, () => ["space","program"])) }), count>=5);
});
test("auto 9 requires two distinct assignees of one program", () => {
  for (const user of ["a","b"]) assert.equal(evaluate(9, { onboarding_assignments: fixture(["teamspace_id","program_id","user_id"], [["space","program","a"],["space","program",user]]) }), user==="b");
});
test("auto 10 requires a completed assignment", () => {
  for (const status of ["in_progress","completed"]) assert.equal(evaluate(10, { onboarding_assignments: fixture(["teamspace_id","status"], [["space",status]]) }), status==="completed");
});
test("auto 11 requires a financial source in this workspace", () => {
  for (const space of ["other","space"]) assert.equal(evaluate(11, { financial_sources: fixture(["teamspace_id"], [[space]]) }), space==="space");
});
test("auto 14 requires payroll rules for three distinct workspace members", () => {
  for (const count of [2,3]) assert.equal(evaluate(14, {
    payroll_rules: fixture(["teamspace_id","user_id"], Array.from({length:count}, (_,i) => ["space",`user${i}`])),
    teamspace_members: fixture(["teamspace_id","user_id"], Array.from({length:3}, (_,i) => ["space",`user${i}`])),
  }), count>=3);
});
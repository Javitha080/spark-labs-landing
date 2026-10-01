#!/usr/bin/env node
/**
 * Supabase migration hygiene check.
 *
 * The Supabase CLI keys migration history on the numeric prefix before the
 * first underscore (the "version"), and that key must be UNIQUE. Several
 * legacy files in this repo share a date-only prefix (20260213_*.sql etc.),
 * which makes `supabase db push` / `db reset` unreliable.
 *
 * We can't rename already-applied migrations from CI, so this check is a
 * ratchet: known legacy duplicates are tolerated, but NO NEW duplicate
 * versions (and no growth of existing groups) are allowed.
 *
 * Use full timestamps for new migrations:  supabase migration new <name>
 */
import { readdirSync, appendFileSync } from "node:fs";

const DIR = "supabase/migrations";

// version -> number of files allowed to share it (legacy, frozen)
const LEGACY_DUPLICATES = { "20260213": 9, "20260214": 2 };

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const groups = new Map();
const badNames = [];

for (const f of files) {
  const m = /^(\d+)_.+\.sql$/.exec(f);
  if (!m) {
    badNames.push(f);
    continue;
  }
  groups.set(m[1], [...(groups.get(m[1]) ?? []), f]);
}

const problems = [];
const legacy = [];
for (const [version, list] of groups) {
  if (list.length < 2) continue;
  const allowed = LEGACY_DUPLICATES[version] ?? 1;
  if (list.length > allowed) {
    problems.push(`version ${version} is shared by ${list.length} files (allowed: ${allowed}): ${list.join(", ")}`);
  } else {
    legacy.push(`${version} ×${list.length}`);
  }
}
for (const f of badNames) problems.push(`"${f}" does not match <version>_<name>.sql`);

const lines = [
  "### 🗄️ Supabase migrations",
  "",
  `${files.length} migrations checked.`,
  legacy.length ? `Tolerated legacy duplicate versions: ${legacy.join(", ")}` : "No duplicate versions.",
  "",
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");

if (legacy.length) {
  console.warn(
    `::warning title=Legacy duplicate migration versions::${legacy.join(", ")} share a version prefix. ` +
      `Review before running \`supabase db push\`.`,
  );
}
if (problems.length) {
  for (const p of problems) console.error(`::error title=Migration naming::${p}`);
  process.exit(1);
}
console.log("✅ migration naming check passed");

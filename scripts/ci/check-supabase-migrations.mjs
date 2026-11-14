#!/usr/bin/env node
/**
 * Supabase migration hygiene check.
 *
 * The Supabase CLI keys migration history on the numeric prefix before the
 * first underscore (the "version"), and that key must be UNIQUE — a repeated
 * version makes `supabase db push` / `db reset` skip the second file.
 *
 * The legacy date-only groups (20260213_* ×9, 20260214_* ×2) were renumbered
 * to unique 14-digit versions on 2026-11-15, so any duplicate version now
 * fails this check outright.
 *
 * Use full timestamps for new migrations:  supabase migration new <name>
 */
import { readdirSync, appendFileSync } from "node:fs";

const DIR = "supabase/migrations";

// version -> number of files allowed to share it (legacy, frozen). Empty since
// 2026-11-15: the last duplicate groups (20260213 ×9, 20260214 ×2) were
// renumbered to unique 14-digit versions, so any duplicate now fails below.
const LEGACY_DUPLICATES = {};

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

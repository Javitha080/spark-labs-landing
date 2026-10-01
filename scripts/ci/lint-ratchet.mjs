#!/usr/bin/env node
/**
 * ESLint "ratchet".
 *
 * The repo currently has pre-existing lint errors. A hard `eslint .` gate would
 * fail every PR from day one, and silently weakening rules would hide real
 * problems. Instead we record the current error count in
 * .github/lint-baseline.json and:
 *
 *   - FAIL when a change introduces MORE errors than the baseline
 *   - PASS (and nudge you to lower the baseline) when errors go down
 *
 * so lint debt can only shrink. Once it reaches 0, change the baseline to 0 and
 * this behaves exactly like a normal `eslint .` gate.
 *
 * Usage:
 *   node scripts/ci/lint-ratchet.mjs            # check (CI)
 *   node scripts/ci/lint-ratchet.mjs --update   # rewrite baseline to current count
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASELINE_FILE = ".github/lint-baseline.json";
const update = process.argv.includes("--update");

const out = join(mkdtempSync(join(tmpdir(), "eslint-")), "report.json");
const run = spawnSync("npx", ["--no-install", "eslint", ".", "-f", "json", "-o", out], {
  stdio: ["ignore", "inherit", "inherit"],
  shell: process.platform === "win32",
});

if (!existsSync(out)) {
  console.error("::error title=ESLint crashed::no report was produced (config or parse failure).");
  process.exit(run.status || 2);
}

const report = JSON.parse(readFileSync(out, "utf8"));
let errors = 0;
let warnings = 0;
const byRule = new Map();
for (const file of report) {
  errors += file.errorCount;
  warnings += file.warningCount;
  for (const m of file.messages) {
    if (m.severity === 2) byRule.set(m.ruleId ?? "parse-error", (byRule.get(m.ruleId ?? "parse-error") ?? 0) + 1);
  }
}

if (update) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ errors }, null, 2) + "\n");
  console.log(`Baseline updated: ${errors} errors (${warnings} warnings not tracked).`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_FILE)
  ? JSON.parse(readFileSync(BASELINE_FILE, "utf8")).errors
  : 0;

const top = [...byRule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
const summary = [
  "### 🧹 ESLint ratchet",
  "",
  `| | Errors | Warnings |`,
  `|---|---:|---:|`,
  `| Baseline (\`${BASELINE_FILE}\`) | ${baseline} | – |`,
  `| This run | **${errors}** | ${warnings} |`,
  "",
  top.length ? "Top rules: " + top.map(([r, n]) => `\`${r}\` ×${n}`).join(", ") : "",
  "",
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");

// Surface the concrete errors as annotations only when we regressed, so a
// passing run isn't buried under 100+ pre-existing annotations.
if (errors > baseline) {
  let shown = 0;
  for (const file of report) {
    for (const m of file.messages) {
      if (m.severity !== 2 || shown >= 50) continue;
      const rel = file.filePath.replace(process.cwd() + "/", "");
      console.log(`::error file=${rel},line=${m.line},col=${m.column},title=${m.ruleId}::${m.message.split("\n")[0]}`);
      shown++;
    }
  }
  console.error(
    `\n::error title=Lint regression::${errors} errors > baseline ${baseline}. ` +
      `Fix the new errors (do NOT just raise the baseline).`,
  );
  process.exit(1);
}

if (errors < baseline) {
  console.log(
    `::notice title=Lint improved::${errors} < baseline ${baseline}. ` +
      `Lock in the win: node scripts/ci/lint-ratchet.mjs --update && commit ${BASELINE_FILE}`,
  );
}
console.log(`✅ lint ratchet passed (${errors} ≤ ${baseline})`);

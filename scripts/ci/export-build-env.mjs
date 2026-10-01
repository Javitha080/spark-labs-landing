#!/usr/bin/env node
/**
 * Exports the public VITE_* build-time variables into $GITHUB_ENV.
 *
 * WHY THIS EXISTS
 * `.env` is gitignored and `wrangler.json -> vars` only exist at Worker
 * *runtime*. Vite bakes `import.meta.env.VITE_*` into the client bundle at
 * *build* time, so a bare `npm run build` in CI would ship a bundle with an
 * empty Supabase URL/key and the site would fail on every data call.
 *
 * Resolution order for each variable:
 *   1. an already-set, non-empty environment variable (e.g. a GitHub repo
 *      variable mapped in the workflow) -> lets you override per repo
 *   2. the matching entry in wrangler.json `vars` (single source of truth)
 *
 * These are PUBLIC values (Supabase URL + publishable/anon key, Turnstile
 * *site* key). Never put secrets in VITE_* variables.
 */
import { readFileSync, appendFileSync } from "node:fs";

const REQUIRED = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];
const OPTIONAL = ["VITE_TURNSTILE_SITE_KEY"];

let wranglerVars = {};
try {
  wranglerVars = JSON.parse(readFileSync("wrangler.json", "utf8")).vars ?? {};
} catch (err) {
  console.warn(`::warning::Could not read wrangler.json vars: ${err.message}`);
}

const resolved = {};
const missing = [];

for (const key of [...REQUIRED, ...OPTIONAL]) {
  const value = (process.env[key] || wranglerVars[key] || "").trim();
  if (value) {
    resolved[key] = value;
  } else if (REQUIRED.includes(key)) {
    missing.push(key);
  } else {
    console.warn(
      `::warning title=${key} not set::Optional build variable ${key} is empty. ` +
        `Set it as a GitHub repository variable if the client needs it (Cloudflare Turnstile).`,
    );
  }
}

if (missing.length) {
  console.error(
    `::error title=Missing build variables::${missing.join(", ")} not found in the environment or wrangler.json vars.`,
  );
  process.exit(1);
}

const envFile = process.env.GITHUB_ENV;
for (const [key, value] of Object.entries(resolved)) {
  if (/[\r\n]/.test(value)) {
    console.error(`::error::${key} contains a newline; refusing to export.`);
    process.exit(1);
  }
  if (envFile) appendFileSync(envFile, `${key}=${value}\n`);
  // Print names only (values are public, but there's no reason to be noisy).
  console.log(`exported ${key}`);
}

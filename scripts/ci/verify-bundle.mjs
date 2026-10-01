#!/usr/bin/env node
/**
 * Post-build sanity checks on dist/client. Fails the pipeline if the bundle
 * would be broken in production, and writes a size report to the job summary.
 *
 * Checks:
 *  - index.html + at least one JS asset exist
 *  - the Supabase URL and publishable key were actually baked into the bundle
 *    (guards against a build that ran without VITE_* variables)
 *  - sw.js had its __SW_VERSION__ placeholder replaced (otherwise browsers
 *    never detect a new service worker after a deploy)
 */
import { readdirSync, readFileSync, statSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist/client";
const errors = [];
const fail = (msg) => errors.push(msg);

if (!existsSync(join(DIST, "index.html"))) fail(`${DIST}/index.html is missing`);

const assetsDir = join(DIST, "assets");
const jsFiles = existsSync(assetsDir)
  ? readdirSync(assetsDir).filter((f) => f.endsWith(".js"))
  : [];
if (jsFiles.length === 0) fail(`no JS assets found in ${assetsDir}`);

// ── Are the Supabase settings baked in? ──────────────────────────────────────
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  fail("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set in this step's env");
} else {
  const host = new URL(url).host;
  let hasUrl = false;
  let hasKey = false;
  for (const f of jsFiles) {
    const src = readFileSync(join(assetsDir, f), "utf8");
    hasUrl ||= src.includes(host);
    hasKey ||= src.includes(key);
    if (hasUrl && hasKey) break;
  }
  if (!hasUrl) fail(`Supabase host "${host}" was not baked into any client bundle`);
  if (!hasKey) fail("Supabase publishable key was not baked into any client bundle");
}

// ── Service worker version injected? ─────────────────────────────────────────
const swPath = join(DIST, "sw.js");
if (existsSync(swPath)) {
  if (readFileSync(swPath, "utf8").includes("__SW_VERSION__")) {
    fail("sw.js still contains the __SW_VERSION__ placeholder");
  }
} else {
  console.warn("::warning::dist/client/sw.js not found; skipping service-worker check");
}

// ── Size report ──────────────────────────────────────────────────────────────
const sizes = jsFiles
  .map((f) => {
    const buf = readFileSync(join(assetsDir, f));
    return { f, raw: buf.length, gz: gzipSync(buf).length };
  })
  .sort((a, b) => b.raw - a.raw);
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const totalRaw = sizes.reduce((s, x) => s + x.raw, 0);
const totalGz = sizes.reduce((s, x) => s + x.gz, 0);

const lines = [
  "### 📦 Client bundle",
  "",
  `**${jsFiles.length}** JS chunks · **${kb(totalRaw)}** raw · **${kb(totalGz)}** gzip`,
  "",
  "| Largest chunks | Raw | Gzip |",
  "|---|---:|---:|",
  ...sizes.slice(0, 5).map((s) => `| \`${s.f}\` | ${kb(s.raw)} | ${kb(s.gz)} |`),
  "",
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
}

if (errors.length) {
  for (const e of errors) console.error(`::error title=Bundle verification failed::${e}`);
  process.exit(1);
}
console.log("✅ bundle verification passed");

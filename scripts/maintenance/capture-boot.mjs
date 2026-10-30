/**
 * Capture the boot-screen animation at fixed beats so the sequence can be
 * reviewed without sitting through it. Dev-only helper: it launches Edge via
 * playwright-core, screenshots the post-load timeline, and prints any console
 * errors or warnings the page produced.
 *
 * Usage:
 *   npm run dev            # or any server serving the app
 *   node scripts/maintenance/capture-boot.mjs
 *   CAPTURE_URL=http://localhost:8080/?boot=1 node scripts/maintenance/capture-boot.mjs
 *
 * Output: scripts/maintenance/boot-screens/bb-<beat>.png (gitignored).
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const BEATS = [1400, 2600, 3300, 4000, 5200, 6500];
const URL = process.env.CAPTURE_URL || "http://localhost:8080/?boot=1";
const OUT_DIR = "scripts/maintenance/boot-screens";

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--window-size=1440,900", "--disable-extensions", "--no-first-run", "--disable-gpu", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));

const t0 = Date.now();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

for (const beat of BEATS) {
  const wait = beat - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const file = `${OUT_DIR}/bb-${beat}.png`;
  try {
    await page.screenshot({ path: file, timeout: 12_000 });
    console.log(`shot ${file} @ ~${Date.now() - t0}ms`);
  } catch (e) {
    console.log(`MISS bb-${beat}: ${String(e?.message ?? e).slice(0, 60)}`);
  }
}

console.log("LOGS:", logs.length ? logs.join(" || ").slice(0, 1500) : "clean");
await browser.close();

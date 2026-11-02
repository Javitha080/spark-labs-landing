#!/usr/bin/env node
/**
 * Regenerates every logo-derived asset from public/club-logo.png.
 *
 *   node scripts/optimize-brand-assets.mjs
 *
 * What it writes (all via `sharp`, already a devDependency):
 *   public/favicon.ico              real 16/32/48 multi-size ICO (was a 522x522 PNG renamed .ico, 322 kB)
 *   public/icons/icon-{192,512}.png          manifest "any" icons   (were referenced but missing -> 404)
 *   public/icons/maskable-{192,512}.png      manifest "maskable" icons on the brand background
 *   public/icons/apple-touch-icon.png        180x180, flattened (iOS renders alpha as black)
 *   public/club-logo.{png,webp,avif}         512x512 (was 1024x1024, 1.4 MB PNG)
 *   src/assets/club-logo.png                 512x512 copy imported by the header + boot screen
 *
 * Idempotent: running it on an already-optimized 512 px master is safe.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "public/club-logo.png";
const BG = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a - matches manifest background_color
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const PNG = { compressionLevel: 9, effort: 10, adaptiveFiltering: true };

const master = fs.readFileSync(SRC);
const square = (n) => sharp(master).resize(n, n, { fit: "contain", background: CLEAR });
const onBrand = async (canvas, logoSize, out) => {
  const logo = await square(logoSize).png().toBuffer();
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png(PNG)
    .toFile(out);
};

fs.mkdirSync("public/icons", { recursive: true });

for (const n of [192, 512]) {
  await square(n).png(PNG).toFile(`public/icons/icon-${n}.png`);
  await onBrand(n, Math.round(n * 0.62), `public/icons/maskable-${n}.png`); // inside the 80% safe zone
}
await onBrand(180, 144, "public/icons/apple-touch-icon.png");

// ICO container with PNG-compressed frames.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map((n) => square(n).png({ compressionLevel: 9 }).toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = frames.map((buf, i) => {
  const e = Buffer.alloc(16);
  e[0] = sizes[i];
  e[1] = sizes[i];
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bpp
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});
fs.writeFileSync("public/favicon.ico", Buffer.concat([header, ...entries, ...frames]));

const logoPng = await square(512).png(PNG).toBuffer();
fs.writeFileSync("public/club-logo.png", logoPng);
fs.writeFileSync("src/assets/club-logo.png", logoPng);
await square(512).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile("public/club-logo.webp");
await square(512).avif({ quality: 60, effort: 6 }).toFile("public/club-logo.avif");

for (const f of ["public/favicon.ico", "public/club-logo.png", "public/club-logo.webp", "public/club-logo.avif"]) {
  console.log(`${(fs.statSync(f).size / 1024).toFixed(1).padStart(8)} kB  ${path.normalize(f)}`);
}

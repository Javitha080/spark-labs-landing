/**
 * Generates the PWA icon set from `public/club-logo.png` (the 1024×1024
 * roundel). Run whenever the logo changes:
 *
 *   node scripts/ci/generate-icons.mjs
 *
 * Emits into public/icons/: icon-192.png, icon-512.png (full-bleed),
 * maskable-192.png, maskable-512.png (logo at 78% on the theme background, for
 * the 20% safe zone Android wants) and apple-touch-icon.png (180×180, iOS).
 */
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..", "..");
const SRC = path.join(root, "public", "club-logo.png");
const OUT = path.join(root, "public", "icons");
const BG = "#0f172a"; // theme background from manifest.json

readFileSync(SRC); // throw early if the source logo is missing
mkdirSync(OUT, { recursive: true });

async function flush(png, name) {
  await sharp(png).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
  console.log("wrote", path.join("public", "icons", name));
}

const scales = [180, 192, 512];
for (const size of scales) {
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  const png = await sharp(SRC).resize(size, size, { fit: "cover" }).toBuffer();
  await flush(png, name);
}

for (const size of [192, 512]) {
  // Rounded square canvas + logo at 78% → respects the 20% maskable safe zone.
  const inner = Math.round(size * 0.78);
  const offsets = {
    width: size,
    height: size,
    channels: 4,
    background: { r: 0x0f, g: 0x17, b: 0x2a, alpha: 1 },
  };
  const logo = await sharp(SRC).resize(inner, inner, { fit: "cover" }).toBuffer();
  const png = await sharp({ create: offsets })
    .composite([{ input: logo, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
    .png()
    .toBuffer();
  await flush(png, `maskable-${size}.png`);
}

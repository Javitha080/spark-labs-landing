/**
 * OG banner generator (1200x630) for social previews.
 *
 * Rendered locally with sharp (vector -> PNG), using the club's real logo
 * and brand palette (navy #0f172a, cyan #22d3ee, amber #f59e0b). Text is
 * drawn via libvips' pango text renderer using the Windows system font
 * stack ("Segoe UI", Arial fallback). Run manually:
 *
 *   node scripts/build-og-banner.mjs
 *
 * Output: public/assets/og-yicdvp-banner.png (referenced by index.html,
 * src/lib/seo.ts and src/worker/prerender.ts as the default og:image).
 */

import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGO = join(ROOT, "public", "club-logo.png");
const OUT = join(ROOT, "public", "assets", "og-yicdvp-banner.png");

const W = 1200;
const H = 630;

const NAVY = "#0f172a";
const CYAN = "#22d3ee";
const AMBER = "#f59e0b";
const WHITE = "#f8fafc";
const SLATE = "#94a3b8";

const FONT_STACK = "Segoe UI,Arial,sans-serif";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Render a small pango-markup text run to a transparent PNG buffer. */
const renderText = (markup, font) =>
  sharp({ text: { text: markup, font, rgba: true } }).png().toBuffer();

/** Render an inline SVG fragment to a PNG buffer. */
const renderSvg = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

const chipRect = (x, y, w, h, fillOpacity) => `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"
        fill="${CYAN}" fill-opacity="${fillOpacity}"
        stroke="${CYAN}" stroke-opacity="0.55" stroke-width="1.5"/>
</svg>`;

const gradientRule = (w, h = 6) => `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${CYAN}"/>
      <stop offset="100%" stop-color="${AMBER}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="${h / 2}" fill="url(#g)"/>
</svg>`;

/* ------------------------------------------------------------------ */
/*  Background SVG (shapes only - no text, so no font risk)            */
/* ------------------------------------------------------------------ */

const bg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glowCyan" cx="0.75" cy="0.32" r="0.55">
      <stop offset="0%" stop-color="${CYAN}" stop-opacity="0.20"/>
      <stop offset="60%" stop-color="${CYAN}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${CYAN}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="0.92" cy="0.92" r="0.40">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowLeft" cx="0.08" cy="0.10" r="0.45">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <pattern id="hexes" width="56" height="97" patternUnits="userSpaceOnUse">
      <path d="M28 2 L52 16 L52 44 L28 58 L4 44 L4 16 Z" fill="none"
            stroke="${CYAN}" stroke-opacity="0.09" stroke-width="1.5"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="${NAVY}"/>
  <rect width="${W}" height="${H}" fill="url(#glowCyan)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAmber)"/>
  <rect width="${W}" height="${H}" fill="url(#glowLeft)"/>

  <g stroke="${CYAN}" stroke-opacity="0.10" stroke-width="1.5" fill="none">
    <polyline points="60,${H - 90} 300,${H - 90} 320,${H - 110} 540,${H - 110}"/>
    <polyline points="940,120 1060,120 1080,100 1160,100"/>
    <polyline points="1020,555 1140,555 1155,540 1165,540"/>
  </g>
  <g fill="${CYAN}" fill-opacity="0.35">
    <circle cx="540" cy="${H - 110}" r="4"/>
    <circle cx="940" cy="120" r="4"/>
    <circle cx="1020" cy="555" r="4"/>
  </g>

  <g transform="translate(660,40)">
    <rect x="0" y="0" width="520" height="560" fill="url(#hexes)" opacity="0.9"/>
  </g>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#334155" stroke-opacity="0.9"/>
  <path d="M28 28 L28 56" stroke="${CYAN}" stroke-width="3" stroke-opacity="0.8"/>
  <path d="M28 28 L56 28" stroke="${CYAN}" stroke-width="3" stroke-opacity="0.8"/>
  <path d="M${W - 28} ${H - 28} L${W - 28} ${H - 56}" stroke="${AMBER}" stroke-width="3" stroke-opacity="0.8"/>
  <path d="M${W - 28} ${H - 28} L${W - 56} ${H - 28}" stroke="${AMBER}" stroke-width="3" stroke-opacity="0.8"/>
</svg>`;

/* ------------------------------------------------------------------ */
/*  Logo panel                                                         */
/* ------------------------------------------------------------------ */

const logoPanel = `
<svg width="440" height="440" viewBox="0 0 440 440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111f38"/>
      <stop offset="100%" stop-color="#0b1220"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="438" height="438" rx="44" fill="url(#p)"/>
  <rect x="1" y="1" width="438" height="438" rx="44" fill="none"
        stroke="${CYAN}" stroke-opacity="0.45" stroke-width="2"/>
</svg>`;

/* ------------------------------------------------------------------ */
/*  Render                                                             */
/* ------------------------------------------------------------------ */

/**
 * Render markup at the largest pango size (maxSize -> minSize, step 2) whose
 * buffer width still fits maxWidth. Returns the buffer plus measured box so
 * the layout can stack lines without overlaps - even when the font backend
 * resolves a different family on a different machine.
 */
async function fittedText(markup, family, maxSize, minSize, maxWidth) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const buf = await renderText(markup, `${family} ${size}`);
    const meta = await sharp(buf).metadata();
    if (meta.width !== undefined && meta.width <= maxWidth) {
      return { buf, size, width: meta.width, height: meta.height ?? size };
    }
  }
  const buf = await renderText(markup, `${family} ${minSize}`);
  const meta = await sharp(buf).metadata();
  return { buf: await sharp(buf).png().toBuffer(), size: minSize, width: meta.width ?? 0, height: meta.height ?? minSize };
}

/* Pango font descriptions take "FAMILY SIZE"; weight goes in the markup.
   sharp renders points at 72 dpi, so N pt === N px. On Windows fontconfig
   resolves Segoe UI; on machines without it the default sans-serif is used. */
const FAMILY = "Segoe UI";

/** Brand font stack documented in case of manual regeneration. */
void FONT_STACK;

async function main() {
  const logoPadded = await sharp(LOGO)
    .resize(360, 360, { fit: "inside" })
    .png()
    .toBuffer();

  const TEXT_RIGHT_EDGE = 664; // 40px gutter before the logo panel (x=704)

  const title1 = await fittedText(
    `<span foreground="${WHITE}" weight="bold">Young Innovators</span>`,
    FAMILY, 92, 60, TEXT_RIGHT_EDGE - 82
  );
  const title2 = await fittedText(
    `<span foreground="${CYAN}" weight="bold">Club</span>`,
    FAMILY, title1.size, 54, TEXT_RIGHT_EDGE - 86
  );
  const subtitle = await fittedText(
    `<span foreground="${CYAN}">Dharmapala Vidyalaya · Pannipitiya</span>`,
    FAMILY, 40, 28, 600
  );
  const rubric = await fittedText(
    `<span foreground="${AMBER}">STEM · Robotics · IoT · Solar · 3D Printing</span>`,
    FAMILY, 30, 20, 580
  );
  const domain = await renderText(
    `<span foreground="${SLATE}">dvpyic.dpdns.org</span>`,
    `${FAMILY} 26`
  );
  const domainMeta = await sharp(domain).metadata();
  const chipLabel = await renderText(
    `<span foreground="${CYAN}" weight="bold" letter_spacing="3000">YICDVP</span>`,
    `${FAMILY} 26`
  );
  const chipLabelMeta = await sharp(chipLabel).metadata();
  const chipEst = await renderText(
    `<span foreground="${SLATE}">EST. 2020 · SRI LANKA</span>`,
    `${FAMILY} 22`
  );

  /* Measured vertical layout - every y is derived from the line above. */
  const CHIP_Y = 104;
  const TITLE_Y = CHIP_Y + 76;
  const titleGap = Math.round(title1.size * 0.06);
  const TITLE2_Y = TITLE_Y + title1.height + titleGap;
  const SUB_Y = TITLE2_Y + title2.height + Math.round(title2.size * 0.18);
  const RULE_Y = SUB_Y + subtitle.height + 20;
  const RUB_Y = RULE_Y + 16;
  const DOMAIN_Y = H - 42 - (domainMeta.height ?? 26);

  const overlays = [
    // chip: YICDVP (pill + centered label) + est line beside it
    { input: await renderSvg(chipRect(0, 0, 186, 58, 0.10)), left: 84, top: CHIP_Y },
    {
      input: chipLabel,
      left: 84 + Math.round((186 - chipLabelMeta.width) / 2),
      top: CHIP_Y + Math.round((58 - chipLabelMeta.height) / 2) + 2,
    },
    { input: chipEst, left: 84 + 186 + 24, top: CHIP_Y + 20 },

    // headline
    { input: title1.buf, left: 82, top: TITLE_Y },
    { input: title2.buf, left: 86, top: TITLE2_Y },

    // subtitle
    { input: subtitle.buf, left: 84, top: SUB_Y },

    // gradient rule + tagline + domain
    { input: await renderSvg(gradientRule(220)), left: 86, top: RULE_Y },
    { input: rubric.buf, left: 84, top: RUB_Y },
    { input: domain, left: 84, top: DOMAIN_Y },

    // logo panel + logo
    { input: await renderSvg(logoPanel), left: 704, top: 95 },
    { input: logoPadded, left: 704 + 40, top: 95 + 40 },
  ];

  await sharp(Buffer.from(bg))
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log(`OG banner written: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

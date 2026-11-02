/**
 * Text helpers for the boot screen's "decrypt" effect.
 *
 * Pure functions only (no DOM, no GSAP): a timeline drives them, and unit
 * tests can pin them down with a seeded random source.
 */

export type Rand = () => number;

/** Scramble pool: letters + digits + a few symbols that stay legible in mono. */
export const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%@<>\\|+=*";

/** Characters that never scramble, so spacing and punctuation hold still. */
const STATIC_CHARS = " ·.,:;-—_'°&/>()";

const HEX = "0123456789ABCDEF";

export function randomGlyph(rand: Rand = Math.random, glyphs: string = GLYPHS): string {
  return glyphs.charAt(Math.floor(rand() * glyphs.length) % glyphs.length);
}

/**
 * Per-character lock thresholds in [0, 1). Characters resolve roughly
 * left-to-right; `spread` is how much each one may wander from that sweep.
 * Every value is < 1, so at p = 1 everything is locked.
 */
export function lockTimes(length: number, rand: Rand = Math.random, spread = 0.4): number[] {
  const s = Math.min(0.9, Math.max(0, spread));
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const base = length > 1 ? (i / length) * (1 - s) : 0;
    out.push(Math.min(0.999, base + rand() * s));
  }
  return out;
}

/**
 * One frame of a decrypt: characters whose lock time has passed show the
 * real glyph, the rest show noise. Spaces and punctuation always show.
 */
export function decryptFrame(
  target: string,
  p: number,
  locks: readonly number[],
  rand: Rand = Math.random,
  glyphs: string = GLYPHS,
): string {
  if (p >= 1) return target;
  let out = "";
  for (let i = 0; i < target.length; i++) {
    const ch = target.charAt(i);
    const lock = locks[i] ?? 0;
    out += STATIC_CHARS.includes(ch) || p >= lock ? ch : randomGlyph(rand, glyphs);
  }
  return out;
}

/** Short fake session id for the HUD, e.g. "0x9C3E". */
export function hexTag(rand: Rand = Math.random, digits = 4): string {
  let out = "0x";
  for (let i = 0; i < digits; i++) out += HEX.charAt(Math.floor(rand() * 16) % 16);
  return out;
}

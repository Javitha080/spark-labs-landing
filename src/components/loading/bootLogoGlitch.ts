/**
 * RGB-split "tear" for the club logo.
 *
 * A transparent canvas sits over the crisp logo. It is idle (no rAF, no
 * cost) until `burst()` is called; then, for ~100-250ms, it draws the logo
 * three times (cyan / magenta / original) with horizontal slices shoved
 * sideways and the odd band dropped, stepped at ~24fps so it reads as a
 * signal fault rather than smooth motion.
 *
 * Bursts are short and the caller spaces them out (never more than a
 * couple per second) so the effect stays well clear of flash thresholds.
 */

import { prefersReducedMotion } from "@/lib/motion";

export interface LogoGlitchHandle {
  /** One tear. `strength` 0..1, `ms` is clamped to 60..260. */
  burst(strength?: number, ms?: number): void;
  resize(): void;
  destroy(): void;
}

/** The canvas bleeds this fraction of the logo size past every edge (CSS: inset -14%). */
export const GLITCH_BLEED = 0.14;

const MAX_DPR = 1.5;
const STEP_MS = 42;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Layers {
  base: HTMLCanvasElement;
  cyan: HTMLCanvasElement;
  magenta: HTMLCanvasElement;
}

function tint(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const g = out.getContext("2d");
  if (!g) return out;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, out.width, out.height);
  return out;
}

export function createLogoGlitch(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
): LogoGlitchHandle | null {
  if (prefersReducedMotion()) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let dpr = 1;
  let box = 0;
  let ox = 0;
  let oy = 0;
  let layers: Layers | null = null;
  let raf = 0;
  let startedAt = 0;
  let until = 0;
  let strength = 0;
  let lastStep = 0;

  const fit = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    box = Math.round(Math.min(w, h) / (1 + GLITCH_BLEED * 2));
    ox = Math.round((w - box) / 2);
    oy = Math.round((h - box) / 2);
    layers = null; // rebuilt lazily at the new size
  };

  const build = (): Layers | null => {
    if (layers) return layers;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih || box < 8) return null;
    const base = document.createElement("canvas");
    base.width = box;
    base.height = box;
    const g = base.getContext("2d");
    if (!g) return null;
    const k = Math.min(box / iw, box / ih);
    g.drawImage(img, (box - iw * k) / 2, (box - ih * k) / 2, iw * k, ih * k);
    layers = { base, cyan: tint(base, "#27e3ff"), magenta: tint(base, "#ff2a6d") };
    return layers;
  };

  const clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clear();
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now >= until) {
      stop();
      return;
    }
    if (now - lastStep < STEP_MS) return;
    lastStep = now;
    const l = layers;
    if (!l) return;

    const life = clamp((until - now) / Math.max(1, until - startedAt), 0, 1);
    const amp = strength * (0.4 + 0.6 * life);
    const w = canvas.width;
    const split = Math.round((1.5 + Math.random() * 5.5) * amp * dpr);
    const parts: Array<[HTMLCanvasElement, number]> = [
      [l.cyan, -split],
      [l.magenta, split],
      [l.base, 0],
    ];

    clear();
    ctx.globalCompositeOperation = "lighter";
    for (const [src, dx] of parts) ctx.drawImage(src, ox + dx, oy);

    // Shove a few horizontal bands sideways; now and then drop one entirely.
    const bands = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < bands; i++) {
      const bh = Math.max(2, Math.round((0.03 + Math.random() * 0.1) * box));
      const by = Math.round(Math.random() * Math.max(1, box - bh));
      const shift = Math.round((Math.random() - 0.5) * box * 0.34 * amp);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, oy + by, w, bh);
      ctx.clip();
      ctx.clearRect(0, oy + by, w, bh);
      if (Math.random() > 0.22) {
        ctx.globalCompositeOperation = "lighter";
        for (const [src, dx] of parts) {
          ctx.drawImage(src, 0, by, box, bh, ox + dx + shift, oy + by, box, bh);
        }
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  fit();
  window.addEventListener("resize", fit);

  return {
    burst(s = 0.8, ms = 160) {
      // The one-shot fit() above can run before layout settles (CSS injecting
      // late, hidden tab), leaving the buffer at the 300x150 intrinsic size.
      // Re-fit whenever the element box has drifted before painting a tear.
      const tw = Math.round(canvas.clientWidth * dpr);
      const th = Math.round(canvas.clientHeight * dpr);
      if (box < 8 || (tw > 0 && th > 0 && (canvas.width !== tw || canvas.height !== th))) fit();
      if (!build()) return;
      strength = clamp(s, 0, 1);
      const now = performance.now();
      startedAt = now;
      until = now + clamp(ms, 60, 260);
      lastStep = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    resize: fit,
    destroy() {
      stop();
      until = 0;
      layers = null;
      window.removeEventListener("resize", fit);
    },
  };
}

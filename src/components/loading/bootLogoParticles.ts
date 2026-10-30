/**
 * 2D particle stage for the boot screen ("Ignition").
 *
 * One opaque carbon canvas, one rAF loop (decoupled from GSAP so timeline
 * edits can never kill the morph mid-flight):
 *
 *  - ambient embers drifting up while the progress counter runs,
 *  - a convergence burst that assembles the club logo silhouette,
 *    sampled from the real logo's alpha channel and tinted with the
 *    logo's own colors plus the ignition palette,
 *  - an outward "ignite" release when the boot screen lifts.
 *
 * All coordinates are device pixels (dpr-capped at 2) so the math stays
 * identical across screens.
 */

import { prefersReducedMotion, isLowPowerDevice } from "@/lib/motion";

export const ASSEMBLE_DUR = 1.5; // seconds, matches the GSAP beat map

const TRAIL_FADE = "rgba(6, 5, 4, 0.26)";
const CARBON = "#060504";
const MAX_DPR = 2;

type Mode = "idle" | "ambient" | "assemble" | "ignite" | "done";

interface Particle {
  nx: number;
  ny: number; // normalized position inside the logo box (0..1)
  sx: number;
  sy: number; // spawn position (device px)
  tx: number;
  ty: number; // target position (device px)
  size: number;
  delay: number;
  phase: number;
  wanderAmp: number;
  wanderSpd: number;
  sprite: number;
  alpha: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  sprite: number;
}

interface SampledPoint {
  nx: number;
  ny: number;
  purple: boolean;
}

function makeSprite(hex: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255, 250, 240, 1)");
  grad.addColorStop(0.25, `${hex}e6`);
  grad.addColorStop(0.6, `${hex}47`);
  grad.addColorStop(1, `${hex}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
}

function sampleLogo(img: HTMLImageElement, off: number): SampledPoint[] {
  const oc = document.createElement("canvas");
  oc.width = oc.height = off;
  const og = oc.getContext("2d", { willReadFrequently: true });
  if (!og) return [];
  try {
    og.drawImage(img, 0, 0, off, off);
    const { data } = og.getImageData(0, 0, off, off);
    const pts: SampledPoint[] = [];
    for (let y = 0; y < off; y++) {
      for (let x = 0; x < off; x++) {
        const i = (y * off + x) * 4;
        if (data[i + 3] > 40) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          pts.push({ nx: (x + 0.5) / off, ny: (y + 0.5) / off, purple: b > r + 18 && b > g + 18 });
        }
      }
    }
    return pts;
  } catch {
    return [];
  }
}

export interface LogoParticlesHandle {
  ambient(): void;
  /** Assemble the logo silhouette; the stage rect is measured when this runs. */
  assemble(img: HTMLImageElement, stage: () => DOMRect): void;
  ignite(): void;
  resize(): void;
  destroy(): void;
  /** True once the silhouette has been sampled successfully. */
  readonly sampled: boolean;
}

export function createLogoParticles(canvas: HTMLCanvasElement): LogoParticlesHandle | null {
  if (prefersReducedMotion()) return null;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  const low = isLowPowerDevice();
  const sprites = [makeSprite("#f38a2a"), makeSprite("#f3b72f"), makeSprite("#7a55d4")];

  let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let raf = 0;
  let mode: Mode = "idle";
  let t0 = 0;
  let igT0 = 0;
  let sampled = false;

  let particles: Particle[] = [];
  let basePts: SampledPoint[] = [];
  let stageRect: DOMRect | null = null;
  let stageGetter: (() => DOMRect) | null = null;
  let embers: Ember[] = [];
  let emberAcc = 0;

  const fit = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.fillStyle = CARBON;
    ctx.fillRect(0, 0, w, h);
  };

  const cap = () =>
    low ? 650 : Math.min(1500, Math.round((canvas.clientWidth * canvas.clientHeight) / 1600));

  const mapParticles = () => {
    if (!stageRect || basePts.length === 0) return;
    const anchor = resizeAnchor();
    if (!anchor) return;
    const { cx, cy, box } = anchor;
    const sizeBase = low ? 2.1 : 2.5;
    const sizeVar = low ? 1.5 : 2.6;

    const wanted = Math.min(cap(), basePts.length);
    const step = basePts.length / wanted;
    particles = [];
    const spread = Math.hypot(canvas.clientWidth, canvas.clientHeight) / 2;
    for (let i = 0; i < wanted; i++) {
      const p = basePts[Math.floor(i * step)];
      const ang = Math.random() * Math.PI * 2;
      const rad = spread * (0.5 + Math.random() * 0.5);
      const sprite = p.purple ? 2 : Math.random() < 0.14 ? 1 : 0;
      particles.push({
        nx: p.nx,
        ny: p.ny,
        sx: cx + Math.cos(ang) * rad * dpr,
        sy: cy + Math.sin(ang) * rad * dpr,
        tx: cx + (p.nx - 0.5) * box,
        ty: cy + (p.ny - 0.5) * box,
        size: (sizeBase + Math.random() * sizeVar) * dpr,
        delay: Math.random() * 0.42,
        phase: Math.random() * Math.PI * 2,
        wanderAmp: (0.5 + Math.random() * 1.1) * dpr,
        wanderSpd: 0.8 + Math.random() * 1.6,
        sprite,
        alpha: 0.55 + Math.random() * 0.45,
      });
    }
  };

  const resizeAnchor = () => {
    if (!stageRect) return null;
    const cvb = canvas.getBoundingClientRect();
    return {
      cx: (stageRect.left - cvb.left + stageRect.width / 2) * dpr,
      cy: (stageRect.top - cvb.top + stageRect.height / 2) * dpr,
      box: Math.max(8, stageRect.width * dpr),
    };
  };

  const spawnEmber = () => {
    embers.push({
      x: Math.random() * canvas.clientWidth * dpr,
      y: canvas.height * (0.92 + Math.random() * 0.1),
      vx: (Math.random() - 0.5) * 6 * dpr,
      vy: -(10 + Math.random() * 26) * dpr,
      size: (1.6 + Math.random() * 2.4) * dpr,
      life: 0,
      maxLife: 2.6 + Math.random() * 3.4,
      sprite: Math.random() < 0.8 ? 0 : 1,
    });
  };

  const drawCentered = (sprite: number, x: number, y: number, size: number, alpha: number) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(sprites[sprite], x - size / 2, y - size / 2, size, size);
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (loop["last"] || now)) / 1000);
    loop["last"] = now;

    // Ember trails: translucent carbon wash, then additive light.
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = TRAIL_FADE;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";

    const w = canvas.width;
    const h = canvas.height;

    if (mode === "ambient" || mode === "assemble") {
      emberAcc += dt * (low ? 9 : 22);
      while (emberAcc >= 1 && embers.length < (low ? 40 : 90)) {
        emberAcc -= 1;
        spawnEmber();
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        e.x += e.vx * dt + Math.sin(e.life * 2.2 + e.size) * 4 * dpr * dt;
        e.y += e.vy * dt;
        const fade = e.life < 0.4 ? e.life / 0.4 : Math.max(0, 1 - (e.life / e.maxLife) ** 2);
        drawCentered(e.sprite, e.x, e.y, e.size * 3, fade * 0.5);
        if (e.life > e.maxLife || e.y < -10) {
          embers[i] = embers[embers.length - 1];
          embers.pop();
        }
      }
    }

    if (mode === "assemble") {
      const t = (now - t0) / 1000;
      // Track a still-settling overlay: retarget every frame so a logo box
      // measured mid-slide still pulls the silhouette into place.
      if (stageGetter) stageRect = stageGetter();
      const anchor = resizeAnchor();
      for (const p of particles) {
        if (anchor) {
          p.tx = anchor.cx + (p.nx - 0.5) * anchor.box;
          p.ty = anchor.cy + (p.ny - 0.5) * anchor.box;
        }
        const local = Math.max(0, Math.min(1, (t - p.delay) / (ASSEMBLE_DUR - 0.4)));
        const eased = 1 - (1 - local) ** 3;
        let x = p.sx + (p.tx - p.sx) * eased;
        let y = p.sy + (p.ty - p.sy) * eased;
        if (local >= 1) {
          x += Math.sin(now * 0.001 * p.wanderSpd * 3 + p.phase) * p.wanderAmp;
          y += Math.cos(now * 0.001 * p.wanderSpd * 2.3 + p.phase) * p.wanderAmp;
        }
        drawCentered(p.sprite, x, y, p.size * 2.6, eased * p.alpha);
      }
    }

    if (mode === "ignite") {
      const t = (now - igT0) / 1000;
      const keep = Math.max(0, 1 - t / 0.8);
      if (t > 0.85 || particles.length === 0) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = CARBON;
        ctx.fillRect(0, 0, w, h);
        mode = "done";
        embers.length = 0;
        ctx.globalCompositeOperation = "lighter";
      } else {
        for (const p of particles) {
          const ang = Math.atan2(p.ty - h / 2, p.tx - w / 2);
          const burst = 90 + (p.size / dpr) * 130;
          p.tx += Math.cos(ang) * burst * dt;
          p.ty += Math.sin(ang) * burst * dt;
          drawCentered(p.sprite, p.tx, p.ty, p.size * 2.6, keep * p.alpha);
        }
      }
    }

    ctx.globalAlpha = 1;
  };

  fit();
  raf = requestAnimationFrame(loop);

  const onResize = () => {
    fit();
    if (stageGetter) {
      stageRect = stageGetter();
      mapParticles();
    } else if (stageRect) {
      mapParticles();
    }
  };
  window.addEventListener("resize", onResize);

  return {
    ambient() {
      if (mode === "idle") mode = "ambient";
    },
    get sampled() {
      return sampled;
    },
    assemble(img, stage) {
      stageGetter = stage;
      stageRect = stage();
      basePts = sampleLogo(img, low ? 84 : 116);
      sampled = basePts.length > 40;
      if (!sampled) return;
      embers.length = 0;
      mapParticles();
      mode = "assemble";
      t0 = performance.now();
    },
    ignite() {
      if (mode !== "assemble" && mode !== "ambient") return;
      mode = "ignite";
      igT0 = performance.now();
    },
    resize: onResize,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mode = "done";
      particles = [];
      embers = [];
    },
  };
}

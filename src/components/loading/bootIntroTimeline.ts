import gsap from "gsap";
import { isLowPowerDevice, isTouchLike } from "@/lib/motion";

/**
 * "Make It Move" intro timeline — ported from the upstream demo and
 * rebranded for YICDVP. Single pass (the boot screen plays once and hands
 * over to the hero via the boot contract in BootScreen.tsx); the demo's
 * looping / scrubbing / resize-rebuild behaviour stays behind.
 *
 * Selector notes: every selector text here is namespaced under `.bim-*`.
 * The component calls buildTimeline() inside a gsap.context(...) whose scope
 * is the overlay root, so these selectors can never leak into the page.
 */

/**
 * Per-device cost ceiling for the intro's filter work. The choreography is
 * identical on every device — every tween keeps its targets, timings and
 * eases — only the blur *radii* and how many characters smear at once are
 * tuned down on low-power hardware. Motion blur reads the same at those
 * radii while animating, but each frame repaints far less of the screen,
 * which is what made phones drop frames and play the show late.
 */
export interface BootBudget {
  lowPower: boolean;
  /** Per-character motion-blur radius (headline + wipe close). */
  charBlur: number;
  /** Extra stagger pad so fewer characters smear simultaneously. */
  charStaggerPad: number;
  /** Orbit shapes: entry smear and implosion smear. */
  shapeBlur: number;
  shapeImploBlur: number;
  /** Orb flash + its stretch-into-the-bar smear. */
  orbFlashBlur: number;
  orbSmearBlur: number;
  /** Orange bar reveal. */
  barBlur: number;
  /** Headline skew smears when the lines slide apart. */
  lineSmearBlur: number;
  /** Marquee bands: smear radius, and how long the smear stays on. */
  mqBlur: number;
  mqBlurDur: number;
  /** Brand-wipe collapse blur. */
  wipeBlur: number;
}

const DESKTOP_BUDGET: Omit<BootBudget, "lowPower"> = {
  charBlur: 18,
  charStaggerPad: 0,
  shapeBlur: 14,
  shapeImploBlur: 10,
  orbFlashBlur: 30,
  orbSmearBlur: 16,
  barBlur: 22,
  lineSmearBlur: 9,
  mqBlur: 8,
  mqBlurDur: 2.1,
  wipeBlur: 8,
};

const LOW_POWER_BUDGET: Omit<BootBudget, "lowPower"> = {
  charBlur: 9,
  charStaggerPad: 0.025,
  shapeBlur: 6,
  shapeImploBlur: 4,
  orbFlashBlur: 18,
  orbSmearBlur: 10,
  barBlur: 14,
  lineSmearBlur: 5,
  mqBlur: 5,
  mqBlurDur: 0.55,
  wipeBlur: 4,
};

export function buildBudget(): BootBudget {
  const lowPower = isLowPowerDevice() || isTouchLike();
  const tuned = lowPower ? LOW_POWER_BUDGET : DESKTOP_BUDGET;
  return { lowPower, ...tuned };
}

export const TOTAL = 5.15;

export type ShapeKind =
  | "ring"
  | "disc"
  | "plus"
  | "tri"
  | "half"
  | "sq"
  | "diamond"
  | "dots"
  | "arc"
  | "bars";

export interface ShapeDef {
  kind: ShapeKind;
  color: "or" | "fg";
  stroke?: boolean;
  angle: number; // degrees
  r: number; // 0..1 distance factor
  size: number; // vmin
  rot: number;
  spin: number;
}

export const SHAPES: ShapeDef[] = [
  { kind: "ring", color: "or", angle: -152, r: 0.86, size: 15, rot: 0, spin: 90 },
  { kind: "plus", color: "fg", angle: -62, r: 0.8, size: 7, rot: 45, spin: 180 },
  { kind: "tri", color: "or", angle: 24, r: 0.9, size: 10, rot: 20, spin: -120 },
  { kind: "half", color: "fg", angle: 152, r: 0.76, size: 9, rot: -30, spin: 140 },
  { kind: "sq", color: "fg", stroke: true, angle: -108, r: 0.58, size: 8, rot: 15, spin: 110 },
  { kind: "diamond", color: "or", angle: 100, r: 0.62, size: 5.5, rot: 0, spin: -90 },
  { kind: "dots", color: "or", angle: -20, r: 0.96, size: 9, rot: 0, spin: 0 },
  { kind: "arc", color: "fg", stroke: true, angle: 200, r: 0.72, size: 12, rot: 30, spin: 200 },
  { kind: "disc", color: "fg", angle: 62, r: 0.66, size: 3.2, rot: 0, spin: 0 },
  { kind: "disc", color: "or", angle: -134, r: 0.42, size: 2.6, rot: 0, spin: 0 },
  { kind: "bars", color: "or", angle: 176, r: 0.97, size: 8, rot: 0, spin: 0 },
  { kind: "plus", color: "or", angle: 128, r: 0.92, size: 5, rot: 0, spin: -150 },
  { kind: "tri", color: "fg", stroke: true, angle: -36, r: 0.64, size: 7, rot: -15, spin: 160 },
  { kind: "ring", color: "fg", angle: 4, r: 1, size: 5, rot: 0, spin: 0 },
];

const LABELS = [
  { t: 0, text: "01 — IGNITE" },
  { t: 1.0, text: "02 — ACCELERATE" },
  { t: 3.0, text: "03 — LAUNCH" },
  { t: 4.4, text: "04 — RELEASE" },
];

const fmt = (t: number) => {
  const s = Math.floor(t);
  const cs = Math.floor((t - s) * 100);
  return `0${s}.${cs.toString().padStart(2, "0")}`;
};

/** Builds the ~5s intro as a single-pass GSAP timeline (HUD included). */
export function buildTimeline(root: HTMLElement, budget: BootBudget = buildBudget()) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const vmin = Math.min(w, h) / 100;

  const hud = root.querySelector<HTMLElement>(".bim-hud");
  const timeEl = root.querySelector<HTMLElement>(".bim-t-code");
  const sceneEl = root.querySelector<HTMLElement>(".bim-t-scene");
  let lastLabel = "";

  const tl = gsap.timeline({
    defaults: { ease: "expo.out" },
    onUpdate: () => {
      const t = tl.time();
      if (timeEl) timeEl.textContent = fmt(t);
      if (sceneEl) {
        const label = LABELS.findLast((l) => t >= l.t)!.text;
        if (label !== lastLabel) {
          sceneEl.textContent = label;
          lastLabel = label;
        }
      }
      // While the orange wipe owns the screen the HUD ink flips to black.
      hud?.classList.toggle("bim-hud--dark", t > 3.3 && t < 4.6);
    },
  });

  gsap.set(".bim-ch", { transformPerspective: 700 });

  const blurIn = {
    yPercent: 118,
    rotate: 10,
    scaleY: 1.6,
    opacity: 0,
    filter: `blur(${budget.charBlur}px)`,
  };
  const blurOut = {
    yPercent: 0,
    rotate: 0,
    scaleY: 1,
    opacity: 1,
    filter: "blur(0px)",
  };

  /* ---------- Camera: slow breathing zoom + shake on impact ---------- */
  tl.fromTo(".bim-cam", { scale: 1.06 }, { scale: 1, duration: 2.5, ease: "sine.inOut" }, 0);
  tl.to(".bim-cam", { scale: 1.06, duration: 2.5, ease: "sine.inOut" }, 2.5);
  tl.to(
    ".bim-cam",
    {
      keyframes: {
        x: [-1.4 * vmin, 1.2 * vmin, -0.8 * vmin, 0.5 * vmin, 0],
        y: [0.8 * vmin, -1.2 * vmin, 0.7 * vmin, -0.3 * vmin, 0],
        easeEach: "none",
      },
      duration: 0.32,
    },
    3.0,
  );
  tl.to(
    ".bim-cam",
    {
      keyframes: { x: [0.6 * vmin, -0.5 * vmin, 0], y: [-0.5 * vmin, 0.4 * vmin, 0], easeEach: "none" },
      duration: 0.2,
    },
    1.05,
  );

  /* ---------- Scene 1: Ignite ---------- */
  tl.fromTo(".bim-gv", { scaleY: 0 }, { scaleY: 1, duration: 1.1, stagger: 0.07 }, 0);
  tl.fromTo(".bim-gh", { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.08 }, 0.1);
  tl.fromTo(
    ".bim-glow",
    { scale: 0.2, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1.4, ease: "power2.out" },
    0.1,
  );

  tl.fromTo(".bim-orb", { scale: 0 }, { scale: 1, duration: 0.85, ease: "elastic.out(1,0.5)" }, 0.15);
  tl.fromTo(
    ".bim-orb",
    { filter: `blur(${budget.orbFlashBlur}px)` },
    { filter: "blur(0px)", duration: 0.5, ease: "power2.out" },
    0.15,
  );

  tl.set(".bim-ring", { opacity: 0 }, 0);
  tl.fromTo(
    ".bim-ring",
    { scale: 0.4, opacity: 0.9 },
    { scale: 3.4, opacity: 0, duration: 1.3, stagger: 0.14, ease: "power3.out", immediateRender: false },
    0.4,
  );

  // Burst shapes
  const els = gsap.utils.toArray<HTMLElement>(".bim-shape");
  els.forEach((el, i) => {
    const d = SHAPES[i];
    if (!d) return;
    const a = (d.angle * Math.PI) / 180;
    const x = Math.cos(a) * w * 0.44 * d.r;
    const y = Math.sin(a) * h * 0.44 * d.r;
    const start = 0.5 + i * 0.03;
    tl.fromTo(
      el,
      { x: 0, y: 0, scale: 0, rotation: -200, filter: `blur(${budget.shapeBlur}px)` },
      { x, y, scale: 1, rotation: d.rot, filter: "blur(0px)", duration: 1.15, ease: "expo.out" },
      start,
    );
    // idle spin on the inner svg (separate element → no property conflicts)
    const inner = el.querySelector("svg");
    if (inner && d.spin) {
      tl.fromTo(inner, { rotation: 0 }, { rotation: d.spin, duration: 2.6, ease: "none" }, start);
    }
    // implosion into the centre
    tl.to(
      el,
      { x: 0, y: 0, scale: 0, rotation: `+=${d.spin > 0 ? 120 : -120}`, filter: `blur(${budget.shapeImploBlur}px)`, duration: 0.45, ease: "back.in(1.6)" },
      2.65 + i * 0.015,
    );
  });

  /* ---------- Scene 2: Accelerate ---------- */
  // orb stretches into the orange bar (motion-blur smear)
  tl.to(
    ".bim-orb",
    { scaleX: 10, scaleY: 0.45, filter: `blur(${budget.orbSmearBlur}px)`, duration: 0.5, ease: "expo.in" },
    1.0,
  );
  tl.set(".bim-orb", { autoAlpha: 0 }, 1.5);
  tl.fromTo(
    ".bim-bar",
    { scaleX: 0, filter: `blur(${budget.barBlur}px)` },
    { scaleX: 1, filter: "blur(0px)", duration: 0.85 },
    1.3,
  );
  tl.fromTo(".bim-echo", { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.1 }, 1.4);
  tl.to(".bim-bar", { scaleY: 1.22, duration: 0.12, ease: "power2.out" }, 2.3);
  tl.to(".bim-bar", { scaleY: 1, duration: 0.55 }, 2.42);
  tl.to(".bim-echo", { opacity: 0, duration: 0.3, ease: "power2.in" }, 2.75);

  // headline letters rise from the mask with blur + stretch
  tl.fromTo(".bim-l1 .bim-ch", blurIn, { ...blurOut, duration: 0.95, stagger: 0.045 + budget.charStaggerPad }, 1.2);
  tl.fromTo(".bim-l2 .bim-ch", blurIn, { ...blurOut, duration: 0.95, stagger: 0.07 + budget.charStaggerPad }, 1.34);
  tl.fromTo(".bim-l3 .bim-ch", blurIn, { ...blurOut, duration: 0.95, stagger: 0.05 + budget.charStaggerPad }, 1.48);

  // beat: INNOVATE goes outline, DISRUPT flips, CREATE pops
  tl.to(".bim-l1", { "--fa": 0, duration: 0.45, ease: "power2.out" }, 2.2);
  tl.to(".bim-l3 .bim-ch", { rotationX: 360, duration: 0.95, stagger: 0.06, ease: "expo.inOut" }, 2.1);
  tl.to(".bim-l2", { scale: 1.1, duration: 0.14, ease: "power2.out" }, 2.3);
  tl.to(".bim-l2", { scale: 1, duration: 0.5 }, 2.44);

  // lines slide apart with a skew + blur smear
  tl.to(
    ".bim-l1",
    { x: 5 * vmin, skewX: -14, filter: `blur(${budget.lineSmearBlur}px)`, duration: 0.25, ease: "power2.in" },
    2.5,
  );
  tl.to(".bim-l1", { skewX: 0, filter: "blur(0px)", duration: 0.5 }, 2.75);
  tl.to(
    ".bim-l3",
    { x: -5 * vmin, skewX: 14, filter: `blur(${budget.lineSmearBlur}px)`, duration: 0.25, ease: "power2.in" },
    2.5,
  );
  tl.to(".bim-l3", { skewX: 0, filter: "blur(0px)", duration: 0.5 }, 2.75);

  // marquees whoosh through. The xPercent travel and the smear are separate
  // tweens so low-power devices can clear the blur early and marquee the
  // rest of the way un-filtered (identical travel on every device).
  tl.fromTo(".bim-mq", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 1.05);
  tl.fromTo(".bim-mq-a .bim-track", { xPercent: 0 }, { xPercent: -50, duration: 2.1, ease: "power3.out" }, 1.0);
  tl.fromTo(
    ".bim-mq-a .bim-track",
    { filter: `blur(${budget.mqBlur}px)` },
    { filter: "blur(0px)", duration: budget.mqBlurDur, ease: "power2.out" },
    1.0,
  );
  tl.fromTo(".bim-mq-b .bim-track", { xPercent: -50 }, { xPercent: 0, duration: 2.1, ease: "power3.out" }, 1.0);
  tl.fromTo(
    ".bim-mq-b .bim-track",
    { filter: `blur(${budget.mqBlur}px)` },
    { filter: "blur(0px)", duration: budget.mqBlurDur, ease: "power2.out" },
    1.0,
  );
  tl.to(".bim-mq", { opacity: 0, duration: 0.25, ease: "power2.in" }, 2.75);

  /* ---------- Scene 3: Launch — circular orange wipe + brand close ---------- */
  tl.fromTo(
    ".bim-wipe",
    { clipPath: "circle(0% at 50% 50%)" },
    { clipPath: "circle(75% at 50% 50%)", duration: 0.85, ease: "expo.inOut" },
    3.0,
  );
  tl.fromTo(
    ".bim-logo",
    { scale: 0.6, autoAlpha: 0, rotation: -10 },
    { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.9, ease: "back.out(1.8)" },
    3.32,
  );
  tl.fromTo(".bim-w1 .bim-ch", blurIn, { ...blurOut, duration: 0.9, stagger: 0.05 + budget.charStaggerPad }, 3.3);
  tl.fromTo(".bim-w2 .bim-ch", blurIn, { ...blurOut, duration: 0.9, stagger: 0.05 + budget.charStaggerPad }, 3.42);
  tl.fromTo(
    ".bim-wplus",
    { scale: 0, rotation: -270 },
    { scale: 1, rotation: 0, duration: 1.0, ease: "back.out(1.8)" },
    3.3,
  );
  tl.fromTo(
    ".bim-wring",
    { scale: 0, rotation: -90 },
    { scale: 1, rotation: 0, duration: 1.0, ease: "elastic.out(1,0.55)" },
    3.4,
  );
  tl.fromTo(".bim-wdots i", { scale: 0 }, { scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(3)" }, 3.55);
  tl.fromTo(".bim-wline", { scaleX: 0 }, { scaleX: 1, duration: 0.9 }, 3.55);
  tl.fromTo(
    ".bim-wmono",
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 },
    3.6,
  );

  // collapse back into the centre → hand-off to the hero curtain lift
  tl.to(
    ".bim-wipe-in",
    { scale: 0.88, filter: `blur(${budget.wipeBlur}px)`, duration: 0.55, ease: "power2.in" },
    4.3,
  );
  tl.to(".bim-wipe", { clipPath: "circle(0% at 50% 50%)", duration: 0.6, ease: "expo.inOut" }, 4.4);

  // grid retracts at the very end
  tl.to(".bim-gv", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.5, stagger: 0.03, ease: "expo.inOut" }, 4.3);
  tl.to(".bim-gh", { scaleX: 0, transformOrigin: "100% 50%", duration: 0.5, stagger: 0.03, ease: "expo.inOut" }, 4.3);

  // while the wipe fully covers the screen, hide the leftovers of scene 2
  tl.set(".bim-words .bim-line, .bim-bar, .bim-echo, .bim-mq", { autoAlpha: 0, immediateRender: false }, 3.9);

  // pad the timeline to exactly TOTAL
  tl.set({}, {}, TOTAL);

  return tl;
}

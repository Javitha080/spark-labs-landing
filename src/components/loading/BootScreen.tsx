import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import clubLogo from "@/assets/club-logo.png";
import ShinyText from "@/components/reactbits/ShinyText";
import { prefersReducedMotion, isLowPowerDevice } from "@/lib/motion";
import { getLenis } from "@/lib/scroll";
import { BOOT_EVENT, dispatchBooted, hasBooted, markBooted } from "@/lib/boot";
import {
  ASSEMBLE_DUR,
  createLogoParticles,
  type LogoParticlesHandle,
} from "./bootLogoParticles";
import { createEmberVolume, type EmberStageHandle } from "./bootStage3D";
import "./BootScreen.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const WORDS = ["YOUNG", "INNOVATORS", "CLUB"];
const MIN_STORY = 2600; // the identity moment needs at least this long
const MAX_WAIT = 6800; // a stalled asset can never trap the visitor
const SKIP_AT = 1400; // skip control appears after this beat

const isForcedBoot = () => {
  try {
    return new URLSearchParams(window.location.search).get("boot") === "1";
  } catch {
    return false;
  }
};

/**
 * Boot screen — "Ignition".
 *
 * Narrative beats (GSAP master choreography + a 2D particle stage + a
 * lazy Three.js ember volume behind everything):
 *
 *   1. HUD corners + calibration scan bars draw in, counter starts
 *      (progress is REAL: window load + fonts + logo decode).
 *   2. ~55%: logo silhouette assembles from ~1400 particles sampled
 *      from the actual club-logo alpha channel; shockwave rings fire
 *      at impact, the crisp PNG crossfades over the silhouette.
 *   3. Wordmark "YOUNG INNOVATORS CLUB" chars rise per-char; ReactBits
 *      ShinyText shimmers the tagline.
 *   4. Ignition flash, particles burst outward, carbon wipe lifts the
 *      curtain onto the hero (BOOT_EVENT coordinates the handoff).
 *
 * Rules of engagement (unchanged from the previous boot screen):
 *   - FIXED overlay, once per session, skipped for reduced motion and
 *     deep links with a hash (a `?boot=1` query forces a replay).
 *   - While visible it only pauses Lenis; no scroll/wheel hijacking.
 *   - Exit is a single compositor-safe wipe (transform only).
 *   - A skip control (button + Escape) appears after ~1.4s.
 */
export default function BootScreen() {
  // Decided at initial render (not via setState) so the effect below
  // never triggers a cascading render.
  const [gone, setGone] = useState(() => {
    const forced = isForcedBoot();
    return (
      (hasBooted() && !forced) ||
      prefersReducedMotion() ||
      (window.location.hash !== "" && !forced)
    );
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const stage3dRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageImgRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ringARef = useRef<HTMLDivElement>(null);
  const ringBRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);
  const fontsRef = useRef<HTMLSpanElement>(null);
  const assetsRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const clockRef = useRef<HTMLParagraphElement>(null);

  const particlesRef = useRef<LogoParticlesHandle | null>(null);
  const bootImgRef = useRef<HTMLImageElement | null>(null);
  const skipFnRef = useRef<() => void>(() => {});
  const summonedRef = useRef(false);
  const exitStartedRef = useRef(false);
  const exitedRef = useRef(false);

  useEffect(() => {
    const forced = isForcedBoot();
    const skip =
      (hasBooted() && !forced) ||
      prefersReducedMotion() ||
      (window.location.hash !== "" && !forced);
    if (skip) {
      // `gone` is already true from the initial state - no restart needed.
      exitedRef.current = true;
      markBooted();
      getLenis()?.start();
      dispatchBooted();
      return;
    }

    getLenis()?.stop();

    // Hide the page scrollbar while the boot overlay is up.
    document.documentElement.classList.add("bi-booting");

    const liveTls: gsap.core.Timeline[] = [];

    // ---- particle stage -------------------------------------------------
    if (canvasRef.current) {
      const handle = createLogoParticles(canvasRef.current);
      particlesRef.current = handle;
      handle?.ambient();
    }

    // ---- three.js ember volume (desktop-class devices only) -------------
    let alive = true;
    let stage3d: EmberStageHandle | null = null;
    if (stage3dRef.current && !isLowPowerDevice()) {
      createEmberVolume(stage3dRef.current)
        .then((handle) => {
          if (alive) stage3d = handle;
          else handle?.dispose();
        })
        .catch(() => {});
    }

    // ---- real progress signals (same contract as before) ----------------
    const signals = new Set(["load", "fonts"]);
    let target = document.readyState === "loading" ? 8 : 15;
    const bump = (amount: number) => {
      target = Math.min(100, Math.max(target, amount));
    };

    const onWindowLoad = () => {
      signals.delete("load");
      bump(100);
    };
    if (document.readyState === "complete") {
      onWindowLoad();
    } else {
      window.addEventListener("load", onWindowLoad, { once: true });
    }

    const onFonts = () => {
      signals.delete("fonts");
      bump(88);
      setStatusReady(fontsRef.current);
    };
    if (document.fonts?.status === "loaded") {
      onFonts();
    } else {
      document.fonts?.ready.then(onFonts, onFonts).catch(() => onFonts());
    }

    // The boot logo itself: decode it so sampling + the reveal never pop.
    const bootImg = new Image();
    bootImgRef.current = bootImg;
    bootImg.src = clubLogo;
    const onLogo = () => {
      bump(92);
      setStatusReady(assetsRef.current);
    };
    bootImg.decode?.().then(onLogo, () => onLogo()).catch(() => onLogo());

    const coreTimer = window.setTimeout(() => setStatusReady(coreRef.current), 420);

    const setStatusReady = (el: HTMLSpanElement | null) => {
      if (!el || el.dataset.ready) return;
      el.dataset.ready = "1";
      el.textContent = "READY";
      el.classList.remove("text-foreground/35");
      el.classList.add("text-primary");
    };

    // ---- choreography ----------------------------------------------------
    const summon = () => {
      if (summonedRef.current || exitStartedRef.current) return;
      summonedRef.current = true;

      // Make sure the display fonts are resident before the wordmark rises.
      try {
        document.fonts?.load('700 16px "Space Grotesk"');
        document.fonts?.load('600 16px "Space Grotesk"');
      } catch {
        /* noop */
      }

      const img = bootImgRef.current;
      const stage = stageRef.current;
      const handle = particlesRef.current;
      let hasParticles = false;
      if (img && stage && handle) {
        handle.assemble(img, () => stage.getBoundingClientRect());
        hasParticles = handle.sampled;
      }

      const chars = wordRef.current?.querySelectorAll(".bi-char");
      const beat = hasParticles ? ASSEMBLE_DUR : 0.35;
      const start = Math.max(0.05, beat - 0.28);

      const tl = gsap.timeline();
      liveTls.push(tl);

      // The crisp logo lands over the assembled particle silhouette.
      tl.to(stageImgRef.current, { autoAlpha: 1, scale: 1, duration: 0.55, ease: "power2.out" }, start);
      tl.to(glowRef.current, { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, start + 0.1);
      // Shockwave rings fire at impact.
      tl.fromTo(
        ringARef.current,
        { autoAlpha: 0.9, scale: 0.45 },
        { autoAlpha: 0, scale: 1.7, duration: 0.95, ease: "power2.out" },
        start + 0.1,
      );
      tl.fromTo(
        ringBRef.current,
        { autoAlpha: 0.7, scale: 0.45 },
        { autoAlpha: 0, scale: 2.3, duration: 1.15, ease: "power2.out" },
        start + 0.24,
      );
      // Wordmark chars rise per-char through their word masks.
      tl.fromTo(
        chars ?? [],
        { yPercent: 118, rotateX: -40, autoAlpha: 0 },
        { yPercent: 0, rotateX: 0, autoAlpha: 1, duration: 0.75, stagger: 0.022, ease: "power3.out", overwrite: "auto" },
        beat + 0.05,
      );
      tl.to(
        taglineRef.current,
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" },
        beat + 0.42,
      );
      tl.to(
        subRef.current,
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" },
        beat + 0.58,
      );
    };

    const finish = () => {
      if (exitedRef.current) return;
      exitedRef.current = true;
      document.documentElement.classList.remove("bi-booting");
      markBooted();
      getLenis()?.start();
      dispatchBooted();
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
      setGone(true);
    };

    const igniteExit = () => {
      if (exitStartedRef.current) return;
      exitStartedRef.current = true;
      const overlay = overlayRef.current;
      if (!overlay) {
        finish();
        return;
      }
      const chars = wordRef.current?.querySelectorAll(".bi-char");
      const seg = gsap.timeline({ onComplete: finish });
      liveTls.push(seg);

      seg.call(() => particlesRef.current?.ignite(), undefined, 0);
      seg.to(flashRef.current, { autoAlpha: 0.85, duration: 0.1, ease: "power2.in" }, 0.02);
      seg.to(flashRef.current, { autoAlpha: 0, duration: 0.55, ease: "power2.out" }, 0.14);
      seg.to(
        overlay.querySelectorAll("[data-boot-hud]"),
        { autoAlpha: 0, y: -8, duration: 0.3, stagger: 0.04, ease: "power2.in", overwrite: "auto" },
        0.15,
      );
      seg.to(
        overlay.querySelectorAll("[data-boot-out]"),
        { autoAlpha: 0, y: -10, duration: 0.3, ease: "power2.in", overwrite: "auto" },
        0.18,
      );
      seg.to(
        chars ?? [],
        { yPercent: -125, autoAlpha: 0, duration: 0.34, stagger: 0.013, ease: "power2.in", overwrite: "auto" },
        0.18,
      );
      seg.to(stageRef.current, { scale: 1.1, duration: 0.85, ease: "power2.inOut" }, 0.2);
      seg.to(overlay, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, 0.55);
    };

    const skipOnUser = () => {
      if (exitedRef.current || exitStartedRef.current) return;
      exitStartedRef.current = true;
      liveTls.forEach((t) => t.kill());
      particlesRef.current?.ignite();
      const overlay = overlayRef.current;
      if (!overlay) {
        finish();
        return;
      }
      const seg = gsap.timeline({ onComplete: finish });
      liveTls.push(seg);
      seg.to(overlay, { autoAlpha: 0, yPercent: -3, duration: 0.35, ease: "power2.in" });
    };
    skipFnRef.current = skipOnUser;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skipOnUser();
    };
    window.addEventListener("keydown", onKeyDown);

    // ---- HUD clock -------------------------------------------------------
    const hudClock = () => {
      if (clockRef.current) {
        clockRef.current.textContent = new Date().toLocaleTimeString("en-GB", {
          hour12: false,
        });
      }
    };
    hudClock();
    const clockTimer = window.setInterval(hudClock, 1000);

    // ---- real progress display ------------------------------------------
    let value = 0;
    let last = performance.now();
    const start = performance.now();

    const paint = () => {
      const p = Math.min(100, value);
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${p / 100})`;
      }
      if (pctRef.current) {
        pctRef.current.textContent = `${Math.round(p)}`;
        overlayRef.current?.setAttribute("aria-valuenow", `${Math.round(p)}`);
      }
    };

    let rafId = 0;
    const tick = (now: number) => {
      if (exitedRef.current || exitStartedRef.current) return; // a skip/exit already owns the screen
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Ease toward the real target, plus a slow creep so the bar never
      // looks frozen while a slow font or image resolves.
      const creep = value < Math.min(target, 92) ? 14 * dt : 0;
      value = Math.min(target, value + (target - value) * Math.min(1, dt * 3) + creep);
      paint();

      const waited = now - start;
      if (!summonedRef.current && value >= 55 && waited > 700) {
        summon();
      }

      const allDone = signals.size === 0;
      if (waited > MIN_STORY && value > 92 && summonedRef.current && allDone) {
        cancelAnimationFrame(rafId);
        exitStartedRef.current = true;
        value = 100;
        paint();
        igniteExit();
        return;
      }
      if (waited > MAX_WAIT) {
        cancelAnimationFrame(rafId);
        if (summonedRef.current) {
          exitStartedRef.current = true;
          value = 100;
          paint();
          igniteExit();
        } else {
          skipOnUser();
        }
      }
    };
    rafId = requestAnimationFrame(tick);

    // ---- cleanup -----------------------------------------------------------
    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("bi-booting");
      window.removeEventListener("load", onWindowLoad);
      window.removeEventListener("keydown", onKeyDown);
      window.clearInterval(clockTimer);
      window.clearTimeout(coreTimer);
      liveTls.forEach((t) => t.kill());
      particlesRef.current?.destroy();
      particlesRef.current = null;
      stage3d?.dispose();
      getLenis()?.start();
      exitedRef.current = true;
    };
  }, []);

  useGSAP(
    () => {
      if (gone || !overlayRef.current) return;
      gsap.set(".bi-char", { yPercent: 118, autoAlpha: 0, rotateX: -40 });
      const ent = gsap.timeline();
      ent.fromTo(
        "[data-boot-in]",
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" },
        0,
      );
      ent.fromTo(
        ".bi-corner",
        { scale: 0, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.55, stagger: 0.06, ease: "back.out(1.7)" },
        0.05,
      );
      ent.fromTo(
        skipRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.3, ease: "power1.out" },
        SKIP_AT / 1000,
      );
    },
    { scope: overlayRef, dependencies: [gone], revertOnUpdate: true },
  );

  if (gone) return null;

  return (
    <div
      ref={overlayRef}
      role="progressbar"
      aria-label="Loading the Young Innovators Club site"
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid="boot-screen"
      className="bi-root bi-grid fixed inset-0 z-[9999] overflow-hidden"
    >
      {/* Layer 0 — 2D particle stage (opaque carbon, ember trails) */}
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 z-0 h-full w-full" />
      {/* Layer 1 — Three.js ember volume (transparent, additive) */}
      <canvas
        ref={stage3dRef}
        aria-hidden="true"
        className="absolute inset-0 z-[1] h-full w-full opacity-70"
      />
      {/* Layer 2 — atmosphere */}
      <div className="bi-vignette pointer-events-none absolute inset-0 z-[2]" />
      <div className="bi-scanline pointer-events-none z-[2]" aria-hidden="true" />
      <div className="bi-scanline bi-scanline--b pointer-events-none z-[2]" aria-hidden="true" />

      {/* HUD corners */}
      <div className="bi-corner bi-corner--tl pointer-events-none z-[2]" aria-hidden="true" />
      <div className="bi-corner bi-corner--tr pointer-events-none z-[2]" aria-hidden="true" />
      <div className="bi-corner bi-corner--bl pointer-events-none z-[2]" aria-hidden="true" />
      <div className="bi-corner bi-corner--br pointer-events-none z-[2]" aria-hidden="true" />

      {/* Center stage: particle logo + wordmark */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pb-[16vh] pt-2">
        <div ref={stageRef} className="bi-stage relative" aria-hidden="true">
          <div ref={glowRef} className="bi-logo-glow absolute -inset-[34%]" />
          <img
            ref={stageImgRef}
            src={clubLogo}
            alt=""
            width={512}
            height={512}
            decoding="async"
            draggable={false}
            className="absolute inset-0 size-full object-contain opacity-0"
            style={{ transform: "scale(1.06)" }}
          />
          <div ref={ringARef} className="bi-ring" />
          <div ref={ringBRef} className="bi-ring" />
        </div>

        <h1
          ref={wordRef}
          aria-label="Young Innovators Club"
          className="bi-word mt-6 text-center font-display font-bold uppercase tracking-[0.05em] text-foreground text-balance"
        >
          {WORDS.map((word) => (
            <span key={word} className="bi-word-chunk" aria-hidden="true">
              {word.split("").map((char, i) => (
                <span key={i} className="bi-char">
                  {char}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p ref={taglineRef} data-boot-out className="mt-4 translate-y-3 opacity-0">
          <ShinyText
            text="INNOVATE · CREATE · DISRUPT"
            color="hsl(30 10% 78%)"
            shineColor="hsl(32 100% 66%)"
            speed={3.4}
            glow={0.5}
            className="font-mono text-[11px] uppercase tracking-[0.42em]"
          />
        </p>

        <p
          ref={subRef}
          data-boot-out
          className="bi-hud mt-3 translate-y-3 font-mono text-foreground/50 opacity-0"
        >
          DHARMAPALA VIDYALAYA · PANNIPITIYA
        </p>
      </div>

      {/* Top-left HUD */}
      <div
        data-boot-hud
        data-boot-in
        className="absolute left-0 top-0 z-20 p-4 pl-7 sm:p-5 sm:pl-8"
      >
        <div className="flex items-center gap-2">
          <span
            className="size-1.5 animate-pulse rounded-full bg-primary"
            style={{ boxShadow: "0 0 8px hsl(24 94% 55% / 0.9)" }}
          />
          <p className="bi-hud font-mono text-foreground/60">YICDVP // IGNITION SEQ</p>
        </div>
        <p className="bi-hud mt-1 pl-[13px] font-mono text-foreground/30">EST 2020 — STEM &amp; ROBOTICS</p>
      </div>

      {/* Top-right HUD */}
      <div
        data-boot-hud
        data-boot-in
        className="absolute right-0 top-0 z-20 hidden p-5 pr-8 text-right sm:block"
      >
        <p className="bi-hud font-mono text-foreground/50">6.8420°N&ensp;79.9540°E</p>
        <p ref={clockRef} className="bi-hud mt-1 font-mono text-foreground/30">
          ··:··:··
        </p>
      </div>

      {/* Bottom-left: statuses + real progress counter */}
      <div
        data-boot-hud
        data-boot-in
        className="absolute bottom-0 left-0 z-20 p-4 pl-7 sm:p-5 sm:pl-8"
      >
        <div className="bi-status-block mb-3 w-40 space-y-1.5 font-mono text-[10px]">
          <div className="bi-status text-foreground/45">
            <span>CORE</span>
            <span className="mx-1 min-w-4 flex-1 translate-y-[-2px] border-b border-dotted border-foreground/15" />
            <span ref={coreRef} className="text-foreground/35">
              · · ·
            </span>
          </div>
          <div className="bi-status text-foreground/45">
            <span>FONTS</span>
            <span className="mx-1 min-w-4 flex-1 translate-y-[-2px] border-b border-dotted border-foreground/15" />
            <span ref={fontsRef} className="text-foreground/35">
              · · ·
            </span>
          </div>
          <div className="bi-status text-foreground/45">
            <span>ASSETS</span>
            <span className="mx-1 min-w-4 flex-1 translate-y-[-2px] border-b border-dotted border-foreground/15" />
            <span ref={assetsRef} className="text-foreground/35">
              · · ·
            </span>
          </div>
        </div>

        <div className="flex items-end gap-1.5">
          <span ref={pctRef} className="bi-counter font-mono font-bold text-foreground">
            0
          </span>
          <span className="pb-1.5 font-mono text-xs text-foreground/40">%</span>
        </div>
        <div className="mt-2 h-px w-44 overflow-hidden bg-foreground/10">
          <div
            ref={fillRef}
            className="h-full w-full origin-left bg-primary"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        <p className="bi-hud mt-1.5 font-mono text-foreground/30">SYSTEM LOAD</p>
      </div>

      {/* Skip control */}
      <button
        type="button"
        ref={skipRef}
        onClick={() => skipFnRef.current()}
        data-boot-hud
        className="absolute bottom-4 right-4 z-20 rounded-full border border-foreground/15 bg-white/[0.03] px-4 py-2 font-mono text-[10px] tracking-[0.22em] text-foreground/55 backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:bottom-6 sm:right-6"
      >
        SKIP →
      </button>

      {/* Warm edge left behind by the wipe */}
      <div className="bi-ember-edge pointer-events-none absolute inset-x-0 bottom-0 z-[3]" aria-hidden="true" />

      {/* Ignition flash (on the lift) */}
      <div ref={flashRef} className="bi-flash absolute inset-0 z-30" aria-hidden="true" />
    </div>
  );
}

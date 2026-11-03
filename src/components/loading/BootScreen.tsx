import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import clubLogo from "@/assets/club-logo.png";
import { prefersReducedMotion } from "@/lib/motion";
import { getLenis } from "@/lib/scroll";
import { BOOT_EVENT, dispatchBooted, hasBooted, markBooted } from "@/lib/boot";
import { SHAPES, TOTAL, buildTimeline, type ShapeDef } from "./bootIntroTimeline";
import "@fontsource/anton";
import "@fontsource/jetbrains-mono/500.css";
import "./BootScreen.css";

gsap.registerPlugin(ScrollTrigger);

const SKIP_AT = 1.15; // seconds until the skip control appears
const FONT_WAIT_CAP = 600; // ms — Anton must never stall the show
const SHOW_CAP = 8_000; // ms — a stalled timeline can never trap the visitor
const EXIT_HOLD = 0.25; // s between the HUD dissolve and the curtain lift

const WORD_LINES: Array<{ text: string; cls: string }> = [
  { text: "INNOVATE", cls: "bim-line bim-fill bim-l1" },
  { text: "CREATE", cls: "bim-line bim-mid bim-l2" },
  { text: "DISRUPT", cls: "bim-line bim-fill bim-l3" },
];

const MQ_ITEMS: Array<[string, string]> = [
  ["bim-tf", "YOUNG"],
  ["bim-ts", "✺"],
  ["bim-to", "INNOVATORS"],
  ["bim-ts", "✺"],
  ["bim-tf", "CLUB"],
  ["bim-ts", "✺"],
];

const isForcedBoot = () => {
  try {
    return new URLSearchParams(window.location.search).get("boot") === "1";
  } catch {
    return false;
  }
};

const Chars = ({ text }: { text: string }) => (
  <>
    {[...text].map((c, i) => (
      <span className="bim-ch" key={i}>
        {c === " " ? "\u00A0" : c}
      </span>
    ))}
  </>
);

const Track = () => (
  <div className="bim-track">
    {[0, 1].map((g) => (
      <div key={g} style={{ display: "flex" }}>
        {Array.from({ length: 5 }).flatMap((_, rep) =>
          MQ_ITEMS.map(([cls, txt], i) => (
            <span key={`${rep}-${i}`} className={cls}>
              {txt}
            </span>
          )),
        )}
      </div>
    ))}
  </div>
);

const ShapeSvg = ({ d }: { d: ShapeDef }) => {
  const stroke = d.stroke || d.kind === "ring" || d.kind === "arc";
  const common = {
    fill: stroke ? "none" : "currentColor",
    stroke: stroke ? "currentColor" : "none",
    strokeWidth: 7,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  switch (d.kind) {
    case "ring":
      return <circle cx="50" cy="50" r="44" {...common} />;
    case "disc":
      return <circle cx="50" cy="50" r="50" {...common} />;
    case "plus":
      return <path d="M38 0h24v38h38v24H62v38H38V62H0V38h38z" {...common} />;
    case "tri":
      return <polygon points="50,6 96,90 4,90" {...common} />;
    case "half":
      return <path d="M0 70a50 50 0 0 1 100 0z" {...common} />;
    case "sq":
      return <rect x="8" y="8" width="84" height="84" {...common} />;
    case "diamond":
      return <polygon points="50,0 100,50 50,100 0,50" {...common} />;
    case "arc":
      return <path d="M8 70a42 42 0 0 1 84 0" {...common} strokeWidth={12} />;
    case "dots":
      return (
        <g fill="currentColor">
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={14 + c * 36} cy={14 + r * 36} r="7" />),
          )}
        </g>
      );
    case "bars":
      return (
        <g fill="currentColor">
          <rect x="0" y="6" width="100" height="16" />
          <rect x="0" y="42" width="70" height="16" />
          <rect x="0" y="78" width="40" height="16" />
        </g>
      );
  }
};

/**
 * Intro boot screen — "Make It Move" (YICDVP port).
 *
 * A ~5.15s kinetic-type story in the club's orange ink over themed ground:
 *
 *   1. IGNITE — calibration grid draws, the orange orb snaps in, 14 shapes
 *      burst into orbit around it.
 *   2. ACCELERATE — the orb smears into the orange bar; INNOVATE / CREATE /
 *      DISRUPT rise per-char (CREATE rides the bar in black ink), the
 *      brand marquees sweep through, DISRUPT flips.
 *   3. LAUNCH — an orange circular wipe takes the screen: club-logo
 *      roundel, "EST. / 2020" and the sign-off line.
 *   4. RELEASE — the wipe contracts, the grid retracts, the HUD dissolves
 *      and the curtain lifts onto the hero (BOOT_EVENT coordinates the
 *      hand-off; a real ScrollTrigger.refresh follows).
 *
 * Boot contract (unchanged from the previous boot screen):
 *   - FIXED overlay, once per session; skipped for reduced motion and
 *     deep links with a hash; a `?boot=1` query forces a replay.
 *   - While visible it stops Lenis and locks scrollbars; on exit it
 *     releases them and dispatches `yicdvp:booted`.
 *   - A skip control (button + Escape) appears after ~1.15s; a hard cap
 *     bails out of a stalled timeline at ~8s.
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

  const rootRef = useRef<HTMLDivElement>(null);
  const skipFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const skipIt =
      !root || (hasBooted() && !isForcedBoot()) || prefersReducedMotion();
    if (skipIt) {
      // `gone` is already true from the initial state - no restart needed.
      markBooted();
      getLenis()?.start();
      dispatchBooted();
      return;
    }

    getLenis()?.stop();
    document.documentElement.classList.add("bim-locked");

    const liveTls: Array<gsap.core.Tween | gsap.core.Timeline> = [];
    let started = false;
    let exitStarted = false;
    let exited = false;

    // All GSAP work in this effect lives in one context (repo rule: when
    // useGSAP() isn't used, gsap.context + revert in cleanup). The intro
    // timeline itself mounts later through ctx.add(...) so its selector
    // text stays scoped to the overlay.
    const ctx = gsap.context(() => {}, root);

    const finished = () => {
      if (exited) return;
      exited = true;
      document.documentElement.classList.remove("bim-locked");
      markBooted();
      getLenis()?.start();
      dispatchBooted();
      requestAnimationFrame(() => ScrollTrigger.refresh());
      setGone(true);
    };

    // Natural hand-off: HUD dissolves, the overlay curtain-lifts.
    const handOff = () => {
      if (exitStarted || exited) return;
      exitStarted = true;
      const seg = gsap.timeline({ onComplete: finished });
      liveTls.push(seg);
      seg.to(
        root.querySelectorAll("[data-bim-exit]"),
        { autoAlpha: 0, y: -8, duration: 0.3, stagger: 0.04, ease: "power2.in" },
        0,
      );
      seg.to(root, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, EXIT_HOLD);
    };

    // User bail: kill the show mid-flight and fade the overlay away.
    const bailOut = () => {
      if (exitStarted || exited) return;
      exitStarted = true;
      liveTls.forEach((t) => t.kill());
      const seg = gsap.timeline({ onComplete: finished });
      liveTls.push(seg);
      seg.to(root, { autoAlpha: 0, duration: 0.35, ease: "power2.in" });
    };
    skipFnRef.current = () => ctx.add(bailOut);

    const startShow = () => {
      if (started || exitStarted || exited) return;
      started = true;
      ctx.add(() => {
        const tl = buildTimeline(root);
        liveTls.push(tl);
        tl.eventCallback("onComplete", handOff);
        // skip control appears after the identity beat
        liveTls.push(
          gsap.fromTo(
            root.querySelectorAll<HTMLElement>(".bim-skip"),
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.3, ease: "power1.out", delay: SKIP_AT },
          ),
        );
      });
    };

    // Anton is the hero material — give it a moment, never stall the show.
    const fontsReady = document.fonts?.load?.('400 100px "Anton"') ?? Promise.resolve();
    const cap = new Promise((res) => window.setTimeout(res, FONT_WAIT_CAP));
    Promise.race([fontsReady, cap]).then(startShow, startShow);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skipFnRef.current();
    };
    window.addEventListener("keydown", onKeyDown);

    // Safety net: even a frozen timeline leaves no mummified overlay.
    const capTimer = window.setTimeout(() => ctx.add(handOff), SHOW_CAP);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(capTimer);
      liveTls.forEach((t) => t.kill());
      ctx.revert();
      document.documentElement.classList.remove("bim-locked");
      getLenis()?.start();
      exited = true;
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      data-testid="boot-screen"
      aria-label="Young Innovators Club intro"
      className="bim-stage z-[9999]"
    >
      <p className="sr-only">Young Innovators Club — welcome</p>

      <div className="bim-cam" aria-hidden="true">
        {/* grid */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`gv${i}`} className="bim-gl bim-gv" style={{ left: `${(i * 100) / 6}%` }} />
        ))}
        {[1, 2, 3].map((i) => (
          <div key={`gh${i}`} className="bim-gl bim-gh" style={{ top: `${i * 25}%` }} />
        ))}

        <div className="bim-glow" />

        {/* shapes + orb */}
        <div className="bim-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bim-ring" />
          ))}
          <div className="bim-orb" />
          {SHAPES.map((d, i) => (
            <div
              key={i}
              className={`bim-shape ${d.color === "or" ? "bim-c-or" : "bim-c-fg"}`}
              style={{
                width: `${d.size}vmin`,
                height: `${d.size}vmin`,
                marginLeft: `${-d.size / 2}vmin`,
                marginTop: `${-d.size / 2}vmin`,
              }}
            >
              <svg viewBox="0 0 100 100">
                <ShapeSvg d={d} />
              </svg>
            </div>
          ))}
        </div>

        {/* bar the orb morphs into */}
        <div className="bim-echo bim-e1" />
        <div className="bim-echo bim-e2" />
        <div className="bim-bar" />

        {/* marquees */}
        <div className="bim-mq bim-mq-a">
          <Track />
        </div>
        <div className="bim-mq bim-mq-b">
          <Track />
        </div>

        {/* headline */}
        <div className="bim-words">
          {WORD_LINES.map((line) => (
            <div key={line.text} className={line.cls}>
              <Chars text={line.text} />
            </div>
          ))}
        </div>

        {/* scene 3: orange wipe with the club roundel + brand close */}
        <div className="bim-wipe">
          <div className="bim-wipe-in">
            <img
              src={clubLogo}
              alt=""
              width={512}
              height={512}
              decoding="async"
              draggable={false}
              className="bim-logo"
            />
            <div className="bim-wmono">YICDVP — YOUNG INNOVATORS CLUB</div>
            <div className="bim-line bim-w1">
              <Chars text="EST." />
            </div>
            <div className="bim-line bim-w2">
              <Chars text="2020" />
            </div>
            <div className="bim-wline" />
            <div className="bim-wmono">INNOVATE · CREATE · DISRUPT</div>
          </div>
          <svg className="bim-wplus" viewBox="0 0 100 100" fill="#0a0a0a">
            <path d="M38 0h24v38h38v24H62v38H38V62H0V38h38z" />
          </svg>
          <div className="bim-wring" />
          <div className="bim-wdots">
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="bim-vignette" />
        <div className="bim-noise" />
      </div>

      {/* HUD */}
      <div className="bim-hud">
        <div className="bim-corner bim-tl" />
        <div className="bim-corner bim-tr" />
        <div className="bim-corner bim-bl" />
        <div className="bim-corner bim-br" />
        <div className="bim-hud-top" data-bim-exit>
          <span>
            <i className="bim-dot" />
            <span className="bim-t-scene">01 — Ignite</span>
          </span>
          <span>
            <span className="bim-t-code">00.00</span> / {TOTAL.toFixed(2).padStart(5, "0")}
          </span>
        </div>
      </div>

      {/* Skip control — reveals at SKIP_AT, dissolves with the HUD */}
      <div data-bim-exit className="bim-skip">
        <button
          type="button"
          onClick={() => skipFnRef.current()}
          className="rounded-full border border-foreground/15 bg-white/[0.03] px-4 py-2 text-[10px] tracking-[0.22em] text-foreground/55 backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-foreground focus-visible:border-primary/60 focus-visible:text-foreground focus-visible:outline-none"
        >
          SKIP →
        </button>
      </div>
    </div>
  );
}

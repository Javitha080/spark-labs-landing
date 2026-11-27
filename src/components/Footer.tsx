import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, PointerEvent } from "react";
import {
  Cpu,
  Facebook,
  Instagram,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Waves,
  Youtube,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Turnstile } from "@/components/Turnstile";
import { sanitizeEmail } from "@/lib/sanitize";
import { prefersReducedMotion } from "@/lib/motion";
import { clubLogo, schoolLogo } from "@/components/ClubLogo";
import {
  VIHARA_ASSETS,
  type ViharaSkyControlsState,
  type ViharaSkyStageState,
  type ViharaWebGLEngineState,
} from "@/components/footer/viharaAssets";
import {
  ATMOSPHERE_PRESETS,
  type AtmospherePresetId,
  type AtmosphericWindSnapshot,
} from "@/components/footer/atmospherePhysics";
import {
  PhysicsWorkerBridge,
  type PackedPhysicsFrame,
} from "@/components/footer/physicsWorkerBridge";
import {
  clamp,
  detectDeviceCapabilities,
  resolveQualityProfile,
  type QualityTierId,
} from "@/components/footer/viharaCapabilities";
import { preloadViharaAssets } from "@/components/footer/viharaPreloader";
import { ViharaErrorBoundary } from "@/components/footer/ViharaErrorBoundary";
import ViharaSkyCanvas from "@/components/footer/ViharaSkyCanvas";

gsap.registerPlugin(useGSAP);

// Lazy-load Three.js WebGL2 engines so `vendor-three` stays strictly out of eager
// page bundles and never downloads on CPU Eco / reduced-motion devices.
const ViharaAtmosphericSkyWebGL = lazy(
  () => import("@/components/footer/ViharaAtmosphericSkyWebGL"),
);
const ViharaWebGLCanvas = lazy(() => import("@/components/footer/ViharaWebGLCanvas"));

/**
 * Footer — YICDVP Vihara v3 Living Woodblock Engraving Footer.
 *
 * Upgraded from the Vihara v3 production-hardened engine and tailored for the
 * Young Innovators Club of Dharmapala Vidyalaya, Pannipitiya:
 *
 *   Stage    Spacious desktop 1280/1260 living sky + uncropped grove stage &
 *            responsive mobile-first stacked header + panoramic 1280/1060 stage
 *   Worker   Inline Blob Web Worker PhysicsBridge (with automatic main-thread
 *            fallback) driving 6-body traveling-gust tree/palm spring ODEs,
 *            Strouhal flap-glide Boids, and aerodynamic falling leaves via
 *            zero-GC transferable Float32Array buffers
 *   Tiers    Adaptive GPU/CPU hardware detector (Auto / Ultra GPU / Balanced /
 *            CPU Eco), parallel asset preloader, offscreen & hidden-tab pausing,
 *            and ViharaErrorBoundary + WebGL context-loss recovery
 *   Layer 0  Lazy-loaded WebGL2 Rayleigh/Mie sky & crepuscular sunbeams/moonbeams
 *            (auto-degrades to zero-GPU CSS Rayleigh gradient in CPU Eco mode)
 *   Layer 1  Lazy-loaded WebGL2 6-body edge-guarded uncropped grove & spinning
 *            Dhamma Chakra with Day Parchment <-> Night Blueprint themes
 *   Layer 2  3-strata high clouds advected strictly via GPU compositor transforms
 *   Layer 3  Zero-GC packed 2D canvas rendering splayed-wingtip birds + tumbling leaves
 *   Layer 4  YICDVP editorial header with @gsap/react useGSAP clip-wipes
 *   Layer 5  Bottom-right whisper-quiet dock (Replay, Gust, Atmosphere, Tier, Pause)
 *   Bar      Shared single-mount Newsletter + Cloudflare Turnstile colophon bar
 */

const MENU_LINKS = [
  { label: "About us", to: "/about" },
  { label: "Projects", to: "/projects" },
  { label: "Events", to: "/events" },
  { label: "Gallery", to: "/gallery" },
  { label: "News", to: "/news" },
  { label: "Blog", to: "/blog" },
] as const;

const EXPLORE_LINKS = [
  { label: "STEM Learning Hub", to: "/learning-hub" },
  { label: "Join the Club", to: "/#join" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms of Service", to: "/terms-of-service" },
] as const;

const SOCIALS = [
  { icon: Facebook, href: "https://www.facebook.com/dharmapalaLKofficia/", label: "Facebook" },
  { icon: Instagram, href: "https://www.instagram.com/yicdvp_official/", label: "Instagram" },
  { icon: Youtube, href: "https://www.youtube.com/channel/UCqCTubkeHjeldLAC4Jh1j8Q", label: "Youtube" },
] as const;

const PRESET_ORDER: readonly AtmospherePresetId[] = ["morning", "golden", "monsoon"];
const TIER_ORDER: readonly QualityTierId[] = ["auto", "ultra", "balanced", "eco"];

interface CloudLayerSpec {
  id: string;
  src: string;
  topPct: number;
  widthPct: number;
  startPhase: number;
  altitudeSpeed: number;
  dayOpacity: number;
  nightOpacity: number;
  flipX?: boolean;
}

// 3 Meteorological Altitude Strata strictly high in the open sky above all tree crowns,
// keeping cumulus clear of corner header links (~19%) and uncropped treetops (~43%+)
const CLOUD_STRATA: readonly CloudLayerSpec[] = [
  {
    id: "cirrus-high-a",
    src: VIHARA_ASSETS.cloudCirrus,
    topPct: 6.5,
    widthPct: 22,
    startPhase: 0.28,
    altitudeSpeed: 0.55,
    dayOpacity: 0.3,
    nightOpacity: 0.22,
  },
  {
    id: "cirrus-high-b",
    src: VIHARA_ASSETS.cloudCirrus,
    topPct: 12.2,
    widthPct: 18,
    startPhase: 0.76,
    altitudeSpeed: 0.45,
    dayOpacity: 0.24,
    nightOpacity: 0.18,
    flipX: true,
  },
  {
    id: "cumulus-main-a",
    src: VIHARA_ASSETS.cloud1,
    topPct: 25.0,
    widthPct: 24,
    startPhase: 0.44,
    altitudeSpeed: 1.05,
    dayOpacity: 0.4,
    nightOpacity: 0.28,
  },
  {
    id: "cumulus-main-b",
    src: VIHARA_ASSETS.cloud2,
    topPct: 29.5,
    widthPct: 21,
    startPhase: 0.08,
    altitudeSpeed: 1.25,
    dayOpacity: 0.34,
    nightOpacity: 0.24,
  },
  {
    id: "cumulus-far-c",
    src: VIHARA_ASSETS.cloud1,
    topPct: 27.2,
    widthPct: 18,
    startPhase: 0.84,
    altitudeSpeed: 0.82,
    dayOpacity: 0.26,
    nightOpacity: 0.2,
    flipX: true,
  },
];

const INITIAL_WIND: AtmosphericWindSnapshot = {
  windSpeed: 1.4,
  gustIntensity: 0.35,
  leftTreeBend: 0,
  leftPalmBend: 0,
  rightPalmBend: 0,
  rightTreeBend: 0,
  hedgeRustle: 0,
  leafFlutter: 0,
  palmBend: 0,
  canopySway: 0,
  cloudAdvection: 0,
  simTime: 0,
};

const EcoSkyBackdrop = ({
  presetId,
  darkMode,
}: {
  presetId: AtmospherePresetId;
  darkMode: boolean;
}) => {
  const p = ATMOSPHERE_PRESETS[presetId];
  const zenith = darkMode ? p.nightZenithHex : p.zenithHex;
  const horizon = darkMode ? p.nightHorizonHex : p.horizonHex;
  const paper = darkMode ? p.nightPaperHex : p.paperHex;
  const sun = darkMode ? p.nightSunRgb : p.sunRgb;
  const beam = darkMode ? p.nightMoonbeamIntensity * 0.24 : p.sunbeamIntensity * 0.35;

  return (
    <div
      aria-hidden="true"
      className="h-full w-full transition-colors duration-700"
      style={{
        background: `radial-gradient(ellipse 60% 55% at 76% 24%, rgba(${Math.round(
          sun[0] * 255,
        )}, ${Math.round(sun[1] * 255)}, ${Math.round(sun[2] * 255)}, ${beam.toFixed(
          2,
        )}) 0%, transparent 70%), linear-gradient(to bottom, ${zenith} 0%, ${horizon} 62%, ${paper} 100%)`,
      }}
    />
  );
};

const EcoGrovePlate = ({ spinWheel }: { spinWheel: boolean }) => (
  <div className="vihara-plate-fallback relative h-full w-full overflow-hidden">
    <img
      src={VIHARA_ASSETS.plate}
      alt="Woodblock engraving of Dharmapala Vidyalaya heritage hall and trees"
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      draggable={false}
    />
    {spinWheel && (
      <img
        src={VIHARA_ASSETS.dharmaWheel}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable={false}
        className="vihara-wheel-icon vihara-eco-wheel pointer-events-none absolute"
        style={{
          left: "48.2%",
          top: "17.35%",
          width: "3.65%",
          height: "auto",
          opacity: 0.88,
        }}
      />
    )}
  </div>
);

const Footer = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark =
    resolvedTheme === "dark" ||
    (resolvedTheme === undefined &&
      (theme === "dark" ||
        (typeof document !== "undefined" &&
          document.documentElement.classList.contains("dark"))));

  const containerRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Refs for GSAP editorial choreography & GPU compositor-only clouds
  const logoWrapRef = useRef<HTMLDivElement | null>(null);
  const descWrapRef = useRef<HTMLParagraphElement | null>(null);
  const copyWrapRef = useRef<HTMLDivElement | null>(null);
  const menuNavRef = useRef<HTMLElement | null>(null);
  const exploreNavRef = useRef<HTMLElement | null>(null);
  const cloudRefs = useRef<Array<HTMLImageElement | null>>([]);
  const revealTlRef = useRef<gsap.core.Timeline | null>(null);

  // Responsive breakpoint, reduced motion, hardware tier & scene controls
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());
  const [mountWebGL, setMountWebGL] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [presetId, setPresetId] = useState<AtmospherePresetId>("morning");
  const [qualityTier, setQualityTier] = useState<QualityTierId>("auto");

  const capabilities = useMemo(() => detectDeviceCapabilities(), []);
  const profile = useMemo(
    () => resolveQualityProfile(qualityTier, capabilities, reducedMotion),
    [qualityTier, capabilities, reducedMotion],
  );
  const activePreset = ATMOSPHERE_PRESETS[presetId];
  const activePaperHex = isDark ? activePreset.nightPaperHex : activePreset.paperHex;
  const activeZenithHex = isDark ? activePreset.nightZenithHex : activePreset.zenithHex;

  // Stage geometry ratios: desktop 1280/1260 (sky 42.9%, grove 57.1%), mobile 1280/1060 (sky 32%, grove 68%)
  const groveTopNorm = isDesktop ? 1 - 720 / 1260 : 1 - 720 / 1060;
  const skyBottomNorm = isDesktop ? 0.42 : 0.34;

  // Shared 60fps mutable refs (read at 60fps by WebGL/2D canvases with zero React re-renders)
  const isVisibleRef = useRef<boolean>(true);
  const bridgeRef = useRef<PhysicsWorkerBridge | null>(null);
  const windSnapshotRef = useRef<AtmosphericWindSnapshot>({ ...INITIAL_WIND });
  const packedFrameRef = useRef<PackedPhysicsFrame>({
    wind: { ...INITIAL_WIND },
    birdsBuffer: new Float32Array(0),
    birdCount: 0,
    leavesBuffer: new Float32Array(0),
    leafCount: 0,
    runningInWorker: false,
  });

  const engineRef = useRef<ViharaWebGLEngineState>({
    reveal: reducedMotion ? 1 : 0,
    timeScale: 1,
    paused: false,
    windStrength: activePreset.defaultWind,
    parallaxStrength: 1.0,
    wheelSpin: true,
    darkMode: isDark,
    showMotes: true,
    presetId,
    targetMouseX: 0,
    targetMouseY: 0,
  });

  const skyStageStateRef = useRef<ViharaSkyStageState>({
    reveal: reducedMotion ? 1 : 0,
    darkMode: isDark,
    targetMouseX: 0,
    targetMouseY: 0,
  });

  const skyControlsRef = useRef<ViharaSkyControlsState>({
    showBirds: true,
    showLeaves: true,
    presetId,
    darkMode: isDark,
    reveal: reducedMotion ? 1 : 0,
  });

  const lastPointerXRef = useRef<number | null>(null);
  const lastPointerTsRef = useRef<number>(0);

  // Track responsive lg breakpoint & OS reduced-motion preference
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onDesktopChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    const onMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    desktopMq.addEventListener("change", onDesktopChange);
    motionMq.addEventListener("change", onMotionChange);
    return () => {
      desktopMq.removeEventListener("change", onDesktopChange);
      motionMq.removeEventListener("change", onMotionChange);
    };
  }, []);

  // Sync live theme, atmosphere preset & pause state into mutable 60fps refs
  useEffect(() => {
    const windMult = ATMOSPHERE_PRESETS[presetId].defaultWind;
    engineRef.current.darkMode = isDark;
    engineRef.current.presetId = presetId;
    engineRef.current.windStrength = windMult;
    engineRef.current.paused = !isPlaying;

    skyStageStateRef.current.darkMode = isDark;

    skyControlsRef.current.darkMode = isDark;
    skyControlsRef.current.presetId = presetId;

    if (revealTlRef.current) {
      if (isPlaying) revealTlRef.current.play();
      else revealTlRef.current.pause();
    }
  }, [isDark, presetId, isPlaying]);

  // Arm parallel asset preloading & lazy WebGL chunk loading when footer approaches viewport
  useEffect(() => {
    if (reducedMotion || mountWebGL) {
      if (!reducedMotion) void preloadViharaAssets();
      return undefined;
    }
    if (typeof IntersectionObserver === "undefined") return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void preloadViharaAssets();
          setMountWebGL(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, mountWebGL]);

  // Instantiate Web Worker Physics Bridge (with automatic main-thread fallback) once
  useEffect(() => {
    if (reducedMotion) return undefined;

    const bridge = new PhysicsWorkerBridge({
      useWorker: profile.useWorkerPhysics,
      maxBirds: profile.maxBirds,
      maxLeaves: profile.maxLeaves,
      targetFps: profile.targetFps,
      windMultiplier: activePreset.defaultWind,
      timeScale: 1.0,
      paused: !isPlaying,
      skyBottomNorm,
      groveTopNorm,
      showLeaves: profile.maxLeaves > 0,
    });
    bridgeRef.current = bridge;

    return () => {
      bridge.dispose();
      bridgeRef.current = null;
    };
    // Intentionally mounted once per reducedMotion lifecycle; updates flow via updateConfig below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Keep Worker Physics Bridge config cleanly synced without restarting thread
  useEffect(() => {
    bridgeRef.current?.updateConfig({
      useWorker: profile.useWorkerPhysics,
      maxBirds: profile.maxBirds,
      maxLeaves: profile.maxLeaves,
      targetFps: profile.targetFps,
      windMultiplier: activePreset.defaultWind,
      paused: !isPlaying,
      skyBottomNorm,
      groveTopNorm,
      showLeaves: profile.maxLeaves > 0,
    });
  }, [profile, activePreset.defaultWind, isPlaying, skyBottomNorm, groveTopNorm]);

  // Master visibility-gated rAF ticker stepping PhysicsWorkerBridge + GPU-only Cloud transforms
  useEffect(() => {
    if (reducedMotion) return undefined;
    const stageEl = stageRef.current;
    if (!stageEl) return undefined;

    let stageW = stageEl.getBoundingClientRect().width || 1280;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            stageW = stageEl.getBoundingClientRect().width || 1280;
          })
        : null;
    ro?.observe(stageEl);

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (document.hidden || !isVisibleRef.current) {
        lastTs = now;
        return;
      }

      const minFrameMs = 1000 / profile.targetFps;
      if (now - lastTs < minFrameMs * 0.85) return;

      const rawDt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      const bridge = bridgeRef.current;
      if (bridge) {
        const frame = bridge.step(rawDt);
        packedFrameRef.current = frame;
        windSnapshotRef.current = frame.wind;
      }

      const st = engineRef.current;
      const snap = windSnapshotRef.current;
      const preset = ATMOSPHERE_PRESETS[st.presetId];
      const revealAlpha = clamp((st.reveal - 0.05) / 0.55, 0, 1);
      const mx = st.targetMouseX;
      const activeClouds = Math.min(CLOUD_STRATA.length, profile.cloudCount);

      for (let i = 0; i < CLOUD_STRATA.length; i++) {
        const el = cloudRefs.current[i];
        if (!el) continue;
        if (i >= activeClouds) {
          el.style.opacity = "0";
          continue;
        }
        const spec = CLOUD_STRATA[i];

        const spanPct = 100 + spec.widthPct * 1.3;
        const rawProgress = (spec.startPhase + snap.cloudAdvection * 0.011 * spec.altitudeSpeed) % 1;
        const xPx = ((-spec.widthPct * 1.15 + rawProgress * spanPct) / 100) * stageW;

        const edgeFade =
          clamp(rawProgress / 0.14, 0, 1) * clamp((1 - rawProgress) / 0.14, 0, 1);

        const floatY = Math.sin(snap.simTime * 0.24 + i * 1.9) * 3.5;
        const breatheX = 1 + Math.sin(snap.simTime * 0.16 + i * 2.3) * 0.018;
        const parallaxX = -mx * 8 * (1 - spec.altitudeSpeed * 0.35);
        const baseOp = (st.darkMode ? spec.nightOpacity : spec.dayOpacity) * preset.cloudOpacityScale;

        // 100% GPU compositor-safe transform + opacity (zero per-frame layout reflow)
        el.style.opacity = Math.min(0.62, baseOp * edgeFade * revealAlpha).toFixed(3);
        el.style.transform = `translate3d(${(xPx + parallaxX).toFixed(1)}px, ${floatY.toFixed(
          1,
        )}px, 0) scaleX(${(spec.flipX ? -1 : 1) * breatheX})`;
      }
    };

    let visibilityObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          isVisibleRef.current = entries.some((entry) => entry.isIntersecting);
        },
        { rootMargin: "180px" },
      );
      visibilityObserver.observe(stageEl);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      visibilityObserver?.disconnect();
      ro?.disconnect();
    };
  }, [reducedMotion, profile.targetFps, profile.cloudCount]);

  // GSAP Ink-Mist + Staggered Editorial Clip-Wipe Reveal Choreography (scoped via @gsap/react)
  useGSAP(
    () => {
      const wipeEls = isDesktop
        ? [
            { el: logoWrapRef.current, start: 0.28, dur: 0.85 },
            { el: descWrapRef.current, start: 0.38, dur: 0.92 },
            { el: copyWrapRef.current, start: 0.42, dur: 0.88 },
            { el: menuNavRef.current, start: 0.44, dur: 1.0 },
            { el: exploreNavRef.current, start: 0.48, dur: 1.0 },
          ]
        : [];

      if (reducedMotion) {
        engineRef.current.reveal = 1;
        skyStageStateRef.current.reveal = 1;
        skyControlsRef.current.reveal = 1;
        wipeEls.forEach(({ el }) => {
          if (el) gsap.set(el, { clearProps: "clipPath" });
        });
        return;
      }

      const revealProxy = { value: 0 };
      engineRef.current.reveal = 0;
      skyStageStateRef.current.reveal = 0;
      skyControlsRef.current.reveal = 0;

      const revealTl = gsap.timeline({
        paused: true,
        defaults: { ease: "power2.out" },
      });

      revealTl.to(
        revealProxy,
        {
          value: 1,
          duration: 1.55,
          ease: "power2.out",
          onUpdate: () => {
            engineRef.current.reveal = revealProxy.value;
            skyStageStateRef.current.reveal = revealProxy.value;
            skyControlsRef.current.reveal = revealProxy.value;
          },
        },
        0,
      );

      wipeEls.forEach(({ el, start, dur }) => {
        if (!el) return;
        revealTl.fromTo(
          el,
          { clipPath: "inset(-12% 100% -12% 0%)" },
          { clipPath: "inset(-12% 0% -12% 0%)", duration: dur, ease: "power2.out" },
          start,
        );
      });

      revealTlRef.current = revealTl;

      const stageEl = stageRef.current;
      let departed = true;
      let revealObserver: IntersectionObserver | null = null;

      const triggerArrivalReveal = () => {
        if (!engineRef.current.paused) {
          revealTl.restart();
        }
      };

      if (stageEl && typeof IntersectionObserver !== "undefined") {
        revealObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                departed = true;
                return;
              }
              if (departed) {
                departed = false;
                triggerArrivalReveal();
              }
            });
          },
          { threshold: 0.14 },
        );
        revealObserver.observe(stageEl);
      } else {
        triggerArrivalReveal();
      }

      return () => {
        revealObserver?.disconnect();
        revealTlRef.current = null;
      };
    },
    { scope: containerRef, dependencies: [isDesktop, reducedMotion] },
  );

  // Interactive Stage Actions
  const handleReplay = useCallback(() => {
    setIsPlaying(true);
    engineRef.current.paused = false;
    revealTlRef.current?.restart();
  }, []);

  const handleSendGust = useCallback(() => {
    setIsPlaying(true);
    engineRef.current.paused = false;
    bridgeRef.current?.triggerGust(1.85);
  }, []);

  const handleCyclePreset = useCallback(() => {
    setPresetId((prev) => PRESET_ORDER[(PRESET_ORDER.indexOf(prev) + 1) % PRESET_ORDER.length]);
  }, []);

  const handleCycleTier = useCallback(() => {
    setQualityTier((prev) => TIER_ORDER[(TIER_ORDER.indexOf(prev) + 1) % TIER_ORDER.length]);
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const u = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const v = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      const mx = u * 2 - 1;
      const my = v * 2 - 1;

      engineRef.current.targetMouseX = mx;
      engineRef.current.targetMouseY = my;
      skyStageStateRef.current.targetMouseX = mx;
      skyStageStateRef.current.targetMouseY = my;

      bridgeRef.current?.setPointer(u, v);

      // Interactive Breeze Brush: compute horizontal swipe velocity over trees, palms & hedges
      const now = performance.now();
      if (lastPointerXRef.current !== null && now - lastPointerTsRef.current < 140) {
        const dt = Math.max(0.008, (now - lastPointerTsRef.current) / 1000);
        const vx = (u - lastPointerXRef.current) / dt;
        if (v > groveTopNorm - 0.05) {
          const groveV = clamp((v - groveTopNorm) / Math.max(0.1, 1 - groveTopNorm), 0, 1);
          bridgeRef.current?.applyPointerImpulse(u, groveV, vx);
        }
      }
      lastPointerXRef.current = u;
      lastPointerTsRef.current = now;
    },
    [groveTopNorm],
  );

  const handlePointerLeave = useCallback(() => {
    engineRef.current.targetMouseX = 0;
    engineRef.current.targetMouseY = 0;
    skyStageStateRef.current.targetMouseX = 0;
    skyStageStateRef.current.targetMouseY = 0;
    lastPointerXRef.current = null;
    bridgeRef.current?.setPointer(null, null);
  }, []);

  // ── Newsletter box state (single mount across all viewports) ─────────────
  const [nlEmail, setNlEmail] = useState("");
  const [nlToken, setNlToken] = useState<string | null>(null);
  const [nlTokenError, setNlTokenError] = useState(false);
  const [nlTokenKey, setNlTokenKey] = useState(0);
  const [nlPhase, setNlPhase] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [nlMessage, setNlMessage] = useState("");

  const resetNewsletterTurnstile = useCallback(() => {
    setNlToken(null);
    setNlTokenKey((k) => k + 1);
  }, []);

  const handleNewsletterSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = sanitizeEmail(nlEmail);
      if (!email) {
        setNlPhase("error");
        setNlMessage("Please enter a valid email address.");
        return;
      }

      setNlPhase("sending");
      setNlMessage("");
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (nlToken) headers["X-Turnstile-Token"] = nlToken;

        const response = await fetch("/api/newsletter-subscribe", {
          method: "POST",
          headers,
          body: JSON.stringify({ email }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };

        if (response.ok && payload.success) {
          setNlPhase("success");
          setNlMessage("You're on the list — see you in the next issue.");
          setNlEmail("");
          resetNewsletterTurnstile();
          return;
        }

        setNlPhase("error");
        setNlMessage(
          response.status === 429
            ? "Too many attempts just now. Please try again in a few minutes."
            : payload.error || "Subscription failed. Please try again shortly.",
        );
        resetNewsletterTurnstile();
      } catch {
        setNlPhase("error");
        setNlMessage("Network hiccup — please try again.");
        resetNewsletterTurnstile();
      }
    },
    [nlEmail, nlToken, resetNewsletterTurnstile],
  );

  const footerThemeVars = useMemo(
    () =>
      ({
        "--vihara-bg": activePaperHex,
        "--vihara-zenith": activeZenithHex,
      }) as CSSProperties,
    [activePaperHex, activeZenithHex],
  );

  const shouldRenderWebGLSky = profile.useWebGLSky && mountWebGL && !reducedMotion;
  const shouldRenderWebGLGrove = profile.useWebGLGrove && mountWebGL && !reducedMotion;
  const activeTierBadge =
    qualityTier === "auto" ? `Auto (${profile.tier})` : profile.label;

  return (
    <footer
      ref={containerRef}
      data-site-footer
      aria-label="YICDVP Vihara living woodblock footer"
      style={footerThemeVars}
      className="vihara-footer relative w-full select-none overflow-hidden border-t border-[var(--vihara-line)] bg-[var(--vihara-bg)] text-[var(--vihara-ink)] transition-colors duration-700"
    >
      {/* ── MOBILE / TABLET (< lg): Stacked High-Legibility Editorial Header ── */}
      {!isDesktop && (
        <div className="bg-[var(--vihara-bg)] px-5 pb-4 pt-8 text-[var(--vihara-ink)] transition-colors duration-700">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src={clubLogo}
                alt="Young Innovators Club logo"
                draggable={false}
                className="h-10 w-auto object-contain"
              />
              <img
                src={schoolLogo}
                alt="Dharmapala Vidyalaya logo"
                draggable={false}
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <p className="font-display text-2xl font-black lowercase leading-none tracking-tighter">
                yicdvp
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--vihara-muted)]">
                young innovators club
              </p>
            </div>
          </Link>

          <p className="font-vihara mt-4 text-sm leading-relaxed text-[var(--vihara-muted)]">
            A young innovators club at Dharmapala Vidyalaya, Pannipitiya. We build and celebrate
            student tech: workshops, hackathons, projects and shared wins.
          </p>

          <div className="font-vihara mt-6 grid grid-cols-1 gap-6 xs:grid-cols-2">
            <nav aria-label="Footer navigation">
              <p className="text-xs text-[var(--vihara-heading)]">Menu</p>
              <ul className="mt-2 space-y-2">
                {MENU_LINKS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-[15px] font-medium text-[var(--vihara-strong)] transition-colors hover:text-[var(--vihara-accent)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Footer explore links">
              <p className="text-xs text-[var(--vihara-heading)]">Explore</p>
              <ul className="mt-2 space-y-2">
                {EXPLORE_LINKS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-[15px] font-medium text-[var(--vihara-strong)] transition-colors hover:text-[var(--vihara-accent)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-[var(--vihara-ink-soft)] transition-colors hover:text-[var(--vihara-accent)]"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <p className="font-vihara text-xs text-[var(--vihara-copy)]">
              yicdvp © 2026, crafted to spark
            </p>
          </div>
        </div>
      )}

      {/* ── LIVING WOODBLOCK STAGE (Single Adaptive Stage across PC, Tablet & Mobile) ── */}
      <ViharaErrorBoundary>
        <div
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="group relative mx-auto w-full touch-pan-y overflow-hidden bg-[var(--vihara-bg)] transition-colors duration-700"
          style={{
            aspectRatio: isDesktop ? "1280 / 1260" : "1280 / 1060",
            minHeight: isDesktop ? "660px" : "330px",
            containerType: "inline-size",
          }}
        >
          {/* LAYER 0: WebGL2 Rayleigh/Mie Atmospheric Sky & Sunbeams/Moonbeams (CSS Eco fallback) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ height: isDesktop ? "48%" : "40%", zIndex: 1 }}
          >
            {shouldRenderWebGLSky ? (
              <Suspense fallback={<EcoSkyBackdrop presetId={presetId} darkMode={isDark} />}>
                <ViharaAtmosphericSkyWebGL
                  presetId={presetId}
                  darkMode={isDark}
                  profile={profile}
                  isVisibleRef={isVisibleRef}
                  windSnapshotRef={windSnapshotRef}
                  stateRef={skyStageStateRef}
                />
              </Suspense>
            ) : (
              <EcoSkyBackdrop presetId={presetId} darkMode={isDark} />
            )}
          </div>

          {/* LAYER 1: Three.js WebGL2 6-Body Edge-Guarded Uncropped 1280x720 Grove & Pavilion */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
            style={{ aspectRatio: "1280 / 720", zIndex: 3 }}
          >
            {shouldRenderWebGLGrove ? (
              <Suspense fallback={<EcoGrovePlate spinWheel={!reducedMotion} />}>
                <ViharaWebGLCanvas
                  profile={profile}
                  isVisibleRef={isVisibleRef}
                  engineRef={engineRef}
                  windSnapshotRef={windSnapshotRef}
                />
              </Suspense>
            ) : (
              <EcoGrovePlate spinWheel={!reducedMotion && isPlaying} />
            )}
          </div>

          {/* LAYER 2: High-Altitude 3-Strata Engraved Clouds (GPU compositor transforms only) */}
          {!reducedMotion && (
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ zIndex: 6 }}
            >
              {CLOUD_STRATA.map((spec, idx) => (
                <img
                  key={spec.id}
                  ref={(el) => {
                    cloudRefs.current[idx] = el;
                  }}
                  src={spec.src}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="vihara-cloud absolute left-0 will-change-transform"
                  style={{
                    top: `${isDesktop ? spec.topPct : Math.max(4, spec.topPct * 0.72)}%`,
                    width: `${spec.widthPct}%`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>
          )}

          {/* LAYER 3: Zero-GC Packed High-DPI Canvas (Splayed-Wingtip Birds + Falling Leaves) */}
          {!reducedMotion && (
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 9 }}>
              <ViharaSkyCanvas
                profile={profile}
                isVisibleRef={isVisibleRef}
                packedFrameRef={packedFrameRef}
                controlsRef={skyControlsRef}
              />
            </div>
          )}

          {/* LAYER 4 (Desktop): Editorial YICDVP Header high in spacious open sky */}
          {isDesktop && (
            <div
              className="font-vihara absolute inset-x-0 top-0 flex items-start justify-between px-[3.4%] pt-[2.5cqw]"
              style={{ zIndex: 12 }}
            >
              {/* Top-Left: YICDVP Brand Lockup, Manifesto, Socials & Copyright */}
              <div className="flex max-w-[min(410px,36cqw)] flex-col">
                <div ref={logoWrapRef} className="flex items-center">
                  <Link
                    to="/"
                    aria-label="YICDVP home"
                    className="group/logo flex items-center focus-visible:outline focus-visible:outline-[color:var(--vihara-accent)]"
                  >
                    <div
                      className="flex items-center"
                      style={{ gap: "0.55cqw", height: "clamp(32px, 3.2cqw, 46px)" }}
                    >
                      <img
                        src={clubLogo}
                        alt="Young Innovators Club logo"
                        draggable={false}
                        className="h-full w-auto select-none object-contain transition-transform duration-500 group-hover/logo:scale-105"
                      />
                      <img
                        src={schoolLogo}
                        alt="Dharmapala Vidyalaya logo"
                        draggable={false}
                        className="h-full w-auto select-none object-contain transition-transform duration-500 group-hover/logo:scale-105"
                      />
                    </div>
                    <span className="flex flex-col" style={{ marginLeft: "0.75cqw" }}>
                      <span
                        className="font-display font-black lowercase leading-none tracking-tighter text-[var(--vihara-ink)]"
                        style={{ fontSize: "clamp(19px, 1.85cqw, 28px)" }}
                      >
                        yicdvp
                      </span>
                      <span
                        className="font-sans font-bold uppercase text-[var(--vihara-muted)]"
                        style={{
                          marginTop: "0.22cqw",
                          fontSize: "clamp(8.5px, 0.64cqw, 10.5px)",
                          letterSpacing: "0.18em",
                        }}
                      >
                        young innovators club
                      </span>
                    </span>
                  </Link>
                </div>

                <p
                  ref={descWrapRef}
                  className="select-text text-[var(--vihara-muted)]"
                  style={{
                    marginTop: "clamp(10px, 1.15cqw, 17px)",
                    fontSize: "clamp(11px, 0.96cqw, 14.5px)",
                    lineHeight: 1.42,
                  }}
                >
                  A young innovators club at Dharmapala Vidyalaya, Pannipitiya. We build and
                  celebrate student tech: workshops, hackathons, projects and shared wins.
                </p>

                <div
                  ref={copyWrapRef}
                  className="flex flex-wrap items-center"
                  style={{
                    marginTop: "clamp(10px, 1.15cqw, 17px)",
                    gap: "clamp(10px, 1cqw, 16px)",
                  }}
                >
                  <div className="flex items-center" style={{ gap: "clamp(8px, 0.72cqw, 12px)" }}>
                    {SOCIALS.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        className="text-[var(--vihara-ink-soft)] transition-colors hover:text-[var(--vihara-accent)] focus-visible:text-[var(--vihara-accent)] focus-visible:outline focus-visible:outline-[color:var(--vihara-accent)]"
                      >
                        <social.icon
                          style={{
                            width: "clamp(14px, 1.12cqw, 17px)",
                            height: "clamp(14px, 1.12cqw, 17px)",
                          }}
                        />
                      </a>
                    ))}
                  </div>
                  <span aria-hidden="true" className="h-3 w-px bg-[var(--vihara-line)]" />
                  <span
                    className="select-text whitespace-nowrap text-[var(--vihara-copy)]"
                    style={{
                      fontSize: "clamp(10px, 0.88cqw, 13px)",
                      lineHeight: 1.2,
                      letterSpacing: "0.01em",
                    }}
                  >
                    yicdvp © 2026, crafted to spark
                  </span>
                </div>
              </div>

              {/* Top-Right: Menu & Explore Navigation Columns */}
              <div
                className="flex items-start"
                style={{
                  gap: "clamp(26px, 3.8cqw, 62px)",
                  paddingTop: "0.25cqw",
                }}
              >
                <nav ref={menuNavRef} aria-label="Footer navigation">
                  <div
                    className="select-text text-[var(--vihara-heading)]"
                    style={{
                      fontSize: "clamp(10px, 0.84cqw, 12.5px)",
                      marginBottom: "clamp(6px, 0.85cqw, 12px)",
                    }}
                  >
                    Menu
                  </div>
                  <ul
                    className="grid grid-cols-2"
                    style={{
                      columnGap: "clamp(16px, 2cqw, 30px)",
                      rowGap: "clamp(6px, 0.7cqw, 10px)",
                    }}
                  >
                    {MENU_LINKS.map((item) => (
                      <li key={item.to} className="leading-none">
                        <Link to={item.to} className="vihara-link">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <nav ref={exploreNavRef} aria-label="Footer explore links">
                  <div
                    className="select-text text-[var(--vihara-heading)]"
                    style={{
                      fontSize: "clamp(10px, 0.84cqw, 12.5px)",
                      marginBottom: "clamp(6px, 0.85cqw, 12px)",
                    }}
                  >
                    Explore
                  </div>
                  <ul className="flex flex-col" style={{ gap: "clamp(6px, 0.7cqw, 10px)" }}>
                    {EXPLORE_LINKS.map((item) => (
                      <li key={item.to} className="leading-none">
                        <Link to={item.to} className="vihara-link">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          )}

          {/* LAYER 5: Zero-Overlap Whisper-Quiet Dock anchored cleanly at bottom-right */}
          {!reducedMotion && (
            <div
              className="pointer-events-none absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)]"
              style={{ zIndex: 20 }}
            >
              <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1 rounded-full border border-[var(--vihara-line)] bg-[var(--vihara-pill-bg)] px-2.5 py-1 opacity-90 shadow-sm backdrop-blur-md transition-opacity duration-300 focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={handleReplay}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-[var(--vihara-ink)] transition-colors hover:bg-[var(--vihara-ink)]/10 focus-visible:outline focus-visible:outline-[color:var(--vihara-accent)]"
                  title="Replay Vihara woodblock mist reveal"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[var(--vihara-accent)]" />
                  <span className="hidden sm:inline">Replay</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendGust}
                  aria-label="Send sweeping wind gust"
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-[var(--vihara-ink)] transition-colors hover:bg-[var(--vihara-ink)]/10 focus-visible:outline focus-visible:outline-[color:var(--vihara-accent)]"
                  title="Send West-to-East sweeping wind gust"
                >
                  <Waves className="h-3.5 w-3.5 text-[var(--vihara-accent)]" />
                  <span>Gust</span>
                </button>

                <span aria-hidden="true" className="h-3 w-px bg-[var(--vihara-line)]" />

                <button
                  type="button"
                  onClick={handleCyclePreset}
                  aria-label={`Switch sky atmosphere (current: ${activePreset.label})`}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-[var(--vihara-ink)] transition-colors hover:bg-[var(--vihara-ink)]/10 focus-visible:outline focus-visible:outline-[color:var(--vihara-accent)]"
                  title={`Atmosphere: ${activePreset.label} — click to cycle Morning / Golden / Monsoon`}
                >
                  <Sun className="h-3.5 w-3.5 text-[var(--vihara-accent)]" />
                  <span className="hidden md:inline">{activePreset.label}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCycleTier}
                  aria-label={`Switch graphics engine tier (current: ${activeTierBadge})`}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-[var(--vihara-ink)] transition-colors hover:bg-[var(--vihara-ink)]/10 focus-visible:outline focus-visible:outline-[color:var(--vihara-accent)]"
                  title={`Engine Tier: ${profile.label} — click to switch Auto / Ultra / Balanced / CPU Eco`}
                >
                  <Cpu className="h-3.5 w-3.5 text-[var(--vihara-accent)]" />
                  <span className="hidden font-mono text-[11px] lg:inline">{activeTierBadge}</span>
                </button>

                <span aria-hidden="true" className="h-3 w-px bg-[var(--vihara-line)]" />

                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? "Pause footer animation" : "Resume footer animation"}
                  className="flex items-center justify-center rounded-full p-1 text-[var(--vihara-ink)] transition-colors hover:bg-[var(--vihara-ink)]/10 focus-visible:outline focus-visible:outline-[color:var(--vihara-accent)]"
                  title={
                    isPlaying ? "Pause physics & ambient motion" : "Resume physics & ambient motion"
                  }
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5 text-[var(--vihara-accent)]" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-[var(--vihara-accent)]" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Fine static paper grain unifying the woodblock engraving print */}
          <div
            aria-hidden="true"
            className="vihara-grain pointer-events-none absolute inset-0"
            style={{ zIndex: 15 }}
          />
        </div>
      </ViharaErrorBoundary>

      {/* ── SHARED NEWSLETTER & COLOPHON BAR (Single Turnstile mount) ────── */}
      <div className="relative border-t border-[var(--vihara-line)] bg-[var(--vihara-bg)] px-5 py-6 transition-colors duration-700 lg:px-[3.4%] lg:py-5">
        <div className="mx-auto flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-center gap-3.5">
            <img
              src={VIHARA_ASSETS.dharmaWheel}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              draggable={false}
              className="vihara-wheel-icon h-9 w-9 shrink-0 object-contain opacity-85 transition-transform duration-700 hover:rotate-90"
            />
            <div className="font-vihara">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--vihara-heading)]">
                Newsletter
              </p>
              <p className="mt-0.5 text-sm leading-snug text-[var(--vihara-muted)]">
                Workshops, hackathons &amp; student STEM launches — delivered to your inbox.
              </p>
            </div>
          </div>

          <div className="w-full max-w-md lg:max-w-[430px]">
            {nlPhase === "success" ? (
              <p
                role="status"
                className="font-vihara select-text text-sm font-semibold text-[var(--vihara-ink)] lg:text-right"
              >
                {nlMessage}
              </p>
            ) : (
              <div className="space-y-2.5">
                <form className="flex items-center gap-2" onSubmit={handleNewsletterSubmit}>
                  <input
                    type="email"
                    value={nlEmail}
                    onChange={(e) => setNlEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    autoComplete="email"
                    className="min-w-0 flex-1 select-text rounded-full border border-[var(--vihara-input-border)] bg-[var(--vihara-input-bg)] px-4 py-2 text-sm text-[var(--vihara-ink)] outline-none transition-colors placeholder:text-[var(--vihara-muted)] focus:border-[var(--vihara-accent)]"
                  />
                  <button
                    type="submit"
                    disabled={nlPhase === "sending" || (!nlToken && !nlTokenError)}
                    className="shrink-0 rounded-full bg-[var(--vihara-ink)] px-5 py-2 text-xs font-bold tracking-wide text-[var(--vihara-bg)] transition-all hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {nlPhase === "sending" ? "Sending" : "Subscribe"}
                  </button>
                </form>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Turnstile
                    key={nlTokenKey}
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    theme={isDark ? "dark" : "light"}
                    size={isDesktop ? "flexible" : "compact"}
                    onSuccess={(token) => {
                      setNlToken(token || null);
                      setNlTokenError(false);
                    }}
                    onError={() => {
                      setNlToken(null);
                      setNlTokenError(true);
                    }}
                  />
                </div>
                {nlPhase === "error" && (
                  <p
                    role="status"
                    className="select-text text-xs leading-relaxed text-[#b3261e] dark:text-[#fca5a5]"
                  >
                    {nlMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

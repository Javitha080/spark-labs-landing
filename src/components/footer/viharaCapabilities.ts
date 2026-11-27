/**
 * Pure Math Helpers, Hardware Capability Detection & Adaptive GPU / CPU Quality Tier Engine.
 *
 * Probes WebGL2/WebGL1 availability, software-renderer detection (SwiftShader/llvmpipe),
 * CPU core count, device memory, touch/mobile form factor, Web Worker support,
 * and OS prefers-reduced-motion accessibility preference.
 */

export function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Smooth 1D value noise for deterministic wind gust envelopes */
export function smoothNoise1D(t: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const h = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  return h(i) * (1 - u) + h(i + 1) * u;
}

export function fbm1D(t: number): number {
  return (
    smoothNoise1D(t) * 0.54 +
    smoothNoise1D(t * 2.17 + 11.4) * 0.31 +
    smoothNoise1D(t * 4.83 + 27.9) * 0.15
  );
}

/** Deterministic Park-Miller PRNG for reproducible artistic layouts */
export function createSeededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export type QualityTierId = "auto" | "ultra" | "balanced" | "eco";
export type ResolvedTier = "ultra" | "balanced" | "eco";

export interface DeviceCapabilities {
  hasWebGL2: boolean;
  hasWebGL1: boolean;
  isSoftwareRenderer: boolean;
  gpuRenderer: string;
  maxTextureSize: number;
  cpuCores: number;
  deviceMemoryGB: number | null;
  isMobile: boolean;
  isTouch: boolean;
  hasWorker: boolean;
  prefersReducedMotion: boolean;
  recommendedTier: ResolvedTier;
}

export interface QualityProfile {
  tier: ResolvedTier;
  label: string;
  useWebGLSky: boolean;
  useWebGLGrove: boolean;
  useWorkerPhysics: boolean;
  maxDpr: number;
  skyDpr: number;
  targetFps: number;
  maxBirds: number;
  maxLeaves: number;
  moteCount: number;
  cloudCount: number;
  reducedMotion: boolean;
}

let cachedCaps: DeviceCapabilities | null = null;

export function detectDeviceCapabilities(): DeviceCapabilities {
  if (cachedCaps) return cachedCaps;

  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  if (!isBrowser) {
    return {
      hasWebGL2: false,
      hasWebGL1: false,
      isSoftwareRenderer: false,
      gpuRenderer: "SSR",
      maxTextureSize: 0,
      cpuCores: 4,
      deviceMemoryGB: null,
      isMobile: false,
      isTouch: false,
      hasWorker: false,
      prefersReducedMotion: false,
      recommendedTier: "eco",
    };
  }

  let hasWebGL2 = false;
  let hasWebGL1 = false;
  let gpuRenderer = "Unknown GPU";
  let maxTextureSize = 2048;
  let isSoftwareRenderer = false;

  try {
    const testCanvas = document.createElement("canvas");
    const gl2 = testCanvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    const gl = gl2 || testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");

    if (gl2) hasWebGL2 = true;
    if (gl) {
      hasWebGL1 = true;
      const webgl = gl as WebGLRenderingContext;
      maxTextureSize = Number(webgl.getParameter(webgl.MAX_TEXTURE_SIZE)) || 2048;
      const dbg = webgl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        const unmasked = String(webgl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
        if (unmasked) gpuRenderer = unmasked;
      }
      const lower = gpuRenderer.toLowerCase();
      isSoftwareRenderer =
        lower.includes("swiftshader") ||
        lower.includes("llvmpipe") ||
        lower.includes("softpipe") ||
        lower.includes("microsoft basic render");

      // Release probe context cleanly immediately
      const loseCtx = webgl.getExtension("WEBGL_lose_context");
      loseCtx?.loseContext();
    }
  } catch {
    hasWebGL2 = false;
    hasWebGL1 = false;
  }

  const cpuCores = Math.max(1, navigator.hardwareConcurrency || 4);
  const navWithMem = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGB = typeof navWithMem.deviceMemory === "number" ? navWithMem.deviceMemory : null;

  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);

  const isMobile =
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

  const prefersReducedMotion = Boolean(
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );

  const hasWorker =
    typeof Worker !== "undefined" &&
    typeof Blob !== "undefined" &&
    typeof URL?.createObjectURL === "function";

  let recommendedTier: ResolvedTier = "ultra";
  if (prefersReducedMotion || (!hasWebGL2 && !hasWebGL1) || isSoftwareRenderer) {
    recommendedTier = "eco";
  } else if (isMobile || cpuCores <= 4 || (deviceMemoryGB !== null && deviceMemoryGB <= 4)) {
    recommendedTier = "balanced";
  }

  cachedCaps = {
    hasWebGL2,
    hasWebGL1,
    isSoftwareRenderer,
    gpuRenderer,
    maxTextureSize,
    cpuCores,
    deviceMemoryGB,
    isMobile,
    isTouch,
    hasWorker,
    prefersReducedMotion,
    recommendedTier,
  };
  return cachedCaps;
}

export function resolveQualityProfile(
  requested: QualityTierId,
  caps: DeviceCapabilities = detectDeviceCapabilities(),
  reducedMotionOverride?: boolean,
): QualityProfile {
  const reducedMotion = reducedMotionOverride ?? caps.prefersReducedMotion;
  const hasAnyWebGL = caps.hasWebGL2 || caps.hasWebGL1;
  const resolved: ResolvedTier = requested === "auto" ? caps.recommendedTier : requested;

  // Never enable WebGL when browser lacks WebGL or user requests reduced motion
  const effective: ResolvedTier = !hasAnyWebGL || reducedMotion ? "eco" : resolved;

  if (effective === "eco") {
    return {
      tier: "eco",
      label: "CPU Eco",
      useWebGLSky: false,
      useWebGLGrove: false,
      useWorkerPhysics: caps.hasWorker && !reducedMotion,
      maxDpr: 1.25,
      skyDpr: 1.0,
      targetFps: reducedMotion ? 15 : 30,
      maxBirds: reducedMotion ? 0 : 7,
      maxLeaves: reducedMotion ? 0 : 6,
      moteCount: 0,
      cloudCount: 3,
      reducedMotion,
    };
  }

  if (effective === "balanced") {
    return {
      tier: "balanced",
      label: "Balanced GPU",
      useWebGLSky: true,
      useWebGLGrove: true,
      useWorkerPhysics: caps.hasWorker,
      maxDpr: 1.5,
      skyDpr: 1.0,
      targetFps: 60,
      maxBirds: 10,
      maxLeaves: 10,
      moteCount: 22,
      cloudCount: 4,
      reducedMotion: false,
    };
  }

  return {
    tier: "ultra",
    label: "Ultra GPU",
    useWebGLSky: true,
    useWebGLGrove: true,
    useWorkerPhysics: caps.hasWorker,
    maxDpr: 2.0,
    skyDpr: 1.5,
    targetFps: 60,
    maxBirds: 13,
    maxLeaves: 16,
    moteCount: 38,
    cloudCount: 5,
    reducedMotion: false,
  };
}

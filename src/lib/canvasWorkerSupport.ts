/**
 * Shared OffscreenCanvas + Web Worker capability detection, CSS color parsing,
 * and zero-reflow bounding-box caching for interactive 2D/WebGL canvases.
 */

let offscreenWebGL2Supported: boolean | undefined;

/**
 * Returns true when the browser supports Dedicated Workers, OffscreenCanvas,
 * HTMLCanvasElement.transferControlToOffscreen, and WebGL2 inside OffscreenCanvas.
 * Memoized for the lifetime of the page; probes a 1x1 OffscreenCanvas once and
 * immediately releases the context.
 */
export function supportsOffscreenWebGL2(): boolean {
  if (typeof window === "undefined") return false;
  if (offscreenWebGL2Supported !== undefined) return offscreenWebGL2Supported;

  try {
    if (
      typeof Worker === "undefined" ||
      typeof OffscreenCanvas === "undefined" ||
      typeof HTMLCanvasElement === "undefined" ||
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen !== "function"
    ) {
      offscreenWebGL2Supported = false;
      return false;
    }
    const probe = new OffscreenCanvas(1, 1);
    const gl = probe.getContext("webgl2") as WebGL2RenderingContext | null;
    offscreenWebGL2Supported = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    offscreenWebGL2Supported = false;
  }

  return offscreenWebGL2Supported;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const srgbChannelToLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

let sharedColorProbe: CanvasRenderingContext2D | null | undefined;
const srgbCache = new Map<string, [number, number, number]>();
const linearCache = new Map<string, [number, number, number]>();

function getColorProbe(): CanvasRenderingContext2D | null {
  if (sharedColorProbe !== undefined) return sharedColorProbe;
  if (typeof document === "undefined") {
    sharedColorProbe = null;
    return null;
  }
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    sharedColorProbe = c.getContext("2d", { willReadFrequently: true });
  } catch {
    sharedColorProbe = null;
  }
  return sharedColorProbe;
}

/**
 * Fast, memoized CSS color -> normalized sRGB [0..1, 0..1, 0..1] parser.
 * Handles #rgb, #rrggbb, rgb()/rgba() via pure math first, falling back to a
 * single shared 1x1 canvas probe for named/hsl/color-mix tokens.
 */
export function parseCssSrgb01(
  value: string,
  fallback: [number, number, number] = [1, 1, 1],
): [number, number, number] {
  const key = String(value || "").trim();
  if (!key) return fallback;
  const hit = srgbCache.get(key);
  if (hit) return hit;

  let out: [number, number, number] | null = null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(key);
  if (hex) {
    const raw =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : hex[1];
    out = [
      parseInt(raw.slice(0, 2), 16) / 255,
      parseInt(raw.slice(2, 4), 16) / 255,
      parseInt(raw.slice(4, 6), 16) / 255,
    ];
  } else {
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(key);
    if (rgb) {
      out = [
        clamp01(parseFloat(rgb[1]) / 255),
        clamp01(parseFloat(rgb[2]) / 255),
        clamp01(parseFloat(rgb[3]) / 255),
      ];
    }
  }

  if (!out) {
    const probe = getColorProbe();
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#000000";
      probe.fillStyle = key;
      probe.fillRect(0, 0, 1, 1);
      const data = probe.getImageData(0, 0, 1, 1).data;
      out = [data[0] / 255, data[1] / 255, data[2] / 255];
    } else {
      out = fallback;
    }
  }

  if (srgbCache.size > 256) srgbCache.clear();
  srgbCache.set(key, out);
  return out;
}

/**
 * Memoized Dither color resolver: numeric tuples stay clamped [0..1], while CSS
 * color strings convert from sRGB to linear light (matching Dither's shader).
 */
export function resolveLinearColor01(
  value: string | [number, number, number],
): [number, number, number] {
  if (Array.isArray(value)) {
    return [
      clamp01(Number(value[0]) || 0),
      clamp01(Number(value[1]) || 0),
      clamp01(Number(value[2]) || 0),
    ];
  }
  const key = String(value || "").trim();
  const hit = linearCache.get(key);
  if (hit) return hit;

  const [sr, sg, sb] = parseCssSrgb01(key, [0, 0, 0]);
  const linear: [number, number, number] = [
    srgbChannelToLinear(sr),
    srgbChannelToLinear(sg),
    srgbChannelToLinear(sb),
  ];
  if (linearCache.size > 256) linearCache.clear();
  linearCache.set(key, linear);
  return linear;
}

/* ─── Shared Zero-Reflow Bounding-Box Cache ────────────────────────────────── */

const rectInvalidators = new Set<() => void>();
let globalListenersAttached = false;

function invalidateAllRects() {
  rectInvalidators.forEach((fn) => fn());
}

function attachGlobalInvalidators() {
  if (globalListenersAttached || typeof window === "undefined") return;
  globalListenersAttached = true;
  window.addEventListener("scroll", invalidateAllRects, { passive: true, capture: true });
  window.addEventListener("resize", invalidateAllRects, { passive: true });
}

function detachGlobalInvalidatorsIfEmpty() {
  if (!globalListenersAttached || rectInvalidators.size > 0 || typeof window === "undefined") return;
  globalListenersAttached = false;
  window.removeEventListener("scroll", invalidateAllRects, { capture: true });
  window.removeEventListener("resize", invalidateAllRects);
}

export interface CachedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ElementRectCache {
  get(): CachedRect;
  read(): CachedRect;
  invalidate(): void;
  destroy(): void;
}

/**
 * Caches an element's viewport rect so high-frequency pointermove and rAF ticks
 * read plain numbers instead of triggering synchronous layout via
 * getBoundingClientRect() on every event. Automatically marks dirty on scroll,
 * window resize, or element resize.
 */
export function createElementRectCache(element: HTMLElement): ElementRectCache {
  let dirty = true;
  let cached: CachedRect = { left: 0, top: 0, right: 0, bottom: 0, width: 1, height: 1 };

  const markDirty = () => {
    dirty = true;
  };

  const readRect = (): CachedRect => {
    if (dirty) {
      const r = element.getBoundingClientRect();
      cached = {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
      dirty = false;
    }
    return cached;
  };

  attachGlobalInvalidators();
  rectInvalidators.add(markDirty);

  const ro =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(markDirty) : null;
  ro?.observe(element);

  return {
    get: readRect,
    read: readRect,
    invalidate: markDirty,
    destroy() {
      ro?.disconnect();
      rectInvalidators.delete(markDirty);
      detachGlobalInvalidatorsIfEmpty();
    },
  };
}

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
  type Ref,
} from "react";
import type { GlassConfig, LiquidGlass as LiquidGlassInstance } from "@ybouane/liquidglass";
import { cn } from "@/lib/utils";

/**
 * The one place this app talks to @ybouane/liquidglass.
 *
 * How the library works (see its README): `LiquidGlass.init({ root, glassElements })`
 * rasterises every NON-glass child of `root` into a texture, then renders each
 * glass element as a WebGL refraction of whatever sits underneath it. That gives
 * three rules this module is built around:
 *
 *  1. Glass elements must be DIRECT children of the stage. Use <GlassPane> as a
 *     direct child of <LiquidGlassStage>, never nested inside a wrapper.
 *  2. The stage should only contain what the glass refracts (a photo, a canvas,
 *     a video, a small decorative layer). It is not meant to wrap a whole page,
 *     which is why the sticky navbar uses <GlassBar> (CSS) instead.
 *  3. Every init() opens a WebGL context, so a stage only keeps its instance
 *     alive while it is near the viewport and tears it down afterwards.
 *
 * While the shader is not running (before init, offscreen, no WebGL, init
 * failure) panes keep a quiet CSS look from `.glass-pane` in index.css, so the
 * UI never depends on WebGL being available.
 */

let webglSupported: boolean | undefined;

export function supportsWebGLGlass(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
    return false;
  }
  if (webglSupported === undefined) {
    try {
      const probe = document.createElement("canvas");
      const gl = (probe.getContext("webgl") ?? probe.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      webglSupported = Boolean(gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupported = false;
    }
  }
  return webglSupported;
}

export interface LiquidGlassStageHandle {
  /**
   * Tell the library something it cannot observe has changed (a canvas you just
   * repainted, an <img> whose src you swapped). Pass the element to redraw only
   * the glass panes that overlap it.
   */
  markChanged: (element?: HTMLElement) => void;
  readonly instance: LiquidGlassInstance | null;
}

export interface LiquidGlassStageProps extends HTMLAttributes<HTMLDivElement> {
  /** Instance-wide defaults; individual panes override through their `config`. */
  defaults?: Partial<GlassConfig>;
  /** Set false to keep the CSS look only (e.g. low-power or tiny viewports). */
  enabled?: boolean;
  /** How far outside the viewport the shader stays alive. */
  rootMargin?: string;
  ref?: Ref<LiquidGlassStageHandle>;
  /** Access to the stage's DOM node, for callers that also need it (focus, fullscreen). */
  rootRef?: Ref<HTMLDivElement>;
}

export function LiquidGlassStage({
  defaults,
  enabled = true,
  rootMargin = "200px",
  className,
  children,
  ref,
  rootRef: externalRootRef,
  ...rest
}: LiquidGlassStageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRoot = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof externalRootRef === "function") externalRootRef(node);
    else if (externalRootRef) (externalRootRef as { current: HTMLDivElement | null }).current = node;
  };
  const instanceRef = useRef<LiquidGlassInstance | null>(null);
  const [shaderActive, setShaderActive] = useState(false);
  const defaultsKey = JSON.stringify(defaults ?? {});

  useImperativeHandle(
    ref,
    () => ({
      markChanged: (element) => instanceRef.current?.markChanged(element),
      get instance() {
        return instanceRef.current;
      },
    }),
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || !supportsWebGLGlass()) return;

    let disposed = false;
    let visible = false;
    let booting = false;
    let idleTimer: number | undefined;

    const teardown = () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
      setShaderActive(false);
    };

    const boot = async () => {
      if (instanceRef.current || booting || disposed) return;
      booting = true;
      try {
        // Webfonts must be loaded before init(): captured text would otherwise
        // fall back to system fonts inside the refraction.
        await document.fonts?.ready;
        const { LiquidGlass } = await import("@ybouane/liquidglass");
        if (disposed || !visible) return;

        const glassElements = Array.from(root.children).filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute("data-liquid-glass"),
        );
        if (glassElements.length === 0) return;

        const instance = await LiquidGlass.init({
          root,
          glassElements,
          defaults: JSON.parse(defaultsKey) as Partial<GlassConfig>,
        });
        if (disposed || !visible) {
          instance.destroy();
          return;
        }
        instanceRef.current = instance;
        setShaderActive(true);
      } catch (error) {
        // Panes stay on their CSS look; nothing else to recover.
        console.warn("[LiquidGlassStage] shader unavailable, using CSS glass", error);
      } finally {
        booting = false;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        window.clearTimeout(idleTimer);
        if (visible) void boot();
        else idleTimer = window.setTimeout(teardown, 1500);
      },
      { rootMargin },
    );
    observer.observe(root);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(idleTimer);
      teardown();
    };
  }, [enabled, rootMargin, defaultsKey]);

  return (
    <div
      ref={setRoot}
      data-glass-stage={shaderActive ? "webgl" : "css"}
      className={cn("relative", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface GlassPaneProps extends HTMLAttributes<HTMLDivElement> {
  /** Per-pane shader settings (merged over the stage defaults). */
  config?: Partial<GlassConfig>;
  /** Corner radius in px. Drives both the shader and the CSS look. */
  radius?: number;
}

/** A single glass element. Must be a direct child of <LiquidGlassStage>. */
export function GlassPane({ config, radius = 24, className, style, children, ...rest }: GlassPaneProps) {
  const merged: Partial<GlassConfig> = {
    cornerRadius: radius,
    zRadius: Math.min(config?.zRadius ?? 40, radius),
    ...config,
  };
  return (
    <div
      data-liquid-glass
      data-config={JSON.stringify(merged)}
      className={cn("glass-pane relative", className)}
      style={{ borderRadius: radius, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

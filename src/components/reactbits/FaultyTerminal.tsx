import { useEffect, useMemo, useRef, type CSSProperties, type HTMLAttributes } from 'react';
import { supportsWebGL2 } from '@/lib/webglSupport';
import { createElementRectCache, supportsOffscreenWebGL2 } from '@/lib/canvasWorkerSupport';
import {
  createFaultyTerminalEngine,
  type FaultyTerminalEngine,
  type FaultyTerminalEngineSettings,
} from './engines/faultyTerminalEngine';
import type { FaultyTerminalWorkerMessage } from './workers/faultyTerminal.worker';

type Vec2 = [number, number];

export type FaultyTerminalGlyphs = 'blocks' | 'dots' | 'characters';
export type FaultyTerminalClickEffect = 'glitch' | 'degauss' | 'none';

export interface FaultyTerminalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  scale?: number;
  gridMul?: Vec2;
  digitSize?: number;
  timeScale?: number;
  pause?: boolean;
  scanlineIntensity?: number;
  glitchAmount?: number;
  flickerAmount?: number;
  noiseAmp?: number;
  chromaticAberration?: number;
  dither?: number | boolean;
  curvature?: number;
  tint?: string;
  mouseReact?: boolean;
  mouseStrength?: number;
  pageLoadAnimation?: boolean;
  brightness?: number;
  glyphs?: FaultyTerminalGlyphs;
  glow?: number;
  persistence?: number;
  scramble?: number;
  mouseGlow?: number;
  vignette?: number;
  clickEffect?: FaultyTerminalClickEffect;
  variation?: number;
  lightMode?: boolean;
  dpr?: number;
  className?: string;
  style?: CSSProperties;
}

const CLICK_SECONDS: Record<string, number> = { glitch: 0.7, degauss: 1.6 };
const GLYPHS: Record<string, number> = { blocks: 0, dots: 1, characters: 2 };
const CLICKS: Record<string, number> = { none: 0, glitch: 1, degauss: 2 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function FaultyTerminal({
  scale = 1,
  gridMul = [2, 1],
  digitSize = 1.5,
  timeScale = 0.3,
  pause = false,
  scanlineIntensity = 0.3,
  glitchAmount = 1,
  flickerAmount = 1,
  noiseAmp = 1,
  chromaticAberration = 0,
  dither = 0,
  curvature = 0.2,
  tint = '#ffffff',
  mouseReact = true,
  mouseStrength = 0.2,
  pageLoadAnimation = true,
  brightness = 1,
  glyphs = 'blocks',
  glow = 0.5,
  persistence = 0.5,
  scramble = 0.5,
  mouseGlow = 0.6,
  vignette = 0.25,
  clickEffect = 'glitch',
  variation,
  lightMode = false,
  dpr,
  className = '',
  style,
  ...rest
}: FaultyTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const hasWebGL2 = useMemo(() => supportsWebGL2(), []);

  const buildSettings = (): FaultyTerminalEngineSettings => ({
    scale: Math.max(0.05, scale),
    gridX: Math.max(0.1, (gridMul?.[0] ?? 2) * 15),
    gridY: Math.max(0.1, (gridMul?.[1] ?? 1) * 15),
    digitSize,
    timeScale,
    pause,
    scanlineIntensity,
    glitchAmount,
    flickerAmount,
    noiseAmp,
    chromaticAberration,
    dither: typeof dither === 'boolean' ? (dither ? 1 : 0) : dither,
    curvature,
    tint,
    mouseReact,
    mouseStrength,
    pageLoadAnimation,
    brightness,
    glyphs: GLYPHS[glyphs] ?? 0,
    glow: clamp(glow, 0, 3),
    persistence: clamp(persistence, 0, 1),
    scramble: clamp(scramble, 0, 1),
    mouseGlow: clamp(mouseGlow, 0, 1),
    vignette: clamp(vignette, 0, 1),
    clickEffect: CLICKS[clickEffect] ?? 0,
    clickSeconds: CLICK_SECONDS[clickEffect] ?? 1,
    variation,
    lightMode,
    reduce:
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
        : false,
  });

  const settingsRef = useRef({ dpr, engineSettings: buildSettings() });
  settingsRef.current = { dpr, engineSettings: buildSettings() };

  useEffect(() => {
    if (!hasWebGL2) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 block h-full w-full';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    let worker: Worker | null = null;
    let fallbackEngine: FaultyTerminalEngine | null = null;
    let visible = true;

    const post = (msg: FaultyTerminalWorkerMessage, transfer?: Transferable[]) => {
      if (worker) {
        if (transfer) worker.postMessage(msg, transfer);
        else worker.postMessage(msg);
      }
    };

    if (supportsOffscreenWebGL2()) {
      try {
        const offscreen = canvas.transferControlToOffscreen();
        worker = new Worker(new URL('./workers/faultyTerminal.worker.ts', import.meta.url), {
          type: 'module',
        });
        post(
          { type: 'init', canvas: offscreen, settings: settingsRef.current.engineSettings },
          [offscreen],
        );
      } catch {
        worker?.terminate();
        worker = null;
        canvas.remove();
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.className = 'absolute inset-0 block h-full w-full';
        fallbackCanvas.setAttribute('aria-hidden', 'true');
        container.appendChild(fallbackCanvas);
        fallbackEngine = createFaultyTerminalEngine(fallbackCanvas, settingsRef.current.engineSettings);
      }
    } else {
      fallbackEngine = createFaultyTerminalEngine(canvas, settingsRef.current.engineSettings);
    }

    const rectCache = createElementRectCache(container);

    const resize = () => {
      rectCache.invalidate();
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(settingsRef.current.dpr || window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (worker) {
        post({ type: 'resize', cssWidth: width, cssHeight: height, pixelWidth, pixelHeight });
      } else {
        fallbackEngine?.resize(width, height, pixelWidth, pixelHeight);
      }
    };

    const locate = (event: PointerEvent) => {
      const rect = rectCache.get();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
      return { x, y, inside: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!visible || !settingsRef.current.engineSettings.mouseReact) return;
      const { x, y, inside } = locate(event);
      if (worker) post({ type: 'pointermove', x, y, inside });
      else fallbackEngine?.pointerMove(x, y, inside);
    };

    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current.engineSettings;
      if (!visible || s.reduce || !s.clickEffect) return;
      const { x, y, inside } = locate(event);
      if (!inside) return;
      if (worker) post({ type: 'pointerdown', x, y, inside });
      else fallbackEngine?.pointerDown(x, y, inside);
    };

    const onPointerLeave = () => {
      if (!settingsRef.current.engineSettings.mouseReact) return;
      if (worker) post({ type: 'pointerleave' });
      else fallbackEngine?.pointerLeave();
    };

    const onVisibility = () => {
      if (worker) post({ type: 'visibility', visible, pageHidden: document.hidden });
      else fallbackEngine?.setVisibility(visible, document.hidden);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      onVisibility();
    });
    intersection.observe(container);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    let lastDpr = settingsRef.current.dpr;
    syncRef.current = () => {
      const current = settingsRef.current;
      if (worker) post({ type: 'settings', settings: current.engineSettings });
      else fallbackEngine?.updateSettings(current.engineSettings);
      if (current.dpr !== lastDpr) {
        lastDpr = current.dpr;
        resize();
      }
    };

    return () => {
      syncRef.current = null;
      rectCache.destroy();
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      if (worker) {
        post({ type: 'destroy' });
        worker.terminate();
        worker = null;
      } else {
        fallbackEngine?.destroy();
        fallbackEngine = null;
      }
      while (container.firstChild) container.removeChild(container.firstChild);
    };
  }, [hasWebGL2]);

  useEffect(() => {
    syncRef.current?.();
  });

  return (
    <div
      ref={containerRef}
      className={['relative h-full w-full overflow-hidden', className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {!hasWebGL2 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${tint}12 0px, ${tint}12 1px, transparent 1px, transparent 4px), radial-gradient(circle at 50% 40%, ${tint}18, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

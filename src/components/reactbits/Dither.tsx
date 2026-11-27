'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { supportsWebGL2 } from '@/lib/webglSupport';
import {
  createElementRectCache,
  resolveLinearColor01,
  supportsOffscreenWebGL2,
} from '@/lib/canvasWorkerSupport';
import { createDitherEngine, type DitherEngine, type DitherEngineSettings } from './engines/ditherEngine';
import type { DitherWorkerMessage } from './workers/dither.worker';

export type DitherColor = string | [number, number, number];
export type DitherMode = 'bayer' | 'bayer4' | 'bayer2' | 'halftone' | 'lines' | 'crosshatch' | 'noise' | 'none';
export type DitherMouseEffect = 'erase' | 'reveal' | 'ripple';

export interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: DitherColor;
  backgroundColor?: DitherColor;
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  ditherMode?: DitherMode;
  palette?: string[];
  scale?: number;
  contrast?: number;
  brightness?: number;
  mouseEffect?: DitherMouseEffect;
  mouseStrength?: number;
  trail?: number;
  clickRipple?: boolean;
  intro?: boolean;
  dpr?: number;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
}

const MODES: Record<string, number> = {
  bayer: 0,
  bayer4: 1,
  bayer2: 2,
  halftone: 3,
  lines: 4,
  crosshatch: 5,
  noise: 6,
  none: 7,
};
const EFFECTS: Record<string, number> = { erase: 0, reveal: 1, ripple: 2 };
const MAX_PALETTE = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const Dither = ({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  backgroundColor = [0, 0, 0],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
  ditherMode = 'bayer',
  palette,
  scale = 1,
  contrast = 1,
  brightness = 0,
  mouseEffect = 'erase',
  mouseStrength = 1,
  trail = 0.5,
  clickRipple = true,
  intro = true,
  dpr,
  paused = false,
  className = '',
  style,
}: DitherProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const hasWebGL2 = useMemo(() => supportsWebGL2(), []);

  const buildEngineSettings = (): DitherEngineSettings => {
    const reduce =
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
        : false;
    const transparent = backgroundColor === 'transparent';
    const cleanPalette = Array.isArray(palette) ? palette.filter(Boolean).slice(0, MAX_PALETTE) : [];
    return {
      waveSpeed,
      waveFrequency,
      waveAmplitude,
      waveLinear: resolveLinearColor01(waveColor),
      bgLinear: transparent ? [0, 0, 0] : resolveLinearColor01(backgroundColor),
      transparent,
      colorNum: Math.max(2, colorNum),
      pixelSize: Math.max(1, pixelSize),
      disableAnimation,
      enableMouseInteraction,
      mouseRadius: Math.max(0.001, mouseRadius),
      mode: MODES[ditherMode] ?? 0,
      paletteLinear: cleanPalette.map((c) => resolveLinearColor01(c)),
      scale: Math.max(0.05, scale),
      contrast,
      brightness,
      effect: EFFECTS[mouseEffect] ?? 0,
      mouseStrength: Math.max(0, mouseStrength),
      trail: clamp(trail, 0, 1),
      clickRipple,
      intro,
      reduce,
      paused,
    };
  };

  const settingsRef = useRef<{ dpr?: number; engineSettings: DitherEngineSettings }>({
    dpr,
    engineSettings: buildEngineSettings(),
  });
  settingsRef.current = { dpr, engineSettings: buildEngineSettings() };

  useEffect(() => {
    if (!hasWebGL2) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    // Mount a fresh <canvas> per effect lifecycle so transferControlToOffscreen()
    // is immune to React 19 StrictMode double-mounts and clean across remounts.
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 block h-full w-full';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    let worker: Worker | null = null;
    let fallbackEngine: DitherEngine | null = null;
    let visible = true;

    const post = (msg: DitherWorkerMessage, transfer?: Transferable[]) => {
      if (worker) {
        if (transfer) worker.postMessage(msg, transfer);
        else worker.postMessage(msg);
      }
    };

    if (supportsOffscreenWebGL2()) {
      try {
        const offscreen = canvas.transferControlToOffscreen();
        worker = new Worker(new URL('./workers/dither.worker.ts', import.meta.url), {
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
        fallbackEngine = createDitherEngine(fallbackCanvas, settingsRef.current.engineSettings);
      }
    } else {
      fallbackEngine = createDitherEngine(canvas, settingsRef.current.engineSettings);
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
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      return { x, y, inside };
    };

    const onPointerMove = (event: PointerEvent) => {
      const s = settingsRef.current.engineSettings;
      if (!visible || s.paused || !s.enableMouseInteraction) return;
      const { x, y, inside } = locate(event);
      if (worker) post({ type: 'pointermove', x, y, inside });
      else fallbackEngine?.pointerMove(x, y, inside);
    };

    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current.engineSettings;
      if (!visible || s.paused || !s.clickRipple) return;
      const { x, y, inside } = locate(event);
      if (!inside) return;
      if (worker) post({ type: 'pointerdown', x, y, inside });
      else fallbackEngine?.pointerDown(x, y, inside);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        if (worker) post({ type: 'pointerleave' });
        else fallbackEngine?.pointerLeave();
      }
    };

    const onPointerLeave = () => {
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
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
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
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
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
    />
  );
};

export default Dither;

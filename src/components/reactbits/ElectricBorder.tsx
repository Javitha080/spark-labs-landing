import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { supportsWebGL2 } from '@/lib/webglSupport';
import {
  createElementRectCache,
  parseCssSrgb01,
  supportsOffscreenWebGL2,
} from '@/lib/canvasWorkerSupport';
import {
  createElectricBorderEngine,
  ELECTRIC_BORDER_MARGIN,
  ELECTRIC_BORDER_PIXEL_BUDGET,
  type ElectricBorderEngine,
  type ElectricBorderEngineSettings,
} from './engines/electricBorderEngine';
import type { ElectricBorderWorkerMessage } from './workers/electricBorder.worker';

export interface ElectricBorderProps {
  children?: ReactNode;
  color?: string;
  glowColor?: string;
  speed?: number;
  chaos?: number;
  spread?: number;
  thickness?: number;
  strands?: number;
  glow?: number;
  fps?: number;
  intensity?: number;
  arcs?: number;
  flicker?: number;
  borderRadius?: number;
  offset?: number;
  active?: boolean;
  intro?: boolean;
  interactive?: boolean;
  cursorRadius?: number;
  theme?: 'dark' | 'light';
  className?: string;
  style?: CSSProperties;
}

const MARGIN = ELECTRIC_BORDER_MARGIN;
const PIXEL_BUDGET = ELECTRIC_BORDER_PIXEL_BUDGET;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ElectricBorder = ({
  children,
  color = '#7df9ff',
  glowColor,
  speed = 1,
  chaos = 0.5,
  spread = 0.6,
  thickness = 1.5,
  strands = 3,
  glow = 0.6,
  fps = 60,
  intensity = 0.8,
  arcs = 1,
  flicker = 0.5,
  borderRadius = 24,
  offset = 0,
  active = true,
  intro = true,
  interactive = true,
  cursorRadius = 90,
  theme = 'dark',
  className = '',
  style,
}: ElectricBorderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLSpanElement>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const hasWebGL2 = useMemo(() => supportsWebGL2(), []);

  const buildSettings = (): ElectricBorderEngineSettings => {
    const base = parseCssSrgb01(color, [0.49, 0.98, 1]);
    return {
      core: [
        base[0] + (1 - base[0]) * 0.55,
        base[1] + (1 - base[1]) * 0.55,
        base[2] + (1 - base[2]) * 0.55,
      ],
      glowColor: glowColor ? parseCssSrgb01(glowColor, base) : base,
      speed: Math.max(0, speed),
      chaos: clamp(chaos, 0, 2),
      spread: clamp(spread, 0, 2),
      thickness: Math.max(0.25, thickness),
      strands: clamp(Math.round(strands), 1, 6),
      glow: clamp(glow, 0, 3),
      fps: clamp(Math.round(fps), 1, 60),
      intensity: Math.max(0, intensity),
      arcs: Math.max(0, arcs),
      flicker: clamp(flicker, 0, 1),
      borderRadius: Math.max(0, borderRadius),
      offset,
      active,
      intro,
      interactive,
      cursorRadius: Math.max(1, cursorRadius),
      light: theme === 'light',
      reduced:
        typeof window !== 'undefined'
          ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
          : false,
    };
  };

  const settingsRef = useRef<ElectricBorderEngineSettings>(buildSettings());
  settingsRef.current = buildSettings();

  useEffect(() => {
    syncRef.current?.();
  });

  useEffect(() => {
    if (!hasWebGL2) return undefined;
    const container = containerRef.current;
    const canvasHost = canvasHostRef.current;
    if (!container || !canvasHost) return undefined;

    const mountCanvas = () => {
      const c = document.createElement('canvas');
      c.className = 'pointer-events-none absolute -top-16 -left-16 z-[2] block';
      c.setAttribute('aria-hidden', 'true');
      canvasHost.appendChild(c);
      return c;
    };

    let activeCanvas = mountCanvas();
    let worker: Worker | null = null;
    let fallbackEngine: ElectricBorderEngine | null = null;
    let visible = true;

    const post = (msg: ElectricBorderWorkerMessage, transfer?: Transferable[]) => {
      if (worker) {
        if (transfer) worker.postMessage(msg, transfer);
        else worker.postMessage(msg);
      }
    };

    if (supportsOffscreenWebGL2()) {
      try {
        const offscreen = activeCanvas.transferControlToOffscreen();
        worker = new Worker(new URL('./workers/electricBorder.worker.ts', import.meta.url), {
          type: 'module',
        });
        post({ type: 'init', canvas: offscreen, settings: settingsRef.current }, [offscreen]);
      } catch {
        worker?.terminate();
        worker = null;
        activeCanvas.remove();
        activeCanvas = mountCanvas();
        fallbackEngine = createElectricBorderEngine(activeCanvas, settingsRef.current);
      }
    } else {
      fallbackEngine = createElectricBorderEngine(activeCanvas, settingsRef.current);
    }

    const rectCache = createElementRectCache(container);

    const resize = () => {
      rectCache.invalidate();
      const width = Math.max(1, container.offsetWidth);
      const height = Math.max(1, container.offsetHeight);
      const canvasWidth = width + MARGIN * 2;
      const canvasHeight = height + MARGIN * 2;
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        2,
        Math.sqrt(PIXEL_BUDGET / (canvasWidth * canvasHeight)),
      );
      const pixelWidth = Math.max(1, Math.round(canvasWidth * ratio));
      const pixelHeight = Math.max(1, Math.round(canvasHeight * ratio));
      activeCanvas.style.width = `${canvasWidth}px`;
      activeCanvas.style.height = `${canvasHeight}px`;
      if (worker) {
        post({ type: 'resize', width, height, pixelWidth, pixelHeight });
      } else {
        fallbackEngine?.resize(width, height, pixelWidth, pixelHeight);
      }
    };

    const locate = (event: PointerEvent) => {
      const rect = rectCache.get();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const over = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      const near =
        x >= -MARGIN / 2 &&
        y >= -MARGIN / 2 &&
        x <= rect.width + MARGIN / 2 &&
        y <= rect.height + MARGIN / 2;
      return { x, y, over, near };
    };

    const onPointerMove = (event: PointerEvent) => {
      const s = settingsRef.current;
      if (!visible || !s.interactive || !s.active) return;
      const { x, y, over, near } = locate(event);
      if (worker) post({ type: 'pointermove', x, y, over, near });
      else fallbackEngine?.pointerMove(x, y, over, near);
    };

    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current;
      if (!visible || !s.interactive || !s.active || s.reduced) return;
      const { x, y, over } = locate(event);
      if (!over) return;
      if (worker) post({ type: 'pointerdown', x, y, over });
      else fallbackEngine?.pointerDown(x, y, over);
    };

    const onLeave = () => {
      if (worker) post({ type: 'pointerleave' });
      else fallbackEngine?.pointerLeave();
    };

    const onVisibility = () => {
      const pageHidden = document.visibilityState === 'hidden';
      if (worker) post({ type: 'visibility', visible, pageHidden });
      else fallbackEngine?.setVisibility(visible, pageHidden);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        onVisibility();
      },
      { rootMargin: '80px' },
    );
    intersection.observe(container);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    syncRef.current = () => {
      if (worker) post({ type: 'settings', settings: settingsRef.current });
      else fallbackEngine?.updateSettings(settingsRef.current);
    };

    return () => {
      syncRef.current = null;
      rectCache.destroy();
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      if (worker) {
        post({ type: 'destroy' });
        worker.terminate();
        worker = null;
      } else {
        fallbackEngine?.destroy();
        fallbackEngine = null;
      }
      while (canvasHost.firstChild) canvasHost.removeChild(canvasHost.firstChild);
    };
  }, [hasWebGL2]);

  return (
    <div
      ref={containerRef}
      className={['relative overflow-visible isolate', className].filter(Boolean).join(' ')}
      style={{ borderRadius, ...style }}
    >
      <span ref={canvasHostRef} aria-hidden="true" className="contents" />
      {!hasWebGL2 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ boxShadow: `inset 0 0 0 ${thickness}px ${color}66` }}
        />
      )}
      <div className="relative z-[1] rounded-[inherit]">{children}</div>
    </div>
  );
};

export default ElectricBorder;

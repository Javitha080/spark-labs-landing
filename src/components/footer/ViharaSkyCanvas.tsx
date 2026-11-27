import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { ATMOSPHERE_PRESETS } from "./atmospherePhysics";
import {
  BIRD_STRIDE,
  LEAF_STRIDE,
  type PackedPhysicsFrame,
} from "./physicsWorkerBridge";
import type { QualityProfile } from "./viharaCapabilities";
import type { ViharaSkyControlsState } from "./viharaAssets";

interface ViharaSkyCanvasProps {
  profile: QualityProfile;
  isVisibleRef: MutableRefObject<boolean>;
  packedFrameRef: MutableRefObject<PackedPhysicsFrame>;
  controlsRef: MutableRefObject<ViharaSkyControlsState>;
  className?: string;
}

/**
 * Draws a finely articulated 2-segment woodblock bird (with splayed primary wingtip feathers)
 * from zero-GC packed Float32Array fields in both Day Parchment and Night Blueprint modes.
 */
function drawPackedBird(
  ctx: CanvasRenderingContext2D,
  buf: Float32Array,
  offset: number,
  stageW: number,
  stageH: number,
  revealAlpha: number,
  paperRgb: [number, number, number],
  darkMode: boolean,
) {
  const x = buf[offset];
  const y = buf[offset + 1];
  const dir = buf[offset + 2];
  const depth = buf[offset + 3];
  const scale = buf[offset + 4];
  const glideBlend = buf[offset + 5];
  const flapPhase = buf[offset + 6];
  const pitch = buf[offset + 7];
  const tailSpread = buf[offset + 8];

  const px = x * stageW;
  const py = y * stageH;
  const s = Math.max(4.2, stageW * 0.0145 * scale);

  const edgeFade =
    Math.min(1, Math.max(0, (x + 0.08) / 0.12)) *
    Math.min(1, Math.max(0, (1.08 - x) / 0.12));
  const alpha = edgeFade * revealAlpha * (0.56 + 0.44 * depth);
  if (alpha < 0.015) return;

  let inkStroke: string;
  let inkShade: string;
  let paperFill: string;

  if (darkMode) {
    // Warm etched parchment-ivory birds harmonized with YICDVP Ember-on-Carbon dark mode
    const strokeR = Math.round(148 + depth * 72);
    const strokeG = Math.round(138 + depth * 68);
    const strokeB = Math.round(124 + depth * 64);
    inkStroke = `rgba(${strokeR}, ${strokeG}, ${strokeB}, ${(alpha * 0.9).toFixed(3)})`;
    inkShade = `rgba(${Math.round(76 + depth * 42)}, ${Math.round(69 + depth * 38)}, ${Math.round(
      62 + depth * 34,
    )}, ${(alpha * 0.45).toFixed(3)})`;
    paperFill = `rgba(${Math.round(paperRgb[0] * 255)}, ${Math.round(
      paperRgb[1] * 255,
    )}, ${Math.round(paperRgb[2] * 255)}, ${(alpha * 0.94).toFixed(3)})`;
  } else {
    const inkR = Math.round(24 + (1 - depth) * 72);
    const inkG = Math.round(40 + (1 - depth) * 74);
    const inkB = Math.round(98 + (1 - depth) * 58);
    inkStroke = `rgba(${inkR}, ${inkG}, ${inkB}, ${alpha.toFixed(3)})`;
    inkShade = `rgba(${Math.min(240, inkR + 55)}, ${Math.min(230, inkG + 58)}, ${Math.min(
      215,
      inkB + 52,
    )}, ${(alpha * 0.44).toFixed(3)})`;
    paperFill = `rgba(${Math.round(paperRgb[0] * 255)}, ${Math.round(
      paperRgb[1] * 255,
    )}, ${Math.round(paperRgb[2] * 255)}, ${(alpha * 0.94).toFixed(3)})`;
  }

  const active = 1.0 - glideBlend;
  const innerFlap = Math.sin(flapPhase) * active + -0.18 * glideBlend;
  const outerFlap = Math.sin(flapPhase - 0.72) * active * 1.28 + -0.06 * glideBlend;
  const upstrokeFold = Math.max(0, -Math.sin(flapPhase)) * active;
  const bodyBob = -Math.sin(flapPhase) * active * s * 0.085;

  ctx.save();
  ctx.translate(px, py + bodyBob);
  ctx.scale(dir, 1);
  ctx.rotate(pitch);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const lw = Math.max(0.75, s * 0.068);

  const drawWing = (isFar: boolean) => {
    const scaleX = isFar ? 0.84 : 1.0;
    const scaleY = isFar ? 0.86 : 1.0;
    const offsetX = isFar ? s * 0.14 : -s * 0.04;
    const offsetY = isFar ? -s * 0.08 : -s * 0.02;

    const shoulderX = offsetX;
    const shoulderY = offsetY;
    const elbowX = shoulderX - s * (0.28 + upstrokeFold * 0.16) * scaleX;
    const elbowY = shoulderY + innerFlap * s * 0.62 * scaleY - (isFar ? s * 0.12 : 0);
    const tipX = elbowX - s * (0.64 - upstrokeFold * 0.22) * scaleX;
    const tipY = elbowY + outerFlap * s * 0.76 * scaleY - (isFar ? s * 0.08 : 0);

    const trailMidX = elbowX - s * 0.22 * scaleX;
    const trailMidY = elbowY + (innerFlap * 0.22 + 0.18) * s * scaleY;
    const rootBackX = shoulderX - s * 0.34;
    const rootBackY = shoulderY + s * 0.12;

    ctx.beginPath();
    ctx.moveTo(shoulderX + s * 0.12, shoulderY);
    ctx.quadraticCurveTo(elbowX + s * 0.1, elbowY - s * 0.08, tipX, tipY);
    ctx.quadraticCurveTo(trailMidX, trailMidY, rootBackX, rootBackY);
    ctx.closePath();

    ctx.fillStyle = isFar ? inkShade : paperFill;
    ctx.fill();
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = lw * (isFar ? 0.82 : 1.0);
    ctx.stroke();

    // Fine woodblock feather hatch lines + splayed primary wingtips
    ctx.beginPath();
    ctx.lineWidth = lw * 0.52;
    for (let f = 1; f <= 3; f++) {
      const t = f / 4;
      const fx = elbowX + (tipX - elbowX) * t;
      const fy = elbowY + (tipY - elbowY) * t;
      const bx = rootBackX + (trailMidX - rootBackX) * t;
      const by = rootBackY + (trailMidY - rootBackY) * t;
      ctx.moveTo(fx, fy);
      ctx.lineTo(bx, by);
    }
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - s * 0.11 * scaleX, tipY - s * 0.06 * scaleY);
    ctx.moveTo(tipX + s * 0.05 * scaleX, tipY + s * 0.04 * scaleY);
    ctx.lineTo(tipX - s * 0.08 * scaleX, tipY + s * 0.07 * scaleY);
    ctx.stroke();
  };

  drawWing(true);

  ctx.beginPath();
  ctx.moveTo(s * 0.78, -s * 0.06);
  ctx.quadraticCurveTo(s * 0.56, -s * 0.19, s * 0.34, -s * 0.08);
  ctx.quadraticCurveTo(-s * 0.12, -s * 0.14, -s * 0.68, -s * 0.03 - s * 0.08 * tailSpread);
  ctx.lineTo(-s * 0.78, s * 0.07 + s * 0.07 * tailSpread);
  ctx.quadraticCurveTo(-s * 0.08, s * 0.24, s * 0.44, s * 0.04);
  ctx.lineTo(s * 0.78, -s * 0.06);
  ctx.closePath();

  ctx.fillStyle = paperFill;
  ctx.fill();
  ctx.strokeStyle = inkStroke;
  ctx.lineWidth = lw;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(s * 0.42, s * 0.04);
  ctx.quadraticCurveTo(-s * 0.06, s * 0.19, -s * 0.56, s * 0.05);
  ctx.strokeStyle = inkStroke;
  ctx.lineWidth = lw * 1.12;
  ctx.stroke();

  drawWing(false);
  ctx.restore();
}

/**
 * Draws an aerodynamic tumbling woodblock leaf from packed Float32Array fields.
 */
function drawPackedLeaf(
  ctx: CanvasRenderingContext2D,
  buf: Float32Array,
  offset: number,
  stageW: number,
  stageH: number,
  revealAlpha: number,
  darkMode: boolean,
) {
  const x = buf[offset];
  const y = buf[offset + 1];
  const angle = buf[offset + 2];
  const rollPhase = buf[offset + 3];
  const size = buf[offset + 4];
  const life = buf[offset + 5];
  const maxLife = buf[offset + 6];
  const depth = buf[offset + 7];

  const fadeIn = Math.min(1, life / 0.6);
  const fadeOut = Math.min(1, (maxLife - life) / 1.2) * Math.min(1, (0.985 - y) / 0.07);
  const alpha = fadeIn * fadeOut * revealAlpha * (0.55 + 0.45 * depth);
  if (alpha < 0.02) return;

  const px = x * stageW;
  const py = y * stageH;
  const len = Math.max(4.5, stageW * 0.0068 * size);
  const wid = len * 0.44;
  const flipY = Math.cos(rollPhase);
  const scaleY = Math.sign(flipY || 1) * Math.max(0.24, Math.abs(flipY));

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.scale(1, scaleY);

  ctx.beginPath();
  ctx.moveTo(-len * 0.55, 0);
  ctx.quadraticCurveTo(0, -wid, len * 0.58, 0);
  ctx.quadraticCurveTo(0, wid, -len * 0.55, 0);
  ctx.closePath();

  if (darkMode) {
    ctx.fillStyle = `rgba(176, 160, 140, ${(alpha * 0.62).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(222, 208, 188, ${(alpha * 0.84).toFixed(3)})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-len * 0.42, 0);
    ctx.lineTo(len * 0.42, 0);
    ctx.strokeStyle = `rgba(248, 134, 46, ${(alpha * 0.56).toFixed(3)})`;
    ctx.lineWidth = 0.65;
    ctx.stroke();
  } else {
    ctx.fillStyle = `rgba(30, 47, 107, ${(alpha * 0.78).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(24, 37, 87, ${(alpha * 0.92).toFixed(3)})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-len * 0.42, 0);
    ctx.lineTo(len * 0.42, 0);
    ctx.strokeStyle = `rgba(246, 235, 216, ${(alpha * 0.55).toFixed(3)})`;
    ctx.lineWidth = 0.65;
    ctx.stroke();
  }

  ctx.restore();
}

export default function ViharaSkyCanvas({
  profile,
  isVisibleRef,
  packedFrameRef,
  controlsRef,
  className = "",
}: ViharaSkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const profileRef = useRef<QualityProfile>(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let cssW = 1280;
    let cssH = 900;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, profileRef.current.maxDpr);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(canvas);

    // Pre-allocated index buffer for zero-GC painter's depth sorting
    const sortOrder: number[] = [];
    let rafId = 0;
    let lastDraw = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (document.hidden || !isVisibleRef.current) return;

      const minFrameMs = 1000 / profileRef.current.targetFps;
      if (now - lastDraw < minFrameMs * 0.85) return;
      lastDraw = now;

      const ctrl = controlsRef.current;
      const frame = packedFrameRef.current;

      ctx.clearRect(0, 0, cssW, cssH);
      const revealAlpha = Math.min(1, Math.max(0, (ctrl.reveal - 0.08) / 0.45));
      if (revealAlpha <= 0.01) return;

      const preset = ATMOSPHERE_PRESETS[ctrl.presetId];
      const activePaperRgb = ctrl.darkMode ? preset.nightPaperRgb : preset.paperRgb;

      // 1. Draw aerodynamic falling & tumbling woodblock leaves
      if (ctrl.showLeaves && frame.leafCount > 0) {
        const lBuf = frame.leavesBuffer;
        for (let i = 0; i < frame.leafCount; i++) {
          drawPackedLeaf(ctx, lBuf, i * LEAF_STRIDE, cssW, cssH, revealAlpha, ctrl.darkMode);
        }
      }

      // 2. Draw articulated Strouhal flap-glide birds (painter's depth sorted, zero GC)
      if (ctrl.showBirds && frame.birdCount > 0) {
        const bBuf = frame.birdsBuffer;
        sortOrder.length = frame.birdCount;
        for (let i = 0; i < frame.birdCount; i++) sortOrder[i] = i;
        sortOrder.sort((ia, ib) => bBuf[ia * BIRD_STRIDE + 3] - bBuf[ib * BIRD_STRIDE + 3]);

        for (let i = 0; i < frame.birdCount; i++) {
          drawPackedBird(
            ctx,
            bBuf,
            sortOrder[i] * BIRD_STRIDE,
            cssW,
            cssH,
            revealAlpha,
            activePaperRgb,
            ctrl.darkMode,
          );
        }
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [controlsRef, isVisibleRef, packedFrameRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none block h-full w-full ${className}`}
    />
  );
}

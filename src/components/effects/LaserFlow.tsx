import { useEffect, useRef } from "react";

interface LaserFlowProps {
  color?: string;
  wispDensity?: number;
  flowSpeed?: number;
  verticalSizing?: number;
  horizontalSizing?: number;
  fogIntensity?: number;
  fogScale?: number;
  wispSpeed?: number;
  wispIntensity?: number;
  flowStrength?: number;
  decay?: number;
  horizontalBeamOffset?: number;
  verticalBeamOffset?: number;
  className?: string;
}

const LaserFlow = ({
  color = "#FF79C6",
  wispDensity = 1,
  flowSpeed = 0.35,
  verticalSizing = 2,
  horizontalSizing = 0.5,
  fogIntensity = 0.45,
  wispSpeed = 15,
  wispIntensity = 5,
  flowStrength = 0.25,
  verticalBeamOffset = -0.5,
  className = "",
}: LaserFlowProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
        : { r: 255, g: 121, b: 198 };
    };

    const rgb = hexToRgb(color);

    const animate = () => {
      // Guard against invalid canvas dimensions
      if (canvas.width <= 0 || canvas.height <= 0 || !isFinite(canvas.width) || !isFinite(canvas.height)) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      time += flowSpeed * 0.01;

      // Clear with fade effect
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + fogIntensity * 0.1})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const beamY = canvas.height * (0.5 + verticalBeamOffset * 0.5);
      const beamWidth = canvas.width * horizontalSizing * 0.3;

      // Guard against invalid calculations
      if (!isFinite(centerX) || !isFinite(beamY) || !isFinite(beamWidth) || beamWidth <= 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Draw main beam pillar
      const gradient = ctx.createLinearGradient(
        centerX - beamWidth,
        0,
        centerX + beamWidth,
        0
      );
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.05 + flowStrength * 0.1})`);
      gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.15 + flowStrength * 0.2})`);
      gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.05 + flowStrength * 0.1})`);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw vertical light pillars
      for (let i = 0; i < 3; i++) {
        const pillarX = centerX + (i - 1) * (beamWidth * 0.5);
        if (!isFinite(pillarX)) continue;

        const pillarGradient = ctx.createLinearGradient(pillarX, 0, pillarX, canvas.height);
        pillarGradient.addColorStop(0, "transparent");
        pillarGradient.addColorStop(0.2, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.03 * verticalSizing})`);
        pillarGradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.08 * verticalSizing})`);
        pillarGradient.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.03 * verticalSizing})`);
        pillarGradient.addColorStop(1, "transparent");

        ctx.fillStyle = pillarGradient;
        ctx.fillRect(pillarX - 2, 0, 4, canvas.height);
      }

      // Draw wisps
      const wispCount = Math.floor(wispDensity * 8);
      for (let i = 0; i < wispCount; i++) {
        const wispX = centerX + Math.sin(time * wispSpeed * 0.1 + i * 2) * beamWidth * 0.6;
        const wispY = (time * wispSpeed * 10 + i * (canvas.height / wispCount)) % canvas.height;
        const wispSize = 2 + Math.sin(time + i) * wispIntensity * 0.3;
        const wispRadius = wispSize * 10;

        // Guard against invalid wisp values
        if (!isFinite(wispX) || !isFinite(wispY) || !isFinite(wispRadius) || wispRadius <= 0) continue;

        const wispGradient = ctx.createRadialGradient(
          wispX,
          wispY,
          0,
          wispX,
          wispY,
          wispRadius
        );
        wispGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 * wispIntensity * 0.1})`);
        wispGradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.1 * wispIntensity * 0.1})`);
        wispGradient.addColorStop(1, "transparent");

        ctx.fillStyle = wispGradient;
        ctx.beginPath();
        ctx.arc(wispX, wispY, wispRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw glow at center
      const glowRadius = canvas.height * 0.5;
      if (isFinite(glowRadius) && glowRadius > 0) {
        const glowGradient = ctx.createRadialGradient(
          centerX,
          beamY,
          0,
          centerX,
          beamY,
          glowRadius
        );
        glowGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.1 + Math.sin(time * 2) * 0.05})`);
        glowGradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03)`);
        glowGradient.addColorStop(1, "transparent");

        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [color, wispDensity, flowSpeed, verticalSizing, horizontalSizing, fogIntensity, wispSpeed, wispIntensity, flowStrength, verticalBeamOffset]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ mixBlendMode: "screen" }}
    />
  );
};

export default LaserFlow;

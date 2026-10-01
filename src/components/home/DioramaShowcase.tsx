import { lazy, Suspense } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { supportsWebGLGlass } from "@/components/glass/LiquidGlassStage";

const TiltShiftDiorama = lazy(() => import("@/components/effects/TiltShiftDiorama"));
const LiquidGlassStage = lazy(() =>
  import("@/components/glass/LiquidGlassStage").then((m) => ({ default: m.LiquidGlassStage }))
);
const GlassPane = lazy(() =>
  import("@/components/glass/LiquidGlassStage").then((m) => ({ default: m.GlassPane }))
);

export default function DioramaShowcase() {
  if (prefersReducedMotion() || !supportsWebGLGlass() || window.innerWidth < 1024) return null;

  return (
    <section aria-label="Innovation campus diorama" className="relative mx-auto w-full max-w-6xl px-4 py-16">
      <Suspense fallback={<div className="min-h-[320px] rounded-3xl border border-border/40" />}>
        <LiquidGlassStage className="overflow-hidden rounded-3xl" rootMargin="400px">
          <Suspense fallback={null}>
            <TiltShiftDiorama className="h-[420px] w-full" animate />
          </Suspense>
          <GlassPane radius={20} className="glass-pane pointer-events-none absolute bottom-4 left-4 px-4 py-2">
            <p className="text-xs text-muted-foreground">Live miniature: workshop, solar array, delivery bots</p>
          </GlassPane>
        </LiquidGlassStage>
      </Suspense>
    </section>
  );
}

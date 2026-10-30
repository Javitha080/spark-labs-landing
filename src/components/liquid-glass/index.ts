/**
 * Canonical liquid glass module - the single entry point for @ybouane/liquidglass.
 *
 * Everything glass goes through one of three real surfaces:
 *   - <LiquidGlassStage> + <GlassPane>   - WebGL stage for a contained scene
 *     (the diorama, a video). Backgrounds live as sibling children of the
 *     stage; panes must be DIRECT children. One WebGL context per stage,
 *     opened only while the stage is near the viewport.
 *   - <LiquidGlassProvider>              - drop-in wrapper for Hero/Footer/
 *     video players; scans its direct children for [data-liquid-glass].
 *   - <GlassSurface>                     - honest CSS surface for things that
 *     cannot be a pane (draggable windows, flip cards, admin chrome).
 *
 * Presets are the official demo's own configs (liquid-glass.ybouane.com):
 * Regular Glass { cornerRadius: 40, blurAmount: 0 } and Frosted Glass
 * { cornerRadius: 40, blurAmount: 0.5 }.
 */
export { LiquidGlassStage, GlassPane } from "@/components/glass/LiquidGlassStage";
export type {
  LiquidGlassStageHandle,
  LiquidGlassStageProps,
  GlassPaneProps,
} from "@/components/glass/LiquidGlassStage";
export * from "./presets";

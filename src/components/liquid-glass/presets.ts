import type { GlassConfig } from "@ybouane/liquidglass";

/**
 * Glass presets lifted from the official demo (liquid-glass.ybouane.com /
 * ybouane/liquidglass), which render every panel through the library's
 * DEFAULTS from src/defaults.ts:
 *
 *   blurAmount: 0, refraction: 0.69, chromAberration: 0.05,
 *   edgeHighlight: 0.05, fresnel: 1, cornerRadius: 65, zRadius: 40,
 *   opacity: 1, shadowOpacity: 0.3, shadowSpread: 10, shadowOffsetY: 1
 *
 * Demo scripts (site/index.html):
 *   #glass-fp1 "Regular Glass"  → { cornerRadius: 40, blurAmount: 0 }
 *   #glass-fp2 "Frosted Glass"  → { cornerRadius: 40, blurAmount: 0.5 }
 *   "Frosted Panel" section     → { blurAmount: 0.25, cornerRadius: 30 }
 *   "Button Mode" section       → { button: true, cornerRadius: 24 }
 *   "Dark Glass" section        → { brightness: -0.3, blurAmount: 0.25, cornerRadius: 50 }
 */

/** Sharp refracting glass - the demo's "Regular Glass". */
export const REGULAR_GLASS: Partial<GlassConfig> = {
  cornerRadius: 40,
  blurAmount: 0,
};

/** Heavy-blur glass - the demo's "Frosted Glass". */
export const FROSTED_GLASS: Partial<GlassConfig> = {
  cornerRadius: 40,
  blurAmount: 0.5,
};

/** Softer frosted variant - the demo's "Frosted Panel" preview strip. */
export const FROSTED_SOFT_GLASS: Partial<GlassConfig> = {
  blurAmount: 0.25,
  cornerRadius: 30,
};

/** Interactive control that brightens on hover and deepens on press. */
export const BUTTON_GLASS: Partial<GlassConfig> = {
  button: true,
  cornerRadius: 24,
};

/** Dimmed frosted panel for light-on-bright media - the demo's "Dark Glass". */
export const DARK_GLASS: Partial<GlassConfig> = {
  brightness: -0.3,
  blurAmount: 0.25,
  cornerRadius: 50,
};

export type GlassPreset =
  | "regular"
  | "frosted"
  | "frosted-soft"
  | "button"
  | "dark";

export const PRESETS: Record<GlassPreset, Partial<GlassConfig>> = {
  regular: REGULAR_GLASS,
  frosted: FROSTED_GLASS,
  "frosted-soft": FROSTED_SOFT_GLASS,
  button: BUTTON_GLASS,
  dark: DARK_GLASS,
};

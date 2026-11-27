/**
 * Static asset paths & shared state contracts for the YICDVP Vihara v3 Footer.
 * Kept strictly free of Three.js imports so importing asset URLs or types
 * in Footer.tsx never pulls `vendor-three` into eager page bundles.
 */

import type { AtmospherePresetId } from "./atmospherePhysics";

export const VIHARA_ASSETS = {
  plate: "/assets/vihara-pavilion-fulltrees.webp",
  cloud1: "/assets/vihara-cloud-1.webp",
  cloud2: "/assets/vihara-cloud-2.webp",
  cloudCirrus: "/assets/vihara-cloud-cirrus.webp",
  dharmaWheel: "/assets/vihara-dharma-wheel.png",
} as const;

export type ViharaAssetKey = keyof typeof VIHARA_ASSETS;

export interface ViharaWebGLEngineState {
  reveal: number;
  timeScale: number;
  paused: boolean;
  windStrength: number;
  parallaxStrength: number;
  wheelSpin: boolean;
  darkMode: boolean;
  showMotes: boolean;
  presetId: AtmospherePresetId;
  targetMouseX: number;
  targetMouseY: number;
}

export interface ViharaSkyStageState {
  reveal: number;
  darkMode: boolean;
  targetMouseX: number;
  targetMouseY: number;
}

export interface ViharaSkyControlsState {
  showBirds: boolean;
  showLeaves: boolean;
  presetId: AtmospherePresetId;
  darkMode: boolean;
  reveal: number;
}

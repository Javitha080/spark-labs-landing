/**
 * Real-World Spatially-Resolved Atmospheric Boundary-Layer & 6-Body Structural Wind Physics
 *
 * Upgraded from Vihara v3 with YICDVP Dual-Theme (Day Parchment + Night Blueprint) palettes:
 *  - Traveling atmospheric gust fronts sweeping West -> East across the full grove
 *    (so the left canopy bends first, followed ~0.35s later by the left palm, then
 *    the right palm, and finally the right canopy — just like real wind in nature)
 *  - 6 independent 2nd-order damped harmonic oscillators with distinct structural mass & stiffness:
 *      1. Left Canopy Tree   (heavy broad timber, wn=1.32 rad/s, zeta=0.26)
 *      2. Left Palm Crown    (long whippy arched fronds, wn=2.15 rad/s, zeta=0.19)
 *      3. Right Palm Crown   (slightly shorter/stiffer fronds, wn=2.34 rad/s, zeta=0.21)
 *      4. Right Canopy Tree  (dense flanking boughs, wn=1.44 rad/s, zeta=0.28)
 *      5. Courtyard Hedges   (stiff woody shrubs, wn=3.65 rad/s, zeta=0.36)
 *      6. Leaf Vortex Flutter (high-frequency turbulent shedding, wn=5.40 rad/s, zeta=0.32)
 *  - Interactive Breeze Brush (applyPointerImpulse) + Triggerable Rolling Gust Waves (triggerGust)
 */

import { fbm1D } from "./viharaCapabilities";

export type AtmospherePresetId = "morning" | "golden" | "monsoon";

export interface AtmospherePreset {
  id: AtmospherePresetId;
  label: string;
  tagline: string;
  // Day Parchment palette
  zenithHex: string;
  horizonHex: string;
  paperHex: string;
  paperRgb: [number, number, number];
  sunRgb: [number, number, number];
  sunbeamIntensity: number;
  hazeStrength: number;
  // Native YICDVP Night Blueprint palette (exact #0B1426 default base in morning)
  nightZenithHex: string;
  nightHorizonHex: string;
  nightPaperHex: string;
  nightPaperRgb: [number, number, number];
  nightSunRgb: [number, number, number];
  nightMoonbeamIntensity: number;
  defaultWind: number;
  cloudOpacityScale: number;
}

export const ATMOSPHERE_PRESETS: Record<AtmospherePresetId, AtmospherePreset> = {
  morning: {
    id: "morning",
    label: "Morning Mist",
    tagline: "Crisp ivory parchment sky with serene diagonal dawn rays",
    zenithHex: "#EDE2CE",
    horizonHex: "#F4E8D3",
    paperHex: "#F6EBD8",
    paperRgb: [246 / 255, 235 / 255, 216 / 255],
    sunRgb: [1.0, 0.96, 0.86],
    sunbeamIntensity: 0.72,
    hazeStrength: 0.52,
    // Native YICDVP Ember-on-Carbon Dark Mode (blends seamlessly with --background: #080808)
    nightZenithHex: "#080808",
    nightHorizonHex: "#110F0D",
    nightPaperHex: "#0A0908",
    nightPaperRgb: [10 / 255, 9 / 255, 8 / 255],
    nightSunRgb: [0.95, 0.82, 0.64],
    nightMoonbeamIntensity: 0.52,
    defaultWind: 1.0,
    cloudOpacityScale: 1.0,
  },
  golden: {
    id: "golden",
    label: "Golden Dusk",
    tagline: "Warm honeyed Rayleigh scattering & long amber sunbeams",
    zenithHex: "#E8D3B0",
    horizonHex: "#F5DEB8",
    paperHex: "#F4E4C8",
    paperRgb: [244 / 255, 228 / 255, 200 / 255],
    sunRgb: [1.0, 0.86, 0.62],
    sunbeamIntensity: 1.15,
    hazeStrength: 0.74,
    nightZenithHex: "#080808",
    nightHorizonHex: "#18100A",
    nightPaperHex: "#0D0A08",
    nightPaperRgb: [13 / 255, 10 / 255, 8 / 255],
    nightSunRgb: [0.98, 0.56, 0.22],
    nightMoonbeamIntensity: 0.78,
    defaultWind: 0.85,
    cloudOpacityScale: 1.1,
  },
  monsoon: {
    id: "monsoon",
    label: "Monsoon Breeze",
    tagline: "Cool highland mist, swift rolling gusts & drifting leaves",
    zenithHex: "#DCE2EC",
    horizonHex: "#EAE7DF",
    paperHex: "#EFEAE0",
    paperRgb: [239 / 255, 234 / 255, 224 / 255],
    sunRgb: [0.95, 0.97, 1.0],
    sunbeamIntensity: 0.35,
    hazeStrength: 0.92,
    nightZenithHex: "#080808",
    nightHorizonHex: "#101216",
    nightPaperHex: "#0A0B0D",
    nightPaperRgb: [10 / 255, 11 / 255, 13 / 255],
    nightSunRgb: [0.76, 0.83, 0.94],
    nightMoonbeamIntensity: 0.44,
    defaultWind: 1.55,
    cloudOpacityScale: 1.32,
  },
};

export interface AtmosphericWindSnapshot {
  /** Ambient boundary-layer wind speed (m/s-equivalent) */
  windSpeed: number;
  /** Instantaneous gust surge factor (0..2.2) */
  gustIntensity: number;
  /** 6 independent structural body bend states */
  leftTreeBend: number;
  leftPalmBend: number;
  rightPalmBend: number;
  rightTreeBend: number;
  hedgeRustle: number;
  leafFlutter: number;
  /** Back-compat aggregates */
  palmBend: number;
  canopySway: number;
  /** Monotonically integrated upper-air cloud advection distance */
  cloudAdvection: number;
  /** Simulation clock in seconds */
  simTime: number;
}

interface OscillatorState {
  pos: number;
  vel: number;
}

interface GustWave {
  startTime: number;
  strength: number;
}

export class AtmospherePhysicsEngine {
  private simTime = 0;
  private cloudAdvection = 0;

  private leftTree: OscillatorState = { pos: 0, vel: 0 };
  private leftPalm: OscillatorState = { pos: 0, vel: 0 };
  private rightPalm: OscillatorState = { pos: 0, vel: 0 };
  private rightTree: OscillatorState = { pos: 0, vel: 0 };
  private hedge: OscillatorState = { pos: 0, vel: 0 };
  private flutter: OscillatorState = { pos: 0, vel: 0 };

  private gustWaves: GustWave[] = [];

  public snapshot: AtmosphericWindSnapshot = {
    windSpeed: 1.4,
    gustIntensity: 0.35,
    leftTreeBend: 0,
    leftPalmBend: 0,
    rightPalmBend: 0,
    rightTreeBend: 0,
    hedgeRustle: 0,
    leafFlutter: 0,
    palmBend: 0,
    canopySway: 0,
    cloudAdvection: 0,
    simTime: 0,
  };

  /** Launch a real physical traveling wind gust sweeping West -> East across the grove */
  public triggerGust(strength = 1.75) {
    this.gustWaves.push({
      startTime: this.simTime,
      strength,
    });
    if (this.gustWaves.length > 4) this.gustWaves.shift();
  }

  /**
   * Interactive Breeze Brush: moving the pointer or finger across a specific palm or tree
   * imparts real physical momentum (impulse) to that exact tree's spring-mass oscillator.
   */
  public applyPointerImpulse(uNorm: number, vNorm: number, velocityX: number) {
    const impulse = Math.max(-1.6, Math.min(1.6, velocityX * 0.085));
    if (Math.abs(impulse) < 0.01) return;

    if (uNorm < 0.27 && vNorm < 0.65) {
      this.leftTree.vel += impulse * 1.4;
      this.flutter.vel += impulse * 2.2;
    }
    if (uNorm > 0.23 && uNorm < 0.43 && vNorm > 0.28 && vNorm < 0.72) {
      this.leftPalm.vel += impulse * 2.4;
      this.flutter.vel += impulse * 1.8;
    }
    if (uNorm > 0.6 && uNorm < 0.85 && vNorm > 0.28 && vNorm < 0.7) {
      this.rightPalm.vel += impulse * 2.4;
      this.flutter.vel += impulse * 1.8;
    }
    if (uNorm > 0.78 && vNorm < 0.8) {
      this.rightTree.vel += impulse * 1.4;
      this.flutter.vel += impulse * 2.2;
    }
    if (vNorm > 0.75) {
      this.hedge.vel += impulse * 1.9;
    }
  }

  private integrate(osc: OscillatorState, force: number, wn: number, zeta: number, dt: number) {
    const accel = force * wn * wn - 2.0 * zeta * wn * osc.vel - wn * wn * osc.pos;
    osc.vel += accel * dt;
    osc.pos += osc.vel * dt;
  }

  /** Sample wind velocity at horizontal stage coordinate xNorm (0=west -> 1=east) */
  private sampleSpatialWind(t: number, xNorm: number, windMultiplier: number): number {
    // Traveling atmospheric phase delay: gusts propagate West -> East (~1.45s across stage)
    const delayedT = t - xNorm * 1.45;
    const macro = fbm1D(delayedT * 0.13);
    const naturalGust = Math.pow(Math.max(0, Math.sin(delayedT * 0.44 + macro * 3.2)), 2.5);
    const eddy = (fbm1D(delayedT * 0.72 + 4.3 + xNorm * 1.9) - 0.5) * 0.55;

    // Add any user-triggered sweeping Gaussian gust waves
    let waveSurge = 0;
    for (let i = 0; i < this.gustWaves.length; i++) {
      const gw = this.gustWaves[i];
      const age = t - gw.startTime;
      const frontX = age * 0.68 - 0.15;
      const dist = xNorm - frontX;
      waveSurge += Math.exp(-(dist * dist) / 0.085) * gw.strength;
    }

    return Math.max(0.12, (0.58 + macro * 0.62 + naturalGust * 1.12 + eddy) * windMultiplier + waveSurge);
  }

  public step(dt: number, windMultiplier: number): AtmosphericWindSnapshot {
    if (dt <= 0) return this.snapshot;

    const clampedDt = Math.min(dt, 0.05);
    const subSteps = 2;
    const h = clampedDt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.simTime += h;
      const t = this.simTime;

      if (this.gustWaves.length > 0 && t - this.gustWaves[0].startTime > 4.5) {
        this.gustWaves.shift();
      }

      const wLeftTree = this.sampleSpatialWind(t, 0.12, windMultiplier);
      const wLeftPalm = this.sampleSpatialWind(t, 0.34, windMultiplier);
      const wRightPalm = this.sampleSpatialWind(t, 0.72, windMultiplier);
      const wRightTree = this.sampleSpatialWind(t, 0.9, windMultiplier);
      const wCenter = this.sampleSpatialWind(t, 0.5, windMultiplier);

      // Aerodynamic drag force ~ v^1.42 (real flexible foliage reconfiguration law / Vogel exponent)
      const toDrag = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 1.42) * 0.52;
      const vortex = (phase: number, v: number) => Math.sin(t * 4.8 + phase) * v * 0.32;

      this.integrate(this.leftTree, toDrag(wLeftTree), 1.32, 0.26, h);
      this.integrate(this.leftPalm, toDrag(wLeftPalm) + vortex(0.4, wLeftPalm) * 0.38, 2.15, 0.19, h);
      this.integrate(this.rightPalm, toDrag(wRightPalm) + vortex(2.1, wRightPalm) * 0.38, 2.34, 0.21, h);
      this.integrate(this.rightTree, toDrag(wRightTree), 1.44, 0.28, h);
      this.integrate(this.hedge, toDrag(wCenter) * 0.7 + vortex(1.3, wCenter) * 0.45, 3.65, 0.36, h);
      this.integrate(this.flutter, vortex(0.0, wCenter) * 1.4, 5.4, 0.32, h);

      this.cloudAdvection += (0.42 + wCenter * 0.38) * h;

      this.snapshot = {
        windSpeed: wCenter * 1.85,
        gustIntensity: Math.max(0, wCenter - 0.55),
        leftTreeBend: this.leftTree.pos,
        leftPalmBend: this.leftPalm.pos,
        rightPalmBend: this.rightPalm.pos,
        rightTreeBend: this.rightTree.pos,
        hedgeRustle: this.hedge.pos,
        leafFlutter: this.flutter.pos,
        palmBend: (this.leftPalm.pos + this.rightPalm.pos) * 0.5,
        canopySway: (this.leftTree.pos + this.rightTree.pos) * 0.5,
        cloudAdvection: this.cloudAdvection,
        simTime: this.simTime,
      };
    }

    return this.snapshot;
  }
}

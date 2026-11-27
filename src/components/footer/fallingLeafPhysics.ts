/**
 * Real-World Aerodynamic Falling Leaf Physics Engine (Vihara v3)
 *
 * Simulates delicate woodblock leaves detaching from the swaying left & right uncropped tree
 * crowns during wind gusts and descending with realistic leaf-flutter aerodynamics:
 *   - Gravity balanced by anisotropic angle-of-attack aerodynamic lift & drag
 *   - Coupled pendulum-flutter rocking oscillation (classic falling-leaf side-to-side glide)
 *   - Tumble transitions when caught in strong gust surges
 *   - Gentle 3D flip foreshortening (scaleY = cos(rollPhase))
 */

import type { AtmosphericWindSnapshot } from "./atmospherePhysics";

export interface FallingLeaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angVel: number;
  rollPhase: number;
  rollFreq: number;
  size: number;
  life: number;
  maxLife: number;
  depth: number;
  seed: number;
}

export class FallingLeafPhysics {
  public leaves: FallingLeaf[] = [];
  private spawnCooldown = 0.6;
  private rngState = 9187;

  private rand(): number {
    this.rngState = (this.rngState * 16807) % 2147483647;
    return (this.rngState - 1) / 2147483646;
  }

  private spawnLeaf(groveTopNorm: number, wind: AtmosphericWindSnapshot, maxLeaves: number) {
    if (this.leaves.length >= maxLeaves) return;

    const fromLeft = this.rand() < 0.62;
    const x = fromLeft ? 0.03 + this.rand() * 0.21 : 0.8 + this.rand() * 0.17;
    const groveH = 1.0 - groveTopNorm;
    const y = groveTopNorm + (0.06 + this.rand() * 0.36) * groveH;

    this.leaves.push({
      x,
      y,
      vx: 0.015 + wind.windSpeed * 0.008 + (this.rand() - 0.3) * 0.015,
      vy: 0.018 + this.rand() * 0.014,
      angle: (this.rand() - 0.5) * 1.4,
      angVel: (this.rand() - 0.5) * 1.8,
      rollPhase: this.rand() * Math.PI * 2,
      rollFreq: 1.8 + this.rand() * 2.2,
      size: 0.72 + this.rand() * 0.58,
      life: 0,
      maxLife: 6.5 + this.rand() * 5.0,
      depth: 0.55 + this.rand() * 0.45,
      seed: this.rand() * 100,
    });
  }

  public step(
    dt: number,
    wind: AtmosphericWindSnapshot,
    groveTopNorm: number,
    windStrength: number,
    maxLeaves = 16,
  ) {
    if (dt <= 0) return;
    const h = Math.min(dt, 0.05);

    this.spawnCooldown -= h * (0.45 + wind.gustIntensity * 1.35 + windStrength * 0.45);
    if (this.spawnCooldown <= 0 && windStrength > 0.15 && maxLeaves > 0) {
      this.spawnLeaf(groveTopNorm, wind, maxLeaves);
      this.spawnCooldown = 1.2 + this.rand() * 2.2;
    }

    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i];
      l.life += h;

      const airVx =
        (0.016 + wind.windSpeed * 0.011) * (0.65 + 0.35 * Math.sin(wind.simTime * 1.2 + l.seed));
      const airVy = Math.sin(wind.simTime * 1.7 + l.x * 11.0 + l.seed) * 0.012;

      const relVx = l.vx - airVx;
      const relVy = l.vy - airVy;

      const flutterTorque =
        -Math.sin(l.angle * 1.8) * 3.6 +
        Math.sin(wind.simTime * 2.8 + l.seed) * 1.4 * (0.5 + wind.gustIntensity);
      l.angVel += (flutterTorque - l.angVel * 2.1) * h;
      l.angle += l.angVel * h;
      l.rollPhase += l.rollFreq * (0.7 + 0.4 * wind.gustIntensity) * h;

      const gravity = 0.052;
      const flatArea = Math.abs(Math.cos(l.angle));
      const dragY = relVy * (2.6 + flatArea * 3.8);
      const dragX = relVx * (1.8 + (1 - flatArea) * 2.5);
      const flutterSlipX = Math.sin(l.angle) * 0.042;

      l.vx += (-dragX + flutterSlipX) * h;
      l.vy += (gravity - dragY) * h;

      l.x += l.vx * h;
      l.y += l.vy * h;

      if (l.life >= l.maxLife || l.y > 0.985 || l.x > 1.08 || l.x < -0.08) {
        this.leaves.splice(i, 1);
      }
    }
  }
}

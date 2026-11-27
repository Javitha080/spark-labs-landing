/**
 * Real-World Avian Flock Aerodynamics & Intermittent Flap-Glide Boids Engine (Vihara v3)
 *
 * Implements physical bird flight mechanics calibrated to the spacious high sky corridor:
 *  - Reynolds Flocking Forces (Separation, Velocity Alignment, Cohesion)
 *  - Intermittent Flap-Glide Gait (real wild birds alternate 1.2-2.6s powered wingbeats
 *    with 1.8-4.4s outstretched soaring glides, transitioning via Strouhal lift dynamics)
 *  - Atmospheric Thermal Updrafts & Headwind/Tailwind Advection synced to AtmospherePhysicsEngine
 *  - Two Altitude Flocks strictly cruising inside the open sky corridor ABOVE the uncropped
 *    tree crowns (foreground eastbound flock + distant high-altitude westbound flock)
 *  - Gentle Pointer Thermal Deflection (approaching cursor makes nearby birds gracefully veer upward)
 */

import type { AtmosphericWindSnapshot } from "./atmospherePhysics";

export type FlightGait = "flapping" | "gliding";

export interface BirdAgent {
  id: number;
  flockId: 0 | 1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  depth: number;
  scale: number;
  dir: 1 | -1;
  cruiseY: number;
  cruiseSpeed: number;
  gait: FlightGait;
  gaitTimer: number;
  glideBlend: number;
  flapPhase: number;
  flapFreq: number;
  pitch: number;
  tailSpread: number;
  seed: number;
}

export class AvianFlockPhysics {
  public birds: BirdAgent[] = [];
  private thermalPhase = 0;

  constructor() {
    this.initFlocks();
  }

  private initFlocks() {
    let rng = 7331;
    const rand = () => {
      rng = (rng * 16807) % 2147483647;
      return (rng - 1) / 2147483646;
    };

    const list: BirdAgent[] = [];

    // Flock 0: 8 Eastbound (L -> R) medium-near sky birds cruising cleanly in mid-open sky (21%..33%)
    for (let i = 0; i < 8; i++) {
      const depth = 0.62 + rand() * 0.34;
      const cruiseSpeed = (0.042 + 0.025 * depth) * (0.94 + rand() * 0.12);
      list.push({
        id: i + 1,
        flockId: 0,
        x: 0.08 + i * 0.038 + (rand() - 0.5) * 0.022,
        y: 0.23 + (i % 3) * 0.032 + (rand() - 0.5) * 0.018,
        vx: cruiseSpeed,
        vy: (rand() - 0.5) * 0.004,
        depth,
        scale: 0.72 + depth * 0.44,
        dir: 1,
        cruiseY: 0.215 + rand() * 0.115,
        cruiseSpeed,
        gait: i % 3 === 0 ? "gliding" : "flapping",
        gaitTimer: 0.9 + rand() * 2.2,
        glideBlend: i % 3 === 0 ? 1 : 0,
        flapPhase: rand() * Math.PI * 2,
        flapFreq: (2.45 + (1 - depth) * 0.75 + rand() * 0.25) * Math.PI * 2,
        pitch: 0,
        tailSpread: 0.3,
        seed: rand() * 100,
      });
    }

    // Flock 1: 5 Westbound (R -> L) high-altitude distant soaring birds (10.5%..20% upper sky)
    for (let i = 0; i < 5; i++) {
      const depth = 0.28 + rand() * 0.22;
      const cruiseSpeed = (0.026 + 0.018 * depth) * (0.92 + rand() * 0.14);
      list.push({
        id: 100 + i,
        flockId: 1,
        x: 0.58 + i * 0.044 + (rand() - 0.5) * 0.02,
        y: 0.11 + (i % 3) * 0.028 + (rand() - 0.5) * 0.014,
        vx: -cruiseSpeed,
        vy: (rand() - 0.5) * 0.003,
        depth,
        scale: 0.54 + depth * 0.34,
        dir: -1,
        cruiseY: 0.105 + rand() * 0.095,
        cruiseSpeed,
        gait: i % 2 === 0 ? "gliding" : "flapping",
        gaitTimer: 1.5 + rand() * 2.8,
        glideBlend: i % 2 === 0 ? 1 : 0,
        flapPhase: rand() * Math.PI * 2,
        flapFreq: (2.3 + rand() * 0.45) * Math.PI * 2,
        pitch: 0,
        tailSpread: 0.45,
        seed: rand() * 100,
      });
    }

    this.birds = list;
  }

  public step(
    dt: number,
    wind: AtmosphericWindSnapshot,
    skyBottomNorm: number,
    pointerXNorm: number | null,
    pointerYNorm: number | null,
  ) {
    if (dt <= 0) return;
    const h = Math.min(dt, 0.05);
    this.thermalPhase += h;

    const minY = 0.045;
    const maxY = Math.max(0.24, skyBottomNorm - 0.03);

    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];

      let sepX = 0;
      let sepY = 0;
      let aliX = 0;
      let aliY = 0;
      let cohX = 0;
      let cohY = 0;
      let neighbors = 0;

      for (let j = 0; j < this.birds.length; j++) {
        if (i === j) continue;
        const other = this.birds[j];
        if (other.flockId !== b.flockId) continue;

        const dx = other.x - b.x;
        const dy = other.y - b.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 0.032 && distSq > 0.000001) {
          const dist = Math.sqrt(distSq);
          const minSep = 0.042 * (0.7 + 0.4 * b.depth);
          if (dist < minSep) {
            const push = ((minSep - dist) / minSep) * 0.055;
            sepX -= (dx / dist) * push;
            sepY -= (dy / dist) * push;
          }
          aliX += other.vx;
          aliY += other.vy;
          cohX += other.x;
          cohY += other.y;
          neighbors++;
        }
      }

      let ax = sepX;
      let ay = sepY;
      if (neighbors > 0) {
        ax += (aliX / neighbors - b.vx) * 0.45 + (cohX / neighbors - b.x) * 0.035;
        ay += (aliY / neighbors - b.vy) * 0.55 + (cohY / neighbors - b.y) * 0.048;
      }

      const thermalUpdraft =
        Math.sin(b.x * 7.5 - this.thermalPhase * 0.35 + b.seed * 0.2) *
        Math.cos(b.y * 9.0 + this.thermalPhase * 0.22) *
        0.0085;

      b.gaitTimer -= h;
      const targetAltitude = Math.min(
        maxY - 0.025,
        Math.max(minY + 0.02, b.cruiseY + Math.sin(this.thermalPhase * 0.32 + b.seed) * 0.03),
      );
      const altError = targetAltitude - b.y;

      if (b.gaitTimer <= 0) {
        if (b.gait === "flapping") {
          b.gait = "gliding";
          b.gaitTimer = 1.9 + (Math.sin(b.seed + this.thermalPhase * 1.7) * 0.5 + 0.5) * 2.5;
        } else {
          b.gait = "flapping";
          b.gaitTimer = 1.15 + (Math.cos(b.seed * 1.3 + this.thermalPhase) * 0.5 + 0.5) * 1.35;
        }
      } else if (b.gait === "gliding" && altError < -0.042) {
        b.gait = "flapping";
        b.gaitTimer = 1.35;
      }

      const targetGlide = b.gait === "gliding" ? 1 : 0;
      b.glideBlend += (targetGlide - b.glideBlend) * Math.min(1, h * 4.2);

      const flapActive = 1 - b.glideBlend;
      const climbBoost = altError < 0 ? 1.14 : 0.94;
      b.flapPhase += b.flapFreq * climbBoost * (0.25 + 0.75 * flapActive) * h;

      const strokeLift = Math.sin(b.flapPhase) * flapActive;
      const windAdv = (wind.windSpeed - 1.2) * 0.005 * (0.4 + 0.6 * b.depth);
      const desiredVx =
        b.dir * b.cruiseSpeed + windAdv * 0.45 + Math.max(0, strokeLift) * 0.007 * b.dir;

      ax += (desiredVx - b.vx) * 1.35;
      ay +=
        altError * 0.16 +
        (-0.0085 - strokeLift * 0.015) * flapActive +
        0.0042 * b.glideBlend -
        thermalUpdraft;

      if (b.y < minY) ay += (minY - b.y) * 1.8;
      if (b.y > maxY) ay -= (b.y - maxY) * 2.2;

      if (pointerXNorm !== null && pointerYNorm !== null && pointerYNorm < skyBottomNorm + 0.05) {
        const pdx = b.x - pointerXNorm;
        const pdy = b.y - pointerYNorm;
        const pDistSq = pdx * pdx + pdy * pdy;
        if (pDistSq < 0.016 && pDistSq > 0.00001) {
          const pDist = Math.sqrt(pDistSq);
          const deflect = ((0.126 - pDist) / 0.126) * 0.045;
          ax += (pdx / pDist) * deflect * 0.6;
          ay += (pdy / pDist) * deflect - 0.018 * deflect;
          if (b.gait === "gliding") {
            b.gait = "flapping";
            b.gaitTimer = 0.9;
          }
        }
      }

      b.vx += ax * h;
      b.vy += ay * h;

      const minVx = b.cruiseSpeed * 0.62;
      const maxVx = b.cruiseSpeed * 1.55;
      if (b.dir === 1) {
        b.vx = Math.max(minVx, Math.min(maxVx, b.vx));
      } else {
        b.vx = Math.min(-minVx, Math.max(-maxVx, b.vx));
      }
      b.vy = Math.max(-0.045, Math.min(0.045, b.vy));

      b.x += b.vx * h;
      b.y += b.vy * h;

      if (b.dir === 1 && b.x > 1.14) {
        b.x = -0.14 - (b.id % 4) * 0.02;
        b.y = Math.min(maxY - 0.04, Math.max(minY + 0.03, b.cruiseY));
        b.vy = -0.004;
      } else if (b.dir === -1 && b.x < -0.14) {
        b.x = 1.14 + (b.id % 3) * 0.025;
        b.y = Math.min(maxY - 0.05, Math.max(minY + 0.02, b.cruiseY));
        b.vy = 0.002;
      }

      const targetPitch = Math.atan2(b.vy, Math.abs(b.vx)) * 0.72;
      b.pitch += (targetPitch - b.pitch) * Math.min(1, h * 6.0);

      const targetTail = 0.25 + b.glideBlend * 0.55 + Math.abs(b.vy) * 4.0;
      b.tailSpread += (targetTail - b.tailSpread) * Math.min(1, h * 5.0);
    }
  }
}

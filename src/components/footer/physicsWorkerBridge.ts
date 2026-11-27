/**
 * Inline Blob Web Worker Physics Bridge with Automatic Main-Thread Fallback (Vihara v3)
 *
 * Offloads 6-body wind spring-mass ODEs, Strouhal flap-glide Boids, and aerodynamic falling
 * leaves onto a dedicated background thread using transferable Float32Array binary buffers
 * (zero main-thread garbage churn).
 *
 * Compatible with YICDVP's strict CSP (`worker-src 'self' blob:`) in Vite dev, Cloudflare
 * Workers production builds, and jsdom tests (falls back transparently to main-thread sync).
 */

import { AtmospherePhysicsEngine, type AtmosphericWindSnapshot } from "./atmospherePhysics";
import { AvianFlockPhysics, type BirdAgent } from "./avianFlockPhysics";
import { FallingLeafPhysics, type FallingLeaf } from "./fallingLeafPhysics";

export interface PhysicsBridgeConfig {
  useWorker: boolean;
  maxBirds: number;
  maxLeaves: number;
  targetFps: number;
  windMultiplier: number;
  timeScale: number;
  paused: boolean;
  skyBottomNorm: number;
  groveTopNorm: number;
  showLeaves: boolean;
}

export interface PackedPhysicsFrame {
  wind: AtmosphericWindSnapshot;
  /** Packed bird fields: [x, y, dir, depth, scale, glideBlend, flapPhase, pitch, tailSpread] (stride 9) */
  birdsBuffer: Float32Array;
  birdCount: number;
  /** Packed leaf fields: [x, y, angle, rollPhase, size, life, maxLife, depth] (stride 8) */
  leavesBuffer: Float32Array;
  leafCount: number;
  runningInWorker: boolean;
}

export const BIRD_STRIDE = 9;
export const LEAF_STRIDE = 8;

const WORKER_SCRIPT = /* js */ `
  let simTime = 0, cloudAdvection = 0;
  const osc = () => ({ pos: 0, vel: 0 });
  const leftTree = osc(), leftPalm = osc(), rightPalm = osc(), rightTree = osc(), hedge = osc(), flutter = osc();
  const gustWaves = [];

  function smoothNoise1D(t) {
    const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
    const h = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
    return h(i) * (1 - u) + h(i + 1) * u;
  }
  function fbm1D(t) {
    return smoothNoise1D(t) * 0.54 + smoothNoise1D(t * 2.17 + 11.4) * 0.31 + smoothNoise1D(t * 4.83 + 27.9) * 0.15;
  }
  function integrate(o, force, wn, zeta, dt) {
    const a = force * wn * wn - 2 * zeta * wn * o.vel - wn * wn * o.pos;
    o.vel += a * dt; o.pos += o.vel * dt;
  }
  function sampleSpatialWind(t, xNorm, mult) {
    const dt = t - xNorm * 1.45;
    const macro = fbm1D(dt * 0.13);
    const natGust = Math.pow(Math.max(0, Math.sin(dt * 0.44 + macro * 3.2)), 2.5);
    const eddy = (fbm1D(dt * 0.72 + 4.3 + xNorm * 1.9) - 0.5) * 0.55;
    let wave = 0;
    for (let i = 0; i < gustWaves.length; i++) {
      const gw = gustWaves[i];
      const cx = (t - gw.startTime) * 0.68 - 0.15;
      const d = xNorm - cx;
      wave += Math.exp(-(d * d) / 0.085) * gw.strength;
    }
    return Math.max(0.12, (0.58 + macro * 0.62 + natGust * 1.12 + eddy) * mult + wave);
  }

  let rng = 7331;
  const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };

  const birds = [];
  for (let i = 0; i < 8; i++) {
    const depth = 0.62 + rand() * 0.34;
    const speed = (0.042 + 0.025 * depth) * (0.94 + rand() * 0.12);
    birds.push({
      id: i + 1, flockId: 0,
      x: 0.08 + i * 0.038 + (rand() - 0.5) * 0.022,
      y: 0.23 + (i % 3) * 0.032 + (rand() - 0.5) * 0.018,
      vx: speed, vy: (rand() - 0.5) * 0.004,
      depth, scale: 0.72 + depth * 0.44, dir: 1,
      cruiseY: 0.215 + rand() * 0.115, cruiseSpeed: speed,
      gait: i % 3 === 0 ? 1 : 0, gaitTimer: 0.9 + rand() * 2.2, glideBlend: i % 3 === 0 ? 1 : 0,
      flapPhase: rand() * Math.PI * 2,
      flapFreq: (2.45 + (1 - depth) * 0.75 + rand() * 0.25) * Math.PI * 2,
      pitch: 0, tailSpread: 0.3, seed: rand() * 100
    });
  }
  for (let i = 0; i < 5; i++) {
    const depth = 0.28 + rand() * 0.22;
    const speed = (0.026 + 0.018 * depth) * (0.92 + rand() * 0.14);
    birds.push({
      id: 100 + i, flockId: 1,
      x: 0.58 + i * 0.044 + (rand() - 0.5) * 0.02,
      y: 0.11 + (i % 3) * 0.028 + (rand() - 0.5) * 0.014,
      vx: -speed, vy: (rand() - 0.5) * 0.003,
      depth, scale: 0.54 + depth * 0.34, dir: -1,
      cruiseY: 0.105 + rand() * 0.095, cruiseSpeed: speed,
      gait: i % 2 === 0 ? 1 : 0, gaitTimer: 1.5 + rand() * 2.8, glideBlend: i % 2 === 0 ? 1 : 0,
      flapPhase: rand() * Math.PI * 2,
      flapFreq: (2.3 + rand() * 0.45) * Math.PI * 2,
      pitch: 0, tailSpread: 0.45, seed: rand() * 100
    });
  }

  const leaves = [];
  let leafCooldown = 0.7;
  let flockPhase = 0;

  const cfg = {
    maxBirds: 13, maxLeaves: 16, windMultiplier: 1.0, timeScale: 1.0, paused: false,
    skyBottomNorm: 0.42, groveTopNorm: 0.429, showLeaves: true, pointerX: -1, pointerY: -1
  };

  let windSpeed = 1.4, gustIntensity = 0.35;

  function stepAll(rawDt) {
    const dt = cfg.paused ? 0 : Math.min(rawDt, 0.05) * cfg.timeScale;
    if (dt > 0) {
      const h = dt / 2;
      for (let s = 0; s < 2; s++) {
        simTime += h;
        if (gustWaves.length > 0 && simTime - gustWaves[0].startTime > 4.5) gustWaves.shift();
        const wLT = sampleSpatialWind(simTime, 0.12, cfg.windMultiplier);
        const wLP = sampleSpatialWind(simTime, 0.34, cfg.windMultiplier);
        const wRP = sampleSpatialWind(simTime, 0.72, cfg.windMultiplier);
        const wRT = sampleSpatialWind(simTime, 0.90, cfg.windMultiplier);
        const wC  = sampleSpatialWind(simTime, 0.50, cfg.windMultiplier);
        const toDrag = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.42) * 0.52;
        const vortex = (ph, v) => Math.sin(simTime * 4.8 + ph) * v * 0.32;

        integrate(leftTree, toDrag(wLT), 1.32, 0.26, h);
        integrate(leftPalm, toDrag(wLP) + vortex(0.4, wLP) * 0.38, 2.15, 0.19, h);
        integrate(rightPalm, toDrag(wRP) + vortex(2.1, wRP) * 0.38, 2.34, 0.21, h);
        integrate(rightTree, toDrag(wRT), 1.44, 0.28, h);
        integrate(hedge, toDrag(wC) * 0.7 + vortex(1.3, wC) * 0.45, 3.65, 0.36, h);
        integrate(flutter, vortex(0, wC) * 1.4, 5.4, 0.32, h);

        cloudAdvection += (0.42 + wC * 0.38) * h;
        windSpeed = wC * 1.85;
        gustIntensity = Math.max(0, wC - 0.55);
      }

      flockPhase += dt;
      const activeBirdCount = Math.min(birds.length, cfg.maxBirds);
      const minY = 0.045, maxY = Math.max(0.24, cfg.skyBottomNorm - 0.03);
      for (let i = 0; i < activeBirdCount; i++) {
        const b = birds[i];
        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, n = 0;
        for (let j = 0; j < activeBirdCount; j++) {
          if (i === j) continue;
          const o = birds[j];
          if (o.flockId !== b.flockId) continue;
          const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 0.032 && d2 > 1e-6) {
            const d = Math.sqrt(d2), minSep = 0.042 * (0.7 + 0.4 * b.depth);
            if (d < minSep) { const p = ((minSep - d) / minSep) * 0.055; sepX -= (dx / d) * p; sepY -= (dy / d) * p; }
            aliX += o.vx; aliY += o.vy; cohX += o.x; cohY += o.y; n++;
          }
        }
        let ax = sepX, ay = sepY;
        if (n > 0) {
          ax += (aliX / n - b.vx) * 0.45 + (cohX / n - b.x) * 0.035;
          ay += (aliY / n - b.vy) * 0.55 + (cohY / n - b.y) * 0.048;
        }
        const thermal = Math.sin(b.x * 7.5 - flockPhase * 0.35 + b.seed * 0.2) * Math.cos(b.y * 9.0 + flockPhase * 0.22) * 0.0085;
        b.gaitTimer -= dt;
        const targetAlt = Math.min(maxY - 0.025, Math.max(minY + 0.02, b.cruiseY + Math.sin(flockPhase * 0.32 + b.seed) * 0.03));
        const altErr = targetAlt - b.y;
        if (b.gaitTimer <= 0) {
          b.gait = b.gait === 0 ? 1 : 0;
          b.gaitTimer = b.gait === 1 ? 1.9 + (Math.sin(b.seed + flockPhase * 1.7) * 0.5 + 0.5) * 2.5 : 1.15 + (Math.cos(b.seed * 1.3 + flockPhase) * 0.5 + 0.5) * 1.35;
        } else if (b.gait === 1 && altErr < -0.042) {
          b.gait = 0; b.gaitTimer = 1.35;
        }
        b.glideBlend += (b.gait - b.glideBlend) * Math.min(1, dt * 4.2);
        const active = 1 - b.glideBlend;
        b.flapPhase += b.flapFreq * (altErr < 0 ? 1.14 : 0.94) * (0.25 + 0.75 * active) * dt;
        const strokeLift = Math.sin(b.flapPhase) * active;
        const windAdv = (windSpeed - 1.2) * 0.005 * (0.4 + 0.6 * b.depth);
        ax += (b.dir * b.cruiseSpeed + windAdv * 0.45 + Math.max(0, strokeLift) * 0.007 * b.dir - b.vx) * 1.35;
        ay += altErr * 0.16 + (-0.0085 - strokeLift * 0.015) * active + 0.0042 * b.glideBlend - thermal;
        if (b.y < minY) ay += (minY - b.y) * 1.8;
        if (b.y > maxY) ay -= (b.y - maxY) * 2.2;
        if (cfg.pointerX >= 0 && cfg.pointerY >= 0 && cfg.pointerY < cfg.skyBottomNorm + 0.05) {
          const pdx = b.x - cfg.pointerX, pdy = b.y - cfg.pointerY, pd2 = pdx * pdx + pdy * pdy;
          if (pd2 < 0.016 && pd2 > 1e-5) {
            const pd = Math.sqrt(pd2), defl = ((0.126 - pd) / 0.126) * 0.045;
            ax += (pdx / pd) * defl * 0.6; ay += (pdy / pd) * defl - 0.018 * defl;
            if (b.gait === 1) { b.gait = 0; b.gaitTimer = 0.9; }
          }
        }
        b.vx += ax * dt; b.vy += ay * dt;
        const minVx = b.cruiseSpeed * 0.62, maxVx = b.cruiseSpeed * 1.55;
        b.vx = b.dir === 1 ? Math.max(minVx, Math.min(maxVx, b.vx)) : Math.min(-minVx, Math.max(-maxVx, b.vx));
        b.vy = Math.max(-0.045, Math.min(0.045, b.vy));
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.dir === 1 && b.x > 1.14) { b.x = -0.14 - (b.id % 4) * 0.02; b.y = Math.min(maxY - 0.04, Math.max(minY + 0.03, b.cruiseY)); b.vy = -0.004; }
        else if (b.dir === -1 && b.x < -0.14) { b.x = 1.14 + (b.id % 3) * 0.025; b.y = Math.min(maxY - 0.05, Math.max(minY + 0.02, b.cruiseY)); b.vy = 0.002; }
        b.pitch += (Math.atan2(b.vy, Math.abs(b.vx)) * 0.72 - b.pitch) * Math.min(1, dt * 6);
        b.tailSpread += (0.25 + b.glideBlend * 0.55 + Math.abs(b.vy) * 4 - b.tailSpread) * Math.min(1, dt * 5);
      }

      if (cfg.showLeaves && cfg.maxLeaves > 0) {
        leafCooldown -= dt * (0.45 + gustIntensity * 1.35 + cfg.windMultiplier * 0.45);
        if (leafCooldown <= 0 && cfg.windMultiplier > 0.15 && leaves.length < cfg.maxLeaves) {
          const fromLeft = rand() < 0.62;
          const groveH = 1 - cfg.groveTopNorm;
          leaves.push({
            x: fromLeft ? 0.03 + rand() * 0.21 : 0.80 + rand() * 0.17,
            y: cfg.groveTopNorm + (0.06 + rand() * 0.36) * groveH,
            vx: 0.015 + windSpeed * 0.008 + (rand() - 0.3) * 0.015,
            vy: 0.018 + rand() * 0.014,
            angle: (rand() - 0.5) * 1.4, angVel: (rand() - 0.5) * 1.8,
            rollPhase: rand() * Math.PI * 2, rollFreq: 1.8 + rand() * 2.2,
            size: 0.72 + rand() * 0.58, life: 0, maxLife: 6.5 + rand() * 5,
            depth: 0.55 + rand() * 0.45, seed: rand() * 100
          });
          leafCooldown = 1.2 + rand() * 2.2;
        }
        for (let i = leaves.length - 1; i >= 0; i--) {
          const l = leaves[i];
          l.life += dt;
          const airVx = (0.016 + windSpeed * 0.011) * (0.65 + 0.35 * Math.sin(simTime * 1.2 + l.seed));
          const airVy = Math.sin(simTime * 1.7 + l.x * 11 + l.seed) * 0.012;
          const tq = -Math.sin(l.angle * 1.8) * 3.6 + Math.sin(simTime * 2.8 + l.seed) * 1.4 * (0.5 + gustIntensity);
          l.angVel += (tq - l.angVel * 2.1) * dt;
          l.angle += l.angVel * dt;
          l.rollPhase += l.rollFreq * (0.7 + 0.4 * gustIntensity) * dt;
          const flat = Math.abs(Math.cos(l.angle));
          l.vx += (-(l.vx - airVx) * (1.8 + (1 - flat) * 2.5) + Math.sin(l.angle) * 0.042) * dt;
          l.vy += (0.052 - (l.vy - airVy) * (2.6 + flat * 3.8)) * dt;
          l.x += l.vx * dt; l.y += l.vy * dt;
          if (l.life >= l.maxLife || l.y > 0.985 || l.x > 1.08 || l.x < -0.08) leaves.splice(i, 1);
        }
      } else if (leaves.length > 0) {
        leaves.length = 0;
      }
    }

    const activeBirds = Math.min(birds.length, cfg.maxBirds);
    const activeLeaves = Math.min(leaves.length, cfg.maxLeaves);
    const windArr = new Float32Array([
      windSpeed, gustIntensity, leftTree.pos, leftPalm.pos, rightPalm.pos,
      rightTree.pos, hedge.pos, flutter.pos, cloudAdvection, simTime
    ]);
    const birdsArr = new Float32Array(activeBirds * 9);
    for (let i = 0; i < activeBirds; i++) {
      const b = birds[i], o = i * 9;
      birdsArr[o] = b.x; birdsArr[o + 1] = b.y; birdsArr[o + 2] = b.dir; birdsArr[o + 3] = b.depth;
      birdsArr[o + 4] = b.scale; birdsArr[o + 5] = b.glideBlend; birdsArr[o + 6] = b.flapPhase;
      birdsArr[o + 7] = b.pitch; birdsArr[o + 8] = b.tailSpread;
    }
    const leavesArr = new Float32Array(activeLeaves * 8);
    for (let i = 0; i < activeLeaves; i++) {
      const l = leaves[i], o = i * 8;
      leavesArr[o] = l.x; leavesArr[o + 1] = l.y; leavesArr[o + 2] = l.angle; leavesArr[o + 3] = l.rollPhase;
      leavesArr[o + 4] = l.size; leavesArr[o + 5] = l.life; leavesArr[o + 6] = l.maxLife; leavesArr[o + 7] = l.depth;
    }
    self.postMessage(
      { type: "frame", windArr, birdsArr, birdCount: activeBirds, leavesArr, leafCount: activeLeaves },
      [windArr.buffer, birdsArr.buffer, leavesArr.buffer]
    );
  }

  self.onmessage = (e) => {
    const m = e.data;
    if (m.type === "config") {
      Object.assign(cfg, m.patch);
    } else if (m.type === "step") {
      stepAll(m.dt);
    } else if (m.type === "gust") {
      gustWaves.push({ startTime: simTime, strength: m.strength || 1.75 });
      if (gustWaves.length > 4) gustWaves.shift();
    } else if (m.type === "impulse") {
      const imp = Math.max(-1.6, Math.min(1.6, m.vx * 0.085));
      if (Math.abs(imp) < 0.01) return;
      if (m.u < 0.27 && m.v < 0.65) { leftTree.vel += imp * 1.4; flutter.vel += imp * 2.2; }
      if (m.u > 0.23 && m.u < 0.43 && m.v > 0.28 && m.v < 0.72) { leftPalm.vel += imp * 2.4; flutter.vel += imp * 1.8; }
      if (m.u > 0.60 && m.u < 0.85 && m.v > 0.28 && m.v < 0.70) { rightPalm.vel += imp * 2.4; flutter.vel += imp * 1.8; }
      if (m.u > 0.78 && m.v < 0.80) { rightTree.vel += imp * 1.4; flutter.vel += imp * 2.2; }
      if (m.v > 0.75) hedge.vel += imp * 1.9;
    }
  };
`;

export class PhysicsWorkerBridge {
  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private workerInFlight = false;

  private fallbackWind: AtmospherePhysicsEngine | null = null;
  private fallbackBirds: AvianFlockPhysics | null = null;
  private fallbackLeaves: FallingLeafPhysics | null = null;

  private config: PhysicsBridgeConfig;
  private pointerX: number | null = null;
  private pointerY: number | null = null;

  public latest: PackedPhysicsFrame = {
    wind: {
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
    },
    birdsBuffer: new Float32Array(0),
    birdCount: 0,
    leavesBuffer: new Float32Array(0),
    leafCount: 0,
    runningInWorker: false,
  };

  constructor(initialConfig: PhysicsBridgeConfig) {
    this.config = { ...initialConfig };
    this.initEngine();
  }

  private initEngine() {
    if (
      this.config.useWorker &&
      typeof Worker !== "undefined" &&
      typeof Blob !== "undefined" &&
      typeof URL?.createObjectURL === "function"
    ) {
      try {
        const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
        this.blobUrl = URL.createObjectURL(blob);
        const w = new Worker(this.blobUrl);
        w.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg?.type === "frame") {
            const wa = msg.windArr as Float32Array;
            this.latest.wind = {
              windSpeed: wa[0],
              gustIntensity: wa[1],
              leftTreeBend: wa[2],
              leftPalmBend: wa[3],
              rightPalmBend: wa[4],
              rightTreeBend: wa[5],
              hedgeRustle: wa[6],
              leafFlutter: wa[7],
              palmBend: (wa[3] + wa[4]) * 0.5,
              canopySway: (wa[2] + wa[5]) * 0.5,
              cloudAdvection: wa[8],
              simTime: wa[9],
            };
            this.latest.birdsBuffer = msg.birdsArr as Float32Array;
            this.latest.birdCount = msg.birdCount as number;
            this.latest.leavesBuffer = msg.leavesArr as Float32Array;
            this.latest.leafCount = msg.leafCount as number;
            this.latest.runningInWorker = true;
            this.workerInFlight = false;
          }
        };
        w.onerror = () => {
          this.switchToMainThreadFallback();
        };
        this.worker = w;
        this.latest.runningInWorker = true;
        this.syncWorkerConfig();
        return;
      } catch {
        // Fall through cleanly to main-thread simulation
      }
    }
    this.switchToMainThreadFallback();
  }

  private switchToMainThreadFallback() {
    this.teardownWorkerOnly();
    this.fallbackWind = new AtmospherePhysicsEngine();
    this.fallbackBirds = new AvianFlockPhysics();
    this.fallbackLeaves = new FallingLeafPhysics();
    this.latest.runningInWorker = false;
  }

  private teardownWorkerOnly() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    this.workerInFlight = false;
  }

  private syncWorkerConfig() {
    if (!this.worker) return;
    this.worker.postMessage({
      type: "config",
      patch: {
        maxBirds: this.config.maxBirds,
        maxLeaves: this.config.maxLeaves,
        windMultiplier: this.config.windMultiplier,
        timeScale: this.config.timeScale,
        paused: this.config.paused,
        skyBottomNorm: this.config.skyBottomNorm,
        groveTopNorm: this.config.groveTopNorm,
        showLeaves: this.config.showLeaves,
        pointerX: this.pointerX ?? -1,
        pointerY: this.pointerY ?? -1,
      },
    });
  }

  public updateConfig(patch: Partial<PhysicsBridgeConfig>) {
    const prevUseWorker = this.config.useWorker;
    Object.assign(this.config, patch);
    if (patch.useWorker !== undefined && patch.useWorker !== prevUseWorker) {
      if (patch.useWorker) this.initEngine();
      else this.switchToMainThreadFallback();
      return;
    }
    this.syncWorkerConfig();
  }

  public setPointer(xNorm: number | null, yNorm: number | null) {
    this.pointerX = xNorm;
    this.pointerY = yNorm;
    if (this.worker) {
      this.worker.postMessage({
        type: "config",
        patch: { pointerX: xNorm ?? -1, pointerY: yNorm ?? -1 },
      });
    }
  }

  public triggerGust(strength = 1.75) {
    if (this.worker) {
      this.worker.postMessage({ type: "gust", strength });
    } else {
      this.fallbackWind?.triggerGust(strength);
    }
  }

  public applyPointerImpulse(u: number, v: number, vx: number) {
    if (this.worker) {
      this.worker.postMessage({ type: "impulse", u, v, vx });
    } else {
      this.fallbackWind?.applyPointerImpulse(u, v, vx);
    }
  }

  /** Advance simulation (async non-blocking on Worker, synchronous fallback on Main Thread) */
  public step(rawDt: number): PackedPhysicsFrame {
    if (this.worker) {
      if (!this.workerInFlight) {
        this.workerInFlight = true;
        this.worker.postMessage({ type: "step", dt: rawDt });
      }
      return this.latest;
    }

    if (this.fallbackWind && this.fallbackBirds && this.fallbackLeaves) {
      const dt = this.config.paused ? 0 : Math.min(rawDt, 0.05) * this.config.timeScale;
      const windSnap = this.fallbackWind.step(dt, this.config.windMultiplier);
      this.fallbackBirds.step(dt, windSnap, this.config.skyBottomNorm, this.pointerX, this.pointerY);
      if (this.config.showLeaves) {
        this.fallbackLeaves.step(
          dt,
          windSnap,
          this.config.groveTopNorm,
          this.config.windMultiplier,
          this.config.maxLeaves,
        );
      }

      const activeBirds = Math.min(this.fallbackBirds.birds.length, this.config.maxBirds);
      if (this.latest.birdsBuffer.length !== activeBirds * BIRD_STRIDE) {
        this.latest.birdsBuffer = new Float32Array(activeBirds * BIRD_STRIDE);
      }
      for (let i = 0; i < activeBirds; i++) {
        const b: BirdAgent = this.fallbackBirds.birds[i];
        const o = i * BIRD_STRIDE;
        this.latest.birdsBuffer[o] = b.x;
        this.latest.birdsBuffer[o + 1] = b.y;
        this.latest.birdsBuffer[o + 2] = b.dir;
        this.latest.birdsBuffer[o + 3] = b.depth;
        this.latest.birdsBuffer[o + 4] = b.scale;
        this.latest.birdsBuffer[o + 5] = b.glideBlend;
        this.latest.birdsBuffer[o + 6] = b.flapPhase;
        this.latest.birdsBuffer[o + 7] = b.pitch;
        this.latest.birdsBuffer[o + 8] = b.tailSpread;
      }

      const activeLeaves = this.config.showLeaves
        ? Math.min(this.fallbackLeaves.leaves.length, this.config.maxLeaves)
        : 0;
      if (this.latest.leavesBuffer.length !== activeLeaves * LEAF_STRIDE) {
        this.latest.leavesBuffer = new Float32Array(activeLeaves * LEAF_STRIDE);
      }
      for (let i = 0; i < activeLeaves; i++) {
        const l: FallingLeaf = this.fallbackLeaves.leaves[i];
        const o = i * LEAF_STRIDE;
        this.latest.leavesBuffer[o] = l.x;
        this.latest.leavesBuffer[o + 1] = l.y;
        this.latest.leavesBuffer[o + 2] = l.angle;
        this.latest.leavesBuffer[o + 3] = l.rollPhase;
        this.latest.leavesBuffer[o + 4] = l.size;
        this.latest.leavesBuffer[o + 5] = l.life;
        this.latest.leavesBuffer[o + 6] = l.maxLife;
        this.latest.leavesBuffer[o + 7] = l.depth;
      }

      this.latest.wind = windSnap;
      this.latest.birdCount = activeBirds;
      this.latest.leafCount = activeLeaves;
      this.latest.runningInWorker = false;
    }

    return this.latest;
  }

  public dispose() {
    this.teardownWorkerOnly();
    this.fallbackWind = null;
    this.fallbackBirds = null;
    this.fallbackLeaves = null;
  }
}

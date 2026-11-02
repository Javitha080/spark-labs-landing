/**
 * WebGL ember volume behind the boot screen ("Ignition").
 *
 * A tiny Three.js points field: two depth layers of drifting sparks
 * (additive blending, ember-gradient colors) with a slow camera push-in.
 * Three.js is dynamically imported so this only loads on the first-visit
 * boot play (it already ships in the lazy `vendor-three` chunk for the
 * hero diorama). Returns null silently when WebGL is unavailable.
 *
 * `setPhase` lets the boot choreography drive drift surges ("ambient",
 * "assemble", "ignite") — the last one also fires a one-shot camera kick.
 */

import { isLowPowerDevice } from "@/lib/motion";

export interface EmberStageHandle {
  resize(): void;
  dispose(): void;
  /** Optional intensity surges synced to the boot choreography. */
  setPhase?(phase: "ambient" | "assemble" | "ignite"): void;
}

interface Layer {
  points: import("three").Points;
  geo: import("three").BufferGeometry;
  mat: import("three").PointsMaterial;
  speeds: Float32Array;
  baseSpeeds: Float32Array;
  maxY: number;
}

type Three = typeof import("three");

export async function createEmberVolume(canvas: HTMLCanvasElement): Promise<EmberStageHandle | null> {
  try {
    const THREE: Three = await import("three");
    const low = isLowPowerDevice();
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
    camera.position.set(0, 0, 9);

    const group = new THREE.Group();
    scene.add(group);

    const mkLayer = (
      count: number,
      size: number,
      box: [number, number, number],
      speedRange: [number, number],
      opacity: number,
    ): Layer => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const speeds = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() * 2 - 1) * (box[0] / 2);
        positions[i * 3 + 1] = (Math.random() * 2 - 1) * (box[1] / 2);
        positions[i * 3 + 2] = (Math.random() * 2 - 1) * (box[2] / 2);
        // Ignition palette: hues 6°..34° (deep red → amber), few deep coals.
        const deep = Math.random() < 0.08;
        const c = new THREE.Color().setHSL(
          deep ? 0.975 : 0.02 + Math.random() * 0.075,
          deep ? 0.5 : 0.8 + Math.random() * 0.2,
          deep ? 0.32 : 0.45 + Math.random() * 0.23,
        );
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        speeds[i] = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size,
        vertexColors: true,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      return {
        points: new THREE.Points(geo, mat),
        geo,
        mat,
        speeds,
        baseSpeeds: speeds.slice(),
        maxY: box[1] / 2,
      };
    };

    const far = mkLayer(low ? 240 : 620, 0.06, [13, 9, 10], [0.04, 0.18], 0.55);
    const near = mkLayer(low ? 80 : 170, 0.13, [11, 7, 8], [0.16, 0.55], 0.8);
    group.add(far.points, near.points);

    // ---- choreography surges ---------------------------------------------
    // `surge` eases toward `surgeTarget` (set by setPhase) and multiplies the
    // ember drift so bursts of synch feel like the volume answering the beat.
    let surge = 1;
    let surgeTarget = 1;
    let kick = 0; // one-shot ignition impulse (opens the camera floor briefly)

    const update = (layer: Layer, dt: number) => {
      const pos = layer.geo.getAttribute("position") as import("three").BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 1, s = 0; i < arr.length; i += 3, s++) {
        arr[i] += layer.baseSpeeds[s] * dt * surge;
        if (arr[i] > layer.maxY) arr[i] = -layer.maxY;
      }
      pos.needsUpdate = true;
    };

    let raf = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(0.05, clock.getDelta());
      surge += (surgeTarget - surge) * Math.min(1, dt * 3);
      kick = Math.max(0, kick - dt * 2.1);
      update(far, dt);
      update(near, dt);
      far.points.rotation.y += dt * 0.012 * surge;
      near.points.rotation.y -= dt * 0.02 * surge;
      camera.position.z = Math.max(
        7.4 - 0.5 * kick,
        camera.position.z - dt * (0.1 + 0.22 * surge),
      );
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    resize();
    clock.getDelta();
    tick();

    // Track the canvas itself (not the window): the Vite/Worker shells and
    // mobile toolbars can change stage size without a window resize event.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    }

    return {
      resize,
      setPhase(phase) {
        surgeTarget = phase === "ambient" ? 1 : phase === "assemble" ? 1.9 : 3.4;
        if (phase === "ignite") kick = 1;
      },
      dispose() {
        disposed = true;
        cancelAnimationFrame(raf);
        ro?.disconnect();
        far.geo.dispose();
        far.mat.dispose();
        near.geo.dispose();
        near.mat.dispose();
        renderer.dispose();
      },
    };
  } catch {
    return null;
  }
}

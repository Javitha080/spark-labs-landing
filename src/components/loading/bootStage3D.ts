/**
 * WebGL ember volume behind the boot screen ("Ignition").
 *
 * A tiny Three.js points field: two depth layers of drifting sparks
 * (additive blending, ember-gradient colors) with a slow camera push-in.
 * Three.js is dynamically imported so this only loads on the first-visit
 * boot play (it already ships in the lazy `vendor-three` chunk for the
 * hero diorama). Returns null silently when WebGL is unavailable.
 */

import { isLowPowerDevice } from "@/lib/motion";

export interface EmberStageHandle {
  resize(): void;
  dispose(): void;
}

interface Layer {
  points: import("three").Points;
  geo: import("three").BufferGeometry;
  mat: import("three").PointsMaterial;
  speeds: Float32Array;
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
      return { points: new THREE.Points(geo, mat), geo, mat, speeds, maxY: box[1] / 2 };
    };

    const far = mkLayer(low ? 240 : 620, 0.06, [13, 9, 10], [0.04, 0.18], 0.55);
    const near = mkLayer(low ? 80 : 170, 0.13, [11, 7, 8], [0.16, 0.55], 0.8);
    group.add(far.points, near.points);

    const update = (layer: Layer, dt: number) => {
      const pos = layer.geo.getAttribute("position") as import("three").BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 1, s = 0; i < arr.length; i += 3, s++) {
        arr[i] += layer.speeds[s] * dt;
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
      update(far, dt);
      update(near, dt);
      far.points.rotation.y += dt * 0.012;
      near.points.rotation.y -= dt * 0.02;
      camera.position.z = Math.max(7.4, camera.position.z - dt * 0.1);
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

    return {
      resize,
      dispose() {
        disposed = true;
        cancelAnimationFrame(raf);
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

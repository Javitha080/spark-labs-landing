import { useEffect, useRef } from "react";
import type * as THREE from "three";

/**
 * Miniature "innovation campus" rendered through tiltshift-in-html.
 *
 * Why this scene: the club's work is robotics, solar and IoT, so the diorama is
 * a small campus with a workshop (robot arm), a solar array, a wind turbine and
 * a couple of delivery bots. A tilted focus plane is what makes a full-size
 * scene read as a scale model, which is the whole point of the `plane` model.
 *
 * Integration notes (from the tiltshift-in-html README / AGENTS.md):
 *  - `tilt.render(scene, camera)` replaces `renderer.render(...)`.
 *  - `tilt.syncSize()` after every `renderer.setSize()` (drawing-buffer pixels).
 *  - Focus follows the pointer through `focusDistanceAtPointer` + `FocusSpring`
 *    so it racks instead of cutting.
 *  - `quality: "auto"` lets the pass step itself down if frames get slow.
 *
 * The canvas is a direct child of the hero's LiquidGlassStage, so the glass
 * pane refracts the live scene. `preserveDrawingBuffer` is required for the
 * library to read the canvas back, and `data-dynamic` tells it to re-sample
 * every frame while the scene animates.
 */

type ThreeNS = typeof import("three");
type TiltNS = typeof import("tiltshift-in-html");

interface TiltShiftDioramaProps {
  /** false = render a single still frame (reduced motion). */
  animate?: boolean;
  className?: string;
  /** Called after a still frame is drawn so the glass can re-sample it. */
  onStillFrame?: (canvas: HTMLCanvasElement) => void;
}

function hslVar(THREE: ThreeNS, name: string, fallback: [number, number, number]) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.match(/-?[\d.]+/g)?.map(Number);
  const [h, s, l] = parts && parts.length >= 3 ? parts : fallback;
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100, THREE.SRGBColorSpace);
}

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createDiorama(
  THREE: ThreeNS,
  { TiltShift, focusDistanceAtPointer, FocusSpring }: TiltNS,
  canvas: HTMLCanvasElement,
  animate: boolean,
  onStill?: (canvas: HTMLCanvasElement) => void,
) {
  const parent = canvas.parentElement as HTMLElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 140);
  const target = new THREE.Vector3(0.4, 0.5, -0.3);

  // ── palette: neutrals + the brand's primary as the single accent ──────────
  const accent = hslVar(THREE, "--primary", [262, 83, 58]);
  const stone = new THREE.Color("#d9d4c8");
  const paper = new THREE.Color("#efece4");
  const concrete = new THREE.Color("#b9b4a9");
  const asphalt = new THREE.Color("#3b3b42");
  const graphite = new THREE.Color("#262d3a");
  const sage = new THREE.Color("#86a07f");
  const leaf = new THREE.Color("#6c8c68");
  const bark = new THREE.Color("#6b5a49");

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const mat = (color: THREE.Color, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true, ...extra });
    materials.push(m);
    return m;
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parentObj: THREE.Object3D = scene) => {
    const g = new THREE.BoxGeometry(w, h, d);
    geometries.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parentObj.add(mesh);
    return mesh;
  };
  const cyl = (rt: number, rb: number, h: number, seg: number, m: THREE.Material, x: number, y: number, z: number, parentObj: THREE.Object3D = scene) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    geometries.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parentObj.add(mesh);
    return mesh;
  };

  const accentMat = mat(accent, { roughness: 0.55 });
  const windowMat = mat(new THREE.Color("#f0b95a"), { emissive: new THREE.Color("#f0b95a"), emissiveIntensity: 0.7 });

  // ground
  box(17, 0.5, 11, mat(stone), 0, -0.25, 0);
  box(7.2, 0.1, 5.2, mat(sage), -4.4, 0.05, -2.1);

  // roads: a simple orthogonal loop, like a circuit trace
  const roadMat = mat(asphalt, { roughness: 0.95 });
  box(16, 0.06, 0.55, roadMat, 0, 0.03, 3.1);
  box(0.55, 0.06, 7.6, roadMat, 3.2, 0.03, -0.7);
  box(7.4, 0.06, 0.55, roadMat, -0.5, 0.03, -4.4 + 0.2);

  // school: main block, accent roof slab, clock tower, row of lit windows
  const schoolMat = mat(paper);
  box(4.4, 1.5, 1.7, schoolMat, -4.6, 0.75, -2.6);
  box(4.6, 0.16, 1.9, accentMat, -4.6, 1.58, -2.6);
  box(0.9, 2.4, 0.9, schoolMat, -3.0, 1.2, -2.6);
  box(1.05, 0.14, 1.05, accentMat, -3.0, 2.45, -2.6);
  for (let i = 0; i < 6; i++) box(0.34, 0.42, 0.05, windowMat, -6.0 + i * 0.58, 0.9, -1.74);

  // workshop with a robot arm that slowly works
  box(2.3, 1.05, 1.9, mat(concrete), 0.4, 0.52, -3.2);
  box(2.5, 0.12, 2.1, mat(graphite), 0.4, 1.1, -3.2);
  const arm = new THREE.Group();
  arm.position.set(0.4, 1.16, -3.2);
  scene.add(arm);
  cyl(0.28, 0.34, 0.18, 8, accentMat, 0, 0.09, 0, arm);
  const shoulder = new THREE.Group();
  shoulder.position.y = 0.18;
  arm.add(shoulder);
  box(0.16, 0.95, 0.16, accentMat, 0, 0.47, 0, shoulder);
  const elbow = new THREE.Group();
  elbow.position.y = 0.95;
  shoulder.add(elbow);
  cyl(0.11, 0.11, 0.22, 10, mat(graphite), 0, 0, 0, elbow).rotation.z = Math.PI / 2;
  box(0.13, 0.8, 0.13, accentMat, 0.0, 0.38, 0, elbow);
  box(0.3, 0.07, 0.12, mat(graphite), 0, 0.82, 0, elbow);

  // solar array
  const panelMat = mat(graphite, { roughness: 0.3, metalness: 0.55 });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const panel = box(1.15, 0.05, 0.78, panelMat, 4.5 + c * 1.25, 0.5, -2.6 + r * 1.05);
      panel.rotation.x = -0.5;
      box(0.06, 0.4, 0.06, mat(concrete), 4.5 + c * 1.25, 0.2, -2.45 + r * 1.05);
    }
  }

  // wind turbine
  const turbine = new THREE.Group();
  turbine.position.set(7, 0, 0.6);
  scene.add(turbine);
  cyl(0.06, 0.13, 3.1, 8, mat(paper), 0, 1.55, 0, turbine);
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.1, 0.15);
  turbine.add(rotor);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), accentMat);
  geometries.push(hub.geometry);
  hub.castShadow = true;
  rotor.add(hub);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Group();
    blade.rotation.z = (i * Math.PI * 2) / 3;
    rotor.add(blade);
    box(0.13, 1.5, 0.03, mat(paper), 0, 0.85, 0, blade);
  }

  // trees on the lawn and along the road
  const rand = seeded(7);
  const treeMat = mat(leaf);
  const trunkMat = mat(bark);
  const addTree = (x: number, z: number, s: number) => {
    cyl(0.05 * s, 0.07 * s, 0.4 * s, 6, trunkMat, x, 0.2 * s + 0.05, z);
    const cone = cyl(0, 0.38 * s, 0.95 * s, 7, treeMat, x, 0.85 * s + 0.05, z);
    cone.rotation.y = rand() * Math.PI;
  };
  for (let i = 0; i < 11; i++) addTree(-7.6 + rand() * 6.2, -4.4 + rand() * 4.6, 0.8 + rand() * 0.7);
  for (let i = 0; i < 5; i++) addTree(-6 + i * 2.6 + rand() * 0.5, 4.4 + rand() * 0.3, 0.8 + rand() * 0.4);

  // two delivery bots patrolling the road
  const bots = [0, 1].map((i) => {
    const bot = new THREE.Group();
    scene.add(bot);
    box(0.5, 0.26, 0.34, accentMat, 0, 0.21, 0, bot);
    box(0.22, 0.14, 0.22, mat(paper), 0, 0.41, 0, bot);
    return { bot, phase: i * 0.5 };
  });

  // light
  const hemi = new THREE.HemisphereLight(0xfff1e0, 0x2a3350, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(-7, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: 1, far: 36 });
  sun.shadow.bias = -0.0004;
  scene.add(hemi, sun);

  // ── theme: scene background follows the site's own --background ───────────
  const applyTheme = () => {
    const dark = document.documentElement.classList.contains("dark");
    const bg = hslVar(THREE, "--background", dark ? [224, 71, 4] : [220, 20, 97]);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 30, 62);
    hemi.intensity = dark ? 0.85 : 1.5;
    sun.intensity = dark ? 2.0 : 2.4;
  };
  applyTheme();
  const themeObserver = new MutationObserver(() => {
    applyTheme();
    if (!animate) renderStill();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // ── sizing ────────────────────────────────────────────────────────────────
  const resize = () => {
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    tilt?.syncSize();
  };
  let tilt: InstanceType<TiltNS["TiltShift"]> | undefined;
  resize();

  tilt = new TiltShift(renderer, {
    model: "plane",
    planePitch: 26,
    aperture: 58,
    maxCoc: 26,
    focusDistance: 21,
    quality: "auto",
  });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!animate) renderStill();
  });
  resizeObserver.observe(parent);

  // ── camera + focus ────────────────────────────────────────────────────────
  const pointer = new THREE.Vector2(0, 0);
  const spring = new FocusSpring(21);
  let pointerDirty = false;
  const onPointer = (e: PointerEvent) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerDirty = true;
  };
  if (animate) window.addEventListener("pointermove", onPointer, { passive: true });

  let focusTarget = 21;
  let time = 0;
  const smoothPointer = new THREE.Vector2();

  const placeCamera = (dt: number) => {
    // Lenis moves the real scroll position, so reading scrollY follows its easing.
    const scroll = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
    smoothPointer.lerp(pointer, 1 - Math.pow(0.001, dt));
    const az = 0.62 + Math.sin(time * 0.07) * 0.09 + smoothPointer.x * 0.09 + scroll * 0.5;
    const el = 0.6 - smoothPointer.y * 0.035 - scroll * 0.1;
    const r = 21 * Math.max(1, 1.55 / camera.aspect) ** 0.85 + scroll * 3;
    camera.position.set(
      target.x + r * Math.sin(az) * Math.cos(el),
      target.y + r * Math.sin(el),
      target.z + r * Math.cos(az) * Math.cos(el),
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
    return { scroll, r };
  };

  const animateScene = () => {
    arm.rotation.y = Math.sin(time * 0.5) * 0.9;
    shoulder.rotation.z = Math.sin(time * 0.7) * 0.28;
    elbow.rotation.z = -0.5 + Math.sin(time * 0.9 + 1) * 0.45;
    rotor.rotation.z = time * 0.9;
    for (const { bot, phase } of bots) {
      const u = (time * 0.05 + phase) % 1;
      const tri = u < 0.5 ? u * 2 : (1 - u) * 2;
      bot.position.set(-7 + tri * 14, 0.06, 3.1);
      bot.rotation.y = u < 0.5 ? 0 : Math.PI;
    }
  };

  const drawFrame = (dt: number) => {
    const { scroll, r } = placeCamera(dt);
    if (pointerDirty) {
      const hit = focusDistanceAtPointer(camera, scene, pointer);
      if (hit !== null) focusTarget = hit;
      pointerDirty = false;
    }
    tilt!.set({
      focusDistance: spring.update(animate ? focusTarget : r, dt),
      planePitch: 26 + scroll * 12,
    });
    tilt!.render(scene, camera);
  };

  function renderStill() {
    time = 4;
    animateScene();
    drawFrame(1 / 60);
    onStill?.(canvas);
  }

  // ── loop, paused whenever the hero is off screen or the tab is hidden ─────
  let raf = 0;
  let last = 0;
  let inView = true;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    time += dt;
    animateScene();
    drawFrame(dt);
  };
  const sync = () => {
    const shouldRun = animate && inView && !document.hidden;
    if (shouldRun && !raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    } else if (!shouldRun && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", sync);

  if (animate) sync();
  else renderStill();

  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    io.disconnect();
    resizeObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pointermove", onPointer);
    tilt?.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

export default function TiltShiftDiorama({ animate = true, className, onStillFrame }: TiltShiftDioramaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stillRef = useRef(onStillFrame);

  useEffect(() => {
    stillRef.current = onStillFrame;
  }, [onStillFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let dispose = () => {};

    // three + the tilt-shift pass are only fetched when the hero actually mounts.
    Promise.all([import("three"), import("tiltshift-in-html")])
      .then(([THREE, tiltLib]) => {
        if (disposed) return;
        dispose = createDiorama(THREE, tiltLib, canvas, animate, (c) => stillRef.current?.(c));
      })
      .catch((error) => console.warn("[TiltShiftDiorama] WebGL2 scene unavailable", error));

    return () => {
      disposed = true;
      dispose();
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-dynamic={animate ? "" : undefined}
      className={className ?? "absolute inset-0 block size-full"}
    />
  );
}

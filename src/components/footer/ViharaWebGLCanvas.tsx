import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import {
  VIHARA_VERTEX_SHADER,
  VIHARA_FRAGMENT_SHADER,
  VIHARA_MOTES_VERTEX_SHADER,
  VIHARA_MOTES_FRAGMENT_SHADER,
  getSharedViharaControlMaskCanvas,
} from "./viharaShader";
import { VIHARA_ASSETS, type ViharaWebGLEngineState } from "./viharaAssets";
import { ATMOSPHERE_PRESETS, type AtmosphericWindSnapshot } from "./atmospherePhysics";
import { createSeededRandom, type QualityProfile } from "./viharaCapabilities";
import { getPreloadedViharaImage } from "./viharaPreloader";

interface ViharaWebGLCanvasProps {
  profile: QualityProfile;
  isVisibleRef: MutableRefObject<boolean>;
  engineRef: MutableRefObject<ViharaWebGLEngineState>;
  windSnapshotRef: MutableRefObject<AtmosphericWindSnapshot>;
  className?: string;
}

/**
 * Lazy-loaded Three.js WebGL2 living woodblock canvas for the YICDVP Vihara v3 footer.
 * Renders the complete 1280x720 uncropped grove plate with 6-body independent wind
 * physics, horizontal edge-guard, sunlit/moonlit canopy dapple, meditative Dhamma Chakra
 * rotation, adaptive 3D motes, context-loss recovery, and native Day/Night themes.
 */
export default function ViharaWebGLCanvas({
  profile,
  isVisibleRef,
  engineRef,
  windSnapshotRef,
  className = "",
}: ViharaWebGLCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<QualityProfile>(profile);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const useCpuFallback = !profile.useWebGLGrove || webglFailed;

  useEffect(() => {
    if (useCpuFallback) return undefined;
    const host = hostRef.current;
    if (!host) return undefined;

    let cancelled = false;
    let failRaf = 0;
    const scheduleWebGLFallback = () => {
      failRaf = requestAnimationFrame(() => {
        if (!cancelled) setWebglFailed(true);
      });
    };

    const maskCanvas = getSharedViharaControlMaskCanvas();
    if (!maskCanvas) {
      scheduleWebGLFallback();
      return () => {
        cancelled = true;
        cancelAnimationFrame(failRaf);
      };
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: profileRef.current.tier === "ultra" ? "high-performance" : "default",
        preserveDrawingBuffer: false,
      });
    } catch {
      scheduleWebGLFallback();
      return () => {
        cancelled = true;
        cancelAnimationFrame(failRaf);
      };
    }

    const initState = engineRef.current;
    const initPreset = ATMOSPHERE_PRESETS[initState.presetId];
    const initPaper = initState.darkMode ? initPreset.nightPaperRgb : initPreset.paperRgb;
    const initSun = initState.darkMode ? initPreset.nightSunRgb : initPreset.sunRgb;
    const initBeam = initState.darkMode
      ? initPreset.nightMoonbeamIntensity
      : initPreset.sunbeamIntensity;

    const dpr = Math.min(window.devicePixelRatio || 1, profileRef.current.maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(initState.darkMode ? 0x0a0908 : 0xf6ebd8, 1);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    camera.position.z = 1;

    // 1. Reuse preloaded decoded plate immediately if cached, else load asynchronously
    // Track texture readiness so the 1x1 black placeholder never inverts to a white flash in Dark Mode
    const preloadedImg = getPreloadedViharaImage("plate");
    let textureLoaded = Boolean(
      preloadedImg && preloadedImg.complete && preloadedImg.naturalWidth > 0,
    );
    let imageTex: THREE.Texture;
    if (textureLoaded && preloadedImg) {
      imageTex = new THREE.Texture(preloadedImg);
      imageTex.needsUpdate = true;
    } else {
      const loader = new THREE.TextureLoader();
      imageTex = loader.load(VIHARA_ASSETS.plate, () => {
        textureLoaded = true;
      });
    }
    imageTex.minFilter = THREE.LinearFilter;
    imageTex.magFilter = THREE.LinearFilter;
    imageTex.generateMipmaps = false;
    imageTex.colorSpace = THREE.NoColorSpace;

    // 2. Upload shared singleton 640x360 RGBA CryEngine GPU control mask
    const maskTex = new THREE.CanvasTexture(maskCanvas);
    maskTex.minFilter = THREE.LinearFilter;
    maskTex.magFilter = THREE.LinearFilter;
    maskTex.generateMipmaps = false;

    const uniforms = {
      uImage: { value: imageTex },
      uMask: { value: maskTex },
      uTime: { value: 0 },
      uReveal: { value: initState.reveal },
      uWindStrength: { value: initState.windStrength },
      uGustIntensity: { value: 0.35 },
      uLeftTreeBend: { value: 0 },
      uLeftPalmBend: { value: 0 },
      uRightPalmBend: { value: 0 },
      uRightTreeBend: { value: 0 },
      uHedgeRustle: { value: 0 },
      uLeafFlutter: { value: 0 },
      uParallaxStrength: { value: initState.parallaxStrength },
      uWheelAngle: { value: 0 },
      uWheelGlow: { value: 0.85 },
      uDarkMode: { value: initState.darkMode ? 1 : 0 },
      uTextureReady: { value: textureLoaded ? 1 : 0 },
      uPaperColor: { value: new THREE.Vector3(...initPaper) },
      uSunColor: { value: new THREE.Vector3(...initSun) },
      uSunbeamIntensity: { value: initBeam },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uImageSize: { value: new THREE.Vector2(1280, 720) },
    };

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quadMat = new THREE.ShaderMaterial({
      vertexShader: VIHARA_VERTEX_SHADER,
      fragmentShader: VIHARA_FRAGMENT_SHADER,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(quadGeo, quadMat));

    // 3. Adaptive 3D Floating Courtyard Pollen / Ember Motes
    const moteCount = Math.max(0, profile.moteCount);
    let motesGeo: THREE.BufferGeometry | null = null;
    let motesMat: THREE.ShaderMaterial | null = null;
    let motesPoints: THREE.Points | null = null;

    const moteUniforms = {
      uTime: { value: 0 },
      uReveal: { value: initState.reveal },
      uWindSpeed: { value: 1.0 },
      uPixelRatio: { value: dpr },
      uDarkMode: { value: initState.darkMode ? 1 : 0 },
      uSunColor: { value: new THREE.Vector3(...initSun) },
      uMouse: { value: new THREE.Vector2(0, 0) },
    };

    if (moteCount > 0) {
      const positions = new Float32Array(moteCount * 3);
      const sizes = new Float32Array(moteCount);
      const phases = new Float32Array(moteCount);
      const speeds = new Float32Array(moteCount);
      const tints = new Float32Array(moteCount);
      const rand = createSeededRandom(4219);

      for (let i = 0; i < moteCount; i++) {
        positions[i * 3] = rand() * 2.2 - 1.1;
        positions[i * 3 + 1] = rand() * 1.55 - 0.85;
        positions[i * 3 + 2] = 0;
        sizes[i] = 2.4 + rand() * 3.8;
        phases[i] = rand() * Math.PI * 2;
        speeds[i] = 0.5 + rand() * 0.9;
        tints[i] = rand() > 0.42 ? 1.0 : 0.0;
      }

      motesGeo = new THREE.BufferGeometry();
      motesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      motesGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      motesGeo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      motesGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
      motesGeo.setAttribute("aTint", new THREE.BufferAttribute(tints, 1));

      motesMat = new THREE.ShaderMaterial({
        vertexShader: VIHARA_MOTES_VERTEX_SHADER,
        fragmentShader: VIHARA_MOTES_FRAGMENT_SHADER,
        uniforms: moteUniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });

      motesPoints = new THREE.Points(motesGeo, motesMat);
      motesPoints.renderOrder = 2;
      scene.add(motesPoints);
    }

    const syncSize = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.min(window.devicePixelRatio || 1, profileRef.current.maxDpr);
      renderer.setPixelRatio(nextDpr);
      renderer.setSize(w, h, false);
      moteUniforms.uPixelRatio.value = nextDpr;
    };
    syncSize();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    resizeObserver?.observe(host);

    const targetPaper = new THREE.Vector3(...initPaper);
    const targetSun = new THREE.Vector3(...initSun);

    let rafId = 0;
    let lastTs = performance.now();
    let wheelAngle = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;
    let smoothDark = initState.darkMode ? 1 : 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (contextLost || document.hidden || !isVisibleRef.current) {
        lastTs = now;
        return;
      }

      const minFrameMs = 1000 / profileRef.current.targetFps;
      if (now - lastTs < minFrameMs * 0.85) return;

      const rawDt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      const st = engineRef.current;
      const snap = windSnapshotRef.current;
      const preset = ATMOSPHERE_PRESETS[st.presetId];
      const dt = st.paused ? 0 : rawDt * st.timeScale;

      if (st.wheelSpin) {
        wheelAngle -= dt * 0.15;
      }

      smoothMouseX += (st.targetMouseX - smoothMouseX) * 0.075;
      smoothMouseY += (st.targetMouseY - smoothMouseY) * 0.075;
      smoothDark += ((st.darkMode ? 1 : 0) - smoothDark) * 0.14;
      uniforms.uTextureReady.value += ((textureLoaded ? 1 : 0) - uniforms.uTextureReady.value) * 0.18;

      const paperTarget = st.darkMode ? preset.nightPaperRgb : preset.paperRgb;
      const sunTarget = st.darkMode ? preset.nightSunRgb : preset.sunRgb;
      const beamTarget = st.darkMode ? preset.nightMoonbeamIntensity : preset.sunbeamIntensity;

      targetPaper.set(...paperTarget);
      targetSun.set(...sunTarget);
      uniforms.uPaperColor.value.lerp(targetPaper, 0.14);
      uniforms.uSunColor.value.lerp(targetSun, 0.14);
      uniforms.uSunbeamIntensity.value += (beamTarget - uniforms.uSunbeamIntensity.value) * 0.14;

      uniforms.uTime.value = snap.simTime;
      uniforms.uReveal.value = st.reveal;
      uniforms.uWindStrength.value = st.windStrength;
      uniforms.uGustIntensity.value = snap.gustIntensity;
      uniforms.uLeftTreeBend.value = snap.leftTreeBend;
      uniforms.uLeftPalmBend.value = snap.leftPalmBend;
      uniforms.uRightPalmBend.value = snap.rightPalmBend;
      uniforms.uRightTreeBend.value = snap.rightTreeBend;
      uniforms.uHedgeRustle.value = snap.hedgeRustle;
      uniforms.uLeafFlutter.value = snap.leafFlutter;
      uniforms.uParallaxStrength.value = st.parallaxStrength;
      uniforms.uWheelAngle.value = wheelAngle;
      uniforms.uWheelGlow.value = st.wheelSpin ? 0.85 : 0.25;
      uniforms.uDarkMode.value = smoothDark;
      uniforms.uMouse.value.set(smoothMouseX, smoothMouseY);

      if (motesPoints) {
        moteUniforms.uTime.value = snap.simTime;
        moteUniforms.uReveal.value = st.reveal;
        moteUniforms.uWindSpeed.value = snap.windSpeed;
        moteUniforms.uDarkMode.value = smoothDark;
        moteUniforms.uSunColor.value.copy(uniforms.uSunColor.value);
        moteUniforms.uMouse.value.set(smoothMouseX, smoothMouseY);
        motesPoints.visible = st.showMotes;
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(failRaf);
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      quadGeo.dispose();
      quadMat.dispose();
      motesGeo?.dispose();
      motesMat?.dispose();
      imageTex.dispose();
      maskTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [useCpuFallback, engineRef, isVisibleRef, profile.moteCount, windSnapshotRef]);

  if (useCpuFallback) {
    return (
      <div className={`vihara-plate-fallback relative h-full w-full overflow-hidden ${className}`}>
        <img
          src={VIHARA_ASSETS.plate}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          draggable={false}
        />
        <img
          src={VIHARA_ASSETS.dharmaWheel}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          draggable={false}
          className="vihara-wheel-icon vihara-eco-wheel pointer-events-none absolute"
          style={{
            left: "48.2%",
            top: "17.35%",
            width: "3.65%",
            height: "auto",
            opacity: 0.88,
          }}
        />
      </div>
    );
  }

  return <div ref={hostRef} className={`h-full w-full ${className}`} />;
}

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { VIHARA_SKY_VERTEX_SHADER, VIHARA_SKY_FRAGMENT_SHADER } from "./viharaSkyShader";
import {
  ATMOSPHERE_PRESETS,
  type AtmospherePresetId,
  type AtmosphericWindSnapshot,
} from "./atmospherePhysics";
import type { QualityProfile } from "./viharaCapabilities";
import type { ViharaSkyStageState } from "./viharaAssets";

interface ViharaAtmosphericSkyWebGLProps {
  presetId: AtmospherePresetId;
  darkMode: boolean;
  profile: QualityProfile;
  isVisibleRef: MutableRefObject<boolean>;
  windSnapshotRef: MutableRefObject<AtmosphericWindSnapshot>;
  stateRef: MutableRefObject<ViharaSkyStageState>;
  className?: string;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function resolveSkyPalette(presetId: AtmospherePresetId, darkMode: boolean) {
  const p = ATMOSPHERE_PRESETS[presetId];
  return {
    zenith: hexToRgbTuple(darkMode ? p.nightZenithHex : p.zenithHex),
    horizon: hexToRgbTuple(darkMode ? p.nightHorizonHex : p.horizonHex),
    paper: darkMode ? p.nightPaperRgb : p.paperRgb,
    sun: darkMode ? p.nightSunRgb : p.sunRgb,
    sunbeam: darkMode ? p.nightMoonbeamIntensity : p.sunbeamIntensity,
    haze: p.hazeStrength,
  };
}

/**
 * Lazy-loaded Three.js WebGL2 Procedural Atmospheric Sky Canvas.
 * Renders Rayleigh/Mie scattering, volumetric sunbeams/moonbeams, drifting cirrus veil,
 * and Night Blueprint starlight with 30-45fps battery pacing, context-loss recovery,
 * offscreen pausing, and clean CSS Rayleigh fallback if WebGL fails.
 */
export default function ViharaAtmosphericSkyWebGL({
  presetId,
  darkMode,
  profile,
  isVisibleRef,
  windSnapshotRef,
  stateRef,
  className = "",
}: ViharaAtmosphericSkyWebGLProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const presetRef = useRef<AtmospherePresetId>(presetId);
  const darkModeRef = useRef<boolean>(darkMode);
  const profileRef = useRef<QualityProfile>(profile);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    presetRef.current = presetId;
  }, [presetId]);

  useEffect(() => {
    darkModeRef.current = darkMode;
  }, [darkMode]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const showCssFallback = !profile.useWebGLSky || webglFailed;

  useEffect(() => {
    if (showCssFallback) return undefined;
    const host = hostRef.current;
    if (!host) return undefined;

    let cancelled = false;
    let failRaf = 0;
    const scheduleFallback = () => {
      failRaf = requestAnimationFrame(() => {
        if (!cancelled) setWebglFailed(true);
      });
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "default",
      });
    } catch {
      scheduleFallback();
      return () => {
        cancelled = true;
        cancelAnimationFrame(failRaf);
      };
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profileRef.current.skyDpr));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    let contextLost = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onRestored = () => {
      contextLost = false;
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost, false);
    renderer.domElement.addEventListener("webglcontextrestored", onRestored, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    camera.position.z = 1;

    const initPal = resolveSkyPalette(presetRef.current, darkModeRef.current);
    const uniforms = {
      uTime: { value: 0 },
      uCloudAdvection: { value: 0 },
      uReveal: { value: stateRef.current.reveal },
      uSunbeamIntensity: { value: initPal.sunbeam },
      uHazeStrength: { value: initPal.haze },
      uDarkMode: { value: darkModeRef.current ? 1 : 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uZenithColor: { value: new THREE.Vector3(...initPal.zenith) },
      uHorizonColor: { value: new THREE.Vector3(...initPal.horizon) },
      uPaperColor: { value: new THREE.Vector3(...initPal.paper) },
      uSunColor: { value: new THREE.Vector3(...initPal.sun) },
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VIHARA_SKY_VERTEX_SHADER,
      fragmentShader: VIHARA_SKY_FRAGMENT_SHADER,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(geo, mat));

    const syncSize = () => {
      const r = host.getBoundingClientRect();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profileRef.current.skyDpr));
      renderer.setSize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)), false);
    };
    syncSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(host);

    const targetZenith = new THREE.Vector3(...initPal.zenith);
    const targetHorizon = new THREE.Vector3(...initPal.horizon);
    const targetPaper = new THREE.Vector3(...initPal.paper);
    const targetSun = new THREE.Vector3(...initPal.sun);

    let rafId = 0;
    let smoothMx = 0;
    let smoothMy = 0;
    let smoothDark = darkModeRef.current ? 1 : 0;
    let lastDraw = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (contextLost || document.hidden || !isVisibleRef.current) return;

      const minFrameMs = 1000 / Math.min(profileRef.current.targetFps, 45);
      if (now - lastDraw < minFrameMs) return;
      lastDraw = now;

      const pal = resolveSkyPalette(presetRef.current, darkModeRef.current);
      const snap = windSnapshotRef.current;
      const st = stateRef.current;

      targetZenith.set(...pal.zenith);
      targetHorizon.set(...pal.horizon);
      targetPaper.set(...pal.paper);
      targetSun.set(...pal.sun);

      uniforms.uZenithColor.value.lerp(targetZenith, 0.09);
      uniforms.uHorizonColor.value.lerp(targetHorizon, 0.09);
      uniforms.uPaperColor.value.lerp(targetPaper, 0.09);
      uniforms.uSunColor.value.lerp(targetSun, 0.09);
      uniforms.uSunbeamIntensity.value += (pal.sunbeam - uniforms.uSunbeamIntensity.value) * 0.09;
      uniforms.uHazeStrength.value += (pal.haze - uniforms.uHazeStrength.value) * 0.09;

      smoothDark += ((darkModeRef.current ? 1 : 0) - smoothDark) * 0.12;
      smoothMx += (st.targetMouseX - smoothMx) * 0.06;
      smoothMy += (st.targetMouseY - smoothMy) * 0.06;

      uniforms.uTime.value = snap.simTime;
      uniforms.uCloudAdvection.value = snap.cloudAdvection;
      uniforms.uReveal.value = st.reveal;
      uniforms.uDarkMode.value = smoothDark;
      uniforms.uMouse.value.set(smoothMx, smoothMy);

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(failRaf);
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [showCssFallback, isVisibleRef, stateRef, windSnapshotRef]);

  if (showCssFallback) {
    const p = ATMOSPHERE_PRESETS[presetId];
    const zenith = darkMode ? p.nightZenithHex : p.zenithHex;
    const horizon = darkMode ? p.nightHorizonHex : p.horizonHex;
    const paper = darkMode ? p.nightPaperHex : p.paperHex;
    const sun = darkMode ? p.nightSunRgb : p.sunRgb;
    const beam = darkMode ? p.nightMoonbeamIntensity * 0.24 : p.sunbeamIntensity * 0.35;

    return (
      <div
        className={`h-full w-full transition-colors duration-700 ${className}`}
        style={{
          background: `radial-gradient(ellipse 60% 55% at 76% 24%, rgba(${Math.round(
            sun[0] * 255,
          )}, ${Math.round(sun[1] * 255)}, ${Math.round(sun[2] * 255)}, ${beam.toFixed(
            2,
          )}) 0%, transparent 70%), linear-gradient(to bottom, ${zenith} 0%, ${horizon} 62%, ${paper} 100%)`,
        }}
      />
    );
  }

  return <div ref={hostRef} className={`h-full w-full ${className}`} />;
}

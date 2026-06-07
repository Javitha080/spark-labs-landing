import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

// ──────────────────────────────────────────────
// Vertex Shader — full-screen quad
// ──────────────────────────────────────────────
const VS_SOURCE = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// ──────────────────────────────────────────────
// Fragment Shader — Production-Grade Liquid Glass
//
// Implements (inspired by @ybouane/liquidglass):
//   • Pill-bevel height field with fluid wave overlay
//   • Biconvex dual-surface refraction model
//   • 4-light Blinn-Phong specular (multi-lobe)
//   • Chromatic aberration (dispersion) edge-weighted
//   • Micro-distortion frosted noise
//   • Fresnel + environment-like reflection
//   • Inner stroke / rim highlight
//   • Cool glass tint, saturation, brightness
//   • Interactive scroll-velocity & mouse ripple warping
//   • Smooth dark/light theme interpolation
// ──────────────────────────────────────────────
const FS_SOURCE = `
precision highp float;
varying vec2 v_uv;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_scroll_y;
uniform float u_scroll_speed;
uniform vec2  u_mouse;
uniform float u_mouse_speed;
uniform float u_theme;       // 0.0 = dark, 1.0 = light
uniform float u_dpr;         // device pixel ratio

// ────── Utility: pseudo-random hash ──────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ────── Smooth directional wave ──────
float wave(vec2 p, float speed, float freq, float angle) {
  float rad = angle * 3.14159265 / 180.0;
  vec2 dir = vec2(cos(rad), sin(rad));
  return sin(dot(p, dir) * freq + u_time * speed);
}

// ────── Rounded-rect SDF ──────
// Returns negative inside, positive outside, zero on edge.
float rrSDF(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + vec2(radius);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - radius;
}

// ────── Bevel height field (biconvex pill profile) ──────
// Produces a half-circle cross-section that peaks at center.
// d = distance inside from edge, zR = bevel z-radius.
float bevelHeight(float d, float zR) {
  if (d <= 0.0) return 0.0;
  if (d >= zR) return zR;
  return sqrt(d * (2.0 * zR - d));
}

// ────── Fluid wave height field ──────
// Combines multi-octave directional waves with interactive physics.
float fluidHeight(vec2 uv) {
  vec2 scrollOff = vec2(u_scroll_speed * 0.025, u_scroll_y * 0.00025);
  vec2 p = uv * 3.5 + scrollOff;

  // Mouse ripple interaction
  float distMouse = distance(uv * u_resolution, u_mouse);
  float mouseRipple = 0.0;
  if (distMouse < 250.0) {
    float rf = 1.0 - distMouse / 250.0;
    rf *= rf; // quadratic falloff for smoother edges
    mouseRipple = sin(distMouse * 0.1 - u_time * 8.0) * rf * u_mouse_speed * 0.18;
    // Secondary harmonic for richer ripple texture
    mouseRipple += sin(distMouse * 0.22 - u_time * 12.0) * rf * u_mouse_speed * 0.06;
  }

  float h = 0.0;
  // Primary slow wave — large undulation
  h += wave(p, 0.7,  2.0,  15.0) * 0.32;
  // Secondary cross-wave
  h += wave(p + vec2(u_time * 0.04, 0.0), 0.55, 3.8, -40.0) * 0.22;
  // Tertiary high-freq detail
  h += wave(p - vec2(0.0, u_time * 0.025), 1.1,  7.0, 110.0) * 0.14;
  // Fine ripple detail
  h += wave(p, 0.3, 12.0, 190.0) * 0.08;
  // Ultra-fine shimmer
  h += wave(p * 1.5, 1.6, 18.0, 65.0) * 0.04;
  // Very slow breathing wave
  h += wave(p * 0.4, 0.15, 0.8, -15.0) * 0.06;

  return h + mouseRipple;
}

void main() {
  vec2 uv = v_uv;
  vec2 pxCoord = uv * u_resolution;

  // ── Panel geometry (pill-shaped header bar) ──
  vec2 panelSize = u_resolution;
  vec2 halfSize = panelSize * 0.5;
  float cornerRadius = min(halfSize.y, halfSize.x * 0.15);
  float zRadius = min(halfSize.y * 0.65, 45.0 * u_dpr);
  vec2 localPx = pxCoord - halfSize;
  float sdf = rrSDF(localPx, halfSize, cornerRadius);

  // Anti-aliased panel mask
  float mask = 1.0 - smoothstep(-1.5, 0.5, sdf);
  if (mask < 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float inside = -sdf;
  float maxD = min(halfSize.x, halfSize.y);
  float edge = smoothstep(maxD * 0.35, 0.0, inside);

  // ── Bevel height & surface normal (top surface) ──
  float e = 2.0;
  float dC = inside;
  float dR = -rrSDF(localPx + vec2(e, 0.0), halfSize, cornerRadius);
  float dL = -rrSDF(localPx - vec2(e, 0.0), halfSize, cornerRadius);
  float dU = -rrSDF(localPx + vec2(0.0, e), halfSize, cornerRadius);
  float dD = -rrSDF(localPx - vec2(0.0, e), halfSize, cornerRadius);

  float hC = bevelHeight(dC, zRadius);
  float hR = bevelHeight(dR, zRadius);
  float hL = bevelHeight(dL, zRadius);
  float hU = bevelHeight(dU, zRadius);
  float hD = bevelHeight(dD, zRadius);

  // Gradient of height field → surface normal
  vec2 bevelGrad = vec2(hR - hL, hU - hD) / (2.0 * e);

  // ── Fluid wave normal overlay ──
  vec2 eps = vec2(1.5 / u_resolution.x, 1.5 / u_resolution.y);
  float fH   = fluidHeight(uv);
  float fH_r = fluidHeight(uv + vec2(eps.x, 0.0));
  float fH_u = fluidHeight(uv + vec2(0.0, eps.y));
  vec2 fluidGrad = vec2(fH_r - fH, fH_u - fH) / eps * 0.008;

  // Combine bevel structural normal with fluid perturbation
  vec2 totalGrad = bevelGrad + fluidGrad * smoothstep(0.0, zRadius * 0.5, inside);
  vec3 N = normalize(vec3(-totalGrad, 1.0));

  float depth = smoothstep(0.0, zRadius, inside);

  // ── Biconvex dual-surface refraction ──
  float ior = 1.5;
  float refrPow = 1.0 - 1.0 / ior;
  float thickness = hC * 2.0;
  float thickNorm = thickness / max(zRadius * 2.0, 1.0);
  vec2 pxToUV = vec2(1.0, -1.0) / u_resolution;
  float refrStrength = mix(0.65, 0.35, u_theme);

  // Entry + exit refraction + through-thickness magnification
  vec2 exitRefr = totalGrad * refrPow;
  vec2 entryRefr = totalGrad * refrPow;
  vec2 throughRefr = entryRefr * thickNorm * 0.5;
  vec2 refrPx = (exitRefr + entryRefr + throughRefr) * refrStrength * 30.0;

  // Center-pull magnification (biconvex lens effect)
  vec2 centerDir = -localPx / max(halfSize, vec2(1.0));
  refrPx += centerDir * refrStrength * 4.0 * depth;

  vec2 refr = refrPx * pxToUV;

  // ── Micro-distortion noise (frosted glass grain) ──
  vec2 ns = localPx * 0.08;
  vec2 absPxToUV = vec2(1.0) / u_resolution;
  float distortStrength = mix(0.25, 0.1, u_theme);
  vec2 micro = (vec2(hash(ns), hash(ns + vec2(37.0))) - 0.5) * distortStrength * 4.0 * absPxToUV;

  // ── Chromatic aberration (spectral dispersion) ──
  float caStrength = mix(0.85, 0.4, u_theme);
  float caS = caStrength * 18.0 * (edge * 0.7 + 0.3) * 2.0;
  vec2 caD = N.xy * caS * pxToUV;

  // Sample base coordinates (refraction + micro-distortion)
  vec2 base = uv + refr + micro;

  // ── Displaced height samples for chromatic color mapping ──
  float rH = fluidHeight(base + caD);
  float gH = fH;
  float bH = fluidHeight(base - caD);

  // ── Theme-aware base color ──
  // Dark: deep obsidian translucency with violet accents
  vec4 darkBase  = vec4(0.025, 0.025, 0.045, 0.42);
  vec3 darkTint  = vec3(0.92, 0.94, 1.06);
  // Light: pristine crystal glass, extremely transparent
  vec4 lightBase = vec4(0.97, 0.97, 1.0, 0.08);
  vec3 lightTint = vec3(0.95, 0.97, 1.03);

  vec4 baseColor = mix(darkBase, lightBase, u_theme);
  vec3 glassTint = mix(darkTint, lightTint, u_theme);

  // ── Chromatic glow from dispersion ──
  float chromaDiff = rH - bH;
  vec3 darkChroma  = vec3(0.35, 0.14, 0.60) * chromaDiff * 2.5;
  vec3 lightChroma = vec3(0.15, 0.32, 0.75) * chromaDiff * 1.6;
  vec3 chroma = mix(darkChroma, lightChroma, u_theme);

  // ── Color composition ──
  vec3 col = baseColor.rgb;
  col += chroma;
  col *= glassTint;

  // ── Brightness & Saturation ──
  float brightness = mix(0.06, 0.03, u_theme);
  col *= 1.0 + brightness;
  col *= 1.0 + 0.06 * depth;

  float satBoost = mix(0.15, 0.05, u_theme);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.0 + satBoost);

  // ── Fresnel reflection ──
  float fresnelStrength = mix(1.0, 0.6, u_theme);
  float fres = pow(1.0 - abs(N.z), 4.0) * fresnelStrength;

  // ── Multi-light Blinn-Phong specular (4 lights) ──
  float specStrength = mix(0.45, 0.25, u_theme);
  vec3 V = vec3(0.0, 0.0, 1.0);

  // Light 1: Primary gloss (top-right key light)
  vec3 L1 = normalize(vec3(0.4, 0.7, 1.0));
  vec3 H1 = normalize(L1 + V);
  float sp1 = pow(max(dot(N, H1), 0.0), 90.0);

  // Light 2: Secondary fill (bottom-left)
  vec3 L2 = normalize(vec3(-0.3, -0.5, 1.0));
  vec3 H2 = normalize(L2 + V);
  float sp2 = pow(max(dot(N, H2), 0.0), 50.0) * 0.3;

  // Light 3: Broad ambient glow
  vec3 L3 = normalize(vec3(0.1, 0.3, 1.0));
  float spB = pow(max(dot(N, L3), 0.0), 6.0) * 0.1;

  // Light 4: Sharp studio glint (top)
  vec3 L4 = normalize(vec3(0.0, 0.9, 0.4));
  vec3 H4 = normalize(L4 + V);
  float sp4 = pow(max(dot(N, H4), 0.0), 120.0) * 0.6;

  float totalSpec = (sp1 + sp2 + spB + sp4) * specStrength;

  // ── Inner stroke / border highlight ──
  float borderWidth = 1.5 * u_dpr;
  float innerStroke = smoothstep(-borderWidth - 1.0, -borderWidth, sdf)
                    * (1.0 - smoothstep(-1.0, 0.0, sdf));
  // Top-bias: stroke is brighter at the top edge (simulates overhead light)
  float topBias = 0.5 + 0.5 * (-localPx.y / halfSize.y);
  innerStroke *= (0.4 + 0.6 * topBias);
  float edgeHLStrength = mix(0.22, 0.12, u_theme);

  // ── Edge rim highlight & inner glow ──
  float rim = edge * edgeHLStrength;
  float innerGlow = smoothstep(5.0 * u_dpr, 0.0, -sdf) * edgeHLStrength * 0.6;

  // ── Environment-like reflection (fake sky dome) ──
  float envRefl = (N.y * 0.5 + 0.5) * fres * 0.08;

  // ── Valley shadow (dark mode only) ──
  float shadow = mix(smoothstep(0.08, -0.08, fH), 0.0, u_theme) * 0.10;

  // ── Final composite ──
  vec3 specColor = mix(vec3(0.94, 0.88, 1.0), vec3(1.0), u_theme);
  vec3 fin = col;
  fin += totalSpec * specColor;
  fin += vec3(rim + innerGlow);
  fin += vec3(innerStroke * edgeHLStrength * 0.55);
  fin += vec3(envRefl);
  fin = mix(fin, vec3(1.0), fres * 0.18);
  fin -= shadow;

  // ── Alpha: base + specular/fresnel shine boost ──
  float alpha = baseColor.a + totalSpec * 0.4 + fres * 0.3;
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(fin, mask * alpha);
}
`;

// ──────────────────────────────────────────────
// React Component
// ──────────────────────────────────────────────
export const WebGLLiquidGlass = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  // Store mutable physics state outside React render cycle
  const stateRef = useRef({
    startTime: 0,
    frameId: 0,
    lastScrollY: 0,
    targetScrollSpeed: 0,
    currentScrollSpeed: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    currentMouseX: 0,
    currentMouseY: 0,
    targetMouseSpeed: 0,
    currentMouseSpeed: 0,
    targetTheme: 0,
    currentTheme: 0,
    lastFrameTime: 0,
  });

  const compileShader = useCallback((gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("WebGLLiquidGlass shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Bail if the user prefers reduced motion ──
    // Without this the rAF render loop keeps the GPU busy every frame and
    // can throttle the whole page on lower-end devices. CSS already hides
    // most decorative motion, but the WebGL loop is JS-driven.
    const reducedMotionMQ =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    if (reducedMotionMQ?.matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,        // Not needed for fullscreen quad
      premultipliedAlpha: true, // Match browser compositing
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn("WebGLLiquidGlass: WebGL unavailable, CSS fallback active.");
      return;
    }

    // Enable alpha blending for proper compositing
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Compile shaders
    const vs = compileShader(gl, VS_SOURCE, gl.VERTEX_SHADER);
    const fs = compileShader(gl, FS_SOURCE, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("WebGLLiquidGlass link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Full-screen quad geometry
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const loc = {
      resolution:  gl.getUniformLocation(program, "u_resolution"),
      time:        gl.getUniformLocation(program, "u_time"),
      scrollY:     gl.getUniformLocation(program, "u_scroll_y"),
      scrollSpeed: gl.getUniformLocation(program, "u_scroll_speed"),
      mouse:       gl.getUniformLocation(program, "u_mouse"),
      mouseSpeed:  gl.getUniformLocation(program, "u_mouse_speed"),
      theme:       gl.getUniformLocation(program, "u_theme"),
      dpr:         gl.getUniformLocation(program, "u_dpr"),
    };

    // State
    const s = stateRef.current;
    s.startTime = performance.now();
    s.lastScrollY = window.scrollY;
    s.targetTheme = document.documentElement.classList.contains("dark") ? 0.0 : 1.0;
    s.currentTheme = s.targetTheme;
    s.lastFrameTime = s.startTime;

    // ── Resize ──
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(loc.resolution, w, h);
        gl.uniform1f(loc.dpr, dpr);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    const parentEl = canvas.parentElement;
    if (parentEl) resizeObserver.observe(parentEl);

    // ── Scroll physics ──
    const handleScroll = () => {
      const y = window.scrollY;
      s.targetScrollSpeed = y - s.lastScrollY;
      s.lastScrollY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // ── Mouse physics ──
    const handleMouseMove = (e: MouseEvent) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.targetMouseX = (e.clientX - rect.left) * dpr;
      s.targetMouseY = (rect.height - (e.clientY - rect.top)) * dpr;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      s.targetMouseSpeed = Math.sqrt(dx * dx + dy * dy);
    };
    if (parentEl) {
      parentEl.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    // ── Visibility / viewport gating ──
    // Pause the rAF loop when the tab is hidden or the canvas is offscreen.
    // Without this, a Header-mounted instance keeps rendering on every page
    // (even when the user is reading content far down a long page) and on
    // background tabs, eating GPU and main-thread time until the page
    // visibly freezes.
    let isPageVisible = !document.hidden;
    let isOnScreen = true;
    const intersectionObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            const wasRunning = isPageVisible && isOnScreen;
            isOnScreen = entry.isIntersecting;
            const nowRunning = isPageVisible && isOnScreen;
            if (!wasRunning && nowRunning) startLoop();
          },
          { rootMargin: "200px" },
        )
      : null;
    intersectionObserver?.observe(canvas);

    const handleVisibility = () => {
      const wasRunning = isPageVisible && isOnScreen;
      isPageVisible = !document.hidden;
      const nowRunning = isPageVisible && isOnScreen;
      if (!wasRunning && nowRunning) startLoop();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) cancelAnimationFrame(s.frameId);
    };
    reducedMotionMQ?.addEventListener?.("change", handleReducedMotionChange);

    // ── Render loop with delta-time normalization ──
    const render = (now: number) => {
      if (!isPageVisible || !isOnScreen) {
        s.frameId = 0;
        return;
      }
      const dt = Math.min((now - s.lastFrameTime) / 16.667, 3.0); // normalize to 60fps
      s.lastFrameTime = now;

      const elapsed = (now - s.startTime) / 1000.0;
      gl.uniform1f(loc.time, elapsed);

      // Scroll physics: critically-damped spring
      s.currentScrollSpeed += (s.targetScrollSpeed - s.currentScrollSpeed) * 0.08 * dt;
      s.targetScrollSpeed *= Math.pow(0.88, dt);
      gl.uniform1f(loc.scrollY, window.scrollY);
      gl.uniform1f(loc.scrollSpeed, s.currentScrollSpeed);

      // Mouse physics: spring-damped position + velocity decay
      s.currentMouseX += (s.targetMouseX - s.currentMouseX) * 0.12 * dt;
      s.currentMouseY += (s.targetMouseY - s.currentMouseY) * 0.12 * dt;
      s.currentMouseSpeed += (s.targetMouseSpeed - s.currentMouseSpeed) * 0.07 * dt;
      s.targetMouseSpeed *= Math.pow(0.88, dt);
      gl.uniform2f(loc.mouse, s.currentMouseX, s.currentMouseY);
      gl.uniform1f(loc.mouseSpeed, s.currentMouseSpeed);

      // Theme transition: smooth 300ms interpolation
      s.targetTheme = document.documentElement.classList.contains("dark") ? 0.0 : 1.0;
      s.currentTheme += (s.targetTheme - s.currentTheme) * 0.1 * dt;
      gl.uniform1f(loc.theme, s.currentTheme);

      // Draw
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      s.frameId = requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (s.frameId) return;
      s.lastFrameTime = performance.now();
      s.frameId = requestAnimationFrame(render);
    };
    startLoop();

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(s.frameId);
      s.frameId = 0;
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotionMQ?.removeEventListener?.("change", handleReducedMotionChange);
      intersectionObserver?.disconnect();
      if (parentEl) {
        parentEl.removeEventListener("mousemove", handleMouseMove);
      }
      resizeObserver.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [theme, compileShader]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full pointer-events-none rounded-[inherit]"
      style={{
        zIndex: -1,
        isolation: "isolate",
      }}
    />
  );
};

export default WebGLLiquidGlass;

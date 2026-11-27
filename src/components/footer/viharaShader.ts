/**
 * Three.js Custom GLSL Vegetation Wind Shader (Vihara v3 — 6-Body Independent Physics)
 * Calibrated to the 1280x720 UNCROPPED woodblock pavilion & grove plate
 * (vihara-pavilion-fulltrees.webp) and upgraded with:
 *   - 6 independent structural body spring-mass uniforms (left tree, left palm, right palm,
 *     right tree, courtyard hedges, vortex leaf flutter) for West -> East traveling gusts
 *   - Smooth horizontal edge-guard preventing UV clamp smearing at x=0 and x=1 on peak gusts
 *   - Tightened left pavilion outer-wall lock shield keeping masonry 100% razor-straight
 *   - Dynamic Atmosphere Preset paper & sunlight/moonlight dapple + native YICDVP Dark
 *     Night-Blueprint (`uDarkMode` 0..1) shader pass
 *   - Shared singleton 640x360 RGBA control mask (`getSharedViharaControlMaskCanvas`)
 *
 * Control Mask Channels (RGBA, 640x360):
 *   R = Palm frond cantilever flexibility (r^2 from crown heart -> tips; 0 on trunks/masonry)
 *   G = Flanking tree crowns & garden hedges height-squared bending (H^2 from trunk base -> top leaves)
 *   B = Smooth 2.5D sculptural depth map for pointer parallax (0.04 sky -> 1.0 foreground palms)
 *   A = Per-branch spatial phase offset (CryEngine detail flutter de-synchronization)
 */

export const VIHARA_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const VIHARA_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uImage;
  uniform sampler2D uMask;
  uniform float uTime;
  uniform float uReveal;
  uniform float uWindStrength;
  uniform float uGustIntensity;
  uniform float uLeftTreeBend;
  uniform float uLeftPalmBend;
  uniform float uRightPalmBend;
  uniform float uRightTreeBend;
  uniform float uHedgeRustle;
  uniform float uLeafFlutter;
  uniform float uParallaxStrength;
  uniform float uWheelAngle;
  uniform float uWheelGlow;
  uniform float uDarkMode;
  uniform float uTextureReady;
  uniform vec3 uPaperColor;
  uniform vec3 uSunColor;
  uniform float uSunbeamIntensity;
  uniform vec2 uMouse;
  uniform vec2 uImageSize;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * noise2D(p);
      p = p * 2.03 + vec2(17.1, 31.7);
      amp *= 0.5;
    }
    return v;
  }

  float smoothWave(float x) {
    float v = abs(fract(x + 0.5) * 2.0 - 1.0);
    return v * v * (3.0 - 2.0 * v) * 2.0 - 1.0;
  }

  void main() {
    vec2 uv = vUv;
    vec4 mask = texture2D(uMask, uv);
    float depthVal = mask.b;

    // 1. Subtle 2.5D Sculptural Depth Parallax driven by smooth pointer position
    vec2 parallaxOffset = vec2(
      -uMouse.x * (depthVal - 0.45) * 0.0072 * uParallaxStrength,
       uMouse.y * (depthVal - 0.45) * 0.0044 * uParallaxStrength
    );
    vec2 baseUv = clamp(uv + parallaxOffset, vec2(0.0005), vec2(0.9995));

    // Re-sample GPU control mask at parallaxed UV so rigid architectural shields stay 100% locked
    vec4 sm = texture2D(uMask, baseUv);
    float palmFlex   = sm.r;
    float canopyFlex = sm.g;
    float phaseByte  = sm.a;
    float phaseRad   = phaseByte * 6.28318;

    // 2. Spatial Region Partitioning for 6 Independent Structural Bodies
    float leftPalmMask  = 1.0 - smoothstep(0.45, 0.55, baseUv.x);
    float rightPalmMask = smoothstep(0.45, 0.55, baseUv.x);
    float leftTreeMask  = 1.0 - smoothstep(0.28, 0.36, baseUv.x);
    float rightTreeMask = smoothstep(0.72, 0.80, baseUv.x);
    float hedgeMask     = 1.0 - smoothstep(0.18, 0.28, baseUv.y); // Bottom courtyard hedges (uv.y = 0 at bottom)

    float windActive = clamp(uWindStrength, 0.0, 2.5);
    float localPalmBend = uLeftPalmBend * leftPalmMask + uRightPalmBend * rightPalmMask;
    float localTreeBend = mix(
      uLeftTreeBend * leftTreeMask + uRightTreeBend * rightTreeMask,
      uHedgeRustle,
      hedgeMask
    );

    // 2A. PALM FRONDS: Elastic cantilevered bending with independent left/right whippy sway
    float palmPrimary = localPalmBend * 0.0052 + smoothWave(uTime * 0.24 - baseUv.x * 0.5 + phaseByte * 0.35) * 0.0014 * windActive;
    float palmDetail  = sin(uTime * 3.15 + phaseRad + baseUv.y * 15.0 - baseUv.x * 9.0) * (0.00075 + 0.00085 * uGustIntensity) * windActive;
    float palmTotalX  = (palmPrimary + palmDetail) * palmFlex;
    float palmDroopY  = (-abs(palmTotalX) * 0.44 + cos(uTime * 2.25 + phaseRad + baseUv.x * 8.5) * 0.00095 * windActive) * palmFlex;

    // 2B. FLANKING TREE CROWNS & HEDGES: Independent Left Tree, Right Tree & Hedge Rustle
    float treeMainX  = localTreeBend * 0.0044 + smoothWave(uTime * 0.17 - baseUv.x * 0.6 + phaseByte * 0.28) * 0.0012 * windActive;
    float leafMicroX = sin(uTime * 4.1 + phaseRad * 1.4 + baseUv.x * 24.0 + baseUv.y * 19.0) * (0.00055 + 0.00095 * abs(uLeafFlutter)) * windActive;
    float leafMicroY = cos(uTime * 3.4 + phaseRad - baseUv.x * 17.0 + baseUv.y * 22.0) * (0.00045 + 0.00075 * abs(uLeafFlutter)) * windActive;

    vec2 treeDisp = vec2(
      (treeMainX + leafMicroX) * canopyFlex,
      (-abs(treeMainX) * 0.28 + leafMicroY) * canopyFlex
    );

    // Smooth horizontal edge-guard prevents UV clamp smearing at x=0 and x=1 during peak wind gusts
    float edgeGuard = smoothstep(0.0, 0.048, baseUv.x) * smoothstep(1.0, 0.952, baseUv.x);
    vec2 totalDisp = (vec2(palmTotalX, palmDroopY) + treeDisp) * vec2(edgeGuard, 1.0);
    totalDisp = clamp(totalDisp, vec2(-0.0082, -0.006), vec2(0.0082, 0.006));
    vec2 sampleUv = clamp(baseUv - totalDisp, vec2(0.0008), vec2(0.9992));

    // 3. Sacred Dhamma Chakra Meditative Rotation (exact 1280x720 center: 641.0, 147.0; radius 22.5px)
    vec2 wheelCenterUv = vec2(641.0 / uImageSize.x, 1.0 - 147.0 / uImageSize.y);
    vec2 wheelDeltaPx = vec2(
      (baseUv.x - wheelCenterUv.x) * uImageSize.x,
      (baseUv.y - wheelCenterUv.y) * uImageSize.y
    );
    float wheelDistPx = length(wheelDeltaPx);
    float wheelInside = 1.0 - smoothstep(20.8, 22.6, wheelDistPx);

    if (wheelInside > 0.001) {
      float c = cos(uWheelAngle);
      float s = sin(uWheelAngle);
      vec2 rotPx = vec2(
        wheelDeltaPx.x * c - wheelDeltaPx.y * s,
        wheelDeltaPx.x * s + wheelDeltaPx.y * c
      );
      vec2 rotUv = wheelCenterUv + vec2(rotPx.x / uImageSize.x, rotPx.y / uImageSize.y);
      sampleUv = mix(sampleUv, rotUv, wheelInside);
    }

    vec3 rawTex = texture2D(uImage, sampleUv).rgb;
    float luma = dot(rawTex, vec3(0.299, 0.587, 0.114));
    float skyPaperMask = smoothstep(0.86, 0.94, luma);

    // Shared organic sunlit/moonlit canopy dapple + diagonal atmospheric wave
    float canopyDapple = sin(baseUv.x * 16.0 - uTime * 0.45 + localTreeBend * 3.5) * cos(baseUv.y * 12.0 + uTime * 0.35);
    float sunWave = sin(baseUv.x * 2.8 - baseUv.y * 1.3 - uTime * 0.22) * 0.5 + 0.5;
    float wheelHalo = exp(-pow(wheelDistPx / 34.0, 2.0)) * (0.5 + 0.5 * sin(uTime * 1.15)) * uWheelGlow;

    // 4a. Day Parchment Woodblock pass (harmonized seamlessly to active preset paper color!)
    vec3 dayPaper = uPaperColor;
    vec3 basePaper = vec3(246.0 / 255.0, 235.0 / 255.0, 216.0 / 255.0);
    vec3 presetPaperShift = dayPaper - basePaper;
    vec3 tintedTex = clamp(rawTex + presetPaperShift * smoothstep(0.45, 0.92, luma), 0.0, 1.0);
    vec3 dayColor = mix(tintedTex, dayPaper, skyPaperMask * 0.97);

    float dappleStrength = smoothstep(0.2, 0.95, canopyDapple) * (canopyFlex + palmFlex) * 0.032 * uSunbeamIntensity;
    dayColor = mix(dayColor, uSunColor, clamp(dappleStrength, 0.0, 0.08) * (1.0 - skyPaperMask));

    float sunFactor = smoothstep(0.38, 0.95, sunWave) * 0.022 * uSunbeamIntensity * (1.0 - skyPaperMask);
    dayColor = mix(dayColor, uSunColor, sunFactor);
    dayColor = mix(dayColor, mix(vec3(0.99, 0.93, 0.76), uSunColor, 0.45), wheelHalo * 0.16 * (1.0 - wheelInside));

    // 4b. Dark Mode Etched Copperplate / Warm Ivory-on-Obsidian Woodblock pass
    // Calibrated to YICDVP Carbon Black (#080808 / #0A0908) + Ignition Ember (#F8741F):
    // - Paper background maps 100% seamlessly to uPaperColor (zero horizon seam)
    // - Sculptural S-curve + 1px engraved line micro-contrast keeps delicate twigs, fronds &
    //   hall architecture crisp in warm antique ivory while preventing broad shadow fills
    //   from blowing out into glaring snowy-white inverted blobs.
    vec2 pxStep = 1.0 / uImageSize;
    float lumaR = dot(texture2D(uImage, clamp(sampleUv + vec2(pxStep.x, 0.0), vec2(0.0008), vec2(0.9992))).rgb, vec3(0.299, 0.587, 0.114));
    float lumaU = dot(texture2D(uImage, clamp(sampleUv + vec2(0.0, pxStep.y), vec2(0.0008), vec2(0.9992))).rgb, vec3(0.299, 0.587, 0.114));
    float lineEdge = clamp((abs(luma - lumaR) + abs(luma - lumaU)) * 2.1, 0.0, 0.42);

    float rawInk = clamp((0.895 - luma) / 0.78, 0.0, 1.0);
    // Soft highlight rolloff prevents solid dark fills (tree trunks, corners) from turning blinding white
    float sculptedInk = pow(rawInk, 1.15) * (0.76 - 0.14 * smoothstep(0.68, 1.0, rawInk));
    float inkMask = smoothstep(0.04, 0.90, rawInk);

    vec3 charcoalMid = vec3(0.32, 0.29, 0.26); // warm graphite-bronze halftone
    vec3 ivoryEtch   = vec3(0.80, 0.75, 0.67); // refined antique parchment-ivory engraving ink
    vec3 emberEdge   = mix(vec3(0.90, 0.84, 0.75), uSunColor, 0.22);

    vec3 nightInk = mix(charcoalMid, ivoryEtch, smoothstep(0.10, 0.78, sculptedInk));
    nightInk = mix(nightInk, emberEdge, lineEdge * 0.65);
    vec3 nightColor = mix(uPaperColor, nightInk, inkMask * (0.72 + lineEdge * 0.52));

    // Subtle warm moonlight/ember canopy dapple + Ignition-Ember halo behind the spinning Dhamma Chakra
    float nightDapple = smoothstep(0.28, 0.95, canopyDapple) * (canopyFlex + palmFlex) * 0.055 * uSunbeamIntensity;
    nightColor = mix(nightColor, uSunColor, clamp(nightDapple, 0.0, 0.10) * inkMask);

    float moonFactor = smoothstep(0.38, 0.95, sunWave) * 0.036 * (1.0 - skyPaperMask);
    nightColor = mix(nightColor, mix(vec3(0.11, 0.09, 0.07), uSunColor * 0.22, 0.45), moonFactor * (1.0 - inkMask * 0.55));
    nightColor = mix(nightColor, vec3(0.97, 0.49, 0.14), wheelHalo * 0.28 * (1.0 - wheelInside * 0.65));

    vec3 shadedColor = mix(dayColor, nightColor, uDarkMode);

    // 5. Top-to-Bottom Feathered Organic Ink-Mist Reveal (ZERO top-edge clipping!)
    float topDownY = 1.0 - uv.y;
    float mistNoise = (fbm(uv * vec2(7.5, 4.5) + vec2(0.0, uTime * 0.05)) - 0.5) * 0.13;
    float mistFront = uReveal * 1.34 - 0.16;
    float revealAlpha = 1.0 - smoothstep(mistFront - 0.18, mistFront + 0.08, topDownY + mistNoise);
    revealAlpha *= smoothstep(0.0, 0.04, uReveal);
    revealAlpha = mix(revealAlpha, 1.0, smoothstep(0.96, 1.0, uReveal));

    // Guard against pre-upload 1x1 black WebGL texture inverting into a white flash in Dark Mode
    vec3 finalColor = mix(uPaperColor, shadedColor, revealAlpha * uTextureReady);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const VIHARA_MOTES_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aTint;

  uniform float uTime;
  uniform float uReveal;
  uniform float uWindSpeed;
  uniform float uPixelRatio;
  uniform vec2 uMouse;

  varying float vAlpha;
  varying float vTint;

  void main() {
    vec3 pos = position;

    float driftX = mod(pos.x + 1.15 + uTime * aSpeed * (0.014 + 0.022 * uWindSpeed), 2.30) - 1.15;
    float driftY = pos.y + sin(uTime * 0.52 + aPhase) * 0.04 + cos(uTime * 0.29 + aPhase * 1.7) * 0.018;

    driftX -= uMouse.x * 0.022 * (0.5 + aTint);
    driftY += uMouse.y * 0.015 * (0.5 + aTint);

    gl_Position = vec4(driftX, driftY, 0.0, 1.0);
    gl_PointSize = aSize * uPixelRatio;

    float twinkle = 0.42 + 0.58 * sin(uTime * 1.05 + aPhase * 2.3);
    float edgeFade = smoothstep(-1.12, -0.85, driftX) * (1.0 - smoothstep(0.85, 1.12, driftX));
    vAlpha = twinkle * edgeFade * smoothstep(0.25, 0.95, uReveal);
    vTint = aTint;
  }
`;

export const VIHARA_MOTES_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform float uDarkMode;
  uniform vec3 uSunColor;

  varying float vAlpha;
  varying float vTint;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;

    float soft = smoothstep(0.5, 0.08, d);
    vec3 dayIndigo = vec3(0.16, 0.25, 0.54);
    vec3 dayGold   = mix(vec3(0.76, 0.60, 0.26), uSunColor, 0.35);
    vec3 dayCol    = mix(dayIndigo, dayGold, vTint);

    vec3 nightMoon  = mix(vec3(0.84, 0.78, 0.69), uSunColor, 0.35);
    vec3 nightEmber = vec3(0.97, 0.49, 0.14);
    vec3 nightCol   = mix(nightMoon, nightEmber, vTint);

    vec3 col = mix(dayCol, nightCol, uDarkMode);
    float opacityScale = mix(0.42, 0.54, uDarkMode);

    gl_FragColor = vec4(col, soft * vAlpha * opacityScale);
  }
`;

/**
 * Procedurally paints the surgical 640x360 RGBA Control Mask calibrated to 1280x720
 * vihara-pavilion-fulltrees.webp.
 */
export function createViharaControlMaskCanvas(): HTMLCanvasElement | null {
  const W = 640;
  const H = 360;

  const makeChannel = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    return { c, ctx };
  };

  const red = makeChannel();
  const green = makeChannel();
  const blue = makeChannel();
  const alpha = makeChannel();
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const outCtx = out.getContext("2d");

  if (!red || !green || !blue || !alpha || !outCtx) return null;

  // --- RED CHANNEL: Twin Palm Frond Cantilever Flex (r^2 from stem heart outward) ---
  {
    const ctx = red.ctx;
    ctx.save();
    ctx.filter = "blur(9px)";

    const paintPalmCrown = (
      cxPct: number,
      cyPct: number,
      rxPct: number,
      ryPct: number,
      heartXPct: number,
      heartYPct: number,
    ) => {
      ctx.save();
      ctx.translate(cxPct * W, cyPct * H);
      ctx.scale(rxPct * W, ryPct * H);
      const grad = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
      grad.addColorStop(0.0, "rgba(255,255,255,0.22)");
      grad.addColorStop(0.42, "rgba(255,255,255,0.85)");
      grad.addColorStop(0.78, "rgba(255,255,255,1.0)");
      grad.addColorStop(1.0, "rgba(255,255,255,0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const hx = heartXPct * W;
      const hy = heartYPct * H;
      const pinGrad = ctx.createRadialGradient(hx, hy, 2, hx, hy, 24);
      pinGrad.addColorStop(0.0, "rgba(0,0,0,0.92)");
      pinGrad.addColorStop(0.55, "rgba(0,0,0,0.38)");
      pinGrad.addColorStop(1.0, "rgba(0,0,0,0.0)");
      ctx.fillStyle = pinGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, 24, 0, Math.PI * 2);
      ctx.fill();
    };

    // Tightened v3 coordinates with strict left pavilion outer-wall lock shield
    paintPalmCrown(0.338, 0.495, 0.088, 0.18, 0.348, 0.455);
    paintPalmCrown(0.725, 0.475, 0.11, 0.175, 0.72, 0.445);

    ctx.fillStyle = "#000";
    ctx.fillRect(0.215 * W, 0.34 * H, 0.048 * W, 0.46 * H);
    ctx.fillRect(0.415 * W, 0, 0.19 * W, H);
    ctx.fillRect(0.2 * W, 0.15 * H, 0.6 * W, 0.18 * H);
    ctx.fillRect(0, 0.7 * H, W, 0.3 * H);
    ctx.restore();
  }

  // --- GREEN CHANNEL: Full Uncropped Tree Crowns (H^2 from trunk base) & Garden Hedges ---
  {
    const ctx = green.ctx;
    ctx.save();
    ctx.filter = "blur(10px)";

    const leftGrad = ctx.createLinearGradient(0, 0.02 * H, 0, 0.64 * H);
    leftGrad.addColorStop(0.0, "rgba(255,255,255,1.0)");
    leftGrad.addColorStop(0.45, "rgba(255,255,255,0.88)");
    leftGrad.addColorStop(0.85, "rgba(255,255,255,0.42)");
    leftGrad.addColorStop(1.0, "rgba(255,255,255,0.12)");
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0.268 * W, 0);
    ctx.lineTo(0.262 * W, 0.27 * H);
    ctx.lineTo(0.188 * W, 0.36 * H);
    ctx.lineTo(0.188 * W, 0.58 * H);
    ctx.lineTo(0, 0.62 * H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.beginPath();
    ctx.ellipse(0.095 * W, 0.71 * H, 0.115 * W, 0.105 * H, 0, 0, Math.PI * 2);
    ctx.fill();

    const rightGrad = ctx.createLinearGradient(0, 0.05 * H, 0, 0.78 * H);
    rightGrad.addColorStop(0.0, "rgba(255,255,255,1.0)");
    rightGrad.addColorStop(0.5, "rgba(255,255,255,0.85)");
    rightGrad.addColorStop(1.0, "rgba(255,255,255,0.48)");
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.moveTo(0.805 * W, 0.04 * H);
    ctx.lineTo(W, 0.04 * H);
    ctx.lineTo(W, 0.79 * H);
    ctx.lineTo(0.79 * W, 0.79 * H);
    ctx.lineTo(0.825 * W, 0.39 * H);
    ctx.lineTo(0.795 * W, 0.24 * H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(0.05 * W, 0.835 * H, 0.242 * W, 0.085 * H);
    ctx.fillRect(0.565 * W, 0.822 * H, 0.105 * W, 0.095 * H);
    ctx.fillRect(0.795 * W, 0.835 * H, 0.205 * W, 0.085 * H);

    ctx.fillStyle = "#000";
    ctx.fillRect(0.228 * W, 0.2 * H, 0.545 * W, 0.62 * H);
    ctx.fillRect(0.425 * W, 0.7 * H, 0.145 * W, 0.3 * H);
    ctx.fillRect(0.295 * W, 0.82 * H, 0.118 * W, 0.18 * H);
    ctx.fillRect(0.672 * W, 0.82 * H, 0.118 * W, 0.18 * H);
    ctx.fillRect(0.025 * W, 0.48 * H, 0.055 * W, 0.22 * H);
    ctx.restore();
  }

  // --- BLUE CHANNEL: Smooth 2.5D Sculptural Depth Map ---
  {
    const ctx = blue.ctx;
    ctx.fillStyle = "rgb(14,14,14)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.filter = "blur(16px)";

    ctx.fillStyle = "rgb(88,88,88)";
    ctx.fillRect(0, 0.02 * H, 0.26 * W, 0.82 * H);
    ctx.fillRect(0.79 * W, 0.05 * H, 0.21 * W, 0.8 * H);

    ctx.fillStyle = "rgb(144,144,144)";
    ctx.fillRect(0.2 * W, 0.22 * H, 0.6 * W, 0.62 * H);
    ctx.beginPath();
    ctx.arc(0.5 * W, 0.205 * H, 0.036 * W, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgb(200,200,200)";
    ctx.fillRect(0, 0.78 * H, W, 0.22 * H);

    ctx.fillStyle = "rgb(255,255,255)";
    ctx.beginPath();
    ctx.ellipse(0.34 * W, 0.5 * H, 0.09 * W, 0.18 * H, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0.3 * W, 0.62 * H, 0.105 * W, 0.38 * H);

    ctx.beginPath();
    ctx.ellipse(0.725 * W, 0.48 * H, 0.105 * W, 0.17 * H, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0.675 * W, 0.62 * H, 0.105 * W, 0.38 * H);
    ctx.restore();
  }

  // --- ALPHA CHANNEL: Smooth Spatial Phase Variation (CryEngine branch flutter de-sync) ---
  {
    const ctx = alpha.ctx;
    ctx.save();
    ctx.filter = "blur(12px)";
    const pockets = [
      [0.08, 0.16, 0.12, 220],
      [0.18, 0.32, 0.11, 90],
      [0.07, 0.46, 0.1, 175],
      [0.29, 0.44, 0.08, 240],
      [0.37, 0.52, 0.08, 65],
      [0.67, 0.45, 0.09, 200],
      [0.77, 0.42, 0.09, 110],
      [0.88, 0.22, 0.12, 235],
      [0.94, 0.48, 0.11, 80],
      [0.86, 0.65, 0.12, 165],
    ];
    for (const [px, py, rad, val] of pockets) {
      ctx.fillStyle = `rgb(${val},${val},${val})`;
      ctx.beginPath();
      ctx.arc(px * W, py * H, rad * W, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const outImg = outCtx.createImageData(W, H);
  const rData = red.ctx.getImageData(0, 0, W, H).data;
  const gData = green.ctx.getImageData(0, 0, W, H).data;
  const bData = blue.ctx.getImageData(0, 0, W, H).data;
  const aData = alpha.ctx.getImageData(0, 0, W, H).data;

  for (let i = 0; i < outImg.data.length; i += 4) {
    outImg.data[i] = rData[i];
    outImg.data[i + 1] = gData[i];
    outImg.data[i + 2] = bData[i];
    outImg.data[i + 3] = Math.max(12, aData[i]);
  }
  outCtx.putImageData(outImg, 0, 0);
  return out;
}

let sharedMaskCanvas: HTMLCanvasElement | null = null;

/** Singleton pre-baked 640x360 GPU control mask shared across route mounts */
export function getSharedViharaControlMaskCanvas(): HTMLCanvasElement | null {
  if (!sharedMaskCanvas) {
    sharedMaskCanvas = createViharaControlMaskCanvas();
  }
  return sharedMaskCanvas;
}

/**
 * Three.js WebGL2 Procedural Atmospheric Sky & Volumetric Sunbeam / Moonbeam Shader (Vihara v3)
 *
 * Renders an organic, physically inspired woodblock sky harmonized across both
 * YICDVP Light Parchment presets (Morning Mist, Golden Dusk, Monsoon Breeze) and
 * native Dark Night-Blueprint mode (`uDarkMode` 0..1):
 *  - Rayleigh zenith-to-horizon scattering gradient
 *  - High eastern solar / lunar disc + soft Mie forward-scattering aureole
 *  - Gentle diagonal volumetric crepuscular light shafts modulated by cloud shadows
 *  - Domain-warped FBM high-altitude atmospheric cirrus veil drifting with upper-air advection
 *  - Whisper-subtle high-zenith starlight glints in Night Blueprint mode
 *  - Guaranteed 100% seamless bottom fade to exact active `uPaperColor` (ZERO horizon seam)
 */

export const VIHARA_SKY_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const VIHARA_SKY_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uCloudAdvection;
  uniform float uReveal;
  uniform float uSunbeamIntensity;
  uniform float uHazeStrength;
  uniform float uDarkMode;
  uniform vec2 uMouse;
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uPaperColor;
  uniform vec3 uSunColor;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.53);
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
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; i++) {
      v += amp * noise2D(p);
      p = rot * p * 2.02 + vec2(13.7, 7.9);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 pUv = uv + vec2(-uMouse.x * 0.012, uMouse.y * 0.008);

    // 1. Rayleigh Zenith -> Horizon Scattering Gradient (uv.y = 1 zenith, 0 grove boundary)
    float altitude = clamp(uv.y, 0.0, 1.0);
    float rayleighCurve = pow(altitude, 0.78);
    vec3 skyCol = mix(uHorizonColor, uZenithColor, rayleighCurve);

    // 2. Solar / Lunar Aureole & Mie Forward Scattering
    vec2 sunPos = vec2(0.76 - uMouse.x * 0.015, 0.78 + uMouse.y * 0.01);
    vec2 sunDelta = vec2((uv.x - sunPos.x) * 1.65, uv.y - sunPos.y);
    float sunDist = length(sunDelta);
    float mieStrength = mix(1.0, 0.26, uDarkMode);
    float mieWide = exp(-sunDist * 2.2) * 0.34 * uSunbeamIntensity * mieStrength;
    float mieCore = exp(-sunDist * 7.5) * 0.42 * uSunbeamIntensity * mieStrength;
    skyCol = mix(skyCol, uSunColor, clamp(mieWide + mieCore, 0.0, mix(0.52, 0.16, uDarkMode)));

    // 3. Domain-Warped FBM High-Altitude Atmospheric Cirrus Veil
    float drift = uCloudAdvection * 0.032;
    vec2 cirrusCoord = vec2(pUv.x * 3.4 - drift, pUv.y * 5.8);
    float warp = fbm(cirrusCoord * 0.7 + vec2(uTime * 0.012, 0.0));
    float cirrus = fbm(cirrusCoord + vec2(warp * 0.85, -warp * 0.35));
    float upperMask = smoothstep(0.14, 0.65, uv.y) * (1.0 - smoothstep(0.90, 1.0, uv.y));
    float cirrusAlpha = smoothstep(0.50, 0.82, cirrus) * upperMask * mix(0.24, 0.09, uDarkMode) * uHazeStrength;
    vec3 dayCirrusTint = mix(uSunColor, vec3(0.99, 0.97, 0.92), 0.55);
    vec3 nightCirrusTint = mix(uSunColor, vec3(0.44, 0.39, 0.34), 0.52);
    vec3 cirrusTint = mix(dayCirrusTint, nightCirrusTint, uDarkMode);
    skyCol = mix(skyCol, cirrusTint, cirrusAlpha);

    // 4. Subtle Volumetric Crepuscular Sunbeams / Moonbeams
    vec2 toSun = uv - sunPos;
    float rayAngle = atan(toSun.y, toSun.x * 1.4);
    float rayNoise = fbm(vec2(rayAngle * 4.5 + uTime * 0.025, sunDist * 1.6 - drift * 0.4));
    float shaft = smoothstep(0.42, 0.78, rayNoise) * exp(-sunDist * 1.45) * smoothstep(0.06, 0.48, uv.y);
    skyCol = mix(skyCol, uSunColor, shaft * mix(0.16, 0.065, uDarkMode) * uSunbeamIntensity * uReveal);

    // 4b. Delicate Dark Mode high-altitude starlight glints (Night mode only)
    if (uDarkMode > 0.02) {
      vec2 starCell = floor(pUv * vec2(110.0, 48.0));
      float starRand = hash21(starCell);
      if (starRand > 0.987) {
        vec2 cellLocal = fract(pUv * vec2(110.0, 48.0)) - 0.5;
        float starDot = smoothstep(0.24, 0.02, length(cellLocal));
        float twinkle = 0.52 + 0.48 * sin(uTime * (0.9 + fract(starRand * 37.0) * 1.8) + starRand * 62.8);
        float starMask = smoothstep(0.32, 0.72, uv.y) * (1.0 - smoothstep(0.90, 1.0, uv.y)) * uDarkMode * uReveal;
        vec3 starCol = mix(vec3(0.92, 0.88, 0.80), vec3(0.98, 0.62, 0.28), step(0.993, starRand));
        skyCol += starCol * starDot * twinkle * starMask * 0.36;
      }
    }

    // 5. Whisper-fine analog cotton paper grain unifying sky & woodblock print
    float paperGrain = (hash21(floor(gl_FragCoord.xy * 0.75)) - 0.5) * mix(0.012, 0.006, uDarkMode);
    skyCol += vec3(paperGrain);

    // 6. Guaranteed 100% seamless blend at both top (into YICDVP #080808 dark page) and bottom (into uPaperColor)
    float topSeamBlend = smoothstep(0.84, 1.0, uv.y) * uDarkMode;
    skyCol = mix(skyCol, uZenithColor, topSeamBlend);
    float bottomSeamBlend = smoothstep(0.0, 0.26, uv.y);
    skyCol = mix(uPaperColor, skyCol, bottomSeamBlend);

    gl_FragColor = vec4(skyCol, 1.0);
  }
`;

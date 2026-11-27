export type DitherEngineSettings = {
  waveSpeed: number;
  waveFrequency: number;
  waveAmplitude: number;
  waveLinear: [number, number, number];
  bgLinear: [number, number, number];
  transparent: boolean;
  colorNum: number;
  pixelSize: number;
  disableAnimation: boolean;
  enableMouseInteraction: boolean;
  mouseRadius: number;
  mode: number;
  paletteLinear: Array<[number, number, number]>;
  scale: number;
  contrast: number;
  brightness: number;
  effect: number;
  mouseStrength: number;
  trail: number;
  clickRipple: boolean;
  intro: boolean;
  reduce: boolean;
  paused: boolean;
};

type TrailPoint = { x: number; y: number; weight: number };
type Ripple = { x: number; y: number; age: number };
type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

const MAX_TRAIL = 16;
const MAX_RIPPLES = 4;
const MAX_PALETTE = 8;
const INTRO_SECONDS = 1.8;
const RIPPLE_SECONDS = 1.6;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const WAVE_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uCell;
uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uScale;
uniform float uContrast;
uniform float uBrightness;
uniform int uEffect;
uniform float uRadius;
uniform float uStrength;
uniform vec3 uTrail[${MAX_TRAIL}];
uniform int uTrailCount;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform int uRippleCount;
uniform float uIntro;
uniform float uReach;
out vec4 outColor;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fadeXY = fade(Pf.xy);
  vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
  return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amp * abs(cnoise(p));
    p *= uWaveFrequency;
    amp *= uWaveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - uTime * uWaveSpeed;
  return fbm(p + fbm(p2));
}

void main() {
  vec2 corner = (gl_FragCoord.xy - 0.5) * uCell;
  vec2 uv = corner / uResolution - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float touch = 0.0;
  for (int i = 0; i < ${MAX_TRAIL}; i++) {
    if (i >= uTrailCount) break;
    vec3 point = uTrail[i];
    float reach = uRadius * mix(0.55, 1.0, point.z);
    touch = max(touch, point.z * (1.0 - smoothstep(0.0, reach, length(uv - point.xy))));
  }

  vec2 warp = vec2(0.0);
  float ring = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    vec2 delta = uv - ripple.xy;
    float dist = length(delta);
    float life = clamp(ripple.z / ${RIPPLE_SECONDS.toFixed(2)}, 0.0, 1.0);
    float wave = exp(-pow((dist - ripple.z * 0.9) / 0.07, 2.0)) * (1.0 - life) * (1.0 - life) * ripple.w;
    warp += (dist > 0.0001 ? delta / dist : vec2(0.0)) * wave * 0.035;
    ring += wave;
  }

  if (uEffect == 2 && touch > 0.0) {
    vec3 head = uTrail[0];
    vec2 delta = uv - head.xy;
    float dist = length(delta);
    warp += (dist > 0.0001 ? delta / dist : vec2(0.0)) * sin(dist / max(uRadius, 0.001) * 16.0 - uTime * 7.0) * 0.04 * touch * uStrength;
  }

  float f = pattern((uv + warp) / uScale);
  if (uEffect == 0) f -= 0.5 * touch * uStrength;
  if (uEffect == 1) f += 0.5 * touch * uStrength;
  f += ring * 0.55;
  f = (f - 0.5) * uContrast + 0.5 + uBrightness;
  float show = clamp((uIntro * uReach - length(uv)) / 0.45, 0.0, 1.0);
  float v = clamp(f, 0.0, 1.0) * show * show * (3.0 - 2.0 * show);
  outColor = vec4(floor(v * 255.0) / 255.0, fract(v * 255.0), 0.0, 1.0);
}`;

const DITHER_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uField;
uniform ivec2 uFieldSize;
uniform float uCellDevice;
uniform int uMode;
uniform float uColorNum;
uniform vec3 uWave;
uniform vec3 uBackground;
uniform vec3 uPalette[${MAX_PALETTE}];
uniform int uPaletteCount;
uniform float uTransparent;
out vec4 outColor;

const float bayer8[64] = float[64](
  0.0 / 64.0, 48.0 / 64.0, 12.0 / 64.0, 60.0 / 64.0, 3.0 / 64.0, 51.0 / 64.0, 15.0 / 64.0, 63.0 / 64.0,
  32.0 / 64.0, 16.0 / 64.0, 44.0 / 64.0, 28.0 / 64.0, 35.0 / 64.0, 19.0 / 64.0, 47.0 / 64.0, 31.0 / 64.0,
  8.0 / 64.0, 56.0 / 64.0, 4.0 / 64.0, 52.0 / 64.0, 11.0 / 64.0, 59.0 / 64.0, 7.0 / 64.0, 55.0 / 64.0,
  40.0 / 64.0, 24.0 / 64.0, 36.0 / 64.0, 20.0 / 64.0, 43.0 / 64.0, 27.0 / 64.0, 39.0 / 64.0, 23.0 / 64.0,
  2.0 / 64.0, 50.0 / 64.0, 14.0 / 64.0, 62.0 / 64.0, 1.0 / 64.0, 49.0 / 64.0, 13.0 / 64.0, 61.0 / 64.0,
  34.0 / 64.0, 18.0 / 64.0, 46.0 / 64.0, 30.0 / 64.0, 33.0 / 64.0, 17.0 / 64.0, 45.0 / 64.0, 29.0 / 64.0,
  10.0 / 64.0, 58.0 / 64.0, 6.0 / 64.0, 54.0 / 64.0, 9.0 / 64.0, 57.0 / 64.0, 5.0 / 64.0, 53.0 / 64.0,
  42.0 / 64.0, 26.0 / 64.0, 38.0 / 64.0, 22.0 / 64.0, 41.0 / 64.0, 25.0 / 64.0, 37.0 / 64.0, 21.0 / 64.0
);

const float bayer4[16] = float[16](
  0.0 / 16.0, 8.0 / 16.0, 2.0 / 16.0, 10.0 / 16.0,
  12.0 / 16.0, 4.0 / 16.0, 14.0 / 16.0, 6.0 / 16.0,
  3.0 / 16.0, 11.0 / 16.0, 1.0 / 16.0, 9.0 / 16.0,
  15.0 / 16.0, 7.0 / 16.0, 13.0 / 16.0, 5.0 / 16.0
);

const float bayer2[4] = float[4](0.0 / 4.0, 2.0 / 4.0, 3.0 / 4.0, 1.0 / 4.0);

float threshold(vec2 cell) {
  if (uMode == 1) {
    ivec2 c = ivec2(mod(cell, 4.0));
    return bayer4[c.y * 4 + c.x];
  }
  if (uMode == 2) {
    ivec2 c = ivec2(mod(cell, 2.0));
    return bayer2[c.y * 2 + c.x];
  }
  if (uMode == 3) {
    vec2 r = vec2(cell.x + cell.y, cell.x - cell.y) * 0.70710678 / 4.0;
    return clamp(length(fract(r) - 0.5) * 1.41421356, 0.0, 0.999);
  }
  if (uMode == 4) {
    return abs(fract(cell.y / 4.0) - 0.5) * 2.0 * 0.999;
  }
  if (uMode == 5) {
    float a = abs(fract((cell.x + cell.y) / 6.0) - 0.5) * 2.0;
    float b = abs(fract((cell.x - cell.y) / 6.0) - 0.5) * 2.0;
    return min(a, b) * 0.999;
  }
  if (uMode == 6) {
    return fract(52.9829189 * fract(dot(cell, vec2(0.06711056, 0.00583715))));
  }
  if (uMode == 7) {
    return 0.25;
  }
  ivec2 c = ivec2(mod(cell, 8.0));
  return bayer8[c.y * 8 + c.x];
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCellDevice);
  vec4 sampleValue = texelFetch(uField, clamp(ivec2(cell), ivec2(0), uFieldSize - 1), 0);
  float f = sampleValue.r + sampleValue.g / 255.0;
  float t = threshold(cell) - 0.25;

  if (uPaletteCount > 1) {
    float n = float(uPaletteCount);
    float v = f + t / (n - 1.0);
    v = clamp(v - mix(0.2, 0.0, smoothstep(0.45, 0.8, v)), 0.0, 1.0);
    int index = int(floor(v * (n - 1.0) + 0.5));
    outColor = vec4(toSrgb(uPalette[index]), 1.0);
    return;
  }

  float levels = max(uColorNum, 1.01) - 1.0;
  if (uTransparent > 0.5) {
    float v = f + t / levels;
    v = clamp(v - mix(0.2, 0.0, smoothstep(0.45, 0.8, v)), 0.0, 1.0);
    float a = floor(v * levels + 0.5) / levels;
    outColor = vec4(toSrgb(uWave) * a, a);
    return;
  }

  float base = dot(uBackground, vec3(0.2126, 0.7152, 0.0722));
  vec3 offset = (uWave - vec3(base)) * f + t / levels;
  float luminance = dot(uBackground + offset, vec3(0.2126, 0.7152, 0.0722));
  offset -= mix(0.2, 0.0, smoothstep(0.45, 0.8, luminance));
  bool rising = dot(uWave, vec3(0.2126, 0.7152, 0.0722)) >= base;
  float lower = rising ? 0.0 : -max(uBackground.r, max(uBackground.g, uBackground.b));
  float upper = rising ? 1.0 - min(uBackground.r, min(uBackground.g, uBackground.b)) : 0.0;
  offset = floor(clamp(offset, lower, upper) * levels + 0.5) / levels;
  outColor = vec4(toSrgb(uBackground + offset), 1.0);
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

const link = (gl: WebGL2RenderingContext, fragmentSource: string): Program | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = vertex && fragment ? gl.createProgram() : null;
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

export interface DitherEngine {
  updateSettings(next: DitherEngineSettings): void;
  resize(cssWidth: number, cssHeight: number, pixelWidth: number, pixelHeight: number): void;
  pointerMove(x: number, y: number, inside: boolean): void;
  pointerDown(x: number, y: number, inside: boolean): void;
  pointerLeave(): void;
  setVisibility(visible: boolean, pageHidden: boolean): void;
  destroy(): void;
}

export function createDitherEngine(
  surface: HTMLCanvasElement | OffscreenCanvas,
  initialSettings: DitherEngineSettings,
): DitherEngine | null {
  const gl = surface.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  }) as WebGL2RenderingContext | null;
  if (!gl) return null;

  gl.getExtension('KHR_parallel_shader_compile');
  const wave = link(gl, WAVE_FRAGMENT);
  const dither = link(gl, DITHER_FRAGMENT);
  if (!wave || !dither) return null;

  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const field = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, field);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer();

  let settings = initialSettings;
  const view = { width: 1, height: 1, ratio: 1, cell: 1, cellCss: 1, cols: 1, rows: 1 };
  const pointer = { x: 0, y: 0, inside: false, set: false };
  const trailPoints: TrailPoint[] = [];
  const ripples: Ripple[] = [];
  const trailData = new Float32Array(MAX_TRAIL * 3);
  const rippleData = new Float32Array(MAX_RIPPLES * 4);
  const paletteData = new Float32Array(MAX_PALETTE * 3);
  const state = {
    time: 0,
    hx: 0,
    hy: 0,
    presence: 0,
    reveal: settings.intro && !settings.reduce ? 0 : 1,
  };
  let raf = 0;
  let last = 0;
  let visible = true;
  let pageHidden = false;
  let contextLost = false;
  let destroyed = false;

  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  surface.addEventListener?.('webglcontextlost', onContextLost as EventListener);

  const isRunningAllowed = () => !destroyed && !contextLost && visible && !pageHidden && !settings.paused;

  const allocate = () => {
    view.cell = Math.max(1, Math.round(settings.pixelSize * view.ratio));
    view.cellCss = view.cell / view.ratio;
    view.cols = Math.max(1, Math.ceil(surface.width / view.cell));
    view.rows = Math.max(1, Math.ceil(surface.height / view.cell));
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, view.cols, view.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const toUvX = (x: number) => (x / view.width - 0.5) * (view.width / view.height);
  const toUvY = (y: number) => -(y / view.height - 0.5);

  const render = () => {
    if (destroyed || contextLost) return;
    const s = settings;
    const expected = Math.max(1, Math.round(s.pixelSize * view.ratio));
    if (expected !== view.cell) allocate();

    let trailCount = 0;
    for (let i = 0; i < trailPoints.length && trailCount < MAX_TRAIL; i++) {
      const point = trailPoints[i];
      if (point.weight <= 0.01) continue;
      const base = trailCount * 3;
      trailData[base] = point.x;
      trailData[base + 1] = point.y;
      trailData[base + 2] = point.weight;
      trailCount++;
    }
    let rippleCount = 0;
    for (let i = ripples.length - 1; i >= 0 && rippleCount < MAX_RIPPLES; i--) {
      const base = rippleCount * 4;
      rippleData[base] = ripples[i].x;
      rippleData[base + 1] = ripples[i].y;
      rippleData[base + 2] = ripples[i].age;
      rippleData[base + 3] = 1;
      rippleCount++;
    }

    const eased = s.intro && !s.reduce ? state.reveal * state.reveal * (3 - 2 * state.reveal) : 1;

    gl.bindVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, view.cols, view.rows);
    gl.useProgram(wave.program);
    const w = wave.uniforms;
    gl.uniform2f(w.uResolution, surface.width / view.ratio, surface.height / view.ratio);
    gl.uniform1f(w.uCell, view.cellCss);
    gl.uniform1f(w.uTime, state.time);
    gl.uniform1f(w.uWaveSpeed, s.waveSpeed);
    gl.uniform1f(w.uWaveFrequency, s.waveFrequency);
    gl.uniform1f(w.uWaveAmplitude, s.waveAmplitude);
    gl.uniform1f(w.uScale, s.scale);
    gl.uniform1f(w.uContrast, s.contrast);
    gl.uniform1f(w.uBrightness, s.brightness);
    gl.uniform1i(w.uEffect, s.effect);
    gl.uniform1f(w.uRadius, s.mouseRadius);
    gl.uniform1f(w.uStrength, s.mouseStrength);
    gl.uniform3fv(w.uTrail, trailData);
    gl.uniform1i(w.uTrailCount, trailCount);
    gl.uniform4fv(w.uRipples, rippleData);
    gl.uniform1i(w.uRippleCount, rippleCount);
    gl.uniform1f(w.uIntro, eased);
    gl.uniform1f(w.uReach, 0.5 * Math.hypot(view.width / view.height, 1) + 0.45);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, surface.width, surface.height);
    gl.useProgram(dither.program);
    const d = dither.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.uniform1i(d.uField, 0);
    gl.uniform2i(d.uFieldSize, view.cols, view.rows);
    gl.uniform1f(d.uCellDevice, view.cell);
    gl.uniform1i(d.uMode, s.mode);
    gl.uniform1f(d.uColorNum, s.colorNum);
    gl.uniform3f(d.uWave, s.waveLinear[0], s.waveLinear[1], s.waveLinear[2]);
    if (s.transparent) {
      gl.uniform3f(d.uBackground, 0, 0, 0);
    } else {
      gl.uniform3f(d.uBackground, s.bgLinear[0], s.bgLinear[1], s.bgLinear[2]);
    }
    gl.uniform1f(d.uTransparent, s.transparent ? 1 : 0);
    const palCount = Math.min(s.paletteLinear.length, MAX_PALETTE);
    for (let index = 0; index < palCount; index++) {
      const col = s.paletteLinear[index];
      const base = index * 3;
      paletteData[base] = col[0];
      paletteData[base + 1] = col[1];
      paletteData[base + 2] = col[2];
    }
    gl.uniform3fv(d.uPalette, paletteData);
    gl.uniform1i(d.uPaletteCount, palCount);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now: number) => {
    raf = 0;
    if (!isRunningAllowed()) {
      last = 0;
      return;
    }
    const s = settings;
    const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
    last = now;
    if (!s.disableAnimation && !s.reduce) state.time += dt;

    const engaged = s.enableMouseInteraction && pointer.inside && !s.reduce;
    state.presence += ((engaged ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / (engaged ? 0.12 : 0.35)));
    if (pointer.set) {
      const tx = toUvX(pointer.x);
      const ty = toUvY(pointer.y);
      const follow = 1 - Math.exp(-dt / 0.06);
      const moved = Math.hypot(tx - state.hx, ty - state.hy);
      state.hx += (tx - state.hx) * follow;
      state.hy += (ty - state.hy) * follow;
      const decay = Math.exp(-dt / (0.08 + s.trail * 0.7));
      for (let i = 0; i < trailPoints.length; i++) {
        trailPoints[i].weight *= decay;
      }
      const head = trailPoints[0];
      if (!head || Math.hypot(head.x - state.hx, head.y - state.hy) > 0.012 || moved > 0.012) {
        trailPoints.unshift({ x: state.hx, y: state.hy, weight: state.presence });
      } else {
        head.x = state.hx;
        head.y = state.hy;
        head.weight = state.presence;
      }
      if (s.trail <= 0.001) trailPoints.length = Math.min(trailPoints.length, 1);
      while (
        trailPoints.length > MAX_TRAIL ||
        (trailPoints.length > 1 && trailPoints[trailPoints.length - 1].weight < 0.01)
      ) {
        trailPoints.pop();
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += dt;
      if (ripples[i].age >= RIPPLE_SECONDS) ripples.splice(i, 1);
    }

    if (!s.intro || s.reduce) state.reveal = 1;
    else if (state.reveal < 1) state.reveal = Math.min(1, state.reveal + dt / INTRO_SECONDS);

    render();
    let hasActiveTrail = false;
    for (let i = 0; i < trailPoints.length; i++) {
      if (trailPoints[i].weight > 0.01) {
        hasActiveTrail = true;
        break;
      }
    }
    const busy =
      !s.disableAnimation ||
      state.reveal < 1 ||
      ripples.length > 0 ||
      state.presence > 0.002 ||
      hasActiveTrail;
    if (busy && !s.reduce && isRunningAllowed()) {
      raf = requestAnimationFrame(frame);
    } else {
      last = 0;
    }
  };

  const wake = () => {
    if (!raf && isRunningAllowed()) {
      raf = requestAnimationFrame(frame);
    }
  };

  return {
    updateSettings(next) {
      const wasPaused = settings.paused;
      settings = next;
      if (wasPaused && !next.paused) last = 0;
      if (!raf && !next.paused) render();
      wake();
    },
    resize(cssWidth, cssHeight, pixelWidth, pixelHeight) {
      view.width = Math.max(1, cssWidth);
      view.height = Math.max(1, cssHeight);
      surface.width = Math.max(1, pixelWidth);
      surface.height = Math.max(1, pixelHeight);
      view.ratio = surface.width / view.width;
      allocate();
      if (!settings.paused) render();
      wake();
    },
    pointerMove(x, y, inside) {
      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      if (inside && !pointer.set) {
        state.hx = toUvX(x);
        state.hy = toUvY(y);
        pointer.set = true;
      }
      wake();
    },
    pointerDown(x, y, inside) {
      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      if (inside && !pointer.set) {
        state.hx = toUvX(x);
        state.hy = toUvY(y);
        pointer.set = true;
      }
      if (!inside || !settings.clickRipple || settings.reduce) return;
      ripples.push({ x: toUvX(x), y: toUvY(y), age: 0 });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
      wake();
    },
    pointerLeave() {
      pointer.inside = false;
    },
    setVisibility(nextVisible, nextPageHidden) {
      visible = nextVisible;
      pageHidden = nextPageHidden;
      if (isRunningAllowed()) {
        last = 0;
        wake();
      }
    },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      surface.removeEventListener?.('webglcontextlost', onContextLost as EventListener);
      if (!contextLost) {
        gl.deleteProgram(wave.program);
        gl.deleteProgram(dither.program);
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        gl.deleteTexture(field);
        gl.deleteFramebuffer(framebuffer);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    },
  };
}

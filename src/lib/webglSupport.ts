/**
 * One-shot WebGL capability probe shared by the liquid-glass stage, the map,
 * and any component that wants to avoid animating a fallback it won't be able
 * to run. Result is memoised for the lifetime of the page - GPUs don't unplug
 * mid-scroll.
 */

let webglSupported: boolean | undefined;

export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (webglSupported === undefined) {
    try {
      const probe = document.createElement("canvas");
      const gl = (probe.getContext("webgl") ?? probe.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      webglSupported = Boolean(gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupported = false;
    }
  }
  return webglSupported;
}

/**
 * The liquid-glass stage and the diorama are decoration, so they also opt out
 * for data-saver users. The map is content, so it only needs `supportsWebGL`.
 */
export function supportsWebGLGlass(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
    return false;
  }
  return supportsWebGL();
}

let webgl2Supported: boolean | undefined;

/**
 * WebGL2-only probe for content surfaces. MapLibre GL JS v6 dropped WebGL1,
 * so the map must guarantee a webgl2 context. Like `supportsWebGL` (whose
 * contract it mirrors below), it deliberately does NOT pay attention to
 * saveData: the map is content, not decoration.
 */
export function supportsWebGL2Strict(): boolean {
  if (typeof window === "undefined") return false;
  if (webgl2Supported === undefined) {
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") as WebGL2RenderingContext | null;
      webgl2Supported = Boolean(gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl2Supported = false;
    }
  }
  return webgl2Supported;
}

/**
 * WebGL2 probe for the ReactBits canvas layers (Dither / ShapeBlur /
 * Grainient only run on a webgl2 context). Same one-shot contract as
 * supportsWebGL: saveData users and context-less browsers fall back early.
 */
export function supportsWebGL2(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
    return false;
  }
  if (webgl2Supported === undefined) {
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") as WebGL2RenderingContext | null;
      webgl2Supported = Boolean(gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl2Supported = false;
    }
  }
  return webgl2Supported;
}

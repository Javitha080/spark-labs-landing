/**
 * One-shot WebGL capability probe shared by the liquid-glass stage and any
 * component that wants to avoid animating a fallback it won't be able to run.
 * Result is memoised for the lifetime of the page — GPUs don't unplug mid-scroll.
 */

let webglSupported: boolean | undefined;

export function supportsWebGLGlass(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
    return false;
  }
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

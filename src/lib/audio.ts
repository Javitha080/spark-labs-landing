let sharedCtx: AudioContext | null = null;

/**
 * Returns a lazy singleton Web Audio `AudioContext` so UI sound effects do not
 * allocate an unclosed hardware audio context per click.
 */
export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioContextClass();
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

/**
 * Closes and clears the shared `AudioContext`, intended for teardown when a
 * sound-enabled desktop shell unmounts or during tests.
 */
export function closeSharedAudioContext(): void {
  if (!sharedCtx) return;
  const ctx = sharedCtx;
  sharedCtx = null;
  if (ctx.state !== "closed") {
    ctx.close().catch(() => {});
  }
}

/**
 * macAudio — Singleton Web Audio API for macOS-themed UI sounds.
 * Replaces the 5+ inline AudioContext creations per page that hit the
 * browser cap (~6 contexts) and leak memory.
 */

type SoundType =
  | "folderOpen"
  | "fileOpen"
  | "windowOpen"
  | "windowClose"
  | "windowMaximize"
  | "windowMinimize"
  | "action"
  | "trash"
  | "bootChime";

interface SoundProfile {
  freq1: number;
  freq2: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const PROFILES: Record<SoundType, SoundProfile> = {
  folderOpen: { freq1: 340, freq2: 340, duration: 0.1, type: "sine", gain: 0.08 },
  fileOpen: { freq1: 400, freq2: 800, duration: 0.15, type: "sine", gain: 0.15 },
  windowOpen: { freq1: 600, freq2: 600, duration: 0.06, type: "triangle", gain: 0.08 },
  windowClose: { freq1: 800, freq2: 300, duration: 0.15, type: "sine", gain: 0.15 },
  windowMaximize: { freq1: 300, freq2: 600, duration: 0.2, type: "triangle", gain: 0.15 },
  windowMinimize: { freq1: 600, freq2: 300, duration: 0.2, type: "triangle", gain: 0.15 },
  action: { freq1: 600, freq2: 600, duration: 0.08, type: "sine", gain: 0.15 },
  trash: { freq1: 150, freq2: 40, duration: 0.3, type: "sine", gain: 0.25 },
  bootChime: { freq1: 0, freq2: 0, duration: 3.0, type: "sine", gain: 0.2 },
};

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

async function ensureUnlocked(): Promise<AudioContext | null> {
  const c = getCtx();
  if (!c) return null;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return null;
    }
  }
  unlocked = true;
  return c;
}

function playProfile(c: AudioContext, profile: SoundProfile) {
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = profile.type;
  osc.frequency.setValueAtTime(profile.freq1, now);
  if (profile.freq2 !== profile.freq1) {
    osc.frequency.exponentialRampToValueAtTime(profile.freq2, now + profile.duration);
  }
  gain.gain.setValueAtTime(profile.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + profile.duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + profile.duration);
}

export async function playMacSound(type: SoundType): Promise<void> {
  const c = await ensureUnlocked();
  if (!c) return;
  try {
    if (type === "bootChime") {
      playBootChime(c);
      return;
    }
    playProfile(c, PROFILES[type]);
  } catch {
  }
}

function playBootChime(c: AudioContext) {
  const freqs = [87.31, 130.81, 174.61, 220.0, 261.63, 349.23];
  const now = c.currentTime;
  const masterGain = c.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(PROFILES.bootChime.gain, now + 0.1);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
  masterGain.connect(c.destination);

  for (let i = 0; i < freqs.length; i++) {
    const freq = freqs[i];
    const osc = c.createOscillator();
    const bandGain = c.createGain();
    osc.type = i % 2 === 0 ? "triangle" : "sawtooth";
    osc.frequency.value = freq;
    osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
    if (osc.type === "sawtooth") {
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      osc.connect(filter);
      filter.connect(bandGain);
    } else {
      osc.connect(bandGain);
    }
    bandGain.gain.setValueAtTime(1 / freqs.length, now);
    bandGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 3.0);
  }
}

export function closeMacAudio(): void {
  if (ctx) {
    try {
      ctx.close();
    } catch {
    }
    ctx = null;
    unlocked = false;
  }
}

export function isMacAudioUnlocked(): boolean {
  return unlocked;
}

import { describe, expect, it } from "vitest";
import { GLYPHS, decryptFrame, hexTag, lockTimes, type Rand } from "./bootText";

/** Deterministic xorshift so the scramble frames are reproducible. */
const seeded = (seed: number): Rand => {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return (s & 0xfffff) / 0x100000;
  };
};

describe("bootText", () => {
  it("lockTimes stays in [0,1) and never leaves a character unlocked at p=1", () => {
    for (let n = 1; n <= 40; n++) {
      const locks = lockTimes(n, seeded(n + 7));
      expect(locks).toHaveLength(n);
      for (const lock of locks) {
        expect(lock).toBeGreaterThanOrEqual(0);
        expect(lock).toBeLessThan(1);
      }
    }
  });

  it("decryptFrame returns the target verbatim once p >= 1", () => {
    const locks = lockTimes("READY".length, seeded(1));
    expect(decryptFrame("READY", 1, locks)).toBe("READY");
    expect(decryptFrame("READY", 1.5, locks)).toBe("READY");
  });

  it("spaces and punctuation never scramble (spacing holds still)", () => {
    const target = "  · A 3: ";
    const locks = lockTimes(target.length, seeded(2));
    const atZero = decryptFrame(target, 0, locks);
    for (let i = 0; i < target.length; i++) {
      if (target[i] === " " || target[i] === "·" || target[i] === ":") {
        expect(atZero[i]).toBe(target[i]);
      }
    }
  });

  it("decryptFrame only ever emits characters from the glyph pool while unlocked", () => {
    const target = "SOCKET LATCH";
    const locks = lockTimes(target.length, seeded(3));
    const frame = decryptFrame(target, 0, locks, seeded(4));
    for (let i = 0; i < target.length; i++) {
      if (target[i] !== " " && frame[i] !== target[i]) {
        expect(GLYPHS).toContain(frame[i]);
      }
    }
  });

  it("hexTag always yields 0x + upper-case hex digits", () => {
    expect(hexTag(seeded(5))).toMatch(/^0x[0-9A-F]{4}$/);
    expect(hexTag(seeded(6), 6)).toMatch(/^0x[0-9A-F]{6}$/);
  });
});

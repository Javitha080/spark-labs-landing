import { describe, expect, it, vi } from "vitest";
import {
  createElementRectCache,
  parseCssSrgb01,
  resolveLinearColor01,
  supportsOffscreenWebGL2,
} from "./canvasWorkerSupport";
import { decodeImageOffThread } from "./animationPreload";

describe("canvasWorkerSupport", () => {
  it("parses hex and rgb CSS colors into normalized sRGB [0..1] tuples", () => {
    const orange = parseCssSrgb01("#ff8000");
    expect(orange[0]).toBeCloseTo(1, 4);
    expect(orange[1]).toBeCloseTo(128 / 255, 4);
    expect(orange[2]).toBeCloseTo(0, 4);

    const shortHex = parseCssSrgb01("#0f0");
    expect(shortHex).toEqual([0, 1, 0]);

    const rgba = parseCssSrgb01("rgba(51, 102, 204, 0.5)");
    expect(rgba[0]).toBeCloseTo(0.2, 4);
    expect(rgba[1]).toBeCloseTo(0.4, 4);
    expect(rgba[2]).toBeCloseTo(0.8, 4);

    expect(parseCssSrgb01("", [0.25, 0.5, 0.75])).toEqual([0.25, 0.5, 0.75]);
  });

  it("converts CSS sRGB strings to linear light and clamps numeric tuples", () => {
    const clamped = resolveLinearColor01([1.5, -0.2, 0.5]);
    expect(clamped).toEqual([1, 0, 0.5]);

    const linearMid = resolveLinearColor01("#808080");
    // sRGB ~0.502 converts to ~0.2159 in linear light
    expect(linearMid[0]).toBeGreaterThan(0.2);
    expect(linearMid[0]).toBeLessThan(0.23);
    expect(resolveLinearColor01("#808080")).toBe(linearMid);
  });

  it("probes OffscreenCanvas WebGL2 support safely in non-GPU test environments", () => {
    expect(supportsOffscreenWebGL2()).toBe(false);
  });

  it("caches getBoundingClientRect reads and invalidates on scroll, resize, or manual reset", () => {
    const el = document.createElement("div");
    let currentLeft = 24;
    const rectSpy = vi.spyOn(el, "getBoundingClientRect").mockImplementation(
      () =>
        ({
          left: currentLeft,
          top: 40,
          right: currentLeft + 200,
          bottom: 140,
          width: 200,
          height: 100,
          x: currentLeft,
          y: 40,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    const cache = createElementRectCache(el);
    expect(cache.get().left).toBe(24);
    expect(cache.read().left).toBe(24);
    expect(rectSpy).toHaveBeenCalledTimes(1);

    currentLeft = 88;
    // Still cached before invalidation
    expect(cache.get().left).toBe(24);
    expect(rectSpy).toHaveBeenCalledTimes(1);

    // Window scroll invalidates all active caches lazily
    window.dispatchEvent(new Event("scroll"));
    expect(rectSpy).toHaveBeenCalledTimes(1);
    expect(cache.read().left).toBe(88);
    expect(rectSpy).toHaveBeenCalledTimes(2);

    currentLeft = 144;
    cache.invalidate();
    expect(cache.get().left).toBe(144);
    expect(rectSpy).toHaveBeenCalledTimes(3);

    cache.destroy();
    currentLeft = 300;
    window.dispatchEvent(new Event("resize"));
    expect(rectSpy).toHaveBeenCalledTimes(3);
  });
});

describe("decodeImageOffThread", () => {
  it("deduplicates repeated image warmup URLs without throwing", () => {
    const decodeSpy = vi.fn().mockRejectedValue(new Error("decode unsupported in jsdom"));
    const OriginalImage = globalThis.Image;

    class MockImage {
      decoding = "auto";
      src = "";
      decode = decodeSpy;
    }

    globalThis.Image = MockImage as unknown as typeof Image;
    try {
      decodeImageOffThread("/assets/test-warmup-unique.webp");
      decodeImageOffThread("/assets/test-warmup-unique.webp");
      expect(decodeSpy).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.Image = OriginalImage;
    }
  });
});

/**
 * Parallel Asset Preloader & Decoded Image Cache for the YICDVP Vihara v3 Footer.
 *
 * Preloads and decodes the woodblock engraving plate, 3-strata cloud sprites, and
 * Dhamma Chakra wheel once into memory with timeout/error resilience and zero
 * duplicate decoding across route transitions.
 */

import { VIHARA_ASSETS, type ViharaAssetKey } from "./viharaAssets";

export interface ViharaPreloadProgress {
  loaded: number;
  total: number;
  percent: number;
  ready: boolean;
  failedKeys: ViharaAssetKey[];
}

const decodedCache = new Map<ViharaAssetKey, HTMLImageElement>();
let preloadPromise: Promise<ViharaPreloadProgress> | null = null;

function loadAndDecodeImage(src: string, timeoutMs = 8000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    let settled = false;

    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Image preload timeout"));
      }
    }, timeoutMs);

    const done = (ok: boolean, err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (ok) resolve(img);
      else reject(err || new Error("Image preload error"));
    };

    img.onload = () => {
      if (typeof img.decode === "function") {
        img
          .decode()
          .then(() => done(true))
          .catch(() => done(true));
      } else {
        done(true);
      }
    };
    img.onerror = () => done(false, new Error("Image failed to load"));
    img.src = src;
  });
}

export function getPreloadedViharaImage(key: ViharaAssetKey): HTMLImageElement | null {
  return decodedCache.get(key) ?? null;
}

export function preloadViharaAssets(
  onProgress?: (progress: ViharaPreloadProgress) => void,
): Promise<ViharaPreloadProgress> {
  const entries = Object.entries(VIHARA_ASSETS) as Array<[ViharaAssetKey, string]>;
  const total = entries.length;

  if (typeof window === "undefined" || typeof Image === "undefined") {
    const fallback: ViharaPreloadProgress = {
      loaded: 0,
      total,
      percent: 0,
      ready: true,
      failedKeys: [],
    };
    onProgress?.(fallback);
    return Promise.resolve(fallback);
  }

  if (preloadPromise) {
    preloadPromise.then((res) => onProgress?.(res));
    return preloadPromise;
  }

  let loaded = 0;
  const failedKeys: ViharaAssetKey[] = [];

  const emit = (ready: boolean): ViharaPreloadProgress => {
    const state: ViharaPreloadProgress = {
      loaded,
      total,
      percent: Math.round((loaded / total) * 100),
      ready,
      failedKeys: [...failedKeys],
    };
    onProgress?.(state);
    return state;
  };

  emit(false);

  preloadPromise = Promise.all(
    entries.map(async ([key, url]) => {
      try {
        const img = await loadAndDecodeImage(url);
        decodedCache.set(key, img);
      } catch {
        failedKeys.push(key);
      } finally {
        loaded += 1;
        emit(loaded >= total);
      }
    }),
  ).then(() => emit(true));

  return preloadPromise;
}

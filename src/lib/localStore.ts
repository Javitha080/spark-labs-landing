import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store built on useSyncExternalStore: never triggers
 * a re-render loop, cross-tab via the storage event, no provider needed.
 */
export function createLocalStore<T>(key: string, initial: T, parse: (raw: unknown) => T) {
  const listeners = new Set<() => void>();
  let lastRaw: string | null | undefined;
  let lastValue = initial;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return lastValue;
    }
    if (raw === lastRaw) return lastValue;
    lastRaw = raw;
    try {
      lastValue = raw ? parse(JSON.parse(raw)) : initial;
    } catch {
      lastValue = initial;
    }
    return lastValue;
  };

  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => e.key === key && cb();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  };

  const set = (value: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode) — keep in memory only */
      lastRaw = undefined;
      lastValue = value;
    }
    listeners.forEach((l) => l());
  };

  return {
    set,
    get: read,
    useValue: () => useSyncExternalStore(subscribe, read, () => initial),
  };
}

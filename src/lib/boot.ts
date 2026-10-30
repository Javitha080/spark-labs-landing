/**
 * Page boot coordination.
 *
 * The boot screen is a once-per-session splash. Anything that should wait
 * for it (hero entrance, hash scroll) can listen for `yicdvp:booted`.
 */

export const BOOT_EVENT = "yicdvp:booted";

const BOOTED_KEY = "yicdvp:booted";

export function markBooted(): void {
  try {
    sessionStorage.setItem(BOOTED_KEY, "1");
  } catch {
    /* private mode: treat every load as first */
  }
}

export function hasBooted(): boolean {
  try {
    return sessionStorage.getItem(BOOTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dispatchBooted(): void {
  // BootScreen can dispatch during its own effect flush (skip path), which
  // runs before parents in the same commit have attached their listeners.
  // A macrotask defers the event until the whole commit has landed.
  window.setTimeout(() => window.dispatchEvent(new Event(BOOT_EVENT)), 0);
}

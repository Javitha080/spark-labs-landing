import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from "@/hooks/use-toast";

interface OnlineStatus {
  isOnline: boolean;
  lastChecked: number;
}

let globalState: OnlineStatus = {
  isOnline: true, // Assume online until proven otherwise
  lastChecked: Date.now(),
};
const listeners = new Set<(state: OnlineStatus) => void>();

// Suppress offline transitions for the first few seconds after the module loads.
// SPA route changes, lazy chunk loading, and service workers often cause
// transient browser "offline" events right after navigation.
const MODULE_LOAD_TIME = Date.now();
const STARTUP_GRACE_MS = 5000;

/**
 * Verify actual connectivity by fetching a known lightweight resource.
 * Uses HEAD to minimize payload. Returns true only on a definitive 2xx.
 */
async function checkConnectivity(): Promise<boolean> {
  // If the browser itself says we're offline, trust it immediately.
  if (!navigator.onLine) return false;

  try {
    const url = `/manifest.json?_cb=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

function broadcast(state: OnlineStatus) {
  const changed = globalState.isOnline !== state.isOnline;
  globalState = state;
  if (!changed) return; // Only notify listeners on actual transitions

  // Show a verified toast for real transitions (not during startup)
  const timeSinceLoad = Date.now() - MODULE_LOAD_TIME;
  if (timeSinceLoad > STARTUP_GRACE_MS) {
    if (state.isOnline) {
      toast({
        title: "Back online",
        description: "Connection restored.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "You're offline",
        description: "Changes won't be saved until your connection is restored.",
      });
    }
  }

  listeners.forEach((fn) => fn(state));
}

// Debounce offline transitions: require confirmation via connectivity check
// after a delay before marking as offline to avoid blips during route changes.
let offlineDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const OFFLINE_CONFIRM_DELAY_MS = 3000;

async function handleOnlineEvent() {
  // Cancel any pending offline transition
  if (offlineDebounceTimer) {
    clearTimeout(offlineDebounceTimer);
    offlineDebounceTimer = null;
  }
  // Verify we really came back
  const reallyOnline = await checkConnectivity();
  if (reallyOnline) {
    broadcast({ isOnline: true, lastChecked: Date.now() });
  }
}

async function handleOfflineEvent() {
  // Don't immediately trust the offline event — it fires spuriously
  // during SPA navigation, service worker updates, and lazy chunk loading.
  // Instead, debounce and verify with a real connectivity check.
  if (offlineDebounceTimer) return; // already pending

  // Extra guard: if navigator.onLine is still true, the event is likely noise.
  if (navigator.onLine) return;

  offlineDebounceTimer = setTimeout(async () => {
    offlineDebounceTimer = null;
    const reallyOffline = !(await checkConnectivity());
    if (reallyOffline) {
      broadcast({ isOnline: false, lastChecked: Date.now() });
    }
  }, OFFLINE_CONFIRM_DELAY_MS);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleOfflineEvent);

  // Ignore SW ONLINE_STATUS messages entirely — the SW's fetch success/failure
  // is NOT a reliable proxy for user connectivity (e.g. a single 503 from a CDN
  // image doesn't mean the user is offline). Let the hook verify on its own.
}

export function useOnlineStatus() {
  const [state, setState] = useState<OnlineStatus>(globalState);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleUpdate = useCallback((newState: OnlineStatus) => {
    setState(newState);
  }, []);

  useEffect(() => {
    listeners.add(handleUpdate);

    // Poll every 2 minutes, but only transition if verified
    pollRef.current = setInterval(async () => {
      if (!navigator.onLine) return;
      const reallyOnline = await checkConnectivity();
      if (reallyOnline !== globalState.isOnline) {
        broadcast({ isOnline: reallyOnline, lastChecked: Date.now() });
      }
    }, 120000);

    return () => {
      listeners.delete(handleUpdate);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [handleUpdate]);

  return state;
}

export function getOnlineStatus(): OnlineStatus {
  return globalState;
}

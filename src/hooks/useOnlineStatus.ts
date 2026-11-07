import { useState, useEffect, useCallback } from 'react';
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

  // In development/local environments, avoid aggressive fetch pinging
  // to prevent spamming the console with network errors when testing.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return navigator.onLine;
  }

  try {
    const url = `/?_cb=${Date.now()}`;
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
  // Don't immediately trust the offline event - it fires spuriously
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

// Poll cadence: while online, re-verify rarely; once we're in the
// offline-verified state, re-check every 15s so the banner clears quickly
// after real recovery instead of waiting out a 2-minute interval.
const POLL_ONLINE_MS = 120_000;
const POLL_OFFLINE_MS = 15_000;

// Single module-level poller. Hook instances used to start their own
// interval each, duplicating connectivity pings per consumer.
let pollTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNextPoll() {
  if (pollTimer) return;
  pollTimer = setTimeout(async () => {
    pollTimer = null;
    try {
      if (navigator.onLine) {
        const reallyOnline = await checkConnectivity();
        if (reallyOnline !== globalState.isOnline) {
          broadcast({ isOnline: reallyOnline, lastChecked: Date.now() });
        }
      }
    } catch {
      /* verification errors shouldn't kill the loop */
    }
    scheduleNextPoll();
  }, globalState.isOnline ? POLL_ONLINE_MS : POLL_OFFLINE_MS);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleOfflineEvent);
  scheduleNextPoll();

  // Ignore SW ONLINE_STATUS messages entirely - the SW's fetch success/failure
  // is NOT a reliable proxy for user connectivity (e.g. a single 503 from a CDN
  // image doesn't mean the user is offline). Let the hook verify on its own.
}

export function useOnlineStatus() {
  const [state, setState] = useState<OnlineStatus>(globalState);

  const handleUpdate = useCallback((newState: OnlineStatus) => {
    // Don't re-render consumers on non-transitions (also keeps the
    // offline-rep poll's repeated false-network states from causing churn).
    setState((prev) =>
      prev.isOnline === newState.isOnline && prev.lastChecked === newState.lastChecked
        ? prev
        : newState
    );
  }, []);

  useEffect(() => {
    listeners.add(handleUpdate);
    // Connectivity polling is centralized in the module (scheduleNextPoll):
    // one ping loop per page, with a fast 15s cadence while offline-verified.
    return () => {
      listeners.delete(handleUpdate);
    };
  }, [handleUpdate]);

  return state;
}

export function getOnlineStatus(): OnlineStatus {
  return globalState;
}

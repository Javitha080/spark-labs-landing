import { useState, useEffect, useCallback, useRef } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  lastChecked: number;
}

let globalState: OnlineStatus = {
  isOnline: navigator.onLine,
  lastChecked: Date.now(),
};
const listeners = new Set<(state: OnlineStatus) => void>();

async function checkConnectivity(): Promise<boolean> {
  try {
    const url = `/manifest.json?_cb=${Date.now()}`;
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
    });
    return response.ok || response.type === 'opaque';
  } catch {
    return false;
  }
}

function broadcast(state: OnlineStatus) {
  globalState = state;
  listeners.forEach((fn) => fn(state));
}

async function verifyAndBroadcast(online: boolean) {
  if (online) {
    const reallyOnline = await checkConnectivity();
    broadcast({ isOnline: reallyOnline, lastChecked: Date.now() });
  } else {
    broadcast({ isOnline: false, lastChecked: Date.now() });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => verifyAndBroadcast(true));
  window.addEventListener('offline', () => verifyAndBroadcast(false));

  navigator.serviceWorker?.addEventListener?.('message', (event) => {
    if (event.data?.type === 'ONLINE_STATUS') {
      broadcast({ isOnline: event.data.isOnline, lastChecked: Date.now() });
    }
  });
}

export function useOnlineStatus() {
  const [state, setState] = useState<OnlineStatus>(globalState);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleUpdate = useCallback((newState: OnlineStatus) => {
    setState(newState);
  }, []);

  useEffect(() => {
    listeners.add(handleUpdate);

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

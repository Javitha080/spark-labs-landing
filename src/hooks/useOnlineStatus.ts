import { useState, useEffect, useCallback } from 'react';

/**
 * Hook that listens for online/offline status from the Service Worker
 * and browser events. Provides real-time connectivity state.
 *
 * Usage:
 *   const { isOnline, lastChecked } = useOnlineStatus();
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastChecked, setLastChecked] = useState<number>(() => Date.now());

  const updateStatus = useCallback((online: boolean) => {
    setIsOnline(online);
    setLastChecked(Date.now());
  }, []);

  useEffect(() => {
    // Browser native events
    const handleOnline = () => updateStatus(true);
    const handleOffline = () => updateStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker offline detection events
    const handleSWStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ isOnline: boolean }>).detail;
      if (detail) {
        updateStatus(detail.isOnline);
      }
    };

    window.addEventListener('sw-online-status', handleSWStatus);

    // Ask SW to check real connectivity on mount
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_ONLINE' });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-online-status', handleSWStatus);
    };
  }, [updateStatus]);

  return { isOnline, lastChecked };
}

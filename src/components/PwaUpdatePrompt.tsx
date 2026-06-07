import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, X, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwVersionPayload {
  version: string;
  buildTimestamp: string;
}

const APP_VERSION_STORAGE_KEY = "yic-app-version";

/**
 * Listens for Service Worker lifecycle events and turns them into user-facing
 * toasts:
 *
 *  - "sw-update-available" (dispatched by index.html) → shows an "Update ready"
 *    toast with a Reload button. On click we post `SKIP_WAITING` to the waiting
 *    SW. The existing controllerchange handler in index.html then reloads the
 *    page, picking up the new build.
 *
 *  - A persistent mini-banner appears at the bottom of the screen while a
 *    waiting SW is detected, in case the toast was dismissed.
 *
 *  - Exposes a global `window.yicClearCacheAndReload()` helper so any other
 *    component (e.g. error boundary, footer link) can give the user a
 *    "Clear cache & reload" escape hatch when content looks stale.
 */
export const PwaUpdatePrompt = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [installingWorker, setInstallingWorker] = useState<ServiceWorker | null>(null);
  const [swVersion, setSwVersion] = useState<SwVersionPayload | null>(null);

  // Listen for the "new SW installed" signal from index.html
  useEffect(() => {
    const onUpdateAvailable = () => {
      const reg = navigator.serviceWorker?.controller
        ? null
        : navigator.serviceWorker?.getRegistration?.();
      // We don't always have a handle to the new worker here, so we also
      // query the registration below to find the waiting worker.
      navigator.serviceWorker?.getRegistration?.().then((r) => {
        if (r && r.waiting) {
          setWaitingWorker(r.waiting);
        }
        if (r && r.installing) {
          setInstallingWorker(r.installing);
        }
      });
      showUpdateToast();
    };
    window.addEventListener("sw-update-available", onUpdateAvailable);
    return () => window.removeEventListener("sw-update-available", onUpdateAvailable);
  }, []);

  // Track the waiting worker as it transitions
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const onChange = () => {
      navigator.serviceWorker.getRegistration().then((r) => {
        if (r?.waiting) setWaitingWorker(r.waiting);
        if (r?.installing) setInstallingWorker(r.installing);
      });
    };
    navigator.serviceWorker.getRegistration().then((r) => {
      r?.addEventListener("updatefound", onChange);
    });
    return () => {
      navigator.serviceWorker.getRegistration().then((r) => {
        r?.removeEventListener("updatefound", onChange);
      });
    };
  }, []);

  // Ask the SW for its version on mount (useful for debugging)
  useEffect(() => {
    if (!navigator.serviceWorker?.controller) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => {
      if (e.data?.type === "SW_VERSION" && e.data.payload) {
        setSwVersion(e.data.payload as SwVersionPayload);
      }
    };
    navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" }, [channel.port2]);
  }, []);

  const showUpdateToast = useCallback(() => {
    toast("A new version is ready", {
      description: "Reload to see the latest changes.",
      duration: Infinity,
      action: {
        label: "Reload",
        onClick: () => applyUpdate(),
      },
      icon: <RefreshCw className="size-4" />,
    });
  }, []);

  const applyUpdate = useCallback(() => {
    const target = waitingWorker ?? navigator.serviceWorker?.controller;
    if (!target) {
      // No SW to skip — just hard-reload the page
      window.location.reload();
      return;
    }
    target.postMessage({ type: "SKIP_WAITING" });
    // controllerchange (handled in index.html) will reload the page.
  }, [waitingWorker]);

  const clearCacheAndReload = useCallback(() => {
    const doIt = async () => {
      try {
        if (!navigator.serviceWorker?.controller) {
          // No SW — just clear caches via Cache API directly and reload
          if ("caches" in self) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          window.location.reload();
          return;
        }
        const channel = new MessageChannel();
        channel.port1.onmessage = (e) => {
          if (e.data?.type === "CLEAR_CACHE_OK" || e.data?.type === "CLEAR_CACHE_FAIL") {
            window.location.reload();
          }
        };
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" }, [channel.port2]);
        // Fallback if no response within 2s
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        console.warn("[PwaUpdatePrompt] clearCacheAndReload failed", err);
        window.location.reload();
      }
    };
    doIt();
  }, []);

  // Expose globally so other components can offer the escape hatch
  useEffect(() => {
    (window as unknown as { yicClearCacheAndReload?: () => void }).yicClearCacheAndReload =
      clearCacheAndReload;
    (window as unknown as { yicAppVersion?: SwVersionPayload | null }).yicAppVersion = swVersion;
    return () => {
      delete (window as unknown as { yicClearCacheAndReload?: () => void }).yicClearCacheAndReload;
    };
  }, [clearCacheAndReload, swVersion]);

  // Persist last-seen version for diagnostics
  useEffect(() => {
    if (swVersion) {
      try { localStorage.setItem(APP_VERSION_STORAGE_KEY, swVersion.version); } catch {}
    }
  }, [swVersion]);

  // Banner shown when a waiting worker is detected (so the user can recover
  // even if the toast was dismissed)
  if (!waitingWorker && !installingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[100000] -translate-x-1/2 flex items-center gap-2 rounded-full border border-border/40 bg-background/90 px-3 py-2 text-xs shadow-lg backdrop-blur"
    >
      <Wifi className="size-3.5 text-emerald-500" />
      <span className="text-muted-foreground">Update ready</span>
      <Button
        size="sm"
        variant="default"
        className="h-7 px-3 text-xs"
        onClick={applyUpdate}
      >
        <RefreshCw className="mr-1 size-3" /> Reload
      </Button>
      <button
        aria-label="Dismiss"
        className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted"
        onClick={() => {
          setWaitingWorker(null);
          setInstallingWorker(null);
        }}
      >
        <X className="size-3" />
      </button>
    </div>
  );
};

export default PwaUpdatePrompt;

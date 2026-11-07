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
 * cues:
 *
 *  - "sw-update-available" (dispatched by index.html when a new SW reaches
 *    'installed' while a controller is active) → brief "Update ready" toast
 *    with a Reload button.
 *
 *  - A persistent mini-banner appears at the bottom of the screen once the
 *    update is genuinely downloaded and WAITING - not merely installing.
 *    Precache of ~6 MB can take a while; while the worker is only installing,
 *    a "Reload" click would post SKIP_WAITING to the already-active
 *    controller and silently do nothing, so we don't show it yet.
 *
 *  - Reload always works: if no worker is waiting, we do a plain reload
 *    instead of sending a message that can't cause a controllerchange.
 *
 *  - Exposes a global `window.yicClearCacheAndReload()` helper so any other
 *    component (e.g. error boundary, footer link) can give the user a
 *    "Clear cache & reload" escape hatch when content looks stale.
 */
export const PwaUpdatePrompt = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [swVersion, setSwVersion] = useState<SwVersionPayload | null>(null);

  const applyUpdate = useCallback(() => {
    // Without a waiting worker there is nothing to activate: posting
    // SKIP_WAITING to the already-active controller is a no-op (no
    // controllerchange fires, so the page would never reload). A plain
    // reload always picks up the latest build instead.
    if (!waitingWorker) {
      window.location.reload();
      return;
    }
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    // controllerchange (handled in index.html) will reload the page.
  }, [waitingWorker]);

  const showUpdateToast = useCallback(() => {
    toast("A new version is ready", {
      description: "Reload to see the latest changes.",
      duration: 10000,
      action: {
        label: "Reload",
        onClick: () => applyUpdate(),
      },
      icon: <RefreshCw className="size-4" />,
    });
  }, [applyUpdate]);

  // Listen for the "new SW installed" signal from index.html
  useEffect(() => {
    const onUpdateAvailable = () => {
      navigator.serviceWorker?.getRegistration?.().then((r) => {
        if (r && r.waiting) {
          setWaitingWorker(r.waiting);
        }
      });
      showUpdateToast();
    };
    window.addEventListener("sw-update-available", onUpdateAvailable);
    return () => window.removeEventListener("sw-update-available", onUpdateAvailable);
  }, [showUpdateToast]);

  // Track the registration across the full lifecycle. Beyond listening for
  // updatefound, watch the installing worker's statechange: the moment the
  // worker finishes installing it becomes registration.waiting, which is
  // what the banner (and a working Reload click) needs. Without this the
  // worker would stay "installing" in our UI state forever.
  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const onStateChange = () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) setWaitingWorker(reg.waiting);
      });
    };

    let installingWorker: ServiceWorker | null = null;

    const sync = () => {
      navigator.serviceWorker.getRegistration().then((r) => {
        if (r?.waiting) setWaitingWorker(r.waiting);
        if (installingWorker && installingWorker !== r?.installing) {
          installingWorker.removeEventListener("statechange", onStateChange);
        }
        installingWorker = r?.installing ?? null;
        installingWorker?.addEventListener("statechange", onStateChange);
      });
    };

    navigator.serviceWorker.getRegistration().then(sync);
    navigator.serviceWorker.getRegistration().then((r) => {
      r?.addEventListener("updatefound", sync);
    });
    return () => {
      navigator.serviceWorker.getRegistration().then((r) => {
        r?.removeEventListener("updatefound", sync);
      });
      installingWorker?.removeEventListener("statechange", onStateChange);
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

  const clearCacheAndReload = useCallback(() => {
    const doIt = async () => {
      try {
        if (!navigator.serviceWorker?.controller) {
          // No SW - just clear caches via Cache API directly and reload
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
      try { localStorage.setItem(APP_VERSION_STORAGE_KEY, swVersion.version); } catch { /* storage may be blocked */ }
    }
  }, [swVersion]);

  // Banner shows ONLY when a downloaded update is genuinely waiting; while
  // the worker is merely installing there is nothing to user-action yet.
  if (!waitingWorker) return null;

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
        onClick={() => setWaitingWorker(null)}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};

export default PwaUpdatePrompt;

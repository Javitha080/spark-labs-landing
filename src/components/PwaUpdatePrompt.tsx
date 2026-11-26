import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, X, Wifi, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwVersionPayload {
  version: string;
  buildTimestamp: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const APP_VERSION_STORAGE_KEY = "yic-app-version";
const INSTALL_DISMISSED_AT_KEY = "yic-pwa-install-dismissed-at";
const INSTALL_DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos = /(iphone|ipad|ipod)/i.test(ua);
  const isOtherBrowser = /(crios|fxios|edgios|opios)/i.test(ua);
  const isSafari = /safari/i.test(ua);
  return isIos && isSafari && !isOtherBrowser;
}

function isInstallDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(INSTALL_DISMISSED_AT_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < INSTALL_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Listens for Service Worker lifecycle events and PWA install prompts, turning
 * them into user-facing cues:
 *
 *  - "sw-update-available" (dispatched by index.html when a new SW reaches
 *    'installed' while a controller is active) -> brief "Update ready" toast
 *    with a Reload button.
 *
 *  - A persistent mini-banner appears at the bottom of the screen once the
 *    update is genuinely downloaded and WAITING - not merely installing.
 *    Precaching can take a moment on slow links; while the worker is only
 *    installing, a "Reload" click would post SKIP_WAITING to the already-active
 *    controller and silently do nothing, so we don't show it yet.
 *
 *  - Reload always works: if no worker is waiting, we do a plain reload
 *    instead of sending a message that can't cause a controllerchange.
 *
 *  - Captures `beforeinstallprompt` (plus iOS Safari A2HS hint) and surfaces a
 *    non-intrusive install pill at bottom-left with 14-day dismissal memory.
 *
 *  - Exposes a global `window.yicClearCacheAndReload()` helper so any other
 *    component (e.g. error boundary, command palette) can give the user a
 *    "Clear cache & reload" escape hatch when content looks stale.
 */
export const PwaUpdatePrompt = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [swVersion, setSwVersion] = useState<SwVersionPayload | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode);
  const [installDismissed, setInstallDismissed] = useState(isInstallDismissed);
  const [isIosSafari] = useState(detectIosSafari);

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

  // Listen for installability events (`beforeinstallprompt` & `appinstalled`)
  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

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
      try {
        localStorage.setItem(APP_VERSION_STORAGE_KEY, swVersion.version);
      } catch {
        /* storage may be blocked */
      }
    }
  }, [swVersion]);

  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    setDeferredPrompt(null);
    try {
      localStorage.setItem(INSTALL_DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      /* storage may be blocked */
    }
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "dismissed") {
        dismissInstall();
      } else {
        setDeferredPrompt(null);
      }
    } catch {
      dismissInstall();
    }
  }, [deferredPrompt, dismissInstall]);

  // Update banner takes priority over install prompt.
  if (waitingWorker) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-pwa-prompt=""
        className="fixed bottom-4 left-1/2 z-[100000] -translate-x-1/2 flex items-center gap-2 rounded-full border border-border/40 bg-background/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur"
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
          type="button"
          aria-label="Dismiss"
          className="ml-1 -my-1.5 -mr-1.5 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={() => setWaitingWorker(null)}
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  const showInstallBanner =
    !isStandalone && !installDismissed && (Boolean(deferredPrompt) || isIosSafari);

  if (!showInstallBanner) return null;

  return (
    <div
      role="region"
      aria-label="Install YICDVP app"
      data-pwa-prompt=""
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[99990] max-w-[calc(100vw-5.5rem)] sm:max-w-sm flex items-center gap-2.5 rounded-2xl border border-border/50 bg-background/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md"
    >
      {deferredPrompt ? (
        <>
          <Download className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-foreground/90 font-medium leading-snug">
            Install YICDVP app for faster offline access
          </span>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 px-3 text-xs rounded-full shrink-0"
            onClick={() => void handleInstallClick()}
          >
            Install
          </Button>
        </>
      ) : (
        <>
          <Share className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-foreground/90 leading-snug">
            Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install YICDVP.
          </span>
        </>
      )}
      <button
        type="button"
        aria-label="Dismiss install prompt"
        className="ml-0.5 -my-1.5 -mr-1.5 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        onClick={dismissInstall}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};

export default PwaUpdatePrompt;

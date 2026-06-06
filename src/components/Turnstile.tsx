import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, config: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

interface TurnstileProps {
  siteKey: string;
  onSuccess?: (token: string) => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOAD_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 3;

let _scriptLoadingPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (_scriptLoadingPromise) return _scriptLoadingPromise;

  _scriptLoadingPromise = new Promise((resolve, reject) => {
    // Check for existing script tag (may have been added by another instance)
    const existing = document.querySelector(`script[src^="${SCRIPT_URL.split("?")[0]}"]`);
    if (existing) {
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(poll);
        if (!window.turnstile) reject(new Error("Turnstile init timeout"));
        else resolve();
      }, LOAD_TIMEOUT_MS);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Wait for window.turnstile to be defined (may be async after script load)
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(poll);
        if (window.turnstile) resolve();
        else reject(new Error("Turnstile API not available after script load"));
      }, 5000);
    };
    script.onerror = () => {
      _scriptLoadingPromise = null;
      reject(new Error("Failed to load Turnstile script"));
    };
    document.head.appendChild(script);
  });

  return _scriptLoadingPromise;
}

export function Turnstile({
  siteKey,
  onSuccess,
  onError,
  theme = "auto",
  size = "normal",
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const renderingRef = useRef(false); // Guard against concurrent renders
  const retryCountRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use refs for callbacks to avoid stale closures and re-render loops
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // react-doctor-disable no-derived-state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Keep refs updated without causing re-render loops
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const safeRemoveWidget = useCallback(() => {
    const wid = widgetIdRef.current;
    if (wid && window.turnstile) {
      try {
        window.turnstile.remove(wid);
      } catch {
        // Widget already removed or not found — safe to ignore
      }
      widgetIdRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    mountedRef.current = false;
    renderingRef.current = false;
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    safeRemoveWidget();
    // Clear container to prevent stale iframes
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  }, [safeRemoveWidget]);

  const renderWidget = useCallback(() => {
    if (!mountedRef.current || !containerRef.current || !window.turnstile) return false;
    if (renderingRef.current) return false; // Prevent concurrent renders

    renderingRef.current = true;

    try {
      // Remove existing widget first
      safeRemoveWidget();

      // Clear any stale Turnstile iframes from the container
      containerRef.current.innerHTML = "";

      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: import.meta.env.DEV ? "1x00000000000000000000AA" : siteKey,
        theme,
        size,
        "retry": "auto",
        "retry-interval": 5000,
        "refresh-expired": "auto",
        callback: (token: string) => {
          if (mountedRef.current) {
            onSuccessRef.current?.(token);
          }
        },
        "error-callback": (errorCode: string) => {
          if (!mountedRef.current) return;
          // 600010 = transient error, let Turnstile auto-retry
          if (errorCode === "600010") {
            console.warn("[Turnstile] Transient error 600010, widget will auto-retry");
            return;
          }
          safeRemoveWidget(); // Clean up widget before error state changes DOM
          setError(true);
          setErrorMsg("Security check failed. Please try again.");
          onErrorRef.current?.();
        },
        "timeout-callback": () => {
          if (!mountedRef.current) return;
          safeRemoveWidget(); // Clean up widget before error state removes container
          setError(true);
          setErrorMsg("Security check timed out. Please refresh.");
          onErrorRef.current?.();
        },
        "expired-callback": () => {
          // Token expired — notify parent to clear the token
          if (mountedRef.current) {
            onSuccessRef.current?.(""); // Clear token
          }
        },
      });

      widgetIdRef.current = widgetId;
      setLoading(false);
      setError(false);
      renderingRef.current = false;
      return true;
    } catch (err) {
      renderingRef.current = false;
      console.warn("[Turnstile] Render error:", err);
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, theme, size, safeRemoveWidget]);

  const attemptLoad = useCallback(() => {
    if (!mountedRef.current) return;

    if (retryCountRef.current >= MAX_RETRIES) {
      setError(true);
      setErrorMsg("Security check unavailable. You can still submit the form.");
      setLoading(false);
      onErrorRef.current?.();
      return;
    }

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }

    loadTurnstileScript()
      .then(() => {
        if (!mountedRef.current) return;
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        // Small delay to ensure DOM is ready
        requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          const ok = renderWidget();
          if (!ok) {
            retryCountRef.current++;
            retryTimerRef.current = setTimeout(attemptLoad, RETRY_DELAY_MS);
          }
        });
      })
      .catch(() => {
        if (!mountedRef.current) return;
        retryCountRef.current++;
        _scriptLoadingPromise = null;
        retryTimerRef.current = setTimeout(attemptLoad, RETRY_DELAY_MS);
      });

    loadingTimerRef.current = setTimeout(() => {
      if (mountedRef.current && loading) {
        retryCountRef.current++;
        _scriptLoadingPromise = null;
        attemptLoad();
      }
    }, LOAD_TIMEOUT_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderWidget]);

  // react-doctor-disable no-derived-state
  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;
    attemptLoad();
    return cleanup;
  }, [attemptLoad, cleanup]);

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-sm text-destructive">{errorMsg}</div>
        <button
          type="button"
          onClick={() => {
            setError(false);
            setLoading(true);
            setErrorMsg("");
            retryCountRef.current = 0;
            _scriptLoadingPromise = null;
            // Don't call full cleanup — just remove widget
            safeRemoveWidget();
            if (containerRef.current) containerRef.current.innerHTML = "";
            mountedRef.current = true;
            attemptLoad();
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Retry security check
        </button>
        {/* Keep container in DOM so turnstile.remove() can find the widget */}
        <div ref={containerRef} style={{ display: "none" }} />
      </div>
    );
  }

  return (
    <div className={className} data-html2canvas-ignore="true">
      {loading && (
        <div className="text-sm text-muted-foreground animate-pulse">Loading security check&hellip;</div>
      )}
      <div ref={containerRef} />
    </div>
  );
}


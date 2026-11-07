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

// Cloudflare docs (Client-side errors): while `retry: "auto"` is running, the
// error-callback can fire repeatedly for the same underlying issue. Tearing
// the widget down on the first blip turns a temporary network wobble into a
// permanent "Security check failed" state, so we give up only once retries
// demonstrably stop recovering. 1xxxxx codes are configuration problems
// (e.g. a wrong sitekey) and can't heal by retrying, so they stay fail-fast.
const TURNSTILE_CONFIG_FAMILY = "1";
const TURNSTILE_GIVE_UP_SAME_CODE = 3; // consecutive identical error codes
const TURNSTILE_GIVE_UP_TOTAL = 6; // ceiling so alternating codes still bail out

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

  // Streak of consecutive error events on the current widget. Reset whenever a
  // widget is (re)rendered or a challenge completes.
  const errorStreakRef = useRef<{ code: string; same: number; total: number }>({
    code: "",
    same: 0,
    total: 0,
  });

  // react-doctor-disable no-derived-state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Keep refs updated without causing re-render loops
  // Self-handle for attemptLoad so deferred timers can re-invoke the latest
  // loader without capturing a not-yet-declared variable.
  const attemptLoadRef = useRef<() => void>(() => {});

  // Keep refs updated without causing re-render loops. Ref writes belong in
  // effects, not render - render-time writes produce inconsistent snapshots
  // under concurrent rendering.
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const safeRemoveWidget = useCallback(() => {
    const wid = widgetIdRef.current;
    if (wid && window.turnstile) {
      try {
        window.turnstile.remove(wid);
      } catch {
        // Widget already removed or not found - safe to ignore
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

  // Tear the widget down and surface the error state. Only called once the
  // widget has proven it cannot recover on its own (see error-callback).
  const giveUpWithError = useCallback(
    (code: string) => {
      if (!mountedRef.current) return;
      console.warn(`[Turnstile] Widget gave up after repeated retries (code ${code})`);
      safeRemoveWidget(); // Clean up widget before error state changes DOM
      setError(true);
      setErrorMsg("Security check failed. Please try again.");
      onErrorRef.current?.();
    },
    [safeRemoveWidget],
  );

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
          // A solved challenge is a recovery point: clear the error streak.
          errorStreakRef.current = { code: "", same: 0, total: 0 };
          if (mountedRef.current) {
            onSuccessRef.current?.(token);
          }
        },
        "error-callback": (errorCode: string) => {
          if (!mountedRef.current) return;
          const code = String(errorCode);

          // 1xxxxx = configuration problem (e.g. bad sitekey/domain). Retrying
          // can't fix it, so fail immediately like before.
          if (code.startsWith(TURNSTILE_CONFIG_FAMILY)) {
            giveUpWithError(code);
            return;
          }

          // Transient/retryable families (300xxx, 600xxx, …): track a streak and
          // let Turnstile's `retry: "auto"` loop do its work. Returning falsy
          // keeps Cloudflare's own per-attempt console trace of the code.
          const streak = errorStreakRef.current;
          if (streak.code === code) {
            streak.same += 1;
          } else {
            streak.code = code;
            streak.same = 1;
          }
          streak.total += 1;

          if (streak.same >= TURNSTILE_GIVE_UP_SAME_CODE || streak.total >= TURNSTILE_GIVE_UP_TOTAL) {
            giveUpWithError(code);
          }
        },
        "timeout-callback": () => {
          if (!mountedRef.current) return;
          safeRemoveWidget(); // Clean up widget before error state removes container
          setError(true);
          setErrorMsg("Security check timed out. Please refresh.");
          onErrorRef.current?.();
        },
        "expired-callback": () => {
          // Token expired - notify parent to clear the token
          if (mountedRef.current) {
            onSuccessRef.current?.(""); // Clear token
          }
        },
      });

      widgetIdRef.current = widgetId;
      // A freshly rendered widget restarts the challenge from scratch, so any
      // error streak from the previous attempt no longer applies.
      errorStreakRef.current = { code: "", same: 0, total: 0 };
      setLoading(false);
      setError(false);
      renderingRef.current = false;
      return true;
    } catch (err) {
      renderingRef.current = false;
      console.warn("[Turnstile] Render error:", err);
      return false;
    }
    }, [siteKey, theme, size, safeRemoveWidget, giveUpWithError]);

  const attemptLoad = useCallback(() => {
    if (!mountedRef.current) return;

    if (retryCountRef.current >= MAX_RETRIES) {
      setError(true);
      // Honest copy: every consumer requires a token and the server rejects
      // tokenless submits, so we must not imply the form will go through.
      setErrorMsg("Security check is unavailable right now. Please refresh the page and try again.");
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
            retryTimerRef.current = setTimeout(() => attemptLoadRef.current(), RETRY_DELAY_MS);
          }
        });
      })
      .catch(() => {
        if (!mountedRef.current) return;
        retryCountRef.current++;
        _scriptLoadingPromise = null;
        retryTimerRef.current = setTimeout(() => attemptLoadRef.current(), RETRY_DELAY_MS);
      });

    loadingTimerRef.current = setTimeout(() => {
      if (mountedRef.current && loading) {
        retryCountRef.current++;
        _scriptLoadingPromise = null;
        attemptLoadRef.current();
      }
    }, LOAD_TIMEOUT_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderWidget]);

  // Keep the deferred-loader handle pointing at the latest attemptLoad before
  // the mount effect below triggers it.
  useEffect(() => {
    attemptLoadRef.current = attemptLoad;
  }, [attemptLoad]);

  // The Turnstile iframe runs a continuous challenge loop, so a form mounted
  // 5,000px below the fold was paying that rendering cost through every
  // scroll frame. The widget still grabs its container; it just does not
  // arm the challenge until the box is (nearly) on screen — one intersection
  // is all it takes, and from there it behaves exactly as before.
  const inViewRef = useRef(false);
  useEffect(() => {
    const el = containerRef.current;
    if (typeof IntersectionObserver === "undefined" || !el) {
      inViewRef.current = true; // no observer support: arm immediately
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (inViewRef.current) return;
        if (entries.some((e) => e.isIntersecting)) {
          inViewRef.current = true;
          observer.disconnect();
          if (mountedRef.current) attemptLoadRef.current();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // react-doctor-disable no-derived-state
  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;
    if (inViewRef.current) attemptLoad();
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
            errorStreakRef.current = { code: "", same: 0, total: 0 };
            _scriptLoadingPromise = null;
            // Don't call full cleanup - just remove widget
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


import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  logError,
  deriveErrorCode,
  rememberErrorCode,
  copyToClipboard,
  categorizeError,
} from "@/lib/errors";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface Props {
  children: ReactNode;
  /** Optional name for logging context (route/section). */
  name?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCode: string;
  codeCopied: boolean;
  attempts: number;
}

const MAX_AUTO_RETRIES = 3;

// Module-loading failures surface with different wording per engine/bundler.
// categorizeError already flags most as "network" (they contain "fetch"), but
// "Importing a module script failed" (Safari) does not - so check both.
const CHUNK_LOAD_PATTERNS: RegExp[] = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk \d+ failed/i,
  /dynamically imported module/i,
];

function isNetworkLoadFailure(error: Error | null): boolean {
  if (!error) return false;
  if (categorizeError(error) === "network") return true;
  return CHUNK_LOAD_PATTERNS.some((re) => re.test(error.message));
}

/**
 * Fires `onRetry` when the verified connection (re)turns on, so a section
 * that failed to download recovers without user interaction. Debounced so
 * a flapping connection does not cause an immediate retry stampede.
 */
function OnlineRetry({ enabled, onRetry }: { enabled: boolean; onRetry: () => void }) {
  const { isOnline } = useOnlineStatus();
  const lastOnline = useRef(isOnline);

  useEffect(() => {
    if (!enabled || !isOnline) {
      lastOnline.current = isOnline;
      return;
    }
    // Fire after recovery (transition false -> true) or shortly after mount
    // if connectivity is already verified - the chunk fetch may just have
    // raced a brief dropout.
    const cameBack = !lastOnline.current;
    lastOnline.current = true;
    const delayMs = cameBack ? 400 : 800;
    const timer = window.setTimeout(onRetry, delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, isOnline, onRetry]);

  return null;
}

interface ErrorViewProps {
  errorCode: string;
  codeCopied: boolean;
  devMessage: string | null;
  isLoadFailure: boolean;
  attempts: number;
  onCopyCode: () => void | Promise<void>;
  onTryAgain: () => void;
  onBack: () => void;
  onClearCacheReload: () => void;
}

/**
 * Presentational fallback. Uses useOnlineStatus so the copy reacts to the
 * verified connection state, and renders OnlineRetry to self-heal once the
 * network returns.
 */
function RouteErrorView({
  errorCode,
  codeCopied,
  devMessage,
  isLoadFailure,
  attempts,
  onCopyCode,
  onTryAgain,
  onBack,
  onClearCacheReload,
}: ErrorViewProps) {
  const { isOnline } = useOnlineStatus();
  const offline = !isOnline;
  const showClearCache = isLoadFailure && attempts >= 2;

  const description = isLoadFailure
    ? offline
      ? "You're offline - this section still needs to be downloaded. It retries automatically once the connection returns."
      : "Loading timed out or a network hiccup interrupted it. Retrying usually fixes this."
    : "An unexpected error occurred. The rest of the app is still working.";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      {isLoadFailure && <OnlineRetry enabled={attempts < MAX_AUTO_RETRIES} onRetry={onTryAgain} />}
      <div className="max-w-md w-full text-center bg-card/40 backdrop-blur border border-border/50 rounded-2xl p-8 space-y-5">
        <div className="mx-auto size-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
          {offline ? (
            <WifiOff className="size-7 text-destructive" />
          ) : (
            <AlertTriangle className="size-7 text-destructive" />
          )}
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">This section couldn't load</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          <button
            type="button"
            onClick={() => void onCopyCode()}
            title="Copy error code"
            className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest cursor-pointer transition-colors hover:text-muted-foreground"
          >
            {codeCopied
              ? `Copied — ${errorCode}`
              : `Error Code: ${errorCode}`}
          </button>
        </div>
        {import.meta.env.DEV && devMessage && (
          <pre className="text-[10px] text-left bg-background/50 p-3 rounded border border-border/40 text-destructive/80 overflow-auto max-h-32">
            {devMessage}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          {isLoadFailure ? (
            <Button size="sm" variant="outline" onClick={onClearCacheReload}>
              <RotateCw className="size-4 mr-2" />
              Reload App
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onBack}>
              Go Back
            </Button>
          )}
          <Button size="sm" onClick={onTryAgain}>
            <RefreshCcw className="size-4 mr-2" />
            Try Again
          </Button>
        </div>
        {showClearCache && (
          <button
            type="button"
            onClick={onClearCacheReload}
            className="text-xs text-muted-foreground/70 underline-offset-4 hover:underline hover:text-muted-foreground transition-colors"
          >
            Still broken? Clear cached files &amp; reload
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Lightweight per-route error boundary so a failure in one section
 * does not blank the entire app. The top-level ErrorBoundary remains
 * as a global safety net.
 *
 * Network/section-download failures get a dedicated fallback: offline-aware
 * copy, a full reload escape hatch, and automatic retry when the verified
 * connection returns (capped at MAX_AUTO_RETRIES per error).
 */
class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorCode: "0xUNK-00000000", codeCopied: false, attempts: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorCode: deriveErrorCode(error), codeCopied: false, attempts: 0 };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const errorCode = deriveErrorCode(error);
    rememberErrorCode(errorCode);
    logError({ error, info }, `route:${this.props.name ?? "unknown"}`);
  }

  private reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCode: "0xUNK-00000000",
      codeCopied: false,
      attempts: 0,
    });
  };

  /** Retry used by both the button and OnlineRetry; counts attempts. */
  private tryAgain = () => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      codeCopied: false,
      attempts: s.attempts + 1,
    }));
  };

  private handleCopyCode = async () => {
    const ok = await copyToClipboard(this.state.errorCode);
    if (!ok) return;
    this.setState({ codeCopied: true });
    window.setTimeout(() => this.setState({ codeCopied: false }), 2000);
  };

  private handleClearCacheReload = () => {
    const helper = (window as unknown as { yicClearCacheAndReload?: () => void }).yicClearCacheAndReload;
    if (typeof helper === "function") {
      helper();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <RouteErrorView
        errorCode={this.state.errorCode}
        codeCopied={this.state.codeCopied}
        devMessage={this.state.error?.message ?? null}
        isLoadFailure={isNetworkLoadFailure(this.state.error)}
        attempts={this.state.attempts}
        onCopyCode={this.handleCopyCode}
        onTryAgain={this.tryAgain}
        onBack={this.reset}
        onClearCacheReload={this.handleClearCacheReload}
      />
    );
  }
}

export default RouteErrorBoundary;

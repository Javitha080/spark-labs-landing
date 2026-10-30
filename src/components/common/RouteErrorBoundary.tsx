import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError, deriveErrorCode, rememberErrorCode, copyToClipboard } from "@/lib/errors";

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
}

/**
 * Lightweight per-route error boundary so a failure in one section
 * does not blank the entire app. The top-level ErrorBoundary remains
 * as a global safety net.
 */
class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorCode: "0xUNK-00000000", codeCopied: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorCode: deriveErrorCode(error), codeCopied: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const errorCode = deriveErrorCode(error);
    rememberErrorCode(errorCode);
    logError({ error, info }, `route:${this.props.name ?? "unknown"}`);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null, errorCode: "0xUNK-00000000", codeCopied: false });
  };

  private handleCopyCode = async () => {
    const ok = await copyToClipboard(this.state.errorCode);
    if (!ok) return;
    this.setState({ codeCopied: true });
    window.setTimeout(() => this.setState({ codeCopied: false }), 2000);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-card/40 backdrop-blur border border-border/50 rounded-2xl p-8 space-y-5">
          <div className="mx-auto size-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="size-7 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">This section couldn't load</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. The rest of the app is still working.
            </p>
            <button
              type="button"
              onClick={this.handleCopyCode}
              title="Copy error code"
              className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest cursor-pointer transition-colors hover:text-muted-foreground"
            >
              {this.state.codeCopied
                ? `Copied — ${this.state.errorCode}`
                : `Error Code: ${this.state.errorCode}`}
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-[10px] text-left bg-background/50 p-3 rounded border border-border/40 text-destructive/80 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button size="sm" onClick={this.reset}>
              <RefreshCcw className="size-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;

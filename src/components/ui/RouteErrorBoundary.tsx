import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/errors";

interface Props {
  children: ReactNode;
  /** Optional name for logging context (route/section). */
  name?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight per-route error boundary so a failure in one section
 * does not blank the entire app. The top-level ErrorBoundary remains
 * as a global safety net.
 */
class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError({ error, info }, `route:${this.props.name ?? "unknown"}`);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-card/40 backdrop-blur border border-border/50 rounded-2xl p-8 space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">This section couldn't load</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. The rest of the app is still working.
            </p>
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
              <RefreshCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;

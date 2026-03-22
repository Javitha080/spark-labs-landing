import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            const isOfflineError = this.state.error?.message?.includes("Failed to fetch dynamically imported module") || 
                                   this.state.error?.message?.includes("Importing a module script failed");

            if (isOfflineError) {
                return (
                    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black z-0 pointer-events-none" />
                        <div className="relative z-10 max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-fade-up">
                            <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                                <WifiOff className="w-10 h-10 text-amber-500 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black tracking-tighter text-white">
                                    You are Offline
                                </h1>
                                <p className="text-muted-foreground text-sm mt-2">
                                    New parts of the app need to be downloaded to show this page. Please reconnect to the internet and try again.
                                </p>
                            </div>
                            <Button
                                onClick={this.handleReload}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
                    {/* Background Elements */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black z-0 pointer-events-none" />
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-destructive/10 rounded-full blur-[80px] animate-pulse delay-700 pointer-events-none" />

                    <div className="relative z-10 max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center space-y-6">
                        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20 mb-6">
                            <AlertTriangle className="w-10 h-10 text-destructive animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tighter text-white">
                                System Failure
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                A critical error has occurred in the interface matrix.
                            </p>
                        </div>

                        {this.state.error && import.meta.env.DEV && (
                            <div className="p-4 bg-black/50 rounded-lg text-left overflow-auto max-h-40 border border-white/5">
                                <p className="font-mono text-xs text-red-400 break-words">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-white transition-colors">Stack Trace</summary>
                                        <pre className="font-mono text-[10px] text-zinc-500 mt-2 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="grid gap-3 grid-cols-2">
                            <Button
                                onClick={this.handleGoHome}
                                variant="outline"
                                className="w-full border-white/10 hover:bg-white/5 hover:text-white group"
                            >
                                <Home className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                Return Base
                            </Button>
                            <Button
                                onClick={this.handleReload}
                                variant="destructive"
                                className="w-full shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2 animate-spin-slow group-hover:animate-spin" />
                                Reboot System
                            </Button>
                        </div>

                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest pt-4">Error Code: 0xCRITICAL_FAIL</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

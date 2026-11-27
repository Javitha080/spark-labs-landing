import React from "react";
import { RotateCcw } from "lucide-react";
import { VIHARA_ASSETS } from "./viharaAssets";

interface ViharaErrorBoundaryProps {
  children: React.ReactNode;
}

interface ViharaErrorBoundaryState {
  hasError: boolean;
}

/**
 * Production React Error Boundary scoped to the Vihara living woodblock stage.
 * If a WebGL driver or browser canvas throws unexpectedly, the footer degrades
 * gracefully to the crisp uncropped woodblock plate without disrupting YICDVP links
 * or the Newsletter bar.
 */
export class ViharaErrorBoundary extends React.Component<
  ViharaErrorBoundaryProps,
  ViharaErrorBoundaryState
> {
  constructor(props: ViharaErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ViharaErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Contained gracefully within the footer stage boundary
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="vihara-plate-fallback relative h-full w-full overflow-hidden bg-[var(--vihara-bg)]">
        <img
          src={VIHARA_ASSETS.plate}
          alt="Woodblock engraving of Dharmapala Vidyalaya heritage hall and trees"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          draggable={false}
        />
        <button
          type="button"
          onClick={this.handleReset}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--vihara-line)] bg-[var(--vihara-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--vihara-ink)] shadow-sm backdrop-blur-md transition-opacity hover:opacity-90"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[var(--vihara-accent)]" />
          <span>Reload Scene</span>
        </button>
      </div>
    );
  }
}

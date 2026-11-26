import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HorizontalShowcase from "./HorizontalShowcase";

const mockScrollToTarget = vi.fn();
let mockIsDesktop = true;
let mockReducedMotion = false;

vi.mock("@/lib/scroll", () => ({
  scrollToTarget: (target: string) => mockScrollToTarget(target),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: (query: string) => {
    if (query === "(min-width: 768px)") return mockIsDesktop;
    if (query === "(prefers-reduced-motion: reduce)") return mockReducedMotion;
    return false;
  },
}));

describe("HorizontalShowcase", () => {
  beforeEach(() => {
    mockIsDesktop = true;
    mockReducedMotion = false;
    mockScrollToTarget.mockReset();
  });

  it("renders desktop pinned section as a non-overlapping flex-col flow layout", () => {
    const { container } = render(<HorizontalShowcase />);
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(section?.className).toContain("flex-col");
    expect(section?.className).toContain("md:h-[100dvh]");

    const heading = screen.getByRole("heading", { level: 2, name: /our vision/i });
    const headerWrapper = heading.parentElement;
    expect(headerWrapper).toBeInTheDocument();
    expect(headerWrapper?.className).not.toContain("absolute");
    expect(headerWrapper?.className).toContain("shrink-0");
    expect(headerWrapper?.className).toContain("pt-24");
    expect(headerWrapper?.className).toContain("md:pt-28");

    const trackWrapper = headerWrapper?.nextElementSibling as HTMLElement | null;
    expect(trackWrapper).toBeInTheDocument();
    expect(trackWrapper?.className).toContain("flex-1");
    expect(trackWrapper?.className).toContain("min-h-0");
    expect(trackWrapper?.className).toContain("pb-8");
    expect(trackWrapper?.className).toContain("md:pb-12");

    const cards = container.querySelectorAll(".showcase-card");
    expect(cards).toHaveLength(3);

    fireEvent.click(screen.getAllByRole("button", { name: /explore projects/i })[0]);
    expect(mockScrollToTarget).toHaveBeenCalledWith("projects");
  });

  it("renders mobile swipe controls and advances slides via tablist and next button", () => {
    mockIsDesktop = false;
    render(<HorizontalShowcase />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByRole("button", { name: /next showcase slide/i }));
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("renders static vertical fallback when prefers-reduced-motion is active", () => {
    mockReducedMotion = true;
    const { container } = render(<HorizontalShowcase />);

    expect(container.querySelector(".showcase-card")).toBeNull();
    expect(screen.getByText("Innovate Daily")).toBeInTheDocument();
    expect(screen.getByText("Sustainable Energy")).toBeInTheDocument();
    expect(screen.getByText("Global Impact")).toBeInTheDocument();
  });
});

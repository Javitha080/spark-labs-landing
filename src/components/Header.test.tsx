import { act, fireEvent, render, screen } from "@testing-library/react";
import { LazyMotion, domAnimation, motionValue } from "framer-motion";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "./Header";

const scrollToTargetMock = vi.fn();
const prefetchRouteMock = vi.fn();
const prefetchDataMock = vi.fn();
const mockScrollY = motionValue(0);
let mockIsAuthenticated = false;
let mockFooterInView = false;

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useScroll: () => ({
      scrollY: mockScrollY,
      scrollX: actual.motionValue(0),
      scrollYProgress: actual.motionValue(0),
      scrollXProgress: actual.motionValue(0),
    }),
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

vi.mock("@/lib/scroll", () => ({
  scrollToTarget: (...args: unknown[]) => scrollToTargetMock(...args),
}));

vi.mock("@/lib/prefetch", () => ({
  prefetchRoute: (...args: unknown[]) => prefetchRouteMock(...args),
  prefetchData: (...args: unknown[]) => prefetchDataMock(...args),
}));

vi.mock("@/context/StudentAuthContext", () => ({
  useStudentSession: () => ({
    isAuthenticated: mockIsAuthenticated,
  }),
}));

vi.mock("@/hooks/useSiteFooterInView", () => ({
  useSiteFooterInView: () => mockFooterInView,
}));

function renderHeader(initialPath = "/") {
  return render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter initialEntries={[initialPath]}>
        <Header />
      </MemoryRouter>
    </LazyMotion>,
  );
}

describe("Header", () => {
  const originalIO = globalThis.IntersectionObserver;

  beforeEach(() => {
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    globalThis.IntersectionObserver = MockIntersectionObserver;

    mockIsAuthenticated = false;
    mockFooterInView = false;
    mockScrollY.set(0);
    scrollToTargetMock.mockReset();
    prefetchRouteMock.mockReset();
    prefetchDataMock.mockReset();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
    mockScrollY.set(0);
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
  });

  it("renders logo with explicit 48x48 dimensions, offline-banner top offset, and Verify/Search/Student Portal controls", () => {
    const { container } = renderHeader("/");

    const banner = screen.getByRole("banner");
    expect(banner.style.top).toBe("var(--offline-banner-h, 0px)");

    const logo = screen.getByAltText("YICDVP Logo");
    expect(logo).toHaveAttribute("width", "48");
    expect(logo).toHaveAttribute("height", "48");

    expect(screen.getByRole("link", { name: "Student Portal" })).toHaveAttribute(
      "href",
      "/student/login",
    );
    expect(screen.getByRole("link", { name: "Verify Certificate" })).toHaveAttribute(
      "href",
      "/verify",
    );
    expect(screen.getByRole("button", { name: "Search site (Ctrl+K)" })).toBeInTheDocument();
    expect(container.querySelector(".header-lg-scrolled")).toBeNull();
  });

  it("shows Student Dashboard link when authenticated and dispatches command palette event on search click", () => {
    mockIsAuthenticated = true;
    const eventSpy = vi.fn();
    window.addEventListener("yicdvp:open-command-palette", eventSpy);

    renderHeader("/");

    expect(screen.getByRole("link", { name: "Student Dashboard" })).toHaveAttribute(
      "href",
      "/student/dashboard",
    );

    fireEvent.click(screen.getByRole("button", { name: "Search site (Ctrl+K)" }));
    expect(eventSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener("yicdvp:open-command-palette", eventSpy);
  });

  it("threshold-gates scrolled state cleanly at scrollY > 50 without per-pixel re-renders", () => {
    const { container } = renderHeader("/");

    expect(container.querySelector(".header-lg-scrolled")).toBeNull();

    act(() => {
      mockScrollY.set(30);
      mockScrollY.set(50);
    });
    expect(container.querySelector(".header-lg-scrolled")).toBeNull();

    act(() => {
      mockScrollY.set(75);
    });
    expect(container.querySelector(".header-lg-scrolled")).not.toBeNull();

    // Additional pixel changes above 50 keep scrolled active without flipping
    act(() => {
      mockScrollY.set(120);
      mockScrollY.set(240);
    });
    expect(container.querySelector(".header-lg-scrolled")).not.toBeNull();

    act(() => {
      mockScrollY.set(10);
    });
    expect(container.querySelector(".header-lg-scrolled")).toBeNull();
  });

  it("prefetches route chunks and query data on nav link hover and focus", () => {
    renderHeader("/about");

    const stemLink = screen.getByRole("menuitem", { name: "STEM" });
    fireEvent.mouseEnter(stemLink);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/learning-hub");

    const newsLink = screen.getByRole("menuitem", { name: "NEWS" });
    fireEvent.focus(newsLink);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/news");
    expect(prefetchDataMock).toHaveBeenCalledWith("news-posts");

    const blogLink = screen.getByRole("menuitem", { name: "BLOG" });
    fireEvent.mouseEnter(blogLink);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/blog");
    expect(prefetchDataMock).toHaveBeenCalledWith("blog-posts");

    const projectsBtn = screen.getByRole("menuitem", { name: "Projects" });
    fireEvent.mouseEnter(projectsBtn);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/");
    expect(prefetchDataMock).toHaveBeenCalledWith("projects-featured");

    const mentorsBtn = screen.getByRole("menuitem", { name: "Mentors" });
    fireEvent.focus(mentorsBtn);
    expect(prefetchDataMock).toHaveBeenCalledWith("teachers");
  });

  it("scrolls to #join via lib/scroll when clicking JOIN on the landing page", () => {
    renderHeader("/");
    fireEvent.click(screen.getByRole("button", { name: /join/i }));
    expect(scrollToTargetMock).toHaveBeenCalledWith("join");
  });

  it("keeps outer banner pointer-events-none, toggles pointer-events on HeaderLiquidGlass, and keeps desktop nav in flex flow without xl:absolute", () => {
    const { container, rerender } = renderHeader("/");

    const banner = screen.getByRole("banner");
    expect(banner.className).toContain("pointer-events-none");
    expect(banner.style.pointerEvents).toBe("");

    const surface = container.querySelector(".header-lg-surface");
    expect(surface).not.toBeNull();
    expect(surface?.className).toContain("pointer-events-auto");

    const desktopNav = screen.getByRole("menubar", { name: "Main Navigation" }).closest("nav");
    expect(desktopNav).not.toBeNull();
    expect(desktopNav?.className).toContain("flex-1");
    expect(desktopNav?.className).toContain("min-w-0");
    expect(desktopNav?.className).not.toContain("xl:absolute");
    expect(desktopNav?.className).not.toContain("xl:-translate-x-1/2");

    // When footer is in view, HeaderLiquidGlass switches to pointer-events-none while banner remains pointer-events-none
    mockFooterInView = true;
    rerender(
      <LazyMotion features={domAnimation} strict>
        <MemoryRouter initialEntries={["/"]}>
          <Header />
        </MemoryRouter>
      </LazyMotion>,
    );
    expect(screen.getByRole("banner").className).toContain("pointer-events-none");
    expect(container.querySelector(".header-lg-surface")?.className).toContain("pointer-events-none");
  });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Footer from "./Footer";

const scrollToTargetMock = vi.fn();
const scrollToTopMock = vi.fn();
const prefetchRouteMock = vi.fn();
const prefetchDataMock = vi.fn();

vi.mock("@/lib/scroll", () => ({
  scrollToTarget: (...args: unknown[]) => scrollToTargetMock(...args),
  scrollToTop: (...args: unknown[]) => scrollToTopMock(...args),
}));

vi.mock("@/lib/prefetch", () => ({
  prefetchRoute: (...args: unknown[]) => prefetchRouteMock(...args),
  prefetchData: (...args: unknown[]) => prefetchDataMock(...args),
}));

vi.mock("@/components/Turnstile", () => ({
  Turnstile: ({
    size,
    onSuccess,
  }: {
    size?: string;
    onSuccess?: (token: string) => void;
  }) => (
    <div data-testid="turnstile-widget" data-size={size}>
      <button
        type="button"
        onClick={() => onSuccess?.("test-turnstile-token")}
      >
        Solve Turnstile
      </button>
    </div>
  ),
}));

function installMatchMediaMock(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(e: MediaQueryListEvent) => void>();

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  return {
    setMatches(next: boolean) {
      matches = next;
      const event = { matches: next } as MediaQueryListEvent;
      listeners.forEach((cb) => cb(event));
    },
  };
}

function renderFooter(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  const originalMatchMedia = window.matchMedia;
  const originalIO = globalThis.IntersectionObserver;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    scrollToTargetMock.mockReset();
    scrollToTopMock.mockReset();
    prefetchRouteMock.mockReset();
    prefetchDataMock.mockReset();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    globalThis.IntersectionObserver = originalIO;
    globalThis.fetch = originalFetch;
  });

  it("mounts exactly one Turnstile widget across 1024px resize while preserving typed email and resetting stale token", () => {
    const mm = installMatchMediaMock(false);
    renderFooter();

    // Mobile (<1024px): compact Turnstile only
    let widgets = screen.getAllByTestId("turnstile-widget");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toHaveAttribute("data-size", "compact");

    // Type email and solve Turnstile in mobile layout
    const emailInput = screen.getByPlaceholderText("you@example.com") as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "student@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));
    const subscribeBtn = screen.getByRole("button", { name: "Subscribe" });
    expect(subscribeBtn).toBeEnabled();

    // Cross 1024px breakpoint to desktop stage layout
    act(() => {
      mm.setMatches(true);
    });

    widgets = screen.getAllByTestId("turnstile-widget");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toHaveAttribute("data-size", "flexible");

    // Typed email is preserved, while stale Turnstile token is reset until solved in new layout
    expect((screen.getByPlaceholderText("you@example.com") as HTMLInputElement).value).toBe(
      "student@example.com",
    );
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeDisabled();

    // Double-resize back to mobile without solving desktop Turnstile:
    // the fresh compact Turnstile must NOT resurrect the stale mobile token
    act(() => {
      mm.setMatches(false);
    });

    widgets = screen.getAllByTestId("turnstile-widget");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toHaveAttribute("data-size", "compact");
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeDisabled();
  });

  it("scrolls smoothly via lib/scroll on same-page /#join and / clicks, and navigates normally on subpages", () => {
    installMatchMediaMock(true);
    const { unmount } = renderFooter("/");

    const joinLinks = screen.getAllByRole("link", { name: "Join the Club" });
    fireEvent.click(joinLinks[0]);
    expect(scrollToTargetMock).toHaveBeenCalledWith("join");

    const homeLogoLink = screen.getByRole("link", { name: "YICDVP home" });
    fireEvent.click(homeLogoLink);
    expect(scrollToTopMock).toHaveBeenCalledTimes(1);

    unmount();

    // On /about, /#join should let router navigate instead of calling scrollToTarget
    renderFooter("/about");
    fireEvent.click(screen.getAllByRole("link", { name: "Join the Club" })[0]);
    expect(scrollToTargetMock).toHaveBeenCalledTimes(1);
  });

  it("prefetches routes and React Query data on hover and focus", () => {
    installMatchMediaMock(true);
    renderFooter("/");

    const projectsLink = screen.getAllByRole("link", { name: "Projects" })[0];
    fireEvent.mouseEnter(projectsLink);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/projects");
    expect(prefetchDataMock).toHaveBeenCalledWith("projects-featured");

    const blogLink = screen.getAllByRole("link", { name: "Blog" })[0];
    fireEvent.focus(blogLink);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/blog");
    expect(prefetchDataMock).toHaveBeenCalledWith("blog-posts");

    const eventsLink = screen.getAllByRole("link", { name: "Events" })[0];
    fireEvent.mouseEnter(eventsLink);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/events");
    expect(prefetchDataMock).toHaveBeenCalledWith("events");
  });

  it("arms once on first intersection and disconnects so leaving/re-entering does not re-clip", () => {
    installMatchMediaMock(true);
    let observerCallback: IntersectionObserverCallback | null = null;
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [0.2];
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = observeMock;
      unobserve = vi.fn();
      disconnect = disconnectMock;
      takeRecords = () => [];
    }

    globalThis.IntersectionObserver = MockIntersectionObserver;

    const { container } = renderFooter("/");
    const footer = container.querySelector("footer");
    expect(footer).toHaveAttribute("data-armed", "false");
    expect(observeMock).toHaveBeenCalledTimes(1);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(footer).toHaveAttribute("data-armed", "true");
    expect(disconnectMock).toHaveBeenCalled();

    // Even if a stale callback fires with isIntersecting: false, footer stays armed
    // and never creates a second observer
    act(() => {
      observerCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(footer).toHaveAttribute("data-armed", "true");
    expect(observeMock).toHaveBeenCalledTimes(1);
  });

  it("renders explicit width/height attributes on logos and plate images and validates newsletter submission", async () => {
    installMatchMediaMock(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = fetchMock;

    const { container } = renderFooter("/");

    const clubLogos = screen.getAllByAltText("Young Innovators Club logo");
    clubLogos.forEach((img) => {
      expect(img).toHaveAttribute("width", "1024");
      expect(img).toHaveAttribute("height", "1024");
    });

    const schoolLogos = screen.getAllByAltText("Dharmapala Vidyalaya logo");
    schoolLogos.forEach((img) => {
      expect(img).toHaveAttribute("width", "200");
      expect(img).toHaveAttribute("height", "200");
    });

    const plateImgs = container.querySelectorAll('img[src="/assets/school-plate.webp"]');
    expect(plateImgs.length).toBeGreaterThanOrEqual(2);
    plateImgs.forEach((img) => {
      expect(img).toHaveAttribute("width", "1280");
      expect(img).toHaveAttribute("height", "720");
    });

    // Submit valid email after Turnstile
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "member@dvp.edu.lk" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => {
      expect(
        screen.getByText("You're on the list - see you in the next issue."),
      ).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/newsletter-subscribe",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Turnstile-Token": "test-turnstile-token",
        }),
      }),
    );
  });
});

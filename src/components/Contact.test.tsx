import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import Contact from "./Contact";

const mockToast = vi.fn();
let mockResolvedTheme = "dark";
let lastTurnstileTheme: string | undefined;

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds = [0];
    constructor(private callback: IntersectionObserverCallback) {}
    observe = (target: Element) => {
      this.callback(
        [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
        this as unknown as globalThis.IntersectionObserver,
      );
    };
    unobserve = () => {};
    disconnect = () => {};
    takeRecords = () => [];
  } as unknown as typeof IntersectionObserver;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  };
}

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme }),
}));

vi.mock("@/hooks/useLandingBlocks", () => ({
  useLandingBlocks: () => ({ blocks: {}, isLoading: false }),
}));

vi.mock("./Map", () => ({
  default: () => <div data-testid="map-mock" />,
}));

vi.mock("@/components/Turnstile", () => ({
  Turnstile: ({
    onSuccess,
    onError,
    theme,
    size,
  }: {
    onSuccess?: (token: string) => void;
    onError?: () => void;
    theme?: string;
    size?: string;
  }) => {
    lastTurnstileTheme = theme;
    return (
      <div data-testid="turnstile-mock" data-theme={theme} data-size={size}>
        <button type="button" onClick={() => onSuccess?.("contact-turnstile-token")}>
          Solve Turnstile
        </button>
        <button type="button" onClick={() => onError?.()}>
          Fail Turnstile
        </button>
      </div>
    );
  },
}));

function renderContact(props: { omitSectionId?: boolean } = {}) {
  return render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Contact {...props} />} />
          <Route path="/privacy-policy" element={<div data-testid="privacy-page">Privacy Policy Page</div>} />
        </Routes>
      </MemoryRouter>
    </LazyMotion>,
  );
}

describe("Contact", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockToast.mockReset();
    mockResolvedTheme = "dark";
    lastTurnstileTheme = undefined;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders unique #contact-* DOM IDs, syncs Turnstile theme, and uses SPA Link for Privacy Policy", () => {
    mockResolvedTheme = "light";
    renderContact();

    expect(document.getElementById("contact-name")).toBeInTheDocument();
    expect(document.getElementById("contact-email")).toBeInTheDocument();
    expect(document.getElementById("contact-message")).toBeInTheDocument();
    expect(document.getElementById("name")).toBeNull();
    expect(document.getElementById("email")).toBeNull();
    expect(document.getElementById("message")).toBeNull();

    expect(lastTurnstileTheme).toBe("light");
    expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-theme", "light");

    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    expect(privacyLink).toHaveAttribute("href", "/privacy-policy");
    fireEvent.click(privacyLink);
    expect(screen.getByTestId("privacy-page")).toBeInTheDocument();
  });

  it("keeps submit disabled when Turnstile token is missing (even on Turnstile error)", () => {
    renderContact();

    const submitBtn = screen.getByRole("button", { name: /send message/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Fail Turnstile" }));
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/security check could not load/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));
    expect(submitBtn).toBeEnabled();
  });

  it("validates fields inline before submitting and posts valid payloads with X-Turnstile-Token", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderContact({ omitSectionId: true });
    expect(document.getElementById("contact")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));

    // Trigger invalid submit first
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "bad-email" } });
    fireEvent.change(screen.getByLabelText(/your message/i), { target: { value: "short" } });
    fireEvent.submit(document.getElementById("contact-name")!.closest("form")!);

    expect(await screen.findByText("Name must be at least 2 characters")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Message must be at least 10 characters")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Fix fields and submit
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Kavitha Perera" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "kavitha@example.com" } });
    fireEvent.change(screen.getByLabelText(/your message/i), {
      target: { value: "Hello! I would love to collaborate on robotics workshops." },
    });
    fireEvent.submit(document.getElementById("contact-name")!.closest("form")!);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("/api/send-contact-message");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["X-Turnstile-Token"]).toBe(
      "contact-turnstile-token",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Kavitha Perera",
      email: "kavitha@example.com",
      message: "Hello! I would love to collaborate on robotics workshops.",
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Message Sent!",
        }),
      );
    });
  });

  it("uses compact Turnstile below 480px and never resurrects a stale token across double resize", () => {
    const originalMatchMedia = window.matchMedia;
    let isCompact = false;
    const listeners = new Set<() => void>();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(max-width: 479px)" ? isCompact : false,
        media: query,
        onchange: null,
        addListener: (cb: () => void) => {
          if (query === "(max-width: 479px)") listeners.add(cb);
        },
        removeListener: (cb: () => void) => {
          listeners.delete(cb);
        },
        addEventListener: (_event: string, cb: () => void) => {
          if (query === "(max-width: 479px)") listeners.add(cb);
        },
        removeEventListener: (_event: string, cb: () => void) => {
          listeners.delete(cb);
        },
        dispatchEvent: () => false,
      }),
    });

    try {
      renderContact();
      expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-size", "normal");

      fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));
      const submitBtn = screen.getByRole("button", { name: /send message/i });
      expect(submitBtn).toBeEnabled();

      // Cross below 480px -> compact widget mounts, solved token cleared
      act(() => {
        isCompact = true;
        listeners.forEach((cb) => cb());
      });
      expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-size", "compact");
      expect(submitBtn).toBeDisabled();

      // Cross back above 480px without solving -> stale token must NOT resurrect
      act(() => {
        isCompact = false;
        listeners.forEach((cb) => cb());
      });
      expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-size", "normal");
      expect(submitBtn).toBeDisabled();
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia,
      });
    }
  });
});

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PwaUpdatePrompt from "./PwaUpdatePrompt";

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

describe("PwaUpdatePrompt", () => {
  const originalMatchMedia = window.matchMedia;
  const originalServiceWorker = navigator.serviceWorker;

  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalServiceWorker,
      configurable: true,
    });
    localStorage.clear();
  });

  it("renders install prompt dismiss button with >=44px touch target classes and persists dismissal", () => {
    render(<PwaUpdatePrompt />);

    const promptEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    };
    promptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    promptEvent.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    const dismissBtn = screen.getByRole("button", { name: "Dismiss install prompt" });
    expect(dismissBtn.className).toContain("min-h-[44px]");
    expect(dismissBtn.className).toContain("min-w-[44px]");

    fireEvent.click(dismissBtn);
    expect(screen.queryByRole("button", { name: "Dismiss install prompt" })).not.toBeInTheDocument();
    expect(localStorage.getItem("yic-pwa-install-dismissed-at")).toBeTruthy();
  });

  it("renders update-ready dismiss button with >=44px touch target classes", async () => {
    const waitingWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as ServiceWorker;

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller: null,
        getRegistration: vi.fn().mockResolvedValue({
          waiting: waitingWorker,
          installing: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      },
      configurable: true,
    });

    render(<PwaUpdatePrompt />);

    const dismissBtn = await screen.findByRole("button", { name: "Dismiss" });
    expect(dismissBtn.className).toContain("min-h-[44px]");
    expect(dismissBtn.className).toContain("min-w-[44px]");

    fireEvent.click(dismissBtn);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });
});

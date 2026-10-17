import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { LazyMotion, domAnimation } from "framer-motion";

import ScrollToTop from "./ScrollToTop";

function renderScrollToTop() {
  return render(
    <LazyMotion features={domAnimation} strict>
      <ScrollToTop />
    </LazyMotion>,
  );
}

describe("ScrollToTop", () => {
  it("stays hidden until the user scrolls past the threshold", () => {
    renderScrollToTop();

    expect(window.scrollY).toBe(0);
    expect(
      screen.queryByRole("button", { name: "Scroll to top" }),
    ).not.toBeInTheDocument();
  });

  it("appears after scrolling down and scrolls back up when clicked", async () => {
    renderScrollToTop();

    Object.defineProperty(window, "scrollY", { value: 500, configurable: true });
    fireEvent(window, new Event("scroll"));

    const button = screen.getByRole("button", { name: "Scroll to top" });
    expect(button).toBeInTheDocument();

    Object.defineProperty(window, "scrollY", { value: 900, configurable: true });
    fireEvent.click(button);

    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    fireEvent(window, new Event("scroll"));

    // The button unmounts only after AnimatePresence finishes its exit
    // transition, so wait for removal instead of asserting synchronously.
    await waitForElementToBeRemoved(() =>
      screen.queryByRole("button", { name: "Scroll to top" }),
    );
  });
});

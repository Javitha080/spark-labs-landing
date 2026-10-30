import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BootScreen from "./BootScreen";

describe("BootScreen", () => {
  it("renders nothing once this session has booted (skip path)", () => {
    sessionStorage.setItem("yicdvp:booted", "1");
    const { container } = render(<BootScreen />);
    expect(container).toBeEmptyDOMElement();
  });
});

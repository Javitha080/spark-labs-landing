import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("concatenates tailwind classes", () => {
    expect(cn("bg-primary", "rounded-full")).toBe("bg-primary rounded-full");
  });

  it("lets a later conflicting utility win", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("drops falsy and conditional inputs", () => {
    const condition = false as boolean;
    expect(cn("btn", condition && "hidden", null, undefined)).toBe("btn");
  });

  it("resolves variant conflicts through class-variance-authority usage", () => {
    expect(cn("bg-background/80", "bg-background")).toBe("bg-background");
  });
});

import { describe, expect, it } from "vitest";
import { durationToMinutes } from "./courseDuration";

describe("durationToMinutes", () => {
    it("parses hours and minutes together", () => {
        expect(durationToMinutes("5h 30m")).toBe(330);
        expect(durationToMinutes("2 Hr 15 Min")).toBe(135);
    });

    it("parses hours only and minutes only", () => {
        expect(durationToMinutes("2h")).toBe(120);
        expect(durationToMinutes("2 hours")).toBe(120);
        expect(durationToMinutes("45 minutes")).toBe(45);
        expect(durationToMinutes("45m")).toBe(45);
    });

    it("binds minutes/hours to the number directly preceding the unit", () => {
        expect(durationToMinutes("10-15 hours")).toBe(900);
        expect(durationToMinutes("30-45 minutes")).toBe(45);
    });

    it("returns null for empty or unparseable text", () => {
        expect(durationToMinutes(null)).toBeNull();
        expect(durationToMinutes("")).toBeNull();
        expect(durationToMinutes("Self-paced")).toBeNull();
        expect(durationToMinutes("Varies")).toBeNull();
    });

    it("returns null for text without duration units", () => {
        // Bare numbers carry no unit, so they are not durations.
        expect(durationToMinutes("42")).toBeNull();
    });
});

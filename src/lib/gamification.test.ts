import { describe, it, expect } from "vitest";
import {
    shouldAwardSpeedLearner,
    shouldAwardComebackKid,
    SPEED_LEARNER_MODULE_COUNT,
    SPEED_LEARNER_WINDOW_MS,
    MIN_COMEBACK_GAP_DAYS,
} from "@/lib/gamification";

// Fixed "now" so the predicates are deterministic across timezones/DST.
const NOW = new Date("2026-11-05T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("shouldAwardSpeedLearner", () => {
    const enrolledAt = "2026-11-05T08:00:00.000Z"; // 4h before NOW

    it("has sensible defaults (3 modules / 24h window)", () => {
        expect(SPEED_LEARNER_MODULE_COUNT).toBe(3);
        expect(SPEED_LEARNER_WINDOW_MS).toBe(DAY_MS);
    });

    it("awards when 3 completions fall inside the 24h window", () => {
        const completions = [
            "2026-11-05T08:30:00.000Z",
            "2026-11-05T10:00:00.000Z",
            "2026-11-05T11:59:00.000Z",
        ];
        expect(shouldAwardSpeedLearner(enrolledAt, completions, NOW)).toBe(true);
    });

    it("does not award with only two completions inside the window", () => {
        const completions = [
            "2026-11-05T08:30:00.000Z",
            "2026-11-05T10:00:00.000Z",
            "2026-11-06T01:00:00.000Z", // outside +24h
        ];
        expect(shouldAwardSpeedLearner(enrolledAt, completions, NOW)).toBe(false);
    });

    it("caps the window at now — completions after NOW can't retro-fit it", () => {
        const completions = [
            "2026-11-05T08:30:00.000Z",
            "2026-11-05T09:00:00.000Z",
            "2026-11-06T01:00:00.000Z", // after NOW but within +24h
        ];
        expect(shouldAwardSpeedLearner(enrolledAt, completions, NOW)).toBe(false);
    });

    it("ignores null/invalid timestamps and shortlists", () => {
        const completions = [null, "garbage", undefined, "2026-11-05T09:00:00.000Z"];
        expect(shouldAwardSpeedLearner(enrolledAt, completions, NOW)).toBe(false);
        expect(shouldAwardSpeedLearner(enrolledAt, null, NOW)).toBe(false);
    });

    it("requires a known enrollment date", () => {
        expect(
            shouldAwardSpeedLearner(null, ["2026-11-05T09:00:00.000Z", "2026-11-05T10:00:00.000Z", "2026-11-05T11:00:00.000Z"], NOW),
        ).toBe(false);
        // Completions before enrolling never count.
        expect(
            shouldAwardSpeedLearner(enrolledAt, ["2026-11-05T07:59:00.000Z", "2026-11-05T10:00:00.000Z", "2026-11-05T11:00:00.000Z"], NOW),
        ).toBe(false);
    });
});

describe("shouldAwardComebackKid", () => {
    it("has a 3-day minimum gap", () => {
        expect(MIN_COMEBACK_GAP_DAYS).toBe(3);
    });

    it("awards after a 3+ day gap", () => {
        expect(shouldAwardComebackKid("2026-11-01", NOW)).toBe(true);
        expect(shouldAwardComebackKid("2026-10-15", NOW)).toBe(true);
    });

    it("does not award within the gap, same-day, or after", () => {
        expect(shouldAwardComebackKid("2026-11-04", NOW)).toBe(false);
        expect(shouldAwardComebackKid("2026-11-03", NOW)).toBe(false); // exactly 2 full days, < 3
        expect(shouldAwardComebackKid("2026-11-05", NOW)).toBe(false);
    });

    it("does not award on the very first activity ever", () => {
        expect(shouldAwardComebackKid(null, NOW)).toBe(false);
        expect(shouldAwardComebackKid(undefined, NOW)).toBe(false);
    });

    it("rejects garbage dates instead of awarding", () => {
        expect(shouldAwardComebackKid("not-a-date", NOW)).toBe(false);
    });

    it("tolerates timestamp-shaped values by taking the date part", () => {
        expect(shouldAwardComebackKid("2026-11-01T08:30:00.000Z", NOW)).toBe(true);
    });
});

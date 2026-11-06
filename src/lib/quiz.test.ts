import { describe, it, expect } from "vitest";
import { scoreQuiz, validateQuizDraft, parseQuizOptions, QUIZ_PASS_PERCENT } from "@/lib/quiz";
import type { QuizQuestion } from "@/types/learning";

const q = (id: string, correctIndex: number): QuizQuestion => ({
    id,
    module_id: "mod-1",
    question: `Q${id}`,
    options: ["A", "B", "C"],
    correct_index: correctIndex,
    explanation: null,
    display_order: 0,
    created_at: "",
    updated_at: "",
});

describe("scoreQuiz", () => {
    it("defaults to a 70% pass line", () => {
        expect(QUIZ_PASS_PERCENT).toBe(70);
    });

    it("counts only matching indexes and scores negative-heavy attempts", () => {
        const questions = [q("a", 0), q("b", 2), q("c", 1), q("d", 0)];
        const score = scoreQuiz(questions, { a: 0, b: 0, c: 2, d: 9 });
        expect(score).toEqual({ correct: 1, total: 4, percent: 25, passed: false });
    });

    it("passes at or above the threshold and not below", () => {
        const questions = [q("a", 0), q("b", 0), q("c", 0), q("d", 0), q("e", 0), q("f", 0), q("g", 0)];
        // 5/7 ≈ 71% → pass. 4/7 ≈ 57% → fail.
        expect(scoreQuiz(questions, { a: 0, b: 0, c: 0, d: 0, e: 0 }).passed).toBe(true);
        expect(scoreQuiz(questions, { a: 0, b: 0, c: 0, d: 0 }).passed).toBe(false);
    });

    it("treats an empty quiz as unscored (cannot pass)", () => {
        expect(scoreQuiz([], {})).toEqual({ correct: 0, total: 0, percent: 0, passed: false });
    });

    it("counts unanswered questions as wrong", () => {
        const score = scoreQuiz([q("a", 1), q("b", 1)], { b: 1 });
        expect(score.correct).toBe(1);
        expect(score.total).toBe(2);
    });
});

describe("validateQuizDraft", () => {
    it("rejects empty questions and too-few options", () => {
        expect(validateQuizDraft({ question: "  ", options: ["A", "B"], correct_index: 0 })).toBe("Question text is required.");
        expect(validateQuizDraft({ question: "Q", options: ["A"], correct_index: 0 })).toBe("At least two answer options are required.");
    });

    it("rejects duplicate options and out-of-range correct answers", () => {
        expect(validateQuizDraft({ question: "Q", options: ["A", "A"], correct_index: 0 })).toBe("Answer options must be unique.");
        expect(validateQuizDraft({ question: "Q", options: ["A", "B"], correct_index: 2 })).toBe("Choose which option is the correct one.");
        expect(validateQuizDraft({ question: "Q", options: ["A", "B"], correct_index: -1 })).toBeTruthy();
    });

    it("accepts a clean draft", () => {
        expect(validateQuizDraft({ question: "What?", options: ["A", "B", "C "], correct_index: 1, explanation: "" })).toBeNull();
    });
});

describe("parseQuizOptions", () => {
    it("tolerates jsonb surprises", () => {
        expect(parseQuizOptions(["a", "b"])).toEqual(["a", "b"]);
        expect(parseQuizOptions("[]")).toEqual([]);
        expect(parseQuizOptions([0, "a", null])).toEqual(["a"]);
        expect(parseQuizOptions(undefined)).toEqual([]);
    });
});

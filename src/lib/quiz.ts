import type { QuizQuestion, QuizScore } from "@/types/learning";

// Formative quiz scoring. Correct answers live on the row (readable to the
// student) by design — this is not a graded exam; the score exists to give
// feedback and gate the "Mark as complete" affordance, not to certify.
export const QUIZ_PASS_PERCENT = 70;

/**
 * Score answers against the questions. `answers` maps question id → chosen
 * option index; unanswered questions count as wrong.
 */
export function scoreQuiz(
    questions: QuizQuestion[],
    answers: Record<string, number>,
    passPercent: number = QUIZ_PASS_PERCENT,
): QuizScore {
    const total = questions.length;
    let correct = 0;
    for (const q of questions) {
        if (answers[q.id] !== undefined && Number.isInteger(answers[q.id]) && answers[q.id] === q.correct_index) {
            correct += 1;
        }
    }
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
    return { correct, total, percent, passed: total > 0 && percent >= passPercent };
}

/** Validate a question row before it is saved from the quiz builder. */
export function validateQuizDraft(draft: {
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
}): string | null {
    if (!draft.question.trim()) return "Question text is required.";
    const options = draft.options.map(o => o.trim()).filter(o => o !== "");
    if (options.length < 2) return "At least two answer options are required.";
    if (new Set(options).size !== options.length) return "Answer options must be unique.";
    if (draft.correct_index < 0 || draft.correct_index >= options.length) {
        return "Choose which option is the correct one.";
    }
    return null;
}

/** Normalise a typed jsonb options column into a string array. */
export function parseQuizOptions(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((o): o is string => typeof o === "string").map(o => o);
}

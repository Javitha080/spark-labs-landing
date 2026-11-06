import { useMemo, useState } from "react";
import { CheckCircle, XCircle, BookOpen, RefreshCw, Award, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { scoreQuiz, parseQuizOptions } from "@/lib/quiz";
import type { QuizQuestion } from "@/types/learning";

// Renders a "quiz" module: one question at a time, immediate correctness
// feedback + explanation, then a score card. Reuses the completion toggle's
// handleToggleComplete via onFinished, so achievements/auto-advance/certificate
// logic stay in exactly one place.
export default function QuizRenderer({
    questions,
    onCompleted,
    completing,
}: {
    questions: QuizQuestion[];
    onCompleted: () => void;
    completing?: boolean;
}) {
    const ordered = useMemo(
        () => [...questions].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
        [questions],
    );
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [revealed, setRevealed] = useState(false);
    const [finished, setFinished] = useState(false);

    // Parent keys this component by module id — switching lessons remounts a
    // fresh attempt instead of resetting through a prop-watching effect.

    if (ordered.length === 0) {
        return (
            <div className="p-6 border border-gray-800 rounded-lg bg-gray-900/40 text-sm text-gray-400 flex items-center gap-3">
                <HelpCircle className="size-5 text-primary" />
                This quiz has no questions yet — check back soon.
            </div>
        );
    }

    if (finished) {
        const score = scoreQuiz(ordered, answers);
        return (
            <div className="border border-gray-800 rounded-lg bg-gray-900/40 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    {score.passed
                        ? <CheckCircle className="size-8 text-emerald-500" />
                        : <BookOpen className="size-8 text-amber-400" />}
                    <div>
                        <p className="font-bold text-white">Score: {score.correct} / {score.total} ({score.percent}%)</p>
                        <p className="text-xs text-gray-400">
                            {score.passed
                                ? "Nice work — you can mark this lesson as complete below."
                                : "Review the answers, then retake as many times as you like."}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => { setAnswers({}); setStep(0); setRevealed(false); setFinished(false); }}>
                        <RefreshCw className="size-3.5 mr-2" /> Retake
                    </Button>
                    <Button
                        size="sm"
                        onClick={onCompleted}
                        disabled={completing}
                        className={cn(score.passed && "bg-emerald-600 hover:bg-emerald-500")}
                    >
                        <Award className="size-3.5 mr-2" /> Mark as Complete
                    </Button>
                </div>
            </div>
        );
    }

    const current = ordered[step];
    const chosen = answers[current.id];
    const correct = revealed && chosen === current.correct_index;

    const submitAnswer = (index: number) => {
        if (revealed) return;
        setAnswers(prev => ({ ...prev, [current.id]: index }));
        setRevealed(true);
    };

    const nextStep = () => {
        setRevealed(false);
        if (step + 1 >= ordered.length) {
            setFinished(true);
        } else {
            setStep(step + 1);
        }
    };

    return (
        <div className="border border-gray-800 rounded-lg bg-gray-900/40 overflow-hidden">
            <div className="px-5 pt-4 pb-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Question {step + 1} of {ordered.length}</span>
                    <span>{Object.keys(answers).length} answered</span>
                </div>
                <Progress value={((step + (revealed ? 1 : 0)) / ordered.length) * 100} className="h-1 bg-gray-800" />
            </div>
            <div className="p-5 pt-2 space-y-4">
                <p className="font-semibold text-white whitespace-pre-line">{current.question}</p>
                <div className="space-y-2" role="radiogroup" aria-label="Answer options">
                    {parseQuizOptions(current.options).map((option, i) => {
                        const isChosen = chosen === i;
                        const isCorrect = i === current.correct_index;
                        return (
                            <button
                                key={i}
                                type="button"
                                role="radio"
                                aria-checked={isChosen}
                                onClick={() => submitAnswer(i)}
                                disabled={revealed}
                                className={cn(
                                    "w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-colors",
                                    !revealed && "border-gray-800 hover:border-primary/50 hover:bg-gray-800/60",
                                    revealed && isCorrect && "border-emerald-600/70 bg-emerald-600/10",
                                    revealed && isChosen && !isCorrect && "border-red-600/70 bg-red-600/10",
                                    revealed && !isChosen && !isCorrect && "border-gray-800 opacity-60",
                                )}
                            >
                                <span className="mt-0.5 size-5 flex-shrink-0 flex items-center justify-center">
                                    {revealed && isCorrect
                                        ? <CheckCircle className="size-5 text-emerald-500" />
                                        : revealed && isChosen
                                            ? <XCircle className="size-5 text-red-500" />
                                            : <span className="size-2 rounded-full bg-gray-600" />}
                                </span>
                                <span className="text-gray-200">{option}</span>
                            </button>
                        );
                    })}
                </div>

                {revealed && (
                    <div className={cn(
                        "rounded-lg border p-4 text-sm",
                        correct ? "border-emerald-600/40 bg-emerald-600/5" : "border-red-600/40 bg-red-600/5",
                    )}>
                        <p className={cn("font-semibold text-xs mb-1", correct ? "text-emerald-400" : "text-red-400")}>
                            {correct ? "Correct!" : "Not quite."}
                        </p>
                        {current.explanation && <p className="text-gray-300 whitespace-pre-line">{current.explanation}</p>}
                    </div>
                )}

                <div className="flex justify-end">
                    <Button size="sm" onClick={nextStep} disabled={!revealed} title={revealed ? undefined : "Choose an answer first"}>
                        {step + 1 >= ordered.length ? "Finish Quiz" : "Next Question"}
                        <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

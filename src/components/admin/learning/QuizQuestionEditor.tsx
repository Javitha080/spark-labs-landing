// react-doctor-disable no-derived-state
import { useState, useEffect, useCallback } from "react";
import { Reorder } from "framer-motion";
import { Plus, GripVertical, Trash2, Pencil, Save, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { toast } from "sonner";
import { logError } from "@/lib/errors";
import { validateQuizDraft } from "@/lib/quiz";
import type { QuizQuestion } from "@/types/learning";

// Editor for learning_quiz_questions — shown inside the Edit Module dialog
// when the module's content type is "quiz". Writes are content-admin-only via
// RLS (20261106 migration); options are stored as a jsonb string array with
// the winner marked by correct_index.
export default function QuizQuestionEditor({ moduleId }: { moduleId: string }) {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null); // existing question id
    const [isDraft, setIsDraft] = useState(false); // unsaved NEW question
    const [draft, setDraft] = useState<{ question: string; options: string[]; correct_index: number; explanation: string }>({
        question: "",
        options: ["", ""],
        correct_index: 0,
        explanation: "",
    });
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("learning_quiz_questions")
            .select("*")
            .eq("module_id", moduleId)
            .order("display_order");
        if (error) {
            logError(error, "QuizQuestionEditor.fetch");
        } else {
            setQuestions((data as QuizQuestion[]) || []);
        }
        setLoading(false);
    }, [moduleId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void fetchQuestions(); }, [fetchQuestions]);

    useRealtimeSync(["learning_quiz_questions"], { onUpdate: () => void fetchQuestions(), debounceMs: 800 });

    const startDraft = () => {
        setIsDraft(true);
        setEditingId(null);
        setDraft({ question: "", options: ["", ""], correct_index: 0, explanation: "" });
    };

    const startEdit = (q: QuizQuestion) => {
        setIsDraft(false);
        setEditingId(q.id);
        setDraft({
            question: q.question,
            options: [...q.options, ""].slice(0, -1).length < 2 ? [...q.options, ""] : [...q.options],
            correct_index: q.correct_index,
            explanation: q.explanation || "",
        });
    };

    const cancelEdit = () => {
        setIsDraft(false);
        setEditingId(null);
    };

    const saveQuestion = async () => {
        const error = validateQuizDraft(draft);
        if (error) {
            toast.error(error);
            return;
        }
        setSaving(true);
        const options = draft.options.map(o => o.trim()).filter(o => o !== "");
        try {
            if (isDraft) {
                const nextOrder = questions.reduce((max, q) => Math.max(max, q.display_order), 0) + 1;
                const { error: insertError } = await supabase.from("learning_quiz_questions").insert({
                    module_id: moduleId,
                    question: draft.question.trim(),
                    options,
                    correct_index: draft.correct_index,
                    explanation: draft.explanation.trim() || null,
                    display_order: nextOrder,
                });
                if (insertError) throw insertError;
                toast.success("Question added");
            } else if (editingId) {
                const { error: updateError } = await supabase
                    .from("learning_quiz_questions")
                    .update({
                        question: draft.question.trim(),
                        options,
                        correct_index: draft.correct_index,
                        explanation: draft.explanation.trim() || null,
                    })
                    .eq("id", editingId);
                if (updateError) throw updateError;
                toast.success("Question updated");
            }
            cancelEdit();
            await fetchQuestions();
        } catch (err: unknown) {
            logError(err, "QuizQuestionEditor.save");
            toast.error(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const removeQuestion = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from("learning_quiz_questions").delete().eq("id", deleteId);
        if (error) {
            logError(error, "QuizQuestionEditor.delete");
            toast.error("Delete failed");
        } else {
            toast.success("Question removed");
        }
        setDeleteId(null);
        await fetchQuestions();
    };

    const persistOrder = async (moduleIdOrder: QuizQuestion[]) => {
        const current = [...questions].sort((a, b) => a.display_order - b.display_order);
        setQuestions(moduleIdOrder);
        const moved = moduleIdOrder
            .map((q, i) => ({ id: q.id, display_order: i + 1 }))
            .filter((row, i) => !current[i] || current[i].id !== row.id || current[i].display_order !== row.display_order);
        if (moved.length === 0) return;
        try {
            await Promise.all(moved.map(row =>
                supabase.from("learning_quiz_questions").update({ display_order: row.display_order }).eq("id", row.id)
            ));
        } catch (err: unknown) {
            logError(err, "QuizQuestionEditor.order");
            toast.error("Couldn't save the new order");
            void fetchQuestions();
        }
    };

    const setOption = (i: number, value: string) => {
        setDraft(prev => {
            const options = [...prev.options];
            options[i] = value;
            return { ...prev, options };
        });
    };

    const addOption = () => {
        setDraft(prev => (prev.options.length >= 6 ? prev : { ...prev, options: [...prev.options, ""] }));
    };

    const removeOption = (i: number) => {
        setDraft(prev => {
            if (prev.options.length <= 2) return prev;
            const options = prev.options.filter((_, idx) => idx !== i);
            return { ...prev, options, correct_index: Math.min(prev.correct_index, options.length - 1) };
        });
    };

    const editing = isDraft || !!editingId;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <HelpCircle className="size-4 text-primary" />
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Quiz Questions ({questions.length})
                    </Label>
                </div>
                {!editing && (
                    <Button variant="outline" size="sm" onClick={startDraft}>
                        <Plus className="size-3.5 mr-1.5" /> Add Question
                    </Button>
                )}
            </div>

            {!editing && (
                loading ? (
                    <p className="text-sm text-muted-foreground py-4">Loading questions…</p>
                ) : questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                        No questions yet. Students will see an empty quiz — add at least one.
                    </p>
                ) : (
                    <Reorder.Group axis="y" values={questions} onReorder={persistOrder} className="space-y-2">
                        {questions.map((q) => (
                            <Reorder.Item key={q.id} value={q}>
                                <div className="p-3 bg-secondary/30 rounded-md border flex items-start gap-3">
                                    <GripVertical className="size-4 text-muted-foreground cursor-move flex-shrink-0 mt-1" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{q.question}</p>
                                        <ul className="mt-1.5 space-y-0.5">
                                            {q.options.map((opt: string, i: number) => (
                                                <li key={i} className="text-xs flex items-center gap-1.5">
                                                    {i === q.correct_index && <CheckCircle2 className="size-3 text-emerald-500 flex-shrink-0" />}
                                                    <span className={i === q.correct_index ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                                        {opt}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex flex-shrink-0">
                                        <Button variant="ghost" size="icon" className="min-h-[36px] min-w-[36px]" onClick={() => startEdit(q)} title="Edit">
                                            <Pencil className="size-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="min-h-[36px] min-w-[36px] text-destructive" onClick={() => setDeleteId(q.id)} title="Delete">
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                )
            )}

            {editing && (
                <div className="border rounded-lg p-4 space-y-3 bg-card/50">
                    <div className="space-y-1.5">
                        <Label>Question</Label>
                        <Textarea
                            rows={2}
                            value={draft.question}
                            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                            placeholder="What is being tested?"
                        />
                    </div>

                    <RadioGroup
                        value={String(draft.correct_index)}
                        onValueChange={(v) => setDraft({ ...draft, correct_index: parseInt(v, 10) })}
                        className="space-y-2"
                    >
                        {draft.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <RadioGroupItem value={String(i)} id={`quiz-opt-${i}`} aria-label={`Mark option ${i + 1} correct`} />
                                <Input
                                    value={opt}
                                    onChange={(e) => setOption(i, e.target.value)}
                                    placeholder={`Option ${i + 1}`}
                                    className="flex-1"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="min-h-[36px] min-w-[36px] text-destructive flex-shrink-0"
                                    onClick={() => removeOption(i)}
                                    disabled={draft.options.length <= 2}
                                    title="Remove option"
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        ))}
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">Tick the radio button of the correct option.</p>

                    {draft.options.length < 6 && (
                        <Button variant="outline" size="sm" onClick={addOption}>
                            <Plus className="size-3.5 mr-1.5" /> Add Option
                        </Button>
                    )}

                    <div className="space-y-1.5">
                        <Label>Explanation (shown after answering)</Label>
                        <Textarea
                            rows={2}
                            value={draft.explanation}
                            onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                            placeholder="Why is the correct answer right?"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => void saveQuestion()} disabled={saving}>
                            <Save className="size-3.5 mr-1.5" /> {saving ? "Saving…" : isDraft ? "Add Question" : "Save Question"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </div>
                </div>
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                        <AlertDialogDescription>Students currently in this quiz will see the shorter list.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void removeQuestion()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

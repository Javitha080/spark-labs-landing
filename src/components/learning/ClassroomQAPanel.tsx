import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Plus, Send, CornerDownRight, Pin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useStudentAuth } from "@/context/StudentAuthContext";
import { useGamification } from "@/context/GamificationContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { logError } from "@/lib/errors";
import { sanitizeUUID } from "@/lib/sanitize";
import { toast } from "sonner";
import type { LearningDiscussion } from "@/types/learning";

type QAThread = LearningDiscussion & { replies: LearningDiscussion[] };

// The 12 discussion columns explicitly (never select author_name — the table
// has none). Profile joins are skipped too: threads are anonymous here,
// matching the public course page.
const QA_COLUMNS = "id, course_id, module_id, user_id, title, content, is_pinned, is_instructor_answer, parent_id, created_at, updated_at";

// Udemy-style in-classroom Q&A for one course. Course-wide threads (pinned
// first) with their replies fetched in a single grouped `.in("parent_id", …)`
// round-trip. Realtime refresh only runs while the panel is open.
const ClassroomQAPanel = ({ open, onOpenChange, courseId }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string | null;
}) => {
    const { student } = useStudentAuth();
    const { awardAchievement } = useGamification();
    const [threads, setThreads] = useState<QAThread[]>([]);
    const [loading, setLoading] = useState(false);

    // Composer / reply form state
    const [askOpen, setAskOpen] = useState(false);
    const [askTitle, setAskTitle] = useState("");
    const [askContent, setAskContent] = useState("");
    const [posting, setPosting] = useState(false);
    const [replyFor, setReplyFor] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [replying, setReplying] = useState(false);

    const validCourseId = courseId ? sanitizeUUID(courseId) : null;

    const loadQa = useCallback(async (withSpinner: boolean) => {
        if (!validCourseId) { setThreads([]); if (withSpinner) setLoading(false); return; }
        if (withSpinner) setLoading(true);
        const { data: parents, error } = await supabase
            .from("learning_discussions")
            .select(QA_COLUMNS)
            .eq("course_id", validCourseId)
            .is("parent_id", null)
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(50);
        if (error) {
            logError(error, "ClassroomQAPanel.threads");
            if (withSpinner) setLoading(false);
            return;
        }
        const parentRows = ((parents || []) as LearningDiscussion[]);
        // All replies in one query instead of one per thread.
        const parentIds = parentRows.map(t => t.id);
        let replyRows: LearningDiscussion[] = [];
        if (parentIds.length > 0) {
            const { data: replies, error: replyErr } = await supabase
                .from("learning_discussions")
                .select(QA_COLUMNS)
                .in("parent_id", parentIds)
                .order("created_at", { ascending: true });
            if (replyErr) logError(replyErr, "ClassroomQAPanel.replies");
            else replyRows = (replies || []) as LearningDiscussion[];
        }
        const byParent = new Map<string, LearningDiscussion[]>();
        for (const r of replyRows) {
            if (!r.parent_id) continue;
            const list = byParent.get(r.parent_id) || [];
            list.push(r);
            byParent.set(r.parent_id, list);
        }
        setThreads(parentRows.map(t => ({ ...t, replies: byParent.get(t.id) || [] })));
        if (withSpinner) setLoading(false);
    }, [validCourseId]);

    const refresh = useCallback(() => { void loadQa(false); }, [loadQa]);

    // Load when the panel opens; realtime channel only lives while it is open.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { if (open) void loadQa(true); }, [open, loadQa]);
    useRealtimeSync(open ? ["learning_discussions"] : [], {
        onUpdate: refresh,
        debounceMs: 600,
        channelName: `rt-qa-${validCourseId || "none"}`,
    });

    const submitQuestion = async () => {
        if (!validCourseId || !askTitle.trim() || !askContent.trim()) return;
        setPosting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Please sign in to ask questions."); return; }
            const { error } = await supabase.from("learning_discussions").insert({
                course_id: validCourseId,
                user_id: user.id,
                title: askTitle.trim(),
                content: askContent.trim(),
            });
            if (error) throw error;
            toast.success("Question posted!");
            awardAchievement("qa_contributor").catch(() => { });
            setAskTitle("");
            setAskContent("");
            setAskOpen(false);
            await loadQa(false);
        } catch (err: unknown) {
            logError(err, "ClassroomQAPanel.ask");
            toast.error(err instanceof Error ? err.message : "Failed to post question");
        } finally {
            setPosting(false);
        }
    };

    const submitReply = async (parentId: string) => {
        if (!validCourseId || !replyText.trim()) return;
        setReplying(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Please sign in to reply."); return; }
            const { error } = await supabase.from("learning_discussions").insert({
                course_id: validCourseId,
                user_id: user.id,
                parent_id: parentId,
                title: "Reply",
                content: replyText.trim(),
            });
            if (error) throw error;
            setReplyText("");
            setReplyFor(null);
            await loadQa(false);
        } catch (err: unknown) {
            logError(err, "ClassroomQAPanel.reply");
            toast.error(err instanceof Error ? err.message : "Failed to post reply");
        } finally {
            setReplying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-primary" /> Q&amp;A
                    </DialogTitle>
                    <DialogDescription>
                        Course-wide questions and answers. Replies post instantly for everyone.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 min-w-0">
                    {askOpen ? (
                        <div className="border border-gray-800 rounded-lg p-3 space-y-2 bg-gray-900/60">
                            <Input
                                value={askTitle}
                                onChange={e => setAskTitle(e.target.value)}
                                placeholder="Question title"
                                maxLength={160}
                                aria-label="Question title"
                            />
                            <Textarea
                                value={askContent}
                                onChange={e => setAskContent(e.target.value)}
                                rows={3}
                                placeholder="Describe your question so others can answer it…"
                                aria-label="Question details"
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => void submitQuestion()} disabled={posting || !askTitle.trim() || !askContent.trim()}>
                                    <Send className="size-3.5 mr-1.5" /> {posting ? "Posting…" : "Post Question"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setAskOpen(false); setAskTitle(""); setAskContent(""); }}>
                                    <X className="size-3.5 mr-1" /> Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Button variant="outline" size="sm" onClick={() => setAskOpen(true)}>
                                <Plus className="size-3.5 mr-1.5" /> Ask a question
                            </Button>
                        </div>
                    )}

                    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                        {loading ? (
                            <p className="text-sm text-gray-500 text-center py-8">Loading discussion…</p>
                        ) : threads.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No questions yet — be the first to ask.
                            </p>
                        ) : threads.map(t => (
                            <div key={t.id} className="border border-gray-800 rounded-lg p-3 bg-gray-900/60">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {t.is_pinned && (
                                            <Badge variant="secondary" className="text-[9px] px-1 py-0 gap-0.5">
                                                <Pin className="size-2.5" /> Pinned
                                            </Badge>
                                        )}
                                        <p className="font-semibold text-sm text-white min-w-0 truncate">{t.title}</p>
                                    </div>
                                    <p className="text-xs text-gray-300 whitespace-pre-line mt-1">{t.content}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{new Date(t.created_at).toLocaleDateString()}</p>
                                </div>

                                {(t.replies?.length ?? 0) > 0 && (
                                    <div className="mt-2 ml-5 pl-3 border-l border-gray-800 space-y-2">
                                        {t.replies!.map(r => (
                                            <div key={r.id} className="flex items-start gap-1.5 min-w-0">
                                                <CornerDownRight className="size-3 mt-0.5 text-gray-600 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    {r.is_instructor_answer && (
                                                        <Badge className="bg-primary/15 text-primary border border-primary/30 text-[9px] px-1 py-0 mr-1.5 align-middle">
                                                            Instructor
                                                        </Badge>
                                                    )}
                                                    <p className="text-xs text-gray-300 whitespace-pre-line">{r.content}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-2 pl-5">
                                    {replyFor === t.id ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                rows={2}
                                                placeholder="Write a reply…"
                                                aria-label={`Reply to ${t.title}`}
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => void submitReply(t.id)} disabled={replying || !replyText.trim()}>
                                                    <Send className="size-3.5 mr-1.5" /> {replying ? "Posting…" : "Post Reply"}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => { setReplyFor(null); setReplyText(""); }}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
                                            onClick={() => { setReplyFor(t.id); setReplyText(""); }}
                                        >
                                            Reply
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ClassroomQAPanel;

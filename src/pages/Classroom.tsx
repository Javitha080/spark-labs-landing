// react-doctor-disable no-giant-component
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Course, Section, Module } from "@/types/learning";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
    CheckCircle, Circle, PlayCircle, Menu, X, ChevronRight,
    ChevronLeft, Video, Play, Award, StickyNote, Sparkles, Code, Image, FileText, Globe, Link2, CloudCheck,
    Megaphone, Gauge, PictureInPicture2, ListChecks, MessageSquare
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/common/loading";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { sanitizeHtml } from "@/lib/security";
import { sanitizeUUID } from "@/lib/sanitize";
import { logError } from "@/lib/errors";
import { shouldAwardSpeedLearner } from "@/lib/gamification";
import { useGamification } from "@/context/GamificationContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import QuizRenderer from "@/components/learning/QuizRenderer";
import ClassroomQAPanel from "@/components/learning/ClassroomQAPanel";
import type { CourseAnnouncement, QuizQuestion } from "@/types/learning";

interface ContentBlock {
    id: string;
    module_id: string;
    block_type: string;
    title: string | null;
    content: string | null;
    code_language: string | null;
    display_order: number;
    is_published: boolean;
}

export default function Classroom() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { student, isAuthenticated, updateModuleProgress, updateLastModule, getLastModule, progress, getCourseProgress } = useStudentAuth();
    const { awardAchievement, recordActivity } = useGamification();

    const [course, setCourse] = useState<Course | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    // react-doctor-disable no-derived-state
    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [notesOpen, setNotesOpen] = useState(false);
    // react-doctor-disable no-derived-state
    const [noteText, setNoteText] = useState("");
    const [showCelebration, setShowCelebration] = useState(false);
    const celebrationShown = useRef(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const timestampIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Note sync plumbing: localStorage stays the instant cache; learning_notes
    // is the durable cross-device copy. Writes are debounced and flushed on
    // module switch/unmount so the last typed characters always reach the DB.
    const NOTE_SAVE_DEBOUNCE_MS = 800;
    const noteTextRef = useRef("");
    const activeModuleRef = useRef<string | null>(null);
    const noteSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // "saving" → debounce write pending; "saved" → last write landed on the
    // server; "local" → server write failed (draft still safe in localStorage).
    const [noteSyncState, setNoteSyncState] = useState<"saving" | "saved" | "local">("saved");

    // ── Announcements (instructor notices; realtime-refreshed) ──
    const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
    const [announcementsOpen, setAnnouncementsOpen] = useState(false);
    // ── Q&A (course-wide discussion; panel owns its data + realtime) ──
    const [qaOpen, setQaOpen] = useState(false);
    const fetchAnnouncements = useCallback(async () => {
        if (!courseId || !sanitizeUUID(courseId)) return;
        const { data } = await supabase
            .from("learning_announcements")
            .select("*")
            .eq("course_id", courseId)
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(10);
        setAnnouncements((data as CourseAnnouncement[]) || []);
    }, [courseId]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void fetchAnnouncements(); }, [fetchAnnouncements]);
    useRealtimeSync(["learning_announcements"], { onUpdate: () => void fetchAnnouncements(), debounceMs: 500 });

    // ── Quiz modules ──
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

    // ── Playback speed (Udemy-style, direct video only) ──
    const [playbackRate, setPlaybackRate] = useState<number>(() => {
        try { return Number(localStorage.getItem("spark_playback_rate")) || 1; } catch { return 1; }
    });
    const changePlaybackRate = useCallback((rate: number) => {
        setPlaybackRate(rate);
        try { localStorage.setItem("spark_playback_rate", String(rate)); } catch { /* silently ignore */ }
    }, []);

    // Auth redirect handled by StudentRoute guard in App.tsx

    const flushNoteToServer = useCallback(async (courseId: string, moduleId: string, content: string) => {
        if (!student?.authUserId) return;
        try {
            if (content.trim() === "") {
                // A fully cleared note doesn't resurrect on reload — drop the row.
                const { error: delErr } = await supabase
                    .from("learning_notes")
                    .delete()
                    .eq("user_id", student.authUserId)
                    .eq("module_id", moduleId);
                if (delErr) throw delErr;
            } else {
                // UNIQUE(user_id,module_id) keeps this idempotent; course_id is
                // denormalized so a "notes" listing can group without extra joins.
                const { error } = await supabase
                    .from("learning_notes")
                    .upsert(
                        { user_id: student.authUserId, course_id: courseId, module_id: moduleId, content },
                        { onConflict: "user_id,module_id" },
                    );
                if (error) throw error;
            }
            setNoteSyncState("saved");
        } catch (err) {
            // Non-fatal: the local draft already covers this session; log it.
            logError(err, "Classroom.noteSync");
            setNoteSyncState("local");
        }
    }, [student]);

    const loadNoteForKey = useCallback((key: string | null, moduleId: string | null) => {
        activeModuleRef.current = moduleId;
        if (!key || !moduleId) {
            setNoteText("");
            noteTextRef.current = "";
            return;
        }
        // Instant local cache first (same-tab reload shows the draft).
        let localText = "";
        try { localText = localStorage.getItem(key) || ""; } catch { /* silently ignore */ }
        setNoteText(localText);
        noteTextRef.current = localText;

        // Durable server copy — wins when it differs (e.g. notes written on
        // another device, or after a browser switch). RLS scopes the row to
        // the signed-in student; a failure leaves the draft as-is.
        void (async () => {
            const { data, error } = await supabase
                .from("learning_notes")
                .select("content")
                .eq("module_id", moduleId)
                .maybeSingle();
            if (error) return; // logged on the next write attempt
            if (activeModuleRef.current !== moduleId) return; // switched away mid-flight
            if (data) {
                setNoteText(data.content);
                noteTextRef.current = data.content;
            }
        })();
    }, []);

    // Every module switch funnels through here: flush the outgoing module's
    // pending note BEFORE the incoming one replaces the refs, then load the
    // new note state (local cache immediately, server value when it lands).
    const switchToModule = useCallback((next: Module) => {
        if (!next) return;
        const outgoingModuleId = activeModuleRef.current;
        if (courseId && outgoingModuleId) {
            if (noteSaveTimerRef.current) {
                clearTimeout(noteSaveTimerRef.current);
                noteSaveTimerRef.current = null;
            }
            setNoteSyncState("saving");
            void flushNoteToServer(courseId, outgoingModuleId, noteTextRef.current);
        }
        setCurrentModule(next);
        loadNoteForKey(courseId ? `classroom-note-${courseId}-${next.id}` : null, next.id);
    }, [courseId, flushNoteToServer, loadNoteForKey]);

    // Best-effort flush of the note being typed when the classroom closes.
    useEffect(() => {
        return () => {
            const outgoingModuleId = activeModuleRef.current;
            if (courseId && outgoingModuleId && noteTextRef.current.trim() !== "") {
                void flushNoteToServer(courseId, outgoingModuleId, noteTextRef.current);
            }
            if (noteSaveTimerRef.current) clearTimeout(noteSaveTimerRef.current);
        };
    }, [courseId, flushNoteToServer]);

    useEffect(() => {
        if (!courseId || !sanitizeUUID(courseId)) return;
        const fetchContent = async () => {
            try {
                const { data: courseData, error } = await supabase
                    .from("learning_courses").select("*").eq("id", courseId).single();
                if (error) throw error;
                setCourse(courseData as Course);

                // Enrollment gate: the classroom URL is guessable, and this page
                // previously happily served / recorded progress for any course id.
                // Scoped to the signed-in user's own enrollment row (admins get no
                // free pass here either).
                if (!student?.authUserId) {
                    navigate("/student/login");
                    return;
                }
                const { data: enrollmentRow } = await supabase
                    .from("learning_enrollments")
                    .select("id")
                    .eq("course_id", courseId)
                    .eq("user_id", student.authUserId)
                    .maybeSingle();
                if (!enrollmentRow) {
                    toast.error("You are not enrolled in this course.");
                    navigate(`/learning-hub/course/${(courseData as Course).slug}`);
                    return;
                }

                const [sectionsRes, modulesRes] = await Promise.all([
                    supabase.from("learning_sections").select("*").eq("course_id", courseId).order("display_order"),
                    // Draft/unpublished modules were visible to learners here while
                    // CourseDetail hides them — filter to published only.
                    supabase.from("learning_modules").select("*").eq("course_id", courseId).eq("is_published", true).order("display_order"),
                ]);
                setSections(sectionsRes.data || []);
                setModules(modulesRes.data || []);

                if (modulesRes.data && modulesRes.data.length > 0) {
                    // Resume: check for last viewed module
                    const lastViewed = getLastModule(courseId!);
                    let initialModule: Module;
                    if (lastViewed.moduleId) {
                        initialModule = modulesRes.data.find((m: Module) => m.id === lastViewed.moduleId) || modulesRes.data[0];
                    } else {
                        initialModule = modulesRes.data[0];
                    }
                    setCurrentModule(initialModule);
                    loadNoteForKey(`classroom-note-${courseId}-${initialModule.id}`, initialModule.id);
                }
            } catch (err) {
                logError(err, "Classroom.fetch");
                toast.error("Failed to load course content");
                // react-doctor-disable no-chain-state-updates
                navigate("/learning-hub");
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, navigate]);

    // Fetch content blocks when current module changes
    // react-doctor-disable no-derived-state
    useEffect(() => {
        if (!currentModule) {
            // Deferred: clearing is a state decision, not an external-system sync.
            const t = setTimeout(() => setContentBlocks([]), 0);
            return () => clearTimeout(t);
        }
        const fetchBlocks = async () => {
            const { data } = await supabase
                .from("module_content_blocks")
                .select("*")
                .eq("module_id", currentModule.id)
                .eq("is_published", true)
                .order("display_order");
            setContentBlocks((data as ContentBlock[]) || []);
        };
        fetchBlocks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentModule?.id]);

    // Fetch quiz questions when the current module is a quiz.
    // react-doctor-disable no-derived-state
    useEffect(() => {
        if (!currentModule || currentModule.content_type !== "quiz") {
            // Deferred: clearing is a state decision, not an external-system sync.
            const t = setTimeout(() => setQuizQuestions([]), 0);
            return () => clearTimeout(t);
        }
        const fetchQuiz = async () => {
            const { data } = await supabase
                .from("learning_quiz_questions")
                .select("*")
                .eq("module_id", currentModule.id)
                .order("display_order");
            setQuizQuestions((data as QuizQuestion[]) || []);
        };
        fetchQuiz();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentModule?.id, currentModule?.content_type]);

    // Track module changes for game-save resume
    useEffect(() => {
        if (!courseId || !currentModule) return;
        updateLastModule(courseId, currentModule.id).catch(() => { /* best-effort */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, currentModule?.id]);

    // Playback speed applies to the (re)mounted <video> whenever the lesson
    // changes or the student picks a new rate; native controls don't offer a
    // speed menu, so this is set programmatically.
    useEffect(() => {
        const video = videoRef.current;
        if (video && video.playbackRate !== playbackRate) {
            video.playbackRate = playbackRate;
        }
    }, [playbackRate, currentModule?.id]);

    // Udemy-style Picture-in-Picture toggle (direct video only).
    const togglePiP = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await video.requestPictureInPicture();
            }
        } catch {
            /* browser refused (e.g. iframe/embed) — non-fatal */
        }
    }, []);

    // Video timestamp save/restore
    useEffect(() => {
        // Clear previous interval
        if (timestampIntervalRef.current) {
            clearInterval(timestampIntervalRef.current);
            timestampIntervalRef.current = null;
        }

        if (!courseId || !currentModule?.content_url) return;

        // Restore timestamp for direct videos
        const lastViewed = getLastModule(courseId);
        if (lastViewed.moduleId === currentModule.id && lastViewed.timestamp > 0) {
            // Wait for video element to mount, then seek
            const timer = setTimeout(() => {
                if (videoRef.current && videoRef.current.readyState >= 1) {
                    videoRef.current.currentTime = lastViewed.timestamp;
                } else if (videoRef.current) {
                    videoRef.current.addEventListener("loadedmetadata", () => {
                        if (videoRef.current) videoRef.current.currentTime = lastViewed.timestamp;
                    }, { once: true });
                }
            }, 200);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, currentModule?.id]);

    // Periodically save video timestamp (every 10s)
    useEffect(() => {
        if (!courseId || !currentModule?.content_url) return;

        // Copy the mounted video node once - React attaches refs before
        // effects run and detaches them after cleanup, so a captured handle
        // is exactly the node this effect's cleanup should save.
        const video = videoRef.current;
        timestampIntervalRef.current = setInterval(() => {
            if (video && !video.paused && video.currentTime > 0) {
                updateLastModule(courseId, currentModule.id, video.currentTime).catch(() => {});
            }
        }, 10_000);

        return () => {
            // Save final timestamp on unmount/module switch
            if (video && video.currentTime > 0) {
                updateLastModule(courseId!, currentModule!.id, video.currentTime).catch(() => {});
            }
            if (timestampIntervalRef.current) clearInterval(timestampIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, currentModule?.id]);

    const isModuleCompleted = (moduleId: string) => {
        const courseProgress = progress[courseId || ""] || [];
        return courseProgress.some(p => p.module_id === moduleId && p.is_completed);
    };

    const handleToggleComplete = async (moduleId: string, currentStatus: boolean) => {
        if (!courseId) return;
        setCompleting(true);
        try {
            await updateModuleProgress(courseId, moduleId, !currentStatus);
            if (!currentStatus) {
                awardAchievement("module_complete").catch(() => { });
                recordActivity().catch(() => { });

                // Read the freshly-triggered progress from the server instead of
                // the stale closure `enrollments` — the trigger just recomputed
                // it, and the completion badge/celebration previously depended
                // on timing luck. Explicit user scope (RLS already restricts
                // students to their own rows, but keep the query honest).
                const [{ data: freshEnroll }, { data: completedRows }] = await Promise.all([
                    supabase
                        .from("learning_enrollments")
                        .select("progress, enrolled_at")
                        .eq("course_id", courseId)
                        .eq("user_id", student?.authUserId ?? "")
                        .maybeSingle(),
                    supabase
                        .from("learning_progress")
                        .select("completed_at")
                        .eq("course_id", courseId)
                        .eq("user_id", student?.authUserId ?? "")
                        .eq("is_completed", true),
                ]);
                if (freshEnroll?.progress === 100 && !celebrationShown.current) {
                    celebrationShown.current = true;
                    setShowCelebration(true);
                    awardAchievement("completed_course").catch(() => { });
                    setTimeout(() => setShowCelebration(false), 10000);
                }
                // Speed Learner: 3+ lessons completed within 24h of enrolling.
                if (freshEnroll?.enrolled_at && shouldAwardSpeedLearner(
                    freshEnroll.enrolled_at,
                    (completedRows as { completed_at: string | null }[] | null)?.map(r => r.completed_at),
                )) {
                    awardAchievement("speed_learner").catch(() => { });
                }
                // Auto-advance
                const currentIndex = modules.findIndex(m => m.id === moduleId);
                if (currentIndex < modules.length - 1) {
                    switchToModule(modules[currentIndex + 1]);
                }
            }
        } catch (err) {
            toast.error("Failed to update progress");
        }
        setCompleting(false);
    };

    const handleNextModule = () => {
        if (!currentModule || !modules.length) return;
        const idx = modules.findIndex(m => m.id === currentModule.id);
        if (idx < modules.length - 1) {
            switchToModule(modules[idx + 1]);
        }
    };

    const handlePrevModule = () => {
        if (!currentModule || !modules.length) return;
        const idx = modules.findIndex(m => m.id === currentModule.id);
        if (idx > 0) {
            switchToModule(modules[idx - 1]);
        }
    };

    // Note-taking
    const noteKey = courseId && currentModule ? `classroom-note-${courseId}-${currentModule.id}` : null;

    const handleNoteChange = useCallback((value: string) => {
        setNoteText(value);
        noteTextRef.current = value;
        if (noteKey) {
            try { localStorage.setItem(noteKey, value); } catch { /* silently ignore */ }
        }
        // Debounced durable save (cross-device copy in learning_notes).
        setNoteSyncState("saving");
        if (noteSaveTimerRef.current) clearTimeout(noteSaveTimerRef.current);
        noteSaveTimerRef.current = setTimeout(() => {
            if (courseId && activeModuleRef.current) {
                void flushNoteToServer(courseId, activeModuleRef.current, noteTextRef.current);
            }
        }, NOTE_SAVE_DEBOUNCE_MS);
        // Award note_taker achievement on first substantial note
        if (value.trim().length > 20) {
            awardAchievement("note_taker").catch(() => { });
        }
    }, [noteKey, courseId, flushNoteToServer, awardAchievement]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            switch (e.key) {
                case "ArrowRight": handleNextModule(); break;
                case "ArrowLeft": handlePrevModule(); break;
                case "m": case "M":
                    if (currentModule) handleToggleComplete(currentModule.id, isModuleCompleted(currentModule.id));
                    break;
                case "n": case "N": setNotesOpen(prev => !prev); break;
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentModule, modules]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loading /></div>;
    if (!course) return null;

    const overallProgress = getCourseProgress(courseId || "");
    const currentIndex = currentModule ? modules.findIndex(m => m.id === currentModule.id) : 0;
    const completedModules = modules.filter(m => isModuleCompleted(m.id)).length;

    const isDirectVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.startsWith("blob:");
    const getEmbedUrl = (url: string) => {
        if (url.includes("youtube.com/watch")) {
            const videoId = url.split("v=")[1]?.split("&")[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        if (url.includes("youtu.be/")) {
            const videoId = url.split("youtu.be/")[1]?.split("?")[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url;
    };

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
            <SEOHead
                title={`${course.title} - Classroom | Young Innovators Club`}
                description={`Learn ${course.title} in the Young Innovators Club classroom.`}
                path={`/learning-hub/classroom/${courseId}`}
                noindex
            />
            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 lg:w-80 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out md:relative md:transform-none flex flex-col",
                sidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:border-none md:overflow-hidden"
            )}>
                <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                    <h2 className="font-semibold truncate pr-2 text-sm">{course.title}</h2>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white md:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="size-4" />
                    </Button>
                </div>

                {/* Student info */}
                {student && (
                    <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-400">
                        <span className="font-medium text-gray-300">{student.name}</span> · {student.grade}
                    </div>
                )}

                <div className="p-4 border-b border-gray-800 flex-shrink-0">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{completedModules} of {modules.length} complete</span>
                        <span>{overallProgress}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-1.5" />
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-4">
                        {sections.map(section => {
                            const sectionModules = modules.filter(m => m.section_id === section.id);
                            const sectionCompleted = sectionModules.filter(m => isModuleCompleted(m.id)).length;
                            return (
                                <div key={section.id}>
                                    <div className="flex items-center justify-between px-2 mb-2">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{section.title}</h3>
                                        <span className="text-[10px] text-gray-600">{sectionCompleted}/{sectionModules.length}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {sectionModules.map(module => {
                                            const isActive = currentModule?.id === module.id;
                                            const isCompleted = isModuleCompleted(module.id);
                                            return (
                                                <button type="button"
                                                    key={module.id}
                                                    onClick={() => switchToModule(module)}
                                                    className={cn(
                                                        "w-full flex items-start text-left gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
                                                        isActive ? "bg-primary/20 text-primary border border-primary/30" : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                                                    )}
                                                >
                                                    <div className="mt-0.5 flex-shrink-0">
                                                        {isCompleted ? <CheckCircle className="size-4 text-emerald-500" /> : isActive ? <PlayCircle className="size-4 text-primary" /> : <Circle className="size-4 text-gray-600" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={cn("text-xs leading-tight line-clamp-2", isCompleted && "line-through text-gray-600")}>{module.title}</span>
                                                        {module.duration_minutes && (
                                                            <span className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                                                                <Video className="size-3" /> {module.duration_minutes}m
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <header className="h-14 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu className="size-5" />
                        </Button>
                        <div className="hidden sm:block">
                            <span className="text-xs text-gray-500">Lesson {currentIndex + 1} of {modules.length}</span>
                            <h1 className="font-semibold text-sm truncate max-w-md">{currentModule?.title}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className={cn("text-gray-400 hover:text-white relative", announcementsOpen && "text-primary")} onClick={() => setAnnouncementsOpen(!announcementsOpen)} title="Course announcements">
                            <Megaphone className="size-4" />
                            {announcements.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-[9px] flex items-center justify-center font-bold text-white" aria-hidden>
                                    {Math.min(announcements.length, 9)}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("text-gray-400 hover:text-white", qaOpen && "text-primary")} onClick={() => setQaOpen(true)} title="Q&A — course questions and answers">
                            <MessageSquare className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("text-gray-400 hover:text-white", notesOpen && "text-amber-400")} onClick={() => setNotesOpen(!notesOpen)} title="Toggle Notes (N)">
                            <StickyNote className="size-4" />
                        </Button>
                        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
                            <span>{overallProgress}%</span>
                            <Progress value={overallProgress} className="w-24 h-1.5" />
                        </div>
                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => navigate("/learning-hub/my-learning")}>Exit</Button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {/* Main Video */}
                    {currentModule?.content_url && (
                        <div className="w-full bg-gray-950">
                            <div className="max-w-5xl mx-auto aspect-video">
                                {isDirectVideoUrl(currentModule.content_url) ? (
                                    <video ref={videoRef} src={currentModule.content_url} className="size-full" controls playsInline preload="metadata" aria-label={currentModule?.title || "Course video"} />
                                ) : (
                                    <iframe src={getEmbedUrl(currentModule.content_url)} className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-popups allow-presentation allow-same-origin" title={currentModule?.title || "Embedded content"} />
                                )}
                            </div>
                            {/* Native controls have no speed menu — overlay it here
                                (direct Video only; embeds keep the provider player). */}
                            {isDirectVideoUrl(currentModule.content_url) && (
                                <div className="max-w-5xl mx-auto flex items-center justify-end gap-1.5 px-4 py-2 bg-gray-900/70 border-b border-gray-800">
                                    <Gauge className="size-3.5 text-gray-500 mr-1" aria-hidden />
                                    {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                                        <button
                                            key={rate}
                                            type="button"
                                            onClick={() => changePlaybackRate(rate)}
                                            aria-pressed={playbackRate === rate}
                                            className={cn(
                                                "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                                                playbackRate === rate
                                                    ? "bg-primary text-white"
                                                    : "text-gray-400 hover:text-white hover:bg-gray-800",
                                            )}
                                        >
                                            {rate}×
                                        </button>
                                    ))}
                                    <span className="w-px h-4 bg-gray-700 mx-1.5" aria-hidden />
                                    <button
                                        type="button"
                                        onClick={() => void togglePiP()}
                                        title="Picture in picture"
                                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                    >
                                        <PictureInPicture2 className="size-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">{currentModule?.title}</h2>
                            {currentModule?.description && (
                                <div className="prose prose-invert max-w-none text-sm text-gray-300">
                                    {/* react-doctor-disable no-danger */}
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentModule.description) }} />
                                </div>
                            )}
                        </div>

                        {/* Knowledge Check — quiz modules */}
                        {currentModule?.content_type === "quiz" && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                    <ListChecks className="size-4 text-primary" /> Knowledge Check
                                </h3>
                                <QuizRenderer
                                    key={currentModule.id}
                                    questions={quizQuestions}
                                    completing={completing}
                                    onCompleted={() => {
                                        if (currentModule) {
                                            void handleToggleComplete(currentModule.id, isModuleCompleted(currentModule.id));
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* Content Blocks */}
                        {contentBlocks.length > 0 && (
                            <div className="space-y-6">
                                {contentBlocks.map((block) => (
                                    <ContentBlockRenderer key={block.id} block={block} getEmbedUrl={getEmbedUrl} />
                                ))}
                            </div>
                        )}

                        {/* Navigation & Complete */}
                        <div className="flex items-center justify-between border-t border-gray-800 pt-6 pb-20">
                            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={handlePrevModule} disabled={currentIndex === 0}>
                                <ChevronLeft className="size-4 mr-2" /> Previous
                            </Button>
                            <Button
                                variant={isModuleCompleted(currentModule?.id || "") ? "outline" : "default"}
                                onClick={() => currentModule && handleToggleComplete(currentModule.id, isModuleCompleted(currentModule.id))}
                                disabled={completing || !currentModule}
                                className={cn(
                                    isModuleCompleted(currentModule?.id || "") ? "border-emerald-500 text-emerald-400 hover:bg-emerald-500/10" : "bg-primary hover:bg-primary/90"
                                )}
                            >
                                {isModuleCompleted(currentModule?.id || "") ? (
                                    <><CheckCircle className="size-4 mr-2" /> Completed</>
                                ) : (
                                    <><Award className="size-4 mr-2" /> Mark Complete & Continue</>
                                )}
                            </Button>
                            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={handleNextModule} disabled={currentIndex === modules.length - 1}>
                                Next <ChevronRight className="size-4 ml-2" />
                            </Button>
                        </div>

                        {/* Notes */}
                        {notesOpen && (
                            <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-300">
                                        <StickyNote className="size-4 text-amber-400" /> Notes
                                    </h3>
                                    <span className={cn(
                                        "text-[10px] flex items-center gap-1",
                                        noteSyncState === "local" ? "text-amber-500" : "text-gray-600",
                                    )}>
                                        {noteSyncState === "saving"
                                            ? <>Saving…</>
                                            : noteSyncState === "local"
                                                ? <>Saved on this device only</>
                                                : <><CloudCheck className="size-3" /> Synced</>}
                                    </span>
                                </div>
                                <Textarea placeholder="Take notes..." value={noteText} onChange={e => handleNoteChange(e.target.value)} rows={5} className="bg-gray-800/50 border-gray-700 text-gray-200 placeholder:text-gray-600 resize-y text-sm" />
                            </div>
                        )}

                        <div className="text-center pb-8">
                            <p className="text-[10px] text-gray-700 flex items-center justify-center gap-3">
                                <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-xs font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-xs font-mono">→</kbd> Navigate</span>
                                <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-xs font-mono">M</kbd> Complete</span>
                                <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-xs font-mono">N</kbd> Notes</span>
                            </p>
                        </div>
                    </div>
                </main>
            </div>

            {/* Course announcements */}
            <Dialog open={announcementsOpen} onOpenChange={setAnnouncementsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="size-4 text-primary" /> Course Announcements
                        </DialogTitle>
                        <DialogDescription>Notices from your instructor for this course.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {announcements.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No announcements yet.</p>
                        ) : announcements.map(a => (
                            <div key={a.id} className="border border-gray-800 rounded-lg p-3 bg-gray-900/60">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="font-semibold text-sm text-white">{a.title}</p>
                                    <span className="text-[10px] text-gray-500 flex-shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-gray-300 whitespace-pre-line">{a.body}</p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Course Q&A discussion */}
            <ClassroomQAPanel open={qaOpen} onOpenChange={setQaOpen} courseId={courseId || null} />

            {/* Celebration */}
            {showCelebration && (
                // react-doctor-disable prefer-tag-over-role
                // Focus trap: dialog takes focus on open; Escape closes; background scroll unchanged
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCelebration(false)} onKeyDown={(e) => { if (e.key === 'Escape') setShowCelebration(false); }} role="dialog" aria-modal="true" aria-label="Course completed" tabIndex={-1} autoFocus>
                    <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="text-8xl">🎉</div>
                            <Sparkles className="absolute -top-2 -right-4 size-8 text-amber-400 animate-pulse" />
                            <Sparkles className="absolute -bottom-2 -left-4 size-6 text-primary animate-pulse" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white">Course Completed!</h2>
                        <p className="text-gray-400 text-lg">Amazing work! You've completed all modules.</p>
                        <div className="flex justify-center gap-3 pt-2">
                            <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setShowCelebration(false)}>Keep Reviewing</Button>
                            {courseId && (
                                <Button variant="outline" className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
                                    onClick={() => navigate(`/learning-hub/certificate/${courseId}`)}>
                                    <Award className="size-4 mr-2" /> Get Certificate
                                </Button>
                            )}
                            <Button onClick={() => navigate("/learning-hub/my-learning")} className="bg-primary"><Award className="size-4 mr-2" /> View My Learning</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Content Block Renderer
function ContentBlockRenderer({ block, getEmbedUrl }: { block: ContentBlock; getEmbedUrl: (url: string) => string }) {
    if (!block.content) return null;

    switch (block.block_type) {
        case "video":
            return (
                <div className="space-y-2">
                    {block.title && <h3 className="text-sm font-semibold text-gray-300">{block.title}</h3>}
                    <div className="aspect-video bg-gray-950 rounded-lg overflow-hidden">
                        <iframe src={getEmbedUrl(block.content)} className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-popups allow-presentation allow-same-origin" title={block.title || "Embedded content"} />
                    </div>
                </div>
            );
        case "image":
            return (
                <div className="space-y-2">
                    {block.title && <h3 className="text-sm font-semibold text-gray-300">{block.title}</h3>}
                    <img src={block.content} alt={block.title || "Content"} className="rounded-lg max-w-full" loading="lazy" />
                </div>
            );
        case "text":
            return (
                <div className="space-y-2">
                    {block.title && <h3 className="text-sm font-semibold text-gray-300">{block.title}</h3>}
                    {/* react-doctor-disable no-danger */}
                    <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />
                </div>
            );
        case "code":
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Code className="size-4 text-emerald-400" />
                        {block.title && <h3 className="text-sm font-semibold text-gray-300">{block.title}</h3>}
                        {block.code_language && <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">{block.code_language}</span>}
                    </div>
                    <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-x-auto">
                        <code className="text-sm font-mono text-emerald-300 whitespace-pre">{block.content}</code>
                    </pre>
                </div>
            );
        case "link":
            return (
                <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-primary/30 transition-colors">
                    <Link2 className="size-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <a href={block.content} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                            {block.title || block.content}
                        </a>
                    </div>
                </div>
            );
        case "tinkercad":
        case "embed":
            return (
                <div className="space-y-2">
                    {block.title && <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Globe className="size-4" /> {block.title}</h3>}
                    <div className="aspect-video rounded-lg overflow-hidden border border-gray-800">
                        <iframe src={block.content} className="size-full" allowFullScreen sandbox="allow-scripts allow-popups allow-same-origin" title={block.title || "Embedded content"} />
                    </div>
                </div>
            );
        default:
            return null;
    }
}

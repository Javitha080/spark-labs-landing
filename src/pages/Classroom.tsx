import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLearner } from "@/context/LearnerContext";
import { supabase } from "@/integrations/supabase/client";
import { Course, Section, Module } from "@/types/learning";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
    CheckCircle, Circle, PlayCircle, Menu, X, ChevronRight,
    ChevronLeft, Video, Play, Award, StickyNote, Sparkles, Code, Image, FileText, Globe, Link2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { sanitizeHtml } from "@/lib/security";

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
    const { learner, isIdentified, updateModuleProgress, progress, getCourseProgress, enrollments } = useLearner();

    const [course, setCourse] = useState<Course | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [notesOpen, setNotesOpen] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [showCelebration, setShowCelebration] = useState(false);
    const celebrationShown = useRef(false);

    // Redirect if not identified
    useEffect(() => {
        if (!isIdentified && !loading) {
            toast.error("Please fill the enrollment form first to access courses.");
            navigate("/#join");
        }
    }, [isIdentified, loading, navigate]);

    useEffect(() => {
        if (!courseId) return;
        const fetchContent = async () => {
            try {
                const { data: courseData, error } = await supabase
                    .from("learning_courses").select("*").eq("id", courseId).single();
                if (error) throw error;
                setCourse(courseData as Course);

                const [sectionsRes, modulesRes] = await Promise.all([
                    supabase.from("learning_sections").select("*").eq("course_id", courseId).order("display_order"),
                    supabase.from("learning_modules").select("*").eq("course_id", courseId).order("display_order"),
                ]);
                setSections(sectionsRes.data || []);
                setModules(modulesRes.data || []);

                if (modulesRes.data && modulesRes.data.length > 0) {
                    setCurrentModule(modulesRes.data[0]);
                }
            } catch (err) {
                console.error("Error loading classroom:", err);
                toast.error("Failed to load course content");
                navigate("/learning-hub");
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [courseId, navigate]);

    // Fetch content blocks when current module changes
    useEffect(() => {
        if (!currentModule) { setContentBlocks([]); return; }
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
                const currentEnrollment = enrollments.find(e => e.course_id === courseId);
                if (currentEnrollment?.progress === 100 && !celebrationShown.current) {
                    celebrationShown.current = true;
                    setShowCelebration(true);
                    setTimeout(() => setShowCelebration(false), 5000);
                }
                // Auto-advance
                const currentIndex = modules.findIndex(m => m.id === moduleId);
                if (currentIndex < modules.length - 1) {
                    setCurrentModule(modules[currentIndex + 1]);
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
        if (idx < modules.length - 1) setCurrentModule(modules[idx + 1]);
    };

    const handlePrevModule = () => {
        if (!currentModule || !modules.length) return;
        const idx = modules.findIndex(m => m.id === currentModule.id);
        if (idx > 0) setCurrentModule(modules[idx - 1]);
    };

    // Note-taking
    const noteKey = courseId && currentModule ? `classroom-note-${courseId}-${currentModule.id}` : null;

    useEffect(() => {
        if (noteKey) {
            try { setNoteText(localStorage.getItem(noteKey) || ""); } catch { /* silently ignore */ }
        }
    }, [noteKey]);

    const handleNoteChange = useCallback((value: string) => {
        setNoteText(value);
        if (noteKey) {
            try { localStorage.setItem(noteKey, value); } catch { /* silently ignore */ }
        }
    }, [noteKey]);

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
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Learner info */}
                {learner && (
                    <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-400">
                        <span className="font-medium text-gray-300">{learner.name}</span> · {learner.grade}
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
                                                <button
                                                    key={module.id}
                                                    onClick={() => setCurrentModule(module)}
                                                    className={cn(
                                                        "w-full flex items-start text-left gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
                                                        isActive ? "bg-primary/20 text-primary border border-primary/30" : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                                                    )}
                                                >
                                                    <div className="mt-0.5 flex-shrink-0">
                                                        {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : isActive ? <PlayCircle className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-gray-600" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={cn("text-xs leading-tight line-clamp-2", isCompleted && "line-through text-gray-600")}>{module.title}</span>
                                                        {module.duration_minutes && (
                                                            <span className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                                                                <Video className="w-3 h-3" /> {module.duration_minutes}m
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
                            <Menu className="w-5 h-5" />
                        </Button>
                        <div className="hidden sm:block">
                            <span className="text-xs text-gray-500">Lesson {currentIndex + 1} of {modules.length}</span>
                            <h1 className="font-semibold text-sm truncate max-w-md">{currentModule?.title}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className={cn("text-gray-400 hover:text-white", notesOpen && "text-amber-400")} onClick={() => setNotesOpen(!notesOpen)} title="Toggle Notes (N)">
                            <StickyNote className="w-4 h-4" />
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
                        <div className="w-full bg-black">
                            <div className="max-w-5xl mx-auto aspect-video">
                                {isDirectVideoUrl(currentModule.content_url) ? (
                                    <video src={currentModule.content_url} className="w-full h-full" controls playsInline preload="metadata" />
                                ) : (
                                    <iframe src={getEmbedUrl(currentModule.content_url)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                )}
                            </div>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">{currentModule?.title}</h2>
                            {currentModule?.description && (
                                <div className="prose prose-invert max-w-none text-sm text-gray-300">
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentModule.description) }} />
                                </div>
                            )}
                        </div>

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
                                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
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
                                    <><CheckCircle className="w-4 h-4 mr-2" /> Completed</>
                                ) : (
                                    <><Award className="w-4 h-4 mr-2" /> Mark Complete & Continue</>
                                )}
                            </Button>
                            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={handleNextModule} disabled={currentIndex === modules.length - 1}>
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>

                        {/* Notes */}
                        {notesOpen && (
                            <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-300">
                                        <StickyNote className="w-4 h-4 text-amber-400" /> Notes
                                    </h3>
                                    <span className="text-[10px] text-gray-600">Auto-saved locally</span>
                                </div>
                                <Textarea placeholder="Take notes..." value={noteText} onChange={e => handleNoteChange(e.target.value)} rows={5} className="bg-gray-800/50 border-gray-700 text-gray-200 placeholder:text-gray-600 resize-y text-sm" />
                            </div>
                        )}

                        <div className="text-center pb-8">
                            <p className="text-[10px] text-gray-700 flex items-center justify-center gap-3">
                                <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 text-[9px] font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 text-[9px] font-mono">→</kbd> Navigate</span>
                                <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 text-[9px] font-mono">M</kbd> Complete</span>
                                <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 text-[9px] font-mono">N</kbd> Notes</span>
                            </p>
                        </div>
                    </div>
                </main>
            </div>

            {/* Celebration */}
            {showCelebration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCelebration(false)}>
                    <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="text-8xl">🎉</div>
                            <Sparkles className="absolute -top-2 -right-4 w-8 h-8 text-amber-400 animate-pulse" />
                            <Sparkles className="absolute -bottom-2 -left-4 w-6 h-6 text-primary animate-pulse" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white">Course Completed!</h2>
                        <p className="text-gray-400 text-lg">Amazing work! You've completed all modules.</p>
                        <div className="flex justify-center gap-3 pt-2">
                            <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setShowCelebration(false)}>Keep Reviewing</Button>
                            <Button onClick={() => navigate("/learning-hub/my-learning")} className="bg-primary"><Award className="w-4 h-4 mr-2" /> View My Learning</Button>
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
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe src={getEmbedUrl(block.content)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
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
                    <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />
                </div>
            );
        case "code":
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-emerald-400" />
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
                    <Link2 className="w-5 h-5 text-primary flex-shrink-0" />
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
                    {block.title && <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Globe className="w-4 h-4" /> {block.title}</h3>}
                    <div className="aspect-video rounded-lg overflow-hidden border border-gray-800">
                        <iframe src={block.content} className="w-full h-full" allowFullScreen />
                    </div>
                </div>
            );
        default:
            return null;
    }
}

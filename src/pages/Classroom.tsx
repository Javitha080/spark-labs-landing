import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEnrollment } from "@/context/EnrollmentContext";
import { supabase } from "@/integrations/supabase/client";
import { Course, Section, Module } from "@/types/learning";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
    CheckCircle, Circle, PlayCircle, Menu, X, ChevronRight,
    ChevronLeft, Video, FileText, Play, Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";

export default function Classroom() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { updateProgress, progress, getCourseProgress } = useEnrollment();

    const [course, setCourse] = useState<Course | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [completing, setCompleting] = useState(false);

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

    const isModuleCompleted = (moduleId: string) => {
        const courseProgress = progress[courseId || ""] || [];
        return courseProgress.some(p => p.module_id === moduleId && p.is_completed);
    };

    const handleToggleComplete = async (moduleId: string, currentStatus: boolean) => {
        if (!courseId) return;
        setCompleting(true);
        await updateProgress(courseId, moduleId, !currentStatus);
        setCompleting(false);

        // Auto-advance to next module on completion
        if (!currentStatus) {
            const currentIndex = modules.findIndex(m => m.id === moduleId);
            if (currentIndex < modules.length - 1) {
                setCurrentModule(modules[currentIndex + 1]);
            }
        }
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

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loading /></div>;
    if (!course) return null;

    const overallProgress = getCourseProgress(courseId || "");
    const currentIndex = currentModule ? modules.findIndex(m => m.id === currentModule.id) : 0;
    const completedModules = modules.filter(m => isModuleCompleted(m.id)).length;

    // Embed URL helper (YouTube) and direct video detection
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
            {/* ─── Sidebar ─── */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-80 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out md:relative md:transform-none flex flex-col",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:border-none md:overflow-hidden"
                )}
            >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                    <h2 className="font-semibold truncate pr-2 text-sm">{course.title}</h2>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white md:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Progress */}
                <div className="p-4 border-b border-gray-800 flex-shrink-0">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{completedModules} of {modules.length} complete</span>
                        <span>{overallProgress}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-1.5" />
                </div>

                {/* Sections & Modules */}
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-4">
                        {sections.map(section => {
                            const sectionModules = modules.filter(m => m.section_id === section.id);
                            const sectionCompleted = sectionModules.filter(m => isModuleCompleted(m.id)).length;
                            return (
                                <div key={section.id}>
                                    <div className="flex items-center justify-between px-2 mb-2">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
                                            {section.title}
                                        </h3>
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
                                                        isActive
                                                            ? "bg-primary/20 text-primary border border-primary/30"
                                                            : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                                                    )}
                                                >
                                                    <div className="mt-0.5 flex-shrink-0">
                                                        {isCompleted ? (
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                        ) : isActive ? (
                                                            <PlayCircle className="w-4 h-4 text-primary" />
                                                        ) : (
                                                            <Circle className="w-4 h-4 text-gray-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={cn("text-xs leading-tight line-clamp-2", isCompleted && "line-through text-gray-600")}>
                                                            {module.title}
                                                        </span>
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

            {/* ─── Main Content ─── */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Top Bar */}
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
                        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
                            <span>{overallProgress}%</span>
                            <Progress value={overallProgress} className="w-24 h-1.5" />
                        </div>
                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => navigate("/learning-hub/my-learning")}>
                            Exit
                        </Button>
                    </div>
                </header>

                {/* Video/Content Area */}
                <main className="flex-1 overflow-y-auto">
                    {/* Video Player */}
                    {currentModule?.content_url && (
                        <div className="w-full bg-black">
                            <div className="max-w-5xl mx-auto aspect-video">
                                {isDirectVideoUrl(currentModule.content_url) ? (
                                    <video
                                        src={currentModule.content_url}
                                        className="w-full h-full"
                                        controls
                                        playsInline
                                        preload="metadata"
                                    />
                                ) : (
                                    <iframe
                                        src={getEmbedUrl(currentModule.content_url)}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Content Below Video */}
                    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
                        {/* Module Title & Actions */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">{currentModule?.title}</h2>

                            {/* Description */}
                            {currentModule?.description && (
                                <div className="prose prose-invert max-w-none text-sm text-gray-300">
                                    <div dangerouslySetInnerHTML={{ __html: currentModule.description }} />
                                </div>
                            )}
                        </div>

                        {/* Navigation & Complete */}
                        <div className="flex items-center justify-between border-t border-gray-800 pt-6 pb-20">
                            <Button
                                variant="ghost"
                                className="text-gray-400 hover:text-white"
                                onClick={handlePrevModule}
                                disabled={currentIndex === 0}
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                            </Button>

                            <Button
                                variant={isModuleCompleted(currentModule?.id || "") ? "outline" : "default"}
                                onClick={() => currentModule && handleToggleComplete(currentModule.id, isModuleCompleted(currentModule.id))}
                                disabled={completing || !currentModule}
                                className={cn(
                                    isModuleCompleted(currentModule?.id || "")
                                        ? "border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                                        : "bg-primary hover:bg-primary/90"
                                )}
                            >
                                {isModuleCompleted(currentModule?.id || "") ? (
                                    <><CheckCircle className="w-4 h-4 mr-2" /> Completed</>
                                ) : (
                                    <><Award className="w-4 h-4 mr-2" /> Mark Complete & Continue</>
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                className="text-gray-400 hover:text-white"
                                onClick={handleNextModule}
                                disabled={currentIndex === modules.length - 1}
                            >
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

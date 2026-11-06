import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import { Course } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen, Search, Play, Clock, Star, GraduationCap, ArrowRight, Zap, Award, Flame, Trophy, Target, Heart, Trash2,
    Archive, ArchiveRestore, LucideIcon,
} from "lucide-react";
import { m } from "framer-motion";
import { Loading } from "@/components/common/loading";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useGamification } from "@/context/GamificationContext";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";
import { useWishlist } from "@/hooks/useWishlist";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import NotificationsBell from "@/components/learning/NotificationsBell";

const CourseItem = ({ course, getProgress, certificateUrl, onArchive, onUnarchive, busy }: {
    course: Course; getProgress: (courseId: string) => number; certificateUrl?: string | null;
    onArchive?: () => void; onUnarchive?: () => void; busy?: boolean;
}) => {
    const progress = getProgress(course.id);
    const inner = (
        <div className="flex flex-col sm:flex-row">
            <div className="sm:w-64 aspect-video sm:aspect-auto flex-shrink-0 bg-muted relative overflow-hidden">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                    <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <BookOpen className="size-10 text-primary/30" />
                    </div>
                )}
            </div>
            <CardContent className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{course.instructor || "SPARK Labs"}</p>
                </div>
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{progress}% complete</span>
                        {onUnarchive && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
                        {progress >= 100 && <Badge className="bg-emerald-500 text-white border-0 text-[10px]">✓ Completed</Badge>}
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                        {course.duration && <span className="flex items-center gap-1"><Clock className="size-3" /> {course.duration}</span>}
                        {course.level && <Badge variant="outline" className="text-[10px] capitalize">{course.level}</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {onUnarchive && (
                            <Button
                                variant="outline" size="sm"
                                className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                                disabled={busy}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnarchive(); }}
                            >
                                <ArchiveRestore className="size-3" /> Unarchive
                            </Button>
                        )}
                        {onArchive && (
                            <Button
                                variant="outline" size="sm"
                                className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                                disabled={busy}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(); }}
                            >
                                <Archive className="size-3" /> Archive
                            </Button>
                        )}
                        {certificateUrl && progress >= 100 && (
                            <Button variant="outline" size="sm" className="text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10 text-xs gap-1" asChild>
                                <Link to={certificateUrl}>Certificate <Award className="size-3" /></Link>
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
                            <Link to={`/learning-hub/classroom/${course.id}`}>
                                {progress > 0 && progress < 100 ? "Continue" : progress >= 100 ? "Review" : "Start"} <Play className="size-3" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </div>
    );
    // Completed cards that offer a certificate must not wrap the whole card in
    // a link (nested <a> is invalid and would hijack the certificate click).
    if (certificateUrl && progress >= 100) {
        return (
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden hover:shadow-lg transition-all group border-0 shadow-sm">
                    {inner}
                </Card>
            </m.div>
        );
    }
    return (
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Link to={`/learning-hub/classroom/${course.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all group border-0 shadow-sm">
                    {inner}
                </Card>
            </Link>
        </m.div>
    );
};

const EmptyState = ({ icon: Icon, title, subtitle, showBrowse = false }: { icon: LucideIcon; title: string; subtitle: string; showBrowse?: boolean }) => (
    <div className="text-center py-16 border-2 border-dashed rounded-xl">
        <Icon className="size-12 mx-auto text-muted-foreground mb-4 opacity-30" />
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
        {showBrowse && (
            <Button asChild><Link to="/learning-hub">Browse Courses <ArrowRight className="size-4 ml-2" /></Link></Button>
        )}
    </div>
);

const WishlistItem = ({ course, onRemove, removing }: { course: Course; onRemove: (courseId: string) => void; removing: boolean }) => (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/learning-hub/course/${course.slug}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-all group border-0 shadow-sm">
                <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-64 aspect-video sm:aspect-auto flex-shrink-0 bg-muted relative overflow-hidden">
                        {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        ) : (
                            <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                <BookOpen className="size-10 text-primary/30" />
                            </div>
                        )}
                    </div>
                    <CardContent className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">{course.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{course.instructor || "SPARK Labs"}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {course.category && <Badge variant="secondary" className="text-[10px]">{course.category}</Badge>}
                                {course.level && <Badge variant="outline" className="text-[10px] capitalize">{course.level}</Badge>}
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                            <div className="flex gap-3 text-xs text-muted-foreground">
                                {course.duration && <span className="flex items-center gap-1"><Clock className="size-3" /> {course.duration}</span>}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs gap-1 text-muted-foreground hover:text-destructive"
                                    disabled={removing}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(course.id); }}
                                >
                                    <Trash2 className="size-3" /> Remove
                                </Button>
                                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
                                    <span>View Course <ArrowRight className="size-3" /></span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </Link>
    </m.div>
);

export default function MyLearning() {
    const { student, isAuthenticated, enrollments, getCourseProgress, loading: studentLoading } = useStudentAuth();
    const { stats, achievements } = useGamification();
    const { savedCourses, toggle: toggleWishlist, loading: wishlistLoading, pending: wishlistPending } = useWishlist();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"recent" | "progress" | "title">("recent");

    // Archived enrollment visibility. Flags come from a student-local read of
    // (course_id, is_archived) instead of the StudentAuthContext select so auth
    // bootstrap never depends on the archive column; toggles write straight to
    // the owner-RLS-visible row and mirror into overrides for optimistic UI.
    const [archivedMap, setArchivedMap] = useState<Record<string, boolean>>({});
    const [archivedOverrides, setArchivedOverrides] = useState<Record<string, boolean>>({});
    const [archiveBusy, setArchiveBusy] = useState<string | null>(null);

    // Auth redirect handled by StudentRoute guard in App.tsx

    useEffect(() => {
        const fetchEnrolledCourses = async () => {
            if (enrollments.length === 0) { setLoading(false); return; }
            const courseIds = enrollments.map(e => e.course_id);
            const { data } = await supabase
                .from("learning_courses").select("*").in("id", courseIds);
            setCourses((data as Course[]) || []);
            setLoading(false);
        };
        if (isAuthenticated) fetchEnrolledCourses();
    }, [enrollments, isAuthenticated]);

    useEffect(() => {
        let cancelled = false;
        const fetchArchivedFlags = async () => {
            if (enrollments.length === 0) { setArchivedMap({}); return; }
            const courseIds = enrollments.map(e => e.course_id);
            const { data, error } = await supabase
                .from("learning_enrollments")
                .select("course_id, is_archived")
                .in("course_id", courseIds);
            if (cancelled) return;
            if (error) {
                // A database without the archive column (pre-migration) degrades
                // to "nothing archived" instead of breaking the page.
                setArchivedMap({});
                return;
            }
            const map: Record<string, boolean> = {};
            ((data || []) as { course_id: string; is_archived: boolean | null }[]).forEach(r => {
                if (r.is_archived) map[r.course_id] = true;
            });
            setArchivedMap(map);
        };
        if (isAuthenticated) fetchArchivedFlags();
        return () => { cancelled = true; };
    }, [enrollments, isAuthenticated]);

    const getProgress = useCallback((courseId: string) => getCourseProgress(courseId), [getCourseProgress]);

    const isArchived = useCallback(
        (courseId: string) => archivedOverrides[courseId] ?? archivedMap[courseId] ?? false,
        [archivedOverrides, archivedMap]
    );

    const toggleArchive = useCallback(async (courseId: string, archived: boolean) => {
        setArchivedOverrides(prev => ({ ...prev, [courseId]: archived }));
        setArchiveBusy(courseId);
        // The owner-UPDATE policy (auth.uid() = user_id) bounds this write to the
        // student's own enrollment row - no user_id filter is required, and the
        // unique(user_id, course_id) constraint guarantees a single target.
        const { error } = await supabase
            .from("learning_enrollments")
            .update({ is_archived: archived })
            .eq("course_id", courseId);
        setArchiveBusy(null);
        if (error) {
            setArchivedOverrides(prev => {
                const next = { ...prev };
                delete next[courseId];
                return next;
            });
            toast.error("Could not update the course. Please try again.");
            return;
        }
        toast.success(archived ? "Course moved to Archive" : "Course restored to your learning");
    }, []);

    const filteredCourses = useMemo(() => {
        let result = courses;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.title.toLowerCase().includes(q) ||
                (c.instructor || "").toLowerCase().includes(q) ||
                (c.category || "").toLowerCase().includes(q)
            );
        }
        // Sort
        if (sortBy === "progress") {
            result = result.toSorted((a, b) => getProgress(b.id) - getProgress(a.id));
        } else if (sortBy === "title") {
            result = result.toSorted((a, b) => a.title.localeCompare(b.title));
        }
        // "recent" uses default enrollment order
        return result;
    }, [courses, searchQuery, sortBy, getProgress]);

    // Archived courses drop out of every learning tab and appear only under
    // "Archive"; they remain enrolled (and counted) everywhere else.
    const activeCourses = useMemo(() => filteredCourses.filter(c => !isArchived(c.id)), [filteredCourses, isArchived]);
    const archivedCourses = useMemo(() => filteredCourses.filter(c => isArchived(c.id)), [filteredCourses, isArchived]);

    const inProgress = useMemo(() => activeCourses.filter(c => { const p = getProgress(c.id); return p > 0 && p < 100; }), [activeCourses, getProgress]);
    const completed = useMemo(() => activeCourses.filter(c => getProgress(c.id) >= 100), [activeCourses, getProgress]);
    const notStarted = activeCourses.filter(c => getProgress(c.id) === 0);

    if (loading || studentLoading) return <><Header /><div className="min-h-screen pt-24 flex justify-center"><Loading /></div></>;

    return (
        <>
            <SEOHead
                title="My Learning | Young Innovators Club"
                description="Track your learning progress and enrolled courses at the Young Innovators Club Learning Hub."
                path="/learning-hub/my-learning"
                noindex
            />
            <Header />
            <main className="min-h-screen bg-background pt-24 pb-20">
                <div className="container mx-auto px-4 max-w-5xl">
                    {/* Header with learner info */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-black">My Learning</h1>
                            <p className="text-muted-foreground mt-1">
                                {student ? `Welcome back, ${student.name}!` : ""} {courses.length} enrolled course{courses.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {isAuthenticated && <NotificationsBell />}
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input placeholder="Search your courses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                            </div>
                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Recent</SelectItem>
                                    <SelectItem value="progress">Progress</SelectItem>
                                    <SelectItem value="title">Title</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Resume Last Course */}
                    {inProgress.length > 0 && (
                        <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
                            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Play className="size-5 text-primary ml-0.5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Continue where you left off</p>
                                        <p className="font-semibold text-sm">{inProgress[0].title}</p>
                                    </div>
                                </div>
                                <Button asChild size="sm" className="gap-2">
                                    <Link to={`/learning-hub/classroom/${inProgress[0].id}`}>
                                        Resume <ArrowRight className="size-3.5" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Stats & XP Dashboard */}
                    {courses.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <BookOpen className="size-5 mx-auto text-primary mb-1" />
                                    <div className="text-2xl font-black">{courses.length}</div>
                                    <p className="text-xs text-muted-foreground">Enrolled</p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Award className="size-5 mx-auto text-emerald-500 mb-1" />
                                    <div className="text-2xl font-black">{completed.length}</div>
                                    <p className="text-xs text-muted-foreground">Completed</p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Zap className="size-5 mx-auto text-amber-500 mb-1" />
                                    <div className="text-2xl font-black">{stats?.total_xp || 0}</div>
                                    <p className="text-xs text-muted-foreground">Total XP</p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Flame className="size-5 mx-auto text-orange-500 mb-1" />
                                    <div className="text-2xl font-black">{stats?.current_streak_days || 0}</div>
                                    <p className="text-xs text-muted-foreground">Day Streak</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Achievements locker — every defined badge, unlocked or not.
                        Locked badges keep their earn hint so the list doubles as
                        a goals page (audit open-item: no dedicated locker). */}
                    <Card className="mb-6 border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <Trophy className="size-4 text-amber-500" />
                                    <h3 className="font-bold text-sm">Achievements</h3>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {achievements.length} of {Object.keys(ACHIEVEMENT_DEFINITIONS).length} unlocked
                                    {stats?.total_xp ? ` · ${stats.total_xp.toLocaleString()} XP` : ""}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {Object.entries(ACHIEVEMENT_DEFINITIONS).map(([type, def]) => {
                                    const earned = achievements.find(a => a.achievement_type === type);
                                    return (
                                        <div
                                            key={type}
                                            className={cn(
                                                "rounded-xl border p-3 transition-colors",
                                                earned
                                                    ? "border-amber-500/40 bg-amber-500/5"
                                                    : "border-border/60 bg-muted/20 opacity-75",
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl leading-none">{earned ? def.icon : "🔒"}</span>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate">{def.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">+{def.xp} XP</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">
                                                {earned
                                                    ? (earned.earned_at ? new Date(earned.earned_at).toLocaleDateString() : "Earned")
                                                    : def.hint}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Student Profile Card */}
                    {student && (
                        <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <GraduationCap className="size-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{student.name}</p>
                                        <p className="text-xs text-muted-foreground">{student.grade} · {student.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Target className="size-3.5" />
                                    <span>Avg: {courses.length > 0 ? Math.round(courses.reduce((sum, c) => sum + getProgress(c.id), 0) / courses.length) : 0}% complete</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {courses.length === 0 ? (
                        <EmptyState icon={GraduationCap} title="No courses yet" subtitle="Start exploring and enroll in courses to begin learning." showBrowse />
                    ) : (
                        <Tabs defaultValue="all" className="space-y-6">
                            <TabsList className="bg-muted/50">
                                <TabsTrigger value="all">All ({filteredCourses.length})</TabsTrigger>
                                <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
                                <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
                                <TabsTrigger value="not-started">Not Started ({notStarted.length})</TabsTrigger>
                                <TabsTrigger value="wishlist" className="gap-1.5">
                                    <Heart className="size-3.5" /> Wishlist ({savedCourses.length})
                                </TabsTrigger>
                                <TabsTrigger value="archived" className="gap-1.5">
                                    <Archive className="size-3.5" /> Archive ({archivedCourses.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="space-y-4 focus-visible:outline-none">
                                {activeCourses.length > 0 ? activeCourses.map(c => (
                                    <CourseItem
                                        key={c.id}
                                        course={c}
                                        getProgress={getProgress}
                                        onArchive={() => toggleArchive(c.id, true)}
                                        busy={archiveBusy === c.id}
                                    />
                                )) : (
                                    <EmptyState
                                        icon={Search}
                                        title={searchQuery ? "No matches" : "Nothing active"}
                                        subtitle={searchQuery ? "Try a different search term" : "Archived courses are kept in the Archive tab."}
                                    />
                                )}
                            </TabsContent>
                            <TabsContent value="in-progress" className="space-y-4 focus-visible:outline-none">
                                {inProgress.length > 0 ? inProgress.map(c => (
                                    <CourseItem
                                        key={c.id}
                                        course={c}
                                        getProgress={getProgress}
                                        onArchive={() => toggleArchive(c.id, true)}
                                        busy={archiveBusy === c.id}
                                    />
                                )) : (
                                    <EmptyState icon={Play} title="No courses in progress" subtitle="Start a course to see it here." />
                                )}
                            </TabsContent>
                            <TabsContent value="completed" className="space-y-4 focus-visible:outline-none">
                                {completed.length > 0 ? completed.map(c => (
                                    <CourseItem
                                        key={c.id}
                                        course={c}
                                        getProgress={getProgress}
                                        certificateUrl={c.certificate_enabled !== false ? `/learning-hub/certificate/${c.id}` : undefined}
                                        onArchive={() => toggleArchive(c.id, true)}
                                        busy={archiveBusy === c.id}
                                    />
                                )) : (
                                    <EmptyState icon={Star} title="No completed courses" subtitle="Complete a course to earn your certificate!" />
                                )}
                            </TabsContent>
                            <TabsContent value="not-started" className="space-y-4 focus-visible:outline-none">
                                {notStarted.length > 0 ? notStarted.map(c => (
                                    <CourseItem
                                        key={c.id}
                                        course={c}
                                        getProgress={getProgress}
                                        onArchive={() => toggleArchive(c.id, true)}
                                        busy={archiveBusy === c.id}
                                    />
                                )) : (
                                    <EmptyState icon={BookOpen} title="All courses started!" subtitle="Great job - keep going!" />
                                )}
                            </TabsContent>
                            <TabsContent value="wishlist" className="space-y-4 focus-visible:outline-none">
                                {wishlistLoading ? (
                                    <Loading />
                                ) : savedCourses.length > 0 ? (
                                    savedCourses.map(c => (
                                        <WishlistItem key={c.id} course={c} onRemove={toggleWishlist} removing={wishlistPending(c.id)} />
                                    ))
                                ) : (
                                    <EmptyState
                                        icon={Heart}
                                        title="No saved courses yet"
                                        subtitle="Tap the heart on any course in the Learning Hub to save it for later."
                                        showBrowse
                                    />
                                )}
                            </TabsContent>
                            <TabsContent value="archived" className="space-y-4 focus-visible:outline-none">
                                {archivedCourses.length > 0 ? archivedCourses.map(c => (
                                    <CourseItem
                                        key={c.id}
                                        course={c}
                                        getProgress={getProgress}
                                        onUnarchive={() => toggleArchive(c.id, false)}
                                        busy={archiveBusy === c.id}
                                    />
                                )) : (
                                    <EmptyState
                                        icon={Archive}
                                        title="Nothing archived"
                                        subtitle="Archived courses are hidden from your learning tabs but stay enrolled, with progress intact."
                                    />
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}

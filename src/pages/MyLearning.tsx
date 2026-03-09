import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLearner } from "@/context/LearnerContext";
import { Course } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen, Search, Play, Clock, Star, GraduationCap, ArrowRight, Zap, Award, Flame, Trophy, Target,
    LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Loading } from "@/components/ui/loading";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useGamification } from "@/context/GamificationContext";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CourseItem = ({ course, getProgress }: { course: Course; getProgress: (courseId: string) => number }) => {
    const progress = getProgress(course.id);
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Link to={`/learning-hub/classroom/${course.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all group border-0 shadow-sm">
                    <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-64 aspect-video sm:aspect-auto flex-shrink-0 bg-muted relative overflow-hidden">
                            {course.thumbnail_url ? (
                                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                    <BookOpen className="w-10 h-10 text-primary/30" />
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
                                    {progress >= 100 && <Badge className="bg-emerald-500 text-white border-0 text-[10px]">✓ Completed</Badge>}
                                </div>
                                <Progress value={progress} className="h-1.5" />
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                    {course.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>}
                                    {course.level && <Badge variant="outline" className="text-[10px] capitalize">{course.level}</Badge>}
                                </div>
                                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                                    {progress > 0 && progress < 100 ? "Continue" : progress >= 100 ? "Review" : "Start"} <Play className="w-3 h-3" />
                                </Button>
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
};

const EmptyState = ({ icon: Icon, title, subtitle, showBrowse = false }: { icon: LucideIcon; title: string; subtitle: string; showBrowse?: boolean }) => (
    <div className="text-center py-16 border-2 border-dashed rounded-xl">
        <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
        {showBrowse && (
            <Button asChild><Link to="/learning-hub">Browse Courses <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
        )}
    </div>
);

export default function MyLearning() {
    const { learner, isIdentified, enrollments, getCourseProgress, loading: learnerLoading } = useLearner();
    const { stats, achievements } = useGamification();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"recent" | "progress" | "title">("recent");

    // Redirect if not identified
    useEffect(() => {
        if (!learnerLoading && !isIdentified) {
            toast.error("Please fill the enrollment form to access My Learning.");
            navigate("/#join");
        }
    }, [learnerLoading, isIdentified, navigate]);

    useEffect(() => {
        const fetchEnrolledCourses = async () => {
            if (enrollments.length === 0) { setLoading(false); return; }
            const courseIds = enrollments.map(e => e.course_id);
            const { data } = await supabase
                .from("learning_courses").select("*").in("id", courseIds);
            setCourses((data as Course[]) || []);
            setLoading(false);
        };
        if (isIdentified) fetchEnrolledCourses();
    }, [enrollments, isIdentified]);

    const getProgress = (courseId: string) => getCourseProgress(courseId);

    // eslint-disable-next-line react-compiler/preserve-manual-memoization
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
            result = [...result].sort((a, b) => getProgress(b.id) - getProgress(a.id));
        } else if (sortBy === "title") {
            result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        }
        // "recent" uses default enrollment order
        return result;
    }, [courses, searchQuery, sortBy, getProgress]);

    // eslint-disable-next-line react-compiler/preserve-manual-memoization
    const inProgress = useMemo(() => filteredCourses.filter(c => { const p = getProgress(c.id); return p > 0 && p < 100; }), [filteredCourses, getProgress]);
    // eslint-disable-next-line react-compiler/preserve-manual-memoization
    const completed = useMemo(() => filteredCourses.filter(c => getProgress(c.id) >= 100), [filteredCourses, getProgress]);
    const notStarted = filteredCourses.filter(c => getProgress(c.id) === 0);

    if (loading || learnerLoading) return <><Header /><div className="min-h-screen pt-24 flex justify-center"><Loading /></div></>;

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
                                {learner ? `Welcome back, ${learner.name}!` : ""} {courses.length} enrolled course{courses.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-primary ml-0.5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Continue where you left off</p>
                                        <p className="font-semibold text-sm">{inProgress[0].title}</p>
                                    </div>
                                </div>
                                <Button asChild size="sm" className="gap-2">
                                    <Link to={`/learning-hub/classroom/${inProgress[0].id}`}>
                                        Resume <ArrowRight className="w-3.5 h-3.5" />
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
                                    <BookOpen className="w-5 h-5 mx-auto text-primary mb-1" />
                                    <div className="text-2xl font-black">{courses.length}</div>
                                    <p className="text-xs text-muted-foreground">Enrolled</p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Award className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                                    <div className="text-2xl font-black">{completed.length}</div>
                                    <p className="text-xs text-muted-foreground">Completed</p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Zap className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                                    <div className="text-2xl font-black">{stats?.total_xp || 0}</div>
                                    <p className="text-xs text-muted-foreground">Total XP</p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                                    <div className="text-2xl font-black">{stats?.current_streak_days || 0}</div>
                                    <p className="text-xs text-muted-foreground">Day Streak</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Achievements */}
                    {achievements.length > 0 && (
                        <Card className="mb-6 border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    <h3 className="font-bold text-sm">Achievements ({achievements.length})</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {achievements.map(a => {
                                        const def = ACHIEVEMENT_DEFINITIONS[a.achievement_type as keyof typeof ACHIEVEMENT_DEFINITIONS];
                                        return (
                                            <Badge key={a.id} variant="secondary" className="gap-1.5 py-1 px-3">
                                                <span>{def?.icon || "🏅"}</span>
                                                <span className="text-xs">{def?.label || a.achievement_type}</span>
                                                <span className="text-[10px] text-muted-foreground">+{a.points_earned}xp</span>
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Learner Profile Card */}
                    {learner && (
                        <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{learner.name}</p>
                                        <p className="text-xs text-muted-foreground">{learner.grade} · {learner.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Target className="w-3.5 h-3.5" />
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
                            </TabsList>

                            <TabsContent value="all" className="space-y-4 focus-visible:outline-none">
                                {filteredCourses.length > 0 ? filteredCourses.map(c => <CourseItem key={c.id} course={c} getProgress={getProgress} />) : (
                                    <EmptyState icon={Search} title="No matches" subtitle="Try a different search term" />
                                )}
                            </TabsContent>
                            <TabsContent value="in-progress" className="space-y-4 focus-visible:outline-none">
                                {inProgress.length > 0 ? inProgress.map(c => <CourseItem key={c.id} course={c} getProgress={getProgress} />) : (
                                    <EmptyState icon={Play} title="No courses in progress" subtitle="Start a course to see it here." />
                                )}
                            </TabsContent>
                            <TabsContent value="completed" className="space-y-4 focus-visible:outline-none">
                                {completed.length > 0 ? completed.map(c => <CourseItem key={c.id} course={c} getProgress={getProgress} />) : (
                                    <EmptyState icon={Star} title="No completed courses" subtitle="Complete a course to earn your certificate!" />
                                )}
                            </TabsContent>
                            <TabsContent value="not-started" className="space-y-4 focus-visible:outline-none">
                                {notStarted.length > 0 ? notStarted.map(c => <CourseItem key={c.id} course={c} getProgress={getProgress} />) : (
                                    <EmptyState icon={BookOpen} title="All courses started!" subtitle="Great job — keep going!" />
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

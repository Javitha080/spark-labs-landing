import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useEnrollment } from "@/context/EnrollmentContext";
import { Course } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen, Search, Play, Clock, Star, GraduationCap, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Loading } from "@/components/ui/loading";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect } from "react";

export default function MyLearning() {
    const { enrollments, getCourseProgress } = useEnrollment();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchEnrolledCourses = async () => {
            if (enrollments.length === 0) { setLoading(false); return; }
            const courseIds = enrollments.map(e => e.course_id);
            const { data } = await supabase
                .from("learning_courses").select("*").in("id", courseIds);
            setCourses((data as Course[]) || []);
            setLoading(false);
        };
        fetchEnrolledCourses();
    }, [enrollments]);

    const getProgress = (courseId: string) => getCourseProgress(courseId);

    const filteredCourses = useMemo(() => {
        if (!searchQuery.trim()) return courses;
        const q = searchQuery.toLowerCase();
        return courses.filter(c =>
            c.title.toLowerCase().includes(q) ||
            (c.instructor || "").toLowerCase().includes(q) ||
            (c.category || "").toLowerCase().includes(q)
        );
    }, [courses, searchQuery]);

    const inProgress = filteredCourses.filter(c => {
        const p = getProgress(c.id);
        return p > 0 && p < 100;
    });
    const completed = filteredCourses.filter(c => getProgress(c.id) >= 100);
    const notStarted = filteredCourses.filter(c => getProgress(c.id) === 0);

    if (loading) return <><Header /><div className="min-h-screen pt-24 flex justify-center"><Loading /></div></>;

    // Course card component
    const CourseItem = ({ course }: { course: Course }) => {
        const progress = getProgress(course.id);
        return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Link to={`/learning-hub/classroom/${course.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all group border-0 shadow-sm">
                        <div className="flex flex-col sm:flex-row">
                            {/* Thumbnail */}
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

    const EmptyState = ({ icon: Icon, title, subtitle, showBrowse = false }: { icon: any; title: string; subtitle: string; showBrowse?: boolean }) => (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
            <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
            {showBrowse && (
                <Button asChild>
                    <Link to="/learning-hub">Browse Courses <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
            )}
        </div>
    );

    return (
        <>
            <Header />
            <main className="min-h-screen bg-background pt-24 pb-20">
                <div className="container mx-auto px-4 max-w-5xl">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-black">My Learning</h1>
                            <p className="text-muted-foreground mt-1">{courses.length} enrolled course{courses.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search your courses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                        </div>
                    </div>

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

                            <TabsContent value="all" className="space-y-4 focus-visible:outline-none ring-offset-background">
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                    {filteredCourses.length > 0 ? filteredCourses.map(c => <CourseItem key={c.id} course={c} />) : (
                                        <EmptyState icon={Search} title="No matches" subtitle="Try a different search term" />
                                    )}
                                </motion.div>
                            </TabsContent>
                            <TabsContent value="in-progress" className="space-y-4 focus-visible:outline-none ring-offset-background">
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                    {inProgress.length > 0 ? inProgress.map(c => <CourseItem key={c.id} course={c} />) : (
                                        <EmptyState icon={Play} title="No courses in progress" subtitle="Start a course to see it here." />
                                    )}
                                </motion.div>
                            </TabsContent>
                            <TabsContent value="completed" className="space-y-4 focus-visible:outline-none ring-offset-background">
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                    {completed.length > 0 ? completed.map(c => <CourseItem key={c.id} course={c} />) : (
                                        <EmptyState icon={Star} title="No completed courses" subtitle="Complete a course to earn your certificate!" />
                                    )}
                                </motion.div>
                            </TabsContent>
                            <TabsContent value="not-started" className="space-y-4 focus-visible:outline-none ring-offset-background">
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                    {notStarted.length > 0 ? notStarted.map(c => <CourseItem key={c.id} course={c} />) : (
                                        <EmptyState icon={BookOpen} title="All courses started!" subtitle="Great job — keep going!" />
                                    )}
                                </motion.div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}

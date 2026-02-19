import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
    BookOpen, Search, GraduationCap, ArrowRight, Star, Users, Clock,
    Filter, ChevronDown, Play, Sparkles, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEnrollment } from "@/context/EnrollmentContext";
import { useRecommendedCourses } from "@/hooks/useLearningRecommendations";
import { Loading } from "@/components/ui/loading";
import { Course, Workshop, Resource } from "@/types/learning";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Category Configuration ───
const CATEGORIES = [
    { label: "All", value: "all", color: "from-purple-500 to-indigo-600" },
    { label: "Robotics", value: "Robotics", color: "from-red-500 to-orange-500" },
    { label: "Coding", value: "Coding", color: "from-emerald-500 to-teal-500" },
    { label: "Electronics", value: "Electronics", color: "from-yellow-500 to-amber-500" },
    { label: "IoT", value: "IoT", color: "from-cyan-500 to-blue-500" },
    { label: "3D Printing", value: "3D Printing", color: "from-pink-500 to-rose-500" },
    { label: "AI/ML", value: "AI/ML", color: "from-violet-500 to-purple-500" },
    { label: "Web Dev", value: "Web Dev", color: "from-indigo-500 to-blue-500" },
    { label: "Arduino", value: "Arduino", color: "from-orange-500 to-amber-500" },
];

// ─── Star Rating ───
function StarRating({ rating, count, size = "sm" }: { rating: number; count?: number; size?: "sm" | "md" }) {
    const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
    return (
        <div className="flex items-center gap-1">
            <span className={`font-bold ${size === "md" ? "text-lg" : "text-sm"} text-amber-500`}>
                {rating > 0 ? rating.toFixed(1) : "New"}
            </span>
            <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`${sz} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
            </div>
            {count !== undefined && <span className="text-xs text-muted-foreground">({count.toLocaleString()})</span>}
        </div>
    );
}

// ─── Course Card (Udemy Style) ───
function CourseCard({ course, index }: { course: Course; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
        >
            <Link to={`/learning-hub/course/${course.slug}`} className="block group">
                <Card className="overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-card h-full">
                    {/* Thumbnail */}
                    <div className="aspect-video relative overflow-hidden bg-muted">
                        {course.thumbnail_url ? (
                            <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                <BookOpen className="w-12 h-12 text-primary/30" />
                            </div>
                        )}
                        {course.is_featured && (
                            <div className="absolute top-2 left-2">
                                <Badge className="bg-amber-500 text-white border-0 text-xs font-bold">
                                    <Sparkles className="w-3 h-3 mr-1" /> Bestseller
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <CardContent className="p-4 space-y-2">
                        <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                            {course.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            {course.instructor || "SPARK Labs"}
                        </p>
                        <StarRating rating={course.rating_avg || 0} count={course.rating_count || 0} />
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                            {course.duration && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {course.duration}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {(course.enrolled_count || 0).toLocaleString()} students
                            </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            {course.level && (
                                <Badge variant="outline" className="text-[10px] capitalize">
                                    {course.level}
                                </Badge>
                            )}
                            {course.category && (
                                <Badge variant="secondary" className="text-[10px]">
                                    {course.category}
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

// ═══════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════
function LearningHub() {
    const { enrollments } = useEnrollment();
    const { recommendedCourses, loading: recLoading } = useRecommendedCourses(enrollments.map(e => e.course_id));
    const [courses, setCourses] = useState<Course[]>([]);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<Record<string, Record<string, string>>>({});

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedLevel, setSelectedLevel] = useState("all");
    const [sortBy, setSortBy] = useState<"newest" | "popular" | "rated">("popular");

    useEffect(() => {
        const fetchAll = async () => {
            const [coursesRes, workshopsRes, resourcesRes, contentRes] = await Promise.all([
                supabase.from("learning_courses").select("*").eq("is_published", true).order("display_order"),
                supabase.from("learning_workshops").select("*").eq("is_published", true).order("workshop_date"),
                supabase.from("learning_resources").select("*").eq("is_published", true).order("display_order"),
                supabase.from("content_blocks").select("*").eq("page_name", "learning_hub")
            ]);

            setCourses((coursesRes.data as Course[]) || []);
            setWorkshops((workshopsRes.data as Workshop[]) || []);
            setResources((resourcesRes.data as Resource[]) || []);

            // Process content blocks
            const contentMap: Record<string, Record<string, string>> = {};
            (contentRes.data || []).forEach((block: any) => {
                if (!contentMap[block.section_name]) contentMap[block.section_name] = {};
                contentMap[block.section_name][block.block_key] = block.content_value || "";
            });
            setContent(contentMap);

            setLoading(false);
        };
        fetchAll();
    }, []);

    // Helper to secure content access with fallbacks
    const getText = (section: string, key: string, fallback: string) => {
        return content[section]?.[key] || fallback;
    };

    // Filtered & sorted courses
    const filteredCourses = useMemo(() => {
        let result = [...courses];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.title.toLowerCase().includes(q) ||
                (c.description || "").toLowerCase().includes(q) ||
                (c.instructor || "").toLowerCase().includes(q) ||
                (c.category || "").toLowerCase().includes(q)
            );
        }

        // Category
        if (selectedCategory !== "all") {
            result = result.filter(c => c.category === selectedCategory);
        }

        // Level
        if (selectedLevel !== "all") {
            result = result.filter(c => c.level === selectedLevel);
        }

        // Sort
        switch (sortBy) {
            case "newest":
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case "popular":
                result.sort((a, b) => (b.enrolled_count || 0) - (a.enrolled_count || 0));
                break;
            case "rated":
                result.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
                break;
        }

        return result;
    }, [courses, searchQuery, selectedCategory, selectedLevel, sortBy]);

    if (loading) return <><Header /><div className="min-h-screen pt-20 flex justify-center items-center"><Loading /></div></>;

    return (
        <>
            <Helmet>
                <title>Learning Hub | YICDVP</title>
                <meta name="description" content="Learn robotics, coding, electronics, and more with Spark Labs HQ yicdvp free courses and workshops." />
            </Helmet>

            <Header />

            <main className="min-h-screen bg-background">
                {/* ─── Hero Section ─── */}
                <section className="relative pt-24 pb-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                    <div className="container mx-auto px-4 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center max-w-3xl mx-auto"
                        >
                            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                                <GraduationCap className="w-3 h-3 mr-1" /> {getText("hero", "badge", "Free Learning Platform")}
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
                                {getText("hero", "title_prefix", "Learn Without")} <span className="text-primary">{getText("hero", "title_highlight", "Limits")}</span>
                            </h1>
                            <p className="text-lg text-muted-foreground mb-8">
                                {getText("hero", "description", "{count}+ courses in Robotics, Coding, Electronics & more — completely free for Spark Labs HQ yicdvp members.").replace("{count}", courses.length.toString())}
                            </p>

                            {/* Search Bar */}
                            <div className="relative max-w-xl mx-auto">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    placeholder="Search for courses..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-12 pr-4 h-14 rounded-full text-base bg-card border-2 border-muted focus:border-primary shadow-lg"
                                />
                            </div>

                            {/* Quick Category Pills */}
                            <div className="flex flex-wrap justify-center gap-2 mt-6">
                                {CATEGORIES.slice(1, 6).map(cat => (
                                    <Button
                                        key={cat.value}
                                        variant={selectedCategory === cat.value ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-full text-xs"
                                        onClick={() => setSelectedCategory(selectedCategory === cat.value ? "all" : cat.value)}
                                    >
                                        {cat.label}
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ─── Main Content ─── */}
                <section className="pb-20">
                    <div className="container mx-auto px-4">
                        <Tabs defaultValue="courses" className="space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <TabsList className="bg-muted/50">
                                    <TabsTrigger value="courses" className="gap-2">
                                        <BookOpen className="w-4 h-4" /> Courses
                                    </TabsTrigger>
                                    <TabsTrigger value="workshops" className="gap-2">
                                        <GraduationCap className="w-4 h-4" /> Workshops
                                    </TabsTrigger>
                                    <TabsTrigger value="resources" className="gap-2">
                                        <Sparkles className="w-4 h-4" /> Resources
                                    </TabsTrigger>
                                </TabsList>

                                {/* My Learning Button */}
                                <Button variant="outline" asChild className="gap-2">
                                    <Link to="/learning-hub/my-learning">
                                        <Play className="w-4 h-4" /> My Learning
                                    </Link>
                                </Button>
                            </div>

                            {/* ─── Courses Tab ─── */}
                            <TabsContent value="courses" className="space-y-6">
                                {/* Recommended for you (when logged in and we have recs) */}
                                {!recLoading && recommendedCourses.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-primary" /> Recommended for you
                                        </h2>
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                            {recommendedCourses.map((course, i) => (
                                                <CourseCard key={course.id} course={course} index={i} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Filters Bar */}
                                <div className="flex flex-wrap gap-3 items-center">
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-40">
                                            <Filter className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(cat => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="Level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Levels</SelectItem>
                                            <SelectItem value="beginner">Beginner</SelectItem>
                                            <SelectItem value="intermediate">Intermediate</SelectItem>
                                            <SelectItem value="advanced">Advanced</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "popular" | "rated")}>
                                        <SelectTrigger className="w-44">
                                            <TrendingUp className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="popular">Most Popular</SelectItem>
                                            <SelectItem value="rated">Highest Rated</SelectItem>
                                            <SelectItem value="newest">Newest</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <span className="text-sm text-muted-foreground ml-auto">
                                        {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
                                    </span>
                                </div>

                                {/* Course Grid */}
                                <AnimatePresence mode="wait">
                                    {filteredCourses.length > 0 ? (
                                        <motion.div
                                            key="grid"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                        >
                                            {filteredCourses.map((course, i) => (
                                                <CourseCard key={course.id} course={course} index={i} />
                                            ))}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-20 border-2 border-dashed rounded-xl"
                                        >
                                            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                                            <h3 className="text-xl font-bold mb-2">No courses found</h3>
                                            <p className="text-muted-foreground">Try adjusting your search or filters</p>
                                            <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setSelectedLevel("all"); }}>
                                                Clear Filters
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </TabsContent>

                            {/* ─── Workshops Tab ─── */}
                            <TabsContent value="workshops">
                                {workshops.length > 0 ? (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {workshops.map((workshop, i) => (
                                            <motion.div key={workshop.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                                <Link to={`/learning-hub/workshop/${workshop.id}`}>
                                                    <Card className="overflow-hidden hover:shadow-lg transition-all h-full group border-0 shadow-sm">
                                                        <CardContent className="p-6 space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary">{workshop.category}</Badge>
                                                                {workshop.is_featured && <Badge className="bg-amber-500 text-white border-0 text-[10px]">Featured</Badge>}
                                                            </div>
                                                            <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">{workshop.title}</h3>
                                                            <p className="text-sm text-muted-foreground line-clamp-2">{workshop.description}</p>
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
                                                                {workshop.workshop_date && <span>{new Date(workshop.workshop_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                                                                {workshop.location && <span>📍 {workshop.location}</span>}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 border-2 border-dashed rounded-xl">
                                        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                                        <h3 className="text-xl font-bold mb-2">No upcoming workshops</h3>
                                        <p className="text-muted-foreground">Check back soon for new workshops!</p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* ─── Resources Tab ─── */}
                            <TabsContent value="resources">
                                {resources.length > 0 ? (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {resources.map((resource, i) => (
                                            <motion.a
                                                key={resource.id}
                                                href={resource.url || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="block"
                                            >
                                                <Card className="hover:shadow-lg transition-all border-0 shadow-sm h-full group">
                                                    <CardContent className="p-5 flex items-start gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl">
                                                            {resource.icon || "📚"}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold group-hover:text-primary transition-colors">{resource.title}</h3>
                                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{resource.description}</p>
                                                            <Badge variant="outline" className="mt-2 text-[10px] capitalize">{resource.resource_type}</Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 border-2 border-dashed rounded-xl">
                                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                                        <h3 className="text-xl font-bold mb-2">No resources yet</h3>
                                        <p className="text-muted-foreground">Resources will be posted soon!</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>

                {/* ─── CTA Section ─── */}
                <section className="py-16 border-t">
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                                <GraduationCap className="w-16 h-16 text-primary mx-auto mb-6" />
                                <h2 className="text-3xl md:text-5xl font-black mb-6">{getText("cta", "title", "Start Your Learning Journey")}</h2>
                                <p className="text-xl text-muted-foreground mb-8">
                                    {getText("cta", "description", "Join our society and access all courses, workshops, and resources for free.")}
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <Button size="lg" asChild className="rounded-full group">
                                        <Link to="/learning-hub/my-learning">
                                            {getText("cta", "button_primary", "Get Started")} <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" asChild className="rounded-full">
                                        <Link to="/contact">{getText("cta", "button_secondary", "Contact Us")}</Link>
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

export default LearningHub;

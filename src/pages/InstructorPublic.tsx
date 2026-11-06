// Public instructor profile — Udemy-style /learning-hub/instructor/:slug.
//
// The instructor entity is derived: courses carry a free-text `instructor`
// field, and the slug must equal slugify_text(instructor) as computed by the
// security-definer RPC get_public_instructor_courses. All reads go through
// that RPC — no direct table reads, so the aggregate (students, ratings)
// never depends on enrollment rows being publicly readable.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSlug } from "@/lib/sanitize";
import { logError } from "@/lib/errors";
import type { PublicInstructorCourse } from "@/types/learning";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const InstructorPublic = () => {
    const { slug } = useParams<{ slug: string }>();
    const [courses, setCourses] = useState<PublicInstructorCourse[] | null>(null);
    const [failed, setFailed] = useState(false);

    const loadInstructor = useCallback(async () => {
        const slugParam = sanitizeSlug(slug || "");
        if (!slugParam) { setFailed(true); setCourses([]); return; }
        const { data, error } = await supabase.rpc("get_public_instructor_courses", {
            p_slug: slugParam,
        });
        if (error) {
            logError(error, "InstructorPublic");
            setFailed(true);
            setCourses([]);
            return;
        }
        setFailed(false);
        setCourses(((data || []) as unknown as PublicInstructorCourse[]));
    }, [slug]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching effect sets state in async callback
    useEffect(() => { setCourses(null); void loadInstructor(); }, [loadInstructor]);

    const courseRows = courses ?? [];
    const lead = courseRows[0];
    const instructorName = lead?.instructor_name?.trim() || "Instructor";
    const bio = lead?.instructor_bio?.trim() || "";
    const avatar = lead?.instructor_avatar || "";

    // Aggregates over the lead's published courses. Rating averages are
    // weighted by each course's rating_count; courses without ratings fall
    // back to a plain mean of their averages so a new course doesn't zero out.
    const totalCourses = courseRows.length;
    const totalStudents = courseRows.reduce((s, r) => s + (r.enrolled_count || 0), 0);
    const totalRatings = courseRows.reduce((s, r) => s + (r.rating_count || 0), 0);
    const hasRated = courseRows.some(r => (r.rating_avg || 0) > 0);
    const avgRating = totalRatings > 0
        ? courseRows.reduce((s, r) => s + (r.rating_avg || 0) * (r.rating_count || 0), 0) / totalRatings
        : hasRated
            ? courseRows.reduce((s, r) => s + (r.rating_avg || 0), 0) / totalCourses
            : 0;

    const loading = courses === null && !failed;
    const notFound = failed || (!loading && courseRows.length === 0);
    const shortBio = bio.length > 160 ? `${bio.slice(0, 157)}…` : bio;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEOHead
                title={`${instructorName} | Instructor | SPARK Labs`}
                description={shortBio || `Courses by ${instructorName} on the SPARK Labs Learning Hub — free STEM courses from the Young Innovators Club.`}
                path={`/learning-hub/instructor/${slug || ""}`}
            />

            <Header />

            <main className="flex-1">
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Loading instructor profile" />
                    </div>
                ) : notFound ? (
                    <section className="pt-32 pb-20 px-4 text-center max-w-lg mx-auto">
                        <h1 className="text-2xl font-bold mb-3">Instructor not found</h1>
                        <p className="text-muted-foreground mb-6">
                            This instructor profile doesn't exist, or there are no published courses
                            under this name yet.
                        </p>
                        <Link to="/learning-hub">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="size-4" /> Back to Learning Hub
                            </Button>
                        </Link>
                    </section>
                ) : (
                    <>
                        {/* Hero */}
                        <section className="relative pt-28 pb-10 px-4 overflow-hidden">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                                <div className="absolute -top-24 left-1/4 w-72 h-72 rounded-full bg-primary/15 blur-[100px]" />
                            </div>
                            <div className="relative max-w-5xl mx-auto">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                    <div className="size-28 sm:size-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/25">
                                        {avatar ? (
                                            <img src={avatar} alt={instructorName} className="size-full object-cover" />
                                        ) : (
                                            <Users className="size-12 text-primary" />
                                        )}
                                    </div>
                                    <div className="text-center sm:text-left min-w-0">
                                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Instructor</p>
                                        <h1 className="text-3xl sm:text-4xl font-extrabold mt-1 break-words">{instructorName}</h1>
                                        {bio && (
                                            <p className="text-sm sm:text-base text-muted-foreground mt-3 whitespace-pre-line max-w-2xl">{bio}</p>
                                        )}
                                        <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <BookOpen className="size-4 text-primary" />
                                                {totalCourses} Course{totalCourses === 1 ? "" : "s"}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Users className="size-4 text-primary" />
                                                {totalStudents.toLocaleString()} Student{totalStudents === 1 ? "" : "s"}
                                            </span>
                                            {avgRating > 0 && (
                                                <span className="flex items-center gap-1.5 text-amber-500">
                                                    <svg viewBox="0 0 24 24" className="size-4 fill-amber-400" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                    {avgRating.toFixed(1)} Instructor Rating
                                                    {totalRatings > 0 && <span className="text-muted-foreground">({totalRatings.toLocaleString()} ratings)</span>}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Courses */}
                        <section className="pb-20 px-4 max-w-6xl mx-auto w-full">
                            <h2 className="text-xl font-bold mb-5">
                                Courses by {instructorName}
                                <span className="text-sm font-normal text-muted-foreground ml-2">{totalCourses}</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {courseRows.map(row => (
                                    <Link
                                        key={row.course_id}
                                        to={`/learning-hub/course/${row.course_slug}`}
                                        className="group block rounded-2xl overflow-hidden border bg-card hover:shadow-xl hover:border-primary/40 transition-all duration-300"
                                    >
                                        {row.course_thumbnail ? (
                                            <div className="aspect-video overflow-hidden bg-muted">
                                                <img
                                                    src={row.course_thumbnail}
                                                    alt={row.course_title}
                                                    loading="lazy"
                                                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-video bg-primary/10 flex items-center justify-center">
                                                <BookOpen className="size-10 text-primary/60" />
                                            </div>
                                        )}
                                        <div className="p-4 space-y-2">
                                            <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                {row.course_title}
                                            </h3>
                                            {(row.course_level || row.course_language) && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {row.course_level && <Badge variant="secondary" className="text-[10px] px-1.5">{row.course_level}</Badge>}
                                                    {row.course_language && <Badge variant="outline" className="text-[10px] px-1.5">{row.course_language}</Badge>}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                {(row.rating_avg || 0) > 0 && (
                                                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                                                        <svg viewBox="0 0 24 24" className="size-3.5 fill-amber-400" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                        {(row.rating_avg || 0).toFixed(1)}
                                                        {row.rating_count ? <span className="text-muted-foreground">({row.rating_count})</span> : null}
                                                    </span>
                                                )}
                                                {(row.enrolled_count || 0) > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="size-3" />
                                                        {(row.enrolled_count || 0).toLocaleString()}
                                                    </span>
                                                )}
                                                {row.course_duration && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="size-3" />
                                                        {row.course_duration}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default InstructorPublic;

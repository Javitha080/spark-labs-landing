import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/context/GamificationContext";
import { useLearner } from "@/context/LearnerContext";
import { recordLearningInteraction } from "@/hooks/useLearningRecommendations";
import { Course, Section, Module, Review, LearningDiscussion } from "@/types/learning";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
    ArrowLeft, Clock, Users, BarChart3, Star, Play, Layers,
    CheckCircle, Globe, Award, BookOpen, Video, FileText, ChevronRight,
    MessageCircle, Send, Pin, Share2, Copy, Check
} from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Star Rating Display ───
function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
    const sz = size === "lg" ? "w-5 h-5" : "w-4 h-4";
    return (
        <div className="flex">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`${sz} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            ))}
        </div>
    );
}

// ─── Rating Breakdown Bar ───
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="w-16 text-right text-muted-foreground">{stars} stars</span>
            <Progress value={pct} className="h-2 flex-1" />
            <span className="w-10 text-muted-foreground text-xs">{Math.round(pct)}%</span>
        </div>
    );
}

// ─── Interactive Star Rating Input ───
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
                <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(i)}
                    className="p-0.5 transition-transform hover:scale-110"
                >
                    <Star className={`w-7 h-7 ${i <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
            ))}
        </div>
    );
}

// ─── Content Type Icon ───
function ContentIcon({ type }: { type: string | null }) {
    switch (type) {
        case "video": return <Video className="w-4 h-4" />;
        case "document": case "text": case "article": return <FileText className="w-4 h-4" />;
        case "quiz": return <CheckCircle className="w-4 h-4" />;
        case "project": case "tinkercad": return <Layers className="w-4 h-4" />;
        case "code": return <BookOpen className="w-4 h-4" />;
        default: return <Play className="w-4 h-4" />;
    }
}

export default function CourseDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { recordActivity, awardAchievement } = useGamification();
    const { learner, isIdentified, enrollInCourse, checkCourseEnrollment, getCourseProgress } = useLearner();

    const [course, setCourse] = useState<Course | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [discussions, setDiscussions] = useState<LearningDiscussion[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [isEnrolled, setIsEnrolled] = useState(false);

    // Review form
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // Q&A form
    const [qaTitle, setQaTitle] = useState("");
    const [qaContent, setQaContent] = useState("");
    const [submittingQa, setSubmittingQa] = useState(false);
    const [replyToId, setReplyToId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [submittingReply, setSubmittingReply] = useState(false);

    // Share & Related
    const [copied, setCopied] = useState(false);
    const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
    const repliesLoadedRef = useRef(false);

    useEffect(() => {
        if (!slug) return;
        const fetchCourse = async () => {
            try {
                const { data, error } = await supabase
                    .from("learning_courses").select("*").eq("slug", slug).single();
                if (error || !data) { navigate("/learning-hub"); return; }
                const courseData = data as Course;
                setCourse(courseData);

                // Record view interaction for recommendations
                if (isIdentified && learner) {
                    recordLearningInteraction({ learner_token_id: learner.id }, courseData.id, "view").catch(() => { });
                }

                // Check enrollment via learner context
                setIsEnrolled(isIdentified ? checkCourseEnrollment(courseData.id) : false);

                // Fetch sections, modules, reviews, discussions in parallel
                const [sectionsRes, modulesRes, reviewsRes, discussionsRes] = await Promise.all([
                    supabase.from("learning_sections").select("*").eq("course_id", courseData.id).eq("is_published", true).order("display_order"),
                    supabase.from("learning_modules").select("*").eq("course_id", courseData.id).eq("is_published", true).order("display_order"),
                    supabase.from("learning_reviews").select("*").eq("course_id", courseData.id).eq("is_approved", true).order("created_at", { ascending: false }).limit(20),
                    supabase.from("learning_discussions").select("*").eq("course_id", courseData.id).is("parent_id", null).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
                ]);
                setSections(sectionsRes.data || []);
                setModules(modulesRes.data || []);
                setReviews((reviewsRes.data as Review[]) || []);
                setDiscussions((discussionsRes.data as LearningDiscussion[]) || []);

                // Fetch related courses by category
                if (courseData.category) {
                    const { data: related } = await supabase
                        .from("learning_courses").select("*")
                        .eq("is_published", true).eq("category", courseData.category)
                        .neq("id", courseData.id).order("enrolled_count", { ascending: false }).limit(3);
                    setRelatedCourses((related as Course[]) || []);
                }

                // Increment view count (once per session per course)
                const viewKey = `viewed_${courseData.id}`;
                if (!sessionStorage.getItem(viewKey)) {
                    sessionStorage.setItem(viewKey, "1");
                    await supabase.rpc("increment_course_view_count", { p_course_id: courseData.id });
                }
            } catch (err) {
                console.error(err);
                navigate("/learning-hub");
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    const fetchReplies = async (parentId: string) => {
        const { data } = await supabase
            .from("learning_discussions")
            .select("*")
            .eq("parent_id", parentId)
            .order("created_at", { ascending: true });
        return (data as LearningDiscussion[]) || [];
    };

    const loadRepliesForDiscussions = async (list: LearningDiscussion[]) => {
        if (!course || list.length === 0) return;
        const withReplies = await Promise.all(
            list.map(async (d) => {
                const replies = await fetchReplies(d.id);
                return { ...d, replies };
            })
        );
        setDiscussions((prev) =>
            prev.map((d) => {
                const updated = withReplies.find((w) => w.id === d.id);
                return updated ? { ...d, replies: updated.replies } : d;
            })
        );
    };

    useEffect(() => {
        if (discussions.length > 0 && !repliesLoadedRef.current) {
            repliesLoadedRef.current = true;
            loadRepliesForDiscussions(discussions);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [course?.id, discussions.length]);

    const handleEnroll = async () => {
        if (!course) return;
        if (!isIdentified || !learner) {
            toast.error("Please fill the enrollment form first to enroll in courses.");
            return;
        }
        setEnrolling(true);
        try {
            await enrollInCourse(course.id);
            recordLearningInteraction({ learner_token_id: learner.id }, course.id, "enroll").catch(() => { });
            recordActivity().catch(() => { });
            awardAchievement("enrolled").catch(() => { });
            awardAchievement("first_course").catch(() => { });
            setIsEnrolled(true);
            toast.success("Successfully enrolled!");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to enroll");
        } finally {
            setEnrolling(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!course || reviewRating === 0) { toast.error("Please select a rating"); return; }
        if (!isIdentified || !learner) {
            toast.error("Please fill the enrollment form to leave a review.");
            return;
        }
        setSubmittingReview(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Supabase Auth user — use user_id
                const { error } = await supabase.from("learning_reviews").upsert({
                    user_id: user.id,
                    course_id: course.id,
                    rating: reviewRating,
                    review_text: reviewText || null,
                    reviewer_name: learner?.name || "Student",
                }, { onConflict: "user_id,course_id" });
                if (error) throw error;
            } else if (isIdentified && learner) {
                // Learner token user — use learner_token_id
                const { error } = await supabase.from("learning_reviews").upsert({
                    learner_token_id: learner.id,
                    course_id: course.id,
                    rating: reviewRating,
                    review_text: reviewText || null,
                    reviewer_name: learner.name,
                }, { onConflict: "learner_token_id,course_id" });
                if (error) throw error;
            } else {
                toast.error("Please fill the enrollment form to leave a review.");
                return;
            }

            if (reviewRating === 5) awardAchievement("first_review_5_star").catch(() => { });
            toast.success("Review submitted!");
            setReviewRating(0);
            setReviewText("");
            const { data } = await supabase.from("learning_reviews").select("*").eq("course_id", course.id).eq("is_approved", true).order("created_at", { ascending: false }).limit(20);
            setReviews((data as Review[]) || []);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to submit review");
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleSubmitQuestion = async () => {
        if (!course || !qaTitle.trim() || !qaContent.trim()) return;
        setSubmittingQa(true);
        try {
            // Q&A requires Supabase auth (admin/editor accounts)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Q&A is available for signed-in members. Contact an admin for access.");
                return;
            }
            const { error } = await supabase.from("learning_discussions").insert({
                course_id: course.id,
                user_id: user.id,
                title: qaTitle.trim(),
                content: qaContent.trim(),
            });
            if (error) throw error;
            toast.success("Question posted!");
            setQaTitle("");
            setQaContent("");
            const { data } = await supabase.from("learning_discussions").select("*").eq("course_id", course.id).is("parent_id", null).order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
            setDiscussions((data as LearningDiscussion[]) || []);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to post question");
        } finally {
            setSubmittingQa(false);
        }
    };

    const handleSubmitReply = async (parentId: string) => {
        if (!replyContent.trim()) return;
        setSubmittingReply(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Q&A replies are available for signed-in members.");
                return;
            }
            const { error } = await supabase.from("learning_discussions").insert({
                course_id: course!.id,
                user_id: user.id,
                parent_id: parentId,
                title: "Reply",
                content: replyContent.trim(),
            });
            if (error) throw error;
            toast.success("Reply posted!");
            setReplyToId(null);
            setReplyContent("");
            await loadRepliesForDiscussions(discussions);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to post reply");
        } finally {
            setSubmittingReply(false);
        }
    };

    if (loading) return <><Header /><div className="min-h-screen pt-24 flex justify-center"><Loading /></div></>;
    if (!course) return null;

    const totalModules = modules.length;
    const totalDuration = modules.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
    const totalHours = Math.floor(totalDuration / 60);
    const totalMins = totalDuration % 60;
    const progress = getCourseProgress(course.id);

    // Rating breakdown
    const ratingCounts = [5, 4, 3, 2, 1].map(s => ({
        stars: s,
        count: reviews.filter(r => r.rating === s).length,
    }));

    return (
        <>
            <Helmet>
                <title>{`${course.title} | ${SITE_NAME} Learning Hub`}</title>
                <meta name="description" content={course.description || `Learn ${course.title} at the Young Innovators Club Learning Hub.`} />
                <link rel="canonical" href={`${SITE_URL}/learning-hub/course/${slug}`} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${SITE_URL}/learning-hub/course/${slug}`} />
                <meta property="og:title" content={`${course.title} | ${SITE_NAME} Learning Hub`} />
                <meta property="og:description" content={course.description || ""} />
                <meta property="og:image" content={course.thumbnail_url || DEFAULT_OG_IMAGE} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={course.title} />
                <meta name="twitter:description" content={course.description || ""} />
                <meta name="twitter:image" content={course.thumbnail_url || DEFAULT_OG_IMAGE} />
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Course",
                    "name": course.title,
                    "description": course.description || "",
                    "provider": { "@type": "Organization", "name": SITE_NAME },
                    ...(course.thumbnail_url ? { "image": course.thumbnail_url } : {}),
                    ...(course.category ? { "courseCode": course.category } : {}),
                    ...((course.rating_avg || 0) > 0 ? { "aggregateRating": { "@type": "AggregateRating", "ratingValue": course.rating_avg, "ratingCount": course.rating_count || 0 } } : {}),
                })}</script>
            </Helmet>
            <Header />
            <main className="min-h-screen bg-background">
                {/* ─── Dark Top Banner ─── */}
                <section className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white pt-24 pb-12">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Left — Course Info */}
                            <div className="flex-1 space-y-4 lg:pr-80">
                                <div className="flex items-center gap-2 text-sm">
                                    <Link to="/learning-hub" className="text-primary hover:underline flex items-center gap-1">
                                        <ArrowLeft className="w-4 h-4" /> Learning Hub
                                    </Link>
                                    <ChevronRight className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-400">{course.category}</span>
                                </div>

                                <h1 className="text-3xl md:text-4xl font-black leading-tight">{course.title}</h1>
                                <p className="text-lg text-gray-300 line-clamp-3">{course.description}</p>

                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    {(course.rating_avg || 0) > 0 && (
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-amber-400 text-lg">{(course.rating_avg || 0).toFixed(1)}</span>
                                            <Stars rating={course.rating_avg || 0} />
                                            <span className="text-gray-400">({course.rating_count || 0} ratings)</span>
                                        </div>
                                    )}
                                    <span className="flex items-center gap-1 text-gray-300">
                                        <Users className="w-4 h-4" /> {(course.enrolled_count || 0).toLocaleString()} students
                                    </span>
                                </div>

                                <div className="text-sm text-gray-400">
                                    Created by <span className="text-primary underline">{course.instructor || "SPARK Labs"}</span>
                                </div>

                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Last updated {course.last_updated ? new Date(course.last_updated).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recently"}</span>
                                    <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> {course.language || "English"}</span>
                                    <span className="flex items-center gap-1">
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="capitalize">{course.level}</span>
                                    </span>
                                </div>

                                {/* Tags */}
                                {course.tags && course.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {course.tags.map((tag, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs bg-white/10 text-gray-200 border-gray-600 hover:bg-white/20">{tag}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Body (2-column layout) ─── */}
                <section className="container mx-auto px-4 max-w-6xl py-8">
                    <div className="flex flex-col lg:flex-row gap-8">

                        {/* Left Column — Content */}
                        <div className="flex-1 space-y-10 lg:pr-8">

                            {/* Promo Video Preview */}
                            {course.promo_video_url && (
                                <div className="rounded-xl overflow-hidden border shadow-sm">
                                    <div className="aspect-video bg-black">
                                        {course.promo_video_url.includes("youtube.com") || course.promo_video_url.includes("youtu.be") ? (
                                            <iframe
                                                src={course.promo_video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                                                className="w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title="Course preview"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <video src={course.promo_video_url} controls className="w-full h-full" preload="metadata" />
                                        )}
                                    </div>
                                    <div className="p-3 bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
                                        <Video className="w-3.5 h-3.5" /> Course preview
                                    </div>
                                </div>
                            )}

                            {/* What You'll Learn */}
                            {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border rounded-lg p-6">
                                    <h2 className="text-xl font-bold mb-4">What you'll learn</h2>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {course.learning_outcomes.map((item, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                                <span className="text-sm">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Prerequisites */}
                            {course.prerequisites && course.prerequisites.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Prerequisites</h2>
                                    <ul className="space-y-2">
                                        {course.prerequisites.map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <ChevronRight className="w-4 h-4 text-primary" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Course Content (Sections/Modules) */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold">Course Content</h2>
                                    <span className="text-sm text-muted-foreground">
                                        {sections.length} sections · {totalModules} lectures · {totalHours > 0 ? `${totalHours}h ` : ""}{totalMins}m total
                                    </span>
                                </div>

                                <Accordion type="multiple" className="border rounded-lg">
                                    {sections.map((section) => {
                                        const sectionModules = modules.filter(m => m.section_id === section.id);
                                        const sectionDuration = sectionModules.reduce((s, m) => s + (m.duration_minutes || 0), 0);
                                        return (
                                            <AccordionItem key={section.id} value={section.id} className="border-b last:border-none">
                                                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <span className="font-semibold text-sm text-left">{section.title}</span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                                                            {sectionModules.length} lectures · {sectionDuration}m
                                                        </span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-0">
                                                    {sectionModules.map(module => (
                                                        <div key={module.id} className="flex items-center gap-3 px-6 py-3 text-sm border-t">
                                                            <ContentIcon type={module.content_type} />
                                                            <span className="flex-1">{module.title}</span>
                                                            {module.duration_minutes && (
                                                                <span className="text-xs text-muted-foreground">{module.duration_minutes}m</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                            </div>

                            {/* Description */}
                            {(course.long_description || course.description) && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Description</h2>
                                    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                                        {course.long_description ? (
                                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.long_description) }} />
                                        ) : (
                                            <p>{course.description}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Target Audience */}
                            {course.target_audience && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Who This Course Is For</h2>
                                    <p className="text-sm text-muted-foreground">{course.target_audience}</p>
                                </div>
                            )}

                            {/* Tinkercad & Promo Video Links */}
                            {(course.tinkercad_classroom_url || course.tinkercad_project_url || course.promo_video_url) && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Resources</h2>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {course.promo_video_url && (
                                            <a href={course.promo_video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <Video className="w-5 h-5 text-primary" />
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium">Intro Video</span>
                                                    <p className="text-xs text-muted-foreground truncate">{course.promo_video_url}</p>
                                                </div>
                                            </a>
                                        )}
                                        {course.tinkercad_classroom_url && (
                                            <a href={course.tinkercad_classroom_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <Layers className="w-5 h-5 text-orange-500" />
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium">Tinkercad Classroom</span>
                                                    <p className="text-xs text-muted-foreground truncate">{course.tinkercad_classroom_url}</p>
                                                </div>
                                            </a>
                                        )}
                                        {course.tinkercad_project_url && (
                                            <a href={course.tinkercad_project_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <Layers className="w-5 h-5 text-blue-500" />
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium">Tinkercad Project</span>
                                                    <p className="text-xs text-muted-foreground truncate">{course.tinkercad_project_url}</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Instructor */}
                            <div>
                                <h2 className="text-xl font-bold mb-4">Instructor</h2>
                                <div className="flex items-start gap-4">
                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/20">
                                        {course.instructor_avatar ? (
                                            <img src={course.instructor_avatar} alt={course.instructor || ""} className="w-full h-full object-cover" />
                                        ) : (
                                            <Users className="w-8 h-8 text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-primary">{course.instructor || "SPARK Labs"}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{course.instructor_bio || "Instructor at SPARK Labs"}</p>
                                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                {(course.rating_avg || 0).toFixed(1)} Instructor Rating
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                {(course.enrolled_count || 0).toLocaleString()} Students
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="w-3.5 h-3.5" />
                                                {totalModules} Lectures
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Reviews Section */}
                            <div>
                                <h2 className="text-xl font-bold mb-6">Student Reviews</h2>

                                {/* Rating Overview */}
                                <div className="flex flex-col sm:flex-row gap-8 mb-8">
                                    <div className="text-center">
                                        <div className="text-5xl font-black text-amber-500">{(course.rating_avg || 0).toFixed(1)}</div>
                                        <Stars rating={course.rating_avg || 0} size="lg" />
                                        <p className="text-sm text-muted-foreground mt-1">Course Rating</p>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        {ratingCounts.map(rc => (
                                            <RatingBar key={rc.stars} stars={rc.stars} count={rc.count} total={reviews.length} />
                                        ))}
                                    </div>
                                </div>

                                {/* Leave a Review (enrolled or identified learner) */}
                                {(isEnrolled || isIdentified) && (
                                    <Card className="mb-8">
                                        <CardContent className="p-6 space-y-4">
                                            <h3 className="font-semibold">Leave a Review</h3>
                                            {isIdentified && learner && (
                                                <p className="text-sm text-muted-foreground">Reviewing as <span className="font-medium text-foreground">{learner.name}</span></p>
                                            )}
                                            <StarInput value={reviewRating} onChange={setReviewRating} />
                                            <Textarea
                                                placeholder="Share your experience with this course..."
                                                value={reviewText}
                                                onChange={e => setReviewText(e.target.value)}
                                                rows={3}
                                            />
                                            <Button onClick={handleSubmitReview} disabled={submittingReview || reviewRating === 0}>
                                                {submittingReview ? "Submitting..." : "Submit Review"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Review List */}
                                <div className="space-y-6">
                                    {reviews.map(review => (
                                        <div key={review.id} className="flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Users className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium">{review.reviewer_name || review.user_name || "Student"}</span>
                                                    <Stars rating={review.rating} />
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </span>
                                                </div>
                                                {review.review_text && <p className="text-sm text-foreground/80">{review.review_text}</p>}

                                                {/* Admin Reply */}
                                                {review.admin_reply && (
                                                    <div className="mt-3 p-3 bg-primary/5 border-l-2 border-primary rounded-r-lg">
                                                        <p className="text-xs font-medium text-primary mb-1">Instructor Reply</p>
                                                        <p className="text-sm text-foreground/80">{review.admin_reply}</p>
                                                        {review.admin_reply_at && (
                                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                                {new Date(review.admin_reply_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {reviews.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">No reviews yet. Be the first to review this course!</p>
                                    )}
                                </div>
                            </div>

                            {/* Q&A Section */}
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5" /> Q&A
                                </h2>
                                <Card className="mb-6">
                                    <CardContent className="p-4 space-y-3">
                                        <Input
                                            placeholder="Question title"
                                            value={qaTitle}
                                            onChange={e => setQaTitle(e.target.value)}
                                            className="bg-muted/50"
                                        />
                                        <Textarea
                                            placeholder="Ask the community or instructor..."
                                            value={qaContent}
                                            onChange={e => setQaContent(e.target.value)}
                                            rows={3}
                                            className="bg-muted/50"
                                        />
                                        <Button onClick={handleSubmitQuestion} disabled={submittingQa || !qaTitle.trim() || !qaContent.trim()} size="sm">
                                            <Send className="w-4 h-4 mr-2" /> {submittingQa ? "Posting..." : "Ask question"}
                                        </Button>
                                    </CardContent>
                                </Card>
                                <div className="space-y-4">
                                    {discussions.filter(d => !d.parent_id).map(d => (
                                        <Card key={d.id}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-2">
                                                    {d.is_pinned && <Pin className="w-4 h-4 text-primary flex-shrink-0" />}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-sm">{d.title}</h3>
                                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{d.content}</p>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                            {d.is_instructor_answer && <Badge variant="secondary" className="ml-2 text-[10px]">Instructor</Badge>}
                                                        </p>
                                                        {replyToId !== d.id ? (
                                                            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setReplyToId(d.id)}>Reply</Button>
                                                        ) : (
                                                            <div className="mt-3 flex gap-2">
                                                                <Textarea
                                                                    placeholder="Write a reply..."
                                                                    value={replyContent}
                                                                    onChange={e => setReplyContent(e.target.value)}
                                                                    rows={2}
                                                                    className="text-sm"
                                                                />
                                                                <div className="flex flex-col gap-1">
                                                                    <Button size="sm" onClick={() => handleSubmitReply(d.id)} disabled={submittingReply || !replyContent.trim()}>
                                                                        {submittingReply ? "..." : "Post"}
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => { setReplyToId(null); setReplyContent(""); }}>Cancel</Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(d.replies && d.replies.length > 0) && (
                                                            <div className="mt-4 pl-4 border-l-2 border-muted space-y-3">
                                                                {d.replies.map(r => (
                                                                    <div key={r.id}>
                                                                        <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                                                                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {discussions.filter(d => !d.parent_id).length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-6">No questions yet. Be the first to ask!</p>
                                    )}
                                </div>
                            </div>

                            {/* Related Courses */}
                            {relatedCourses.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Students Also Enrolled In</h2>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {relatedCourses.map(rc => (
                                            <Link key={rc.id} to={`/learning-hub/course/${rc.slug}`}>
                                                <Card className="overflow-hidden hover:shadow-lg transition-all group border-0 shadow-sm h-full">
                                                    <div className="aspect-video bg-muted relative overflow-hidden">
                                                        {rc.thumbnail_url ? (
                                                            <img src={rc.thumbnail_url} alt={rc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                                                <BookOpen className="w-8 h-8 text-primary/30" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <CardContent className="p-4">
                                                        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">{rc.title}</h3>
                                                        <p className="text-xs text-muted-foreground mt-1">{rc.instructor || "SPARK Labs"}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {(rc.rating_avg || 0) > 0 && (
                                                                <span className="text-xs font-bold text-amber-500">{(rc.rating_avg || 0).toFixed(1)}</span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">{(rc.enrolled_count || 0).toLocaleString()} students</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column — Sticky CTA Sidebar */}
                        <div className="lg:w-80 flex-shrink-0">
                            <div className="lg:sticky lg:top-24 space-y-4">
                                {/* Course Thumbnail Card */}
                                <Card className="overflow-hidden shadow-xl">
                                    {course.thumbnail_url && (
                                        <div className="aspect-video relative bg-muted">
                                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-gray-900 ml-1" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <CardContent className="p-6 space-y-4">
                                        {/* Enroll/Continue Button */}
                                        {isEnrolled ? (
                                            <div className="space-y-3">
                                                {progress >= 100 ? (
                                                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20">
                                                        <Award className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                                        <p className="font-bold text-emerald-600 dark:text-emerald-400">Course Completed!</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Congratulations on finishing this course</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-medium">{progress}% complete</span>
                                                        </div>
                                                        <Progress value={progress} className="h-2" />
                                                    </div>
                                                )}
                                                <Button className="w-full font-bold" size="lg" asChild>
                                                    <Link to={`/learning-hub/classroom/${course.id}`}>
                                                        <Play className="w-4 h-4 mr-2" />
                                                        {progress >= 100 ? "Review Course" : progress > 0 ? "Continue Learning" : "Start Course"}
                                                    </Link>
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                className="w-full font-bold text-lg"
                                                size="lg"
                                                onClick={handleEnroll}
                                                disabled={enrolling}
                                            >
                                                {enrolling ? "Enrolling..." : "Enroll Now — Free"}
                                            </Button>
                                        )}

                                        <Separator />

                                        {/* Course Stats */}
                                        <div className="space-y-3 text-sm">
                                            <h4 className="font-semibold">This course includes:</h4>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Layers className="w-4 h-4" />
                                                <span>{sections.length} sections, {totalModules} lectures</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                <span>{totalHours > 0 ? `${totalHours}h ` : ""}{totalMins}m total length</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <BarChart3 className="w-4 h-4" />
                                                <span className="capitalize">{course.level || "All"} level</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Globe className="w-4 h-4" />
                                                <span>{course.language || "English"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Award className="w-4 h-4" />
                                                <span>Certificate of completion</span>
                                            </div>
                                        </div>

                                        {/* Skills */}
                                        {course.skills && course.skills.length > 0 && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-2">Skills you'll gain</h4>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {course.skills.map(skill => (
                                                            <Badge key={skill} variant="secondary" className="text-[10px]">
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Share Course */}
                                        <Separator />
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">Share this course</h4>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 gap-2 text-xs"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${SITE_URL}/learning-hub/course/${slug}`);
                                                        setCopied(true);
                                                        toast.success("Link copied!");
                                                        setTimeout(() => setCopied(false), 2000);
                                                    }}
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copied ? "Copied" : "Copy Link"}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 text-xs"
                                                    onClick={() => {
                                                        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${course.title}" on the Young Innovators Club Learning Hub!`)}&url=${encodeURIComponent(`${SITE_URL}/learning-hub/course/${slug}`)}`;
                                                        window.open(url, "_blank", "width=600,height=400");
                                                    }}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEnrollment } from "@/context/EnrollmentContext";
import { useGamification } from "@/context/GamificationContext";
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
    MessageCircle, Send, Pin
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
        case "document": case "text": return <FileText className="w-4 h-4" />;
        default: return <Play className="w-4 h-4" />;
    }
}

export default function CourseDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { enrollInCourse, checkEnrollment, getCourseProgress } = useEnrollment();
    const { recordActivity, awardAchievement } = useGamification();

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

    useEffect(() => {
        if (!slug) return;
        const fetchCourse = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data, error } = await supabase
                    .from("learning_courses").select("*").eq("slug", slug).single();
                if (error || !data) { navigate("/learning-hub"); return; }
                const courseData = data as Course;
                setCourse(courseData);

                if (user) {
                    recordLearningInteraction(user.id, courseData.id, "view").catch(() => { });
                }

                // Check enrollment
                const enrolled = await checkEnrollment(courseData.id);
                setIsEnrolled(enrolled);

                // Fetch sections, modules, reviews, discussions in parallel
                const [sectionsRes, modulesRes, reviewsRes, discussionsRes] = await Promise.all([
                    supabase.from("learning_sections").select("*").eq("course_id", courseData.id).order("display_order"),
                    supabase.from("learning_modules").select("*").eq("course_id", courseData.id).order("display_order"),
                    supabase.from("learning_reviews").select("*").eq("course_id", courseData.id).order("created_at", { ascending: false }).limit(20),
                    supabase.from("learning_discussions").select("*").eq("course_id", courseData.id).is("parent_id", null).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
                ]);
                setSections(sectionsRes.data || []);
                setModules(modulesRes.data || []);
                setReviews((reviewsRes.data as Review[]) || []);
                setDiscussions((discussionsRes.data as LearningDiscussion[]) || []);

                // Increment view count
                await supabase.from("learning_courses").update({ view_count: (courseData.view_count || 0) + 1 }).eq("id", courseData.id);
            } catch (err) {
                console.error(err);
                navigate("/learning-hub");
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
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
        if (discussions.length > 0 && discussions.some(d => !d.replies)) {
            loadRepliesForDiscussions(discussions);
        }
    }, [course?.id, discussions]);

    const handleEnroll = async () => {
        if (!course) return;
        setEnrolling(true);
        const { data: { user } } = await supabase.auth.getUser();
        await enrollInCourse(course.id);
        setIsEnrolled(true);
        if (user) {
            recordLearningInteraction(user.id, course.id, "enroll").catch(() => { });
            recordActivity().catch(() => { });
            awardAchievement("enrolled").catch(() => { });
            awardAchievement("first_course").catch(() => { });
        }
        setEnrolling(false);
    };

    const handleSubmitReview = async () => {
        if (!course || reviewRating === 0) { toast.error("Please select a rating"); return; }
        setSubmittingReview(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Please sign in to leave a review"); return; }
            const { error } = await supabase.from("learning_reviews").upsert({
                user_id: user.id,
                course_id: course.id,
                rating: reviewRating,
                review_text: reviewText || null,
            }, { onConflict: "user_id,course_id" });
            if (error) throw error;
            if (reviewRating === 5) awardAchievement("first_review_5_star").catch(() => { });
            toast.success("Review submitted!");
            setReviewRating(0);
            setReviewText("");
            const { data } = await supabase.from("learning_reviews").select("*").eq("course_id", course.id).order("created_at", { ascending: false }).limit(20);
            setReviews((data as Review[]) || []);
        } catch (err: any) {
            toast.error(err.message || "Failed to submit review");
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleSubmitQuestion = async () => {
        if (!course || !qaTitle.trim() || !qaContent.trim()) return;
        setSubmittingQa(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Sign in to ask a question"); return; }
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
        } catch (err: any) {
            toast.error(err.message || "Failed to post question");
        } finally {
            setSubmittingQa(false);
        }
    };

    const handleSubmitReply = async (parentId: string) => {
        if (!replyContent.trim()) return;
        setSubmittingReply(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Sign in to reply"); return; }
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
        } catch (err: any) {
            toast.error(err.message || "Failed to post reply");
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
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Body (2-column layout) ─── */}
                <section className="container mx-auto px-4 max-w-6xl py-8">
                    <div className="flex flex-col lg:flex-row gap-8">

                        {/* Left Column — Content */}
                        <div className="flex-1 space-y-10 lg:pr-8">

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
                            {course.description && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Description</h2>
                                    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                                        <p>{course.description}</p>
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

                                {/* Leave a Review (only if enrolled) */}
                                {isEnrolled && (
                                    <Card className="mb-8">
                                        <CardContent className="p-6 space-y-4">
                                            <h3 className="font-semibold">Leave a Review</h3>
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
                                                    <Stars rating={review.rating} />
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </span>
                                                </div>
                                                {review.review_text && <p className="text-sm text-foreground/80">{review.review_text}</p>}
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

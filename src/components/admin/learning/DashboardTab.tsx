import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/learning/FileUpload";
import { Separator } from "@/components/ui/separator";
import {
    Plus, Pencil, Trash2, Eye, EyeOff, QrCode, Download, Search,
    BookOpen, Layers, Wrench, Link2, GraduationCap, Video, Image as ImageIcon,
    ExternalLink, FileText, Star, X, Copy, Users, MessageSquare, BarChart3, CheckCircle, XCircle, Layout,
    LayoutDashboard, School, FolderOpen, UserPlus, FileDown, Pin, TrendingUp
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// react-doctor-disable prefer-dynamic-import
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import QRCode from "qrcode";
import { logError } from "@/lib/errors";
import RichTextEditor from "@/components/admin/learning/RichTextEditor";
import { DashboardStats } from "../dashboard/DashboardStats";
import { CoursePerformanceTable } from "../dashboard/CoursePerformanceTable";
import { DashboardRightSidebar } from "../dashboard/DashboardRightSidebar";
import { DashboardCharts } from "../dashboard/DashboardCharts";
import { QuickNavigation } from "../dashboard/QuickNavigation";

// ─── Types ───
type Course = {
    id: string; title: string; slug: string; description: string | null;
    category: string | null; level: string | null; content_type: string | null;
    content_url: string | null; thumbnail_url: string | null; instructor: string | null;
    instructor_bio?: string | null; instructor_avatar?: string | null;
    duration: string | null; skills: string[] | null; learning_outcomes?: string[] | null;
    prerequisites?: string[] | null; language?: string | null;
    long_description?: string | null; tags?: string[] | null;
    tinkercad_classroom_url?: string | null; tinkercad_project_url?: string | null;
    welcome_message?: string | null; certificate_enabled?: boolean | null;
    promo_video_url?: string | null; target_audience?: string | null;
    is_featured: boolean | null; is_published: boolean | null; display_order: number | null;
    view_count: number | null; created_at: string; updated_at: string;
};
type Module = {
    id: string; course_id: string; title: string; description: string | null;
    content_type: string | null; content_url: string | null;
    duration_minutes: number | null; display_order: number | null;
    is_published: boolean | null; created_at: string; updated_at: string;
};
type Workshop = {
    id: string; title: string; slug: string; description: string | null;
    workshop_date: string | null; workshop_time: string | null; location: string | null;
    max_capacity: number | null; materials: string | null; instructor: string | null;
    category: string | null; is_featured: boolean | null; is_published: boolean | null;
    registration_url: string | null; created_at: string; updated_at: string;
};
type Resource = {
    id: string; title: string; description: string | null; resource_type: string | null;
    url: string | null; icon: string | null; display_order: number | null;
    is_published: boolean | null; created_at: string; updated_at: string;
};

const CATEGORIES = ["Robotics", "Coding", "Electronics", "IoT", "3D Printing", "AI/ML", "Web Dev", "Arduino"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const CONTENT_TYPES = ["video", "tinkercad", "notebookllm", "image", "document", "external"];
const RESOURCE_TYPES = ["tool", "reference", "guide", "media", "download"];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";

type CourseFormState = {
    title: string; description: string; category: string; level: string;
    content_type: string; content_url: string; thumbnail_url: string;
    instructor: string; instructor_bio: string; instructor_avatar: string;
    duration: string; skills: string; learning_outcomes: string; prerequisites: string; language: string;
    long_description: string; tags: string; tinkercad_classroom_url: string; tinkercad_project_url: string;
    welcome_message: string; certificate_enabled: boolean; promo_video_url: string; target_audience: string;
    is_featured: boolean; is_published: boolean;
};

// ─── QR Code Modal ───
function QRModal({ url, title }: { url: string; title: string }) {
    const [qrDataUrl, setQrDataUrl] = useState("");
    useEffect(() => {
        if (!url) return;
        QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#000", light: "#fff" } })
            .then(setQrDataUrl).catch((err) => logError(err, "learning-hub.qr"));
    }, [url]);

    const downloadQR = () => {
        const a = document.createElement("a");
        a.href = qrDataUrl; a.download = `qr-${slugify(title)}.png`; a.click();
    };
    const copyLink = () => { navigator.clipboard.writeText(url); };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>QR Code: {title}</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
                {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="rounded-xl border" />}
                <p className="text-xs text-muted-foreground text-center break-all max-w-sm">{url}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyLink}><Copy className="size-4 mr-1" />Copy Link</Button>
                    <Button size="sm" onClick={downloadQR}><Download className="size-4 mr-1" />Download PNG</Button>
                </div>
            </div>
        </DialogContent>
    );
}

// ─── Content Type Icon ───
function ContentIcon({ type }: { type: string | null }) {
    switch (type) {
        case "video": return <Video className="size-4" />;
        case "tinkercad": return <Wrench className="size-4" />;
        case "notebookllm": return <BookOpen className="size-4" />;
        case "image": return <ImageIcon className="size-4" />;
        case "document": return <FileText className="size-4" />;
        default: return <ExternalLink className="size-4" />;
    }
}

// ═══════════════════════════════════════════
// DASHBOARD TAB — Full Analytics Dashboard
// ═══════════════════════════════════════════
export default function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
    const [stats, setStats] = useState({ courses: 0, published: 0, enrollments: 0, learnerEnrollments: 0, reviews: 0, workshops: 0, avgRating: 0, totalViews: 0, totalLearners: 0 });
    const [topCourses, setTopCourses] = useState<{ id: string; title: string; slug: string; category: string | null; level: string | null; enrolled_count: number | null; view_count: number | null; rating_avg: number | null; rating_count: number | null; is_published: boolean | null }[]>([]);
    const [recentLearners, setRecentLearners] = useState<{ id: string; name: string; email: string; grade: string; created_at: string }[]>([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; count: number }[]>([]);
    const [enrollmentTrends, setEnrollmentTrends] = useState<{ date: string; count: number }[]>([]);
    const [completionRates, setCompletionRates] = useState<{ title: string; rate: number; total: number }[]>([]);

    useEffect(() => {
        const fetchDashboard = async () => {
            const [c, cp, e, r, w, ratingRes, viewsRes, learnersRes] = await Promise.all([
                supabase.from("learning_courses").select("*", { count: "exact", head: true }),
                supabase.from("learning_courses").select("*", { count: "exact", head: true }).eq("is_published", true),
                supabase.from("learning_enrollments").select("*", { count: "exact", head: true }),
                supabase.from("learning_reviews").select("*", { count: "exact", head: true }),
                supabase.from("learning_workshops").select("*", { count: "exact", head: true }),
                supabase.from("learning_courses").select("rating_avg").eq("is_published", true),
                supabase.from("learning_courses").select("view_count"),
                supabase.from("student_accounts").select("*", { count: "exact", head: true }),
            ]);
            const ratings = (ratingRes.data || []).reduce<number[]>((acc, x: { rating_avg: number | null }) => {
                const val = x.rating_avg || 0;
                if (val > 0) acc.push(val);
                return acc;
            }, []);
            const avgRating = ratings.length > 0 ? ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length : 0;
            const totalViews = (viewsRes.data || []).reduce((s: number, x: { view_count: number | null }) => s + (x.view_count || 0), 0);
            setStats({
                courses: c.count ?? 0,
                published: cp.count ?? 0,
                enrollments: e.count ?? 0,
                learnerEnrollments: 0,
                reviews: r.count ?? 0,
                workshops: w.count ?? 0,
                avgRating,
                totalViews,
                totalLearners: learnersRes.count ?? 0,
            });
            // Top courses by enrollment
            const { data: courses } = await supabase.from("learning_courses")
                .select("id, title, slug, category, level, enrolled_count, view_count, rating_avg, rating_count, is_published")
                .order("enrolled_count", { ascending: false }).limit(10);
            setTopCourses(courses || []);

            // Category breakdown
            if (courses && courses.length > 0) {
                const cats: Record<string, number> = {};
                courses.forEach((c: { category: string | null }) => { const cat = c.category || "Other"; cats[cat] = (cats[cat] || 0) + 1; });
                setCategoryBreakdown(Object.entries(cats).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));
            }

            // Recent learners
            const { data: learners } = await supabase.from("student_accounts")
                .select("auth_user_id, email, created_at, profiles(full_name)")
                .order("created_at", { ascending: false }).limit(8);
            // @ts-ignore - profiles is an array of objects in PostgREST but Supabase JS types it strangely sometimes
            setRecentLearners(learners?.map(l => ({
                id: l.auth_user_id,
                name: (l.profiles as any)?.full_name || "Unknown",
                email: l.email,
                grade: "Student",
                created_at: l.created_at
            })) || []);
        };
        // react-doctor-disable no-initialize-state
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDashboard();

        // Fetch enrollment trends (last 12 weeks)
        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);
        const twelveWeeksAgoStr = twelveWeeksAgo.toISOString();

        const enrollmentTrendsPromise = supabase.from("learning_enrollments").select("enrolled_at")
            .gte("enrolled_at", twelveWeeksAgoStr)
            .order("enrolled_at", { ascending: true })
            .limit(5000);
        
        enrollmentTrendsPromise.then(({ data, error }) => {
            if (error) return;
            if (!data || data.length === 0) return;
            const weekMap: Record<string, number> = {};
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i * 7);
                const key = d.toISOString().slice(0, 10);
                weekMap[key] = 0;
            }
            data.forEach((e: { enrolled_at: string }) => {
                const d = new Date(e.enrolled_at);
                const keys = Object.keys(weekMap);
                for (let i = keys.length - 1; i >= 0; i--) {
                    if (d >= new Date(keys[i])) {
                        weekMap[keys[i]] = (weekMap[keys[i]] || 0) + 1;
                        break;
                    }
                }
            });
            setEnrollmentTrends(Object.entries(weekMap).map(([date, count]) => ({
                date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                count,
            })));
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString();

        const completionRatesPromise = Promise.all([
            supabase.from("learning_courses").select("id, title").eq("is_published", true).limit(10),
            supabase.from("learning_enrollments").select("course_id, progress")
                .gte("enrolled_at", sixMonthsAgoStr)
                .limit(5000),
        ]);
        
        completionRatesPromise.then(([coursesRes, enrollRes]) => {
            const courses = coursesRes.data || [];
            const enrollments = enrollRes.data || [];
            const rates = courses.reduce<{ title: string; rate: number; total: number }[]>((acc, c) => {
                const courseEnrollments = enrollments.filter((e: { course_id: string; progress: number | null }) => e.course_id === c.id);
                const completed = courseEnrollments.filter((e: { course_id: string; progress: number | null }) => (e.progress || 0) >= 100).length;
                const rate = courseEnrollments.length > 0 ? Math.round((completed / courseEnrollments.length) * 100) : 0;
                const total = courseEnrollments.length;
                if (total > 0) acc.push({ title: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title, rate, total });
                return acc;
            }, []);
            setCompletionRates(rates);
        });
    }, []);

    return (
        <div className="space-y-6">
            <DashboardStats stats={stats} onNavigate={onNavigate} />
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
                <CoursePerformanceTable topCourses={topCourses} onNavigate={onNavigate} />
                <DashboardRightSidebar categoryBreakdown={categoryBreakdown} recentLearners={recentLearners} />
            </div>
            <DashboardCharts enrollmentTrends={enrollmentTrends} completionRates={completionRates} />
            <QuickNavigation onNavigate={onNavigate} />
        </div>
    );
}

// ═══════════════════════════════════════════
// CLASSROOM TAB (Classroom Manager)
// ═══════════════════════════════════════════

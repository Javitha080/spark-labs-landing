import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Separator } from "@/components/ui/separator";
import {
    Plus, Pencil, Trash2, Eye, EyeOff, QrCode, Download, Search,
    BookOpen, Layers, Wrench, Link2, GraduationCap, Video, Image as ImageIcon,
    ExternalLink, FileText, Star, X, Copy, Users, MessageSquare, BarChart3, CheckCircle, XCircle, Layout,
    LayoutDashboard, School, FolderOpen, UserPlus, FileDown, Pin, TrendingUp
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import QRCode from "qrcode";

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
            .then(setQrDataUrl).catch(console.error);
    }, [url]);

    const downloadQR = () => {
        const a = document.createElement("a");
        a.href = qrDataUrl; a.download = `qr-${slugify(title)}.png`; a.click();
    };
    const copyLink = () => { navigator.clipboard.writeText(url); };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>QR Code — {title}</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
                {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="rounded-xl border" />}
                <p className="text-xs text-muted-foreground text-center break-all max-w-sm">{url}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyLink}><Copy className="w-4 h-4 mr-1" />Copy Link</Button>
                    <Button size="sm" onClick={downloadQR}><Download className="w-4 h-4 mr-1" />Download PNG</Button>
                </div>
            </div>
        </DialogContent>
    );
}

// ─── Content Type Icon ───
function ContentIcon({ type }: { type: string | null }) {
    switch (type) {
        case "video": return <Video className="w-4 h-4" />;
        case "tinkercad": return <Wrench className="w-4 h-4" />;
        case "notebookllm": return <BookOpen className="w-4 h-4" />;
        case "image": return <ImageIcon className="w-4 h-4" />;
        case "document": return <FileText className="w-4 h-4" />;
        default: return <ExternalLink className="w-4 h-4" />;
    }
}

// ═══════════════════════════════════════════
// DASHBOARD TAB — Full Analytics Dashboard
// ═══════════════════════════════════════════
function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
    const [stats, setStats] = useState({ courses: 0, published: 0, enrollments: 0, learnerEnrollments: 0, reviews: 0, workshops: 0, avgRating: 0, totalViews: 0, totalLearners: 0 });
    const [topCourses, setTopCourses] = useState<Record<string, unknown>[]>([]);
    const [recentLearners, setRecentLearners] = useState<Record<string, unknown>[]>([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; count: number }[]>([]);
    const [enrollmentTrends, setEnrollmentTrends] = useState<{ date: string; count: number }[]>([]);
    const [completionRates, setCompletionRates] = useState<{ title: string; rate: number; total: number }[]>([]);

    useEffect(() => {
        const fetchDashboard = async () => {
            const [c, cp, e, le, r, w, ratingRes, viewsRes, learnersRes] = await Promise.all([
                supabase.from("learning_courses").select("*", { count: "exact", head: true }),
                supabase.from("learning_courses").select("*", { count: "exact", head: true }).eq("is_published", true),
                supabase.from("learning_enrollments").select("*", { count: "exact", head: true }),
                supabase.from("learner_course_enrollments").select("*", { count: "exact", head: true }),
                supabase.from("learning_reviews").select("*", { count: "exact", head: true }),
                supabase.from("learning_workshops").select("*", { count: "exact", head: true }),
                supabase.from("learning_courses").select("rating_avg").eq("is_published", true),
                supabase.from("learning_courses").select("view_count"),
                supabase.from("learner_tokens").select("*", { count: "exact", head: true }),
            ]);
            const ratings = (ratingRes.data || []).map((x: { rating_avg: number | null }) => x.rating_avg || 0).filter((v: number) => v > 0);
            const avgRating = ratings.length > 0 ? ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length : 0;
            const totalViews = (viewsRes.data || []).reduce((s: number, x: { view_count: number | null }) => s + (x.view_count || 0), 0);
            setStats({
                courses: c.count ?? 0,
                published: cp.count ?? 0,
                enrollments: (e.count ?? 0) + (le.count ?? 0),
                learnerEnrollments: le.count ?? 0,
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
            const { data: learners } = await supabase.from("learner_tokens")
                .select("id, name, email, grade, created_at")
                .order("created_at", { ascending: false }).limit(8);
            setRecentLearners(learners || []);
        };
        fetchDashboard();

        // Fetch enrollment trends (last 12 weeks)
        supabase.from("learning_enrollments").select("enrolled_at").order("enrolled_at", { ascending: true }).then(({ data }) => {
            if (!data || data.length === 0) return;
            const weekMap: Record<string, number> = {};
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i * 7);
                const key = d.toISOString().slice(0, 10);
                weekMap[key] = 0;
            }
            data.forEach((e: any) => {
                const d = new Date(e.enrolled_at);
                // Find closest week bucket
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

        // Fetch completion rates per course
        Promise.all([
            supabase.from("learning_courses").select("id, title").eq("is_published", true).limit(10),
            supabase.from("learning_enrollments").select("course_id, progress"),
        ]).then(([coursesRes, enrollRes]) => {
            const courses = coursesRes.data || [];
            const enrollments = enrollRes.data || [];
            const rates = courses.map(c => {
                const courseEnrollments = enrollments.filter((e: any) => e.course_id === c.id);
                const completed = courseEnrollments.filter((e: any) => (e.progress || 0) >= 100).length;
                const rate = courseEnrollments.length > 0 ? Math.round((completed / courseEnrollments.length) * 100) : 0;
                return { title: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title, rate, total: courseEnrollments.length };
            }).filter(r => r.total > 0);
            setCompletionRates(rates);
        });
    }, []);

    const quickLinks = [
        { tab: "courses", label: "Courses", icon: BookOpen },
        { tab: "course-manager", label: "Course Manager", icon: FolderOpen },
        { tab: "classroom", label: "Classroom", icon: School },
        { tab: "curriculum", label: "Curriculum", icon: Layers },
        { tab: "enrollments", label: "Enrollments", icon: Users },
        { tab: "workshops", label: "Workshops", icon: GraduationCap },
        { tab: "resources", label: "Resources", icon: Link2 },
        { tab: "reviews", label: "Reviews", icon: MessageSquare },
        { tab: "content", label: "Landing Content", icon: Layout },
    ];

    return (
        <div className="space-y-6">
            {/* ─── Stat Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card onClick={() => onNavigate("courses")} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                            <div><div className="text-2xl font-bold">{stats.courses}</div><p className="text-xs text-muted-foreground">Courses ({stats.published} live)</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card onClick={() => onNavigate("enrollments")} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-blue-500" /></div>
                            <div><div className="text-2xl font-bold">{stats.enrollments}</div><p className="text-xs text-muted-foreground">Enrollments</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card onClick={() => onNavigate("classroom")} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-emerald-500" /></div>
                            <div><div className="text-2xl font-bold">{stats.totalLearners}</div><p className="text-xs text-muted-foreground">Learners</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card onClick={() => onNavigate("reviews")} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Star className="w-5 h-5 text-amber-500" /></div>
                            <div><div className="text-2xl font-bold">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}</div><p className="text-xs text-muted-foreground">{stats.reviews} reviews</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-default">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Eye className="w-5 h-5 text-purple-500" /></div>
                            <div><div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div><p className="text-xs text-muted-foreground">Total Views</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
                {/* ─── Course Performance Table ─── */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Course Performance</CardTitle>
                        <CardDescription>Top courses by enrollment</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead className="text-center w-20">Students</TableHead>
                                    <TableHead className="text-center w-20">Views</TableHead>
                                    <TableHead className="text-center w-20">Rating</TableHead>
                                    <TableHead className="text-center w-16">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topCourses.map(c => (
                                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onNavigate("course-manager")}>
                                        <TableCell>
                                            <div className="font-medium text-sm line-clamp-1">{c.title}</div>
                                            <div className="text-xs text-muted-foreground">{c.category} · {c.level}</div>
                                        </TableCell>
                                        <TableCell className="text-center text-sm font-medium">{c.enrolled_count || 0}</TableCell>
                                        <TableCell className="text-center text-sm">{(c.view_count || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center">
                                            {(c.rating_avg || 0) > 0 ? (
                                                <span className="text-sm font-medium text-amber-500">{(c.rating_avg || 0).toFixed(1)}</span>
                                            ) : <span className="text-xs text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {c.is_published ? <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Live</Badge> : <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {topCourses.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No courses yet</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* ─── Right Sidebar ─── */}
                <div className="space-y-6">
                    {/* Category Breakdown */}
                    {categoryBreakdown.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Categories</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {categoryBreakdown.map(c => (
                                    <div key={c.category} className="flex items-center justify-between">
                                        <span className="text-sm">{c.category}</span>
                                        <Badge variant="secondary" className="text-xs">{c.count}</Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Learners */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Recent Learners</CardTitle>
                            <CardDescription>Newest registrations</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {recentLearners.map(l => (
                                <div key={l.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {(l.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{l.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{l.grade} · {new Date(l.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            {recentLearners.length === 0 && <p className="text-sm text-muted-foreground">No learners yet</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Enrollment Trends</CardTitle>
                        <CardDescription>Weekly enrollments over the last 12 weeks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {enrollmentTrends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={enrollmentTrends}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} name="Enrollments" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-muted-foreground">No enrollment data yet</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Course Completion Rates</CardTitle>
                        <CardDescription>Percentage of enrolled learners who completed each course</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {completionRates.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={completionRates} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" />
                                    <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} formatter={(value: number) => `${value}%`} />
                                    <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Completion %" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-muted-foreground">No completion data yet</div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Quick Navigation</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {quickLinks.map(({ tab, label, icon: Icon }) => (
                            <Button key={tab} variant="outline" size="sm" onClick={() => onNavigate(tab)} className="gap-2">
                                <Icon className="w-4 h-4" /> {label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ═══════════════════════════════════════════
// CLASSROOM TAB (Classroom Manager)
// ═══════════════════════════════════════════
function ClassroomTab() {
    const { toast } = useToast();
    const [courses, setCourses] = useState<{ id: string; title: string; slug: string; enrolled_count: number | null }[]>([]);
    const [enrollmentsByCourse, setEnrollmentsByCourse] = useState<Record<string, EnrollmentRow[]>>({});
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);
    const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
    const [enrollCourseId, setEnrollCourseId] = useState("");
    const [enrollUserId, setEnrollUserId] = useState("");
    const [unenrollTarget, setUnenrollTarget] = useState<{ id: string; courseId: string } | null>(null);
    const [resetTarget, setResetTarget] = useState<{ userId: string; courseId: string } | null>(null);

    const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; courseId: string; userId?: string } | null>(null);

    const fetchCourses = useCallback(async () => {
        const [coursesRes, profilesRes] = await Promise.all([
            supabase.from("learning_courses").select("id, title, slug, enrolled_count").eq("is_published", true).order("title"),
            supabase.from("profiles").select("id, full_name").order("full_name"),
        ]);
        setCourses(coursesRes.data || []);
        setProfiles((profilesRes.data || []) as { id: string; full_name: string | null }[]);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const loadEnrollmentsForCourse = useCallback(async (courseId: string) => {
        // Fetch both auth-based and token-based enrollments
        const [authRes, learnerRes] = await Promise.all([
            supabase.from("learning_enrollments").select("id, user_id, course_id, enrolled_at, progress, profiles(full_name), learning_courses(title, slug)").eq("course_id", courseId).order("enrolled_at", { ascending: false }),
            supabase.from("learner_course_enrollments").select("id, learner_token_id, course_id, enrolled_at, progress, learner_tokens(name, email, grade)").eq("course_id", courseId).order("enrolled_at", { ascending: false }),
        ]);
        // Merge: normalize token-based enrollments to match EnrollmentRow shape
        const authEnrollments = (authRes.data || []) as EnrollmentRow[];
        const learnerEnrollments = (learnerRes.data || []).map((le: { id: string; learner_token_id: string; course_id: string; enrolled_at: string; progress: number | null; learner_tokens: { name: string | null; email: string | null; grade: string | null } | null }) => ({
            id: le.id,
            user_id: `learner:${le.learner_token_id}`,
            course_id: le.course_id,
            enrolled_at: le.enrolled_at,
            progress: le.progress || 0,
            profiles: { full_name: le.learner_tokens?.name || "Learner" },
            learning_courses: null,
            _learner_email: le.learner_tokens?.email,
            _learner_grade: le.learner_tokens?.grade,
            _is_token_based: true,
        })) as EnrollmentRow[];
        setEnrollmentsByCourse(prev => ({ ...prev, [courseId]: [...authEnrollments, ...learnerEnrollments] }));
    }, []);

    const toggleExpand = (courseId: string) => {
        if (expandedCourse === courseId) setExpandedCourse(null);
        else {
            setExpandedCourse(courseId);
            loadEnrollmentsForCourse(courseId);
        }
    };

    const handleQuickEnroll = async () => {
        if (!enrollUserId || !enrollCourseId) return;
        const { error } = await supabase.from("learning_enrollments").insert({ user_id: enrollUserId, course_id: enrollCourseId });
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Learner enrolled successfully" });
        setEnrollDialogOpen(false);
        setEnrollUserId("");
        loadEnrollmentsForCourse(enrollCourseId);
        fetchCourses();
    };

    const executeConfirmAction = async () => {
        if (!confirmAction) return;
        if (confirmAction.type === "unenroll") {
            const { error } = await supabase.from("learning_enrollments").delete().eq("id", confirmAction.id);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } else {
                toast({ title: "Learner removed" });
                loadEnrollmentsForCourse(confirmAction.courseId);
                fetchCourses();
            }
        } else if (confirmAction.type === "reset" && confirmAction.userId) {
            const { error } = await supabase.from("learning_progress").delete().eq("user_id", confirmAction.userId).eq("course_id", confirmAction.courseId);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } else {
                await supabase.from("learning_enrollments").update({ progress: 0 }).eq("user_id", confirmAction.userId).eq("course_id", confirmAction.courseId);
                toast({ title: "Progress reset" });
                loadEnrollmentsForCourse(confirmAction.courseId);
            }
        }
        setConfirmAction(null);
    };

    if (loading) return <p className="text-muted-foreground py-8">Loading classrooms...</p>;

    return (
        <div className="space-y-4">
            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmAction?.type === "unenroll" ? "Remove Learner" : "Reset Progress"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.type === "unenroll"
                                ? "This will remove the learner from this classroom. They will lose access to the course."
                                : "This will reset all progress for this learner in this course. This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeConfirmAction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {confirmAction?.type === "unenroll" ? "Remove" : "Reset"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Each course has a classroom. View learners, enroll/remove users, and reset progress.</p>
                <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
                    <Button size="sm" onClick={() => setEnrollDialogOpen(true)}><UserPlus className="w-4 h-4 mr-1" /> Quick Enroll</Button>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Quick Enroll Learner</DialogTitle><DialogDescription>Add a user to a course classroom.</DialogDescription></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div><Label>Course</Label>
                                <Select value={enrollCourseId} onValueChange={setEnrollCourseId}>
                                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label>User</Label>
                                <Select value={enrollUserId} onValueChange={setEnrollUserId}>
                                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleQuickEnroll} disabled={!enrollUserId || !enrollCourseId}>Enroll</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="grid gap-4">
                {courses.map((c) => (
                    <Card key={c.id}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="font-semibold">{c.title}</div>
                                    <Badge variant="secondary">{c.enrolled_count ?? 0} enrolled</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={`${SITE_URL}/learning-hub/classroom/${c.id}`} target="_blank" rel="noopener noreferrer">
                                            <Video className="w-4 h-4 mr-1" /> Open classroom
                                        </a>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => { setEnrollCourseId(c.id); setEnrollDialogOpen(true); }}>
                                        <UserPlus className="w-4 h-4 mr-1" /> Enroll
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => toggleExpand(c.id)}>
                                        {expandedCourse === c.id ? "Hide learners" : "View learners"}
                                    </Button>
                                </div>
                            </div>
                            {expandedCourse === c.id && (
                                <div className="mt-4 border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Learner</TableHead>
                                                <TableHead>Progress</TableHead>
                                                <TableHead>Enrolled</TableHead>
                                                <TableHead className="w-24">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(enrollmentsByCourse[c.id] || []).map((e) => (
                                                <TableRow key={e.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{e.profiles?.full_name || "—"}</div>
                                                        {e._is_token_based && (
                                                            <div className="text-[10px] text-muted-foreground">{e._learner_email}{e._learner_grade ? ` · ${e._learner_grade}` : ""}</div>
                                                        )}
                                                        {e._is_token_based && <Badge variant="outline" className="text-[9px] mt-0.5">Token</Badge>}
                                                    </TableCell>
                                                    <TableCell>{e.progress ?? 0}%</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmAction({ type: "reset", id: e.id, courseId: c.id, userId: e.user_id })} title="Reset progress">
                                                                <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmAction({ type: "unenroll", id: e.id, courseId: c.id })} title="Remove learner">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!enrollmentsByCourse[c.id] || enrollmentsByCourse[c.id].length === 0) && (
                                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No enrollments</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            {courses.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No published courses yet. Add courses and publish them.</CardContent></Card>}


        </div>
    );
}

// ═══════════════════════════════════════════
// COURSES TAB
// ═══════════════════════════════════════════
function CoursesTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [qrUrl, setQrUrl] = useState("");
    const [qrTitle, setQrTitle] = useState("");
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
    const [editing, setEditing] = useState<Course | null>(null);
    const [form, setForm] = useState<CourseFormState>({
        title: "", description: "", category: "", level: "beginner",
        content_type: "video", content_url: "", thumbnail_url: "",
        instructor: "", instructor_bio: "", instructor_avatar: "",
        duration: "", skills: "", learning_outcomes: "", prerequisites: "", language: "English",
        long_description: "", tags: "", tinkercad_classroom_url: "", tinkercad_project_url: "",
        welcome_message: "", certificate_enabled: true, promo_video_url: "", target_audience: "",
        is_featured: false, is_published: false
    });

    const fetchCourses = useCallback(async () => {
        const { data, error } = await supabase.from("learning_courses").select("*").order("display_order");
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setCourses(data || []); setLoading(false);
    }, [toast]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const resetForm = () => {
        setForm({ title: "", description: "", category: "", level: "beginner", content_type: "video", content_url: "", thumbnail_url: "", instructor: "", instructor_bio: "", instructor_avatar: "", duration: "", skills: "", learning_outcomes: "", prerequisites: "", language: "English", long_description: "", tags: "", tinkercad_classroom_url: "", tinkercad_project_url: "", welcome_message: "", certificate_enabled: true, promo_video_url: "", target_audience: "", is_featured: false, is_published: false });
        setEditing(null);
    };

    const openEdit = (c: Course) => {
        setEditing(c);
        setForm({
            title: c.title, description: c.description || "", category: c.category || "",
            level: c.level || "beginner", content_type: c.content_type || "video",
            content_url: c.content_url || "", thumbnail_url: c.thumbnail_url || "",
            instructor: c.instructor || "", instructor_bio: c.instructor_bio || "", instructor_avatar: c.instructor_avatar || "",
            duration: c.duration || "", skills: (c.skills || []).join(", "),
            learning_outcomes: (c.learning_outcomes || []).join("\n"), prerequisites: (c.prerequisites || []).join("\n"),
            language: c.language || "English",
            long_description: c.long_description || "", tags: (c.tags || []).join(", "),
            tinkercad_classroom_url: c.tinkercad_classroom_url || "", tinkercad_project_url: c.tinkercad_project_url || "",
            welcome_message: c.welcome_message || "", certificate_enabled: c.certificate_enabled ?? true,
            promo_video_url: c.promo_video_url || "", target_audience: c.target_audience || "",
            is_featured: c.is_featured || false, is_published: c.is_published || false,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
        const slug = slugify(form.title);
        const skills = form.skills.split(",").map(s => s.trim()).filter(Boolean);
        const learning_outcomes = form.learning_outcomes.split(/\n|,/).map(s => s.trim()).filter(Boolean);
        const prerequisites = form.prerequisites.split(/\n|,/).map(s => s.trim()).filter(Boolean);
        const tags = form.tags.split(",").map(s => s.trim()).filter(Boolean);
        const payload = {
            title: form.title, description: form.description, category: form.category || null,
            level: form.level, content_type: form.content_type, content_url: form.content_url || null,
            thumbnail_url: form.thumbnail_url || null, instructor: form.instructor || null,
            instructor_bio: form.instructor_bio || null, instructor_avatar: form.instructor_avatar || null,
            duration: form.duration || null, skills, learning_outcomes, prerequisites, language: form.language || "English",
            long_description: form.long_description || null, tags: tags.length > 0 ? tags : null,
            tinkercad_classroom_url: form.tinkercad_classroom_url || null, tinkercad_project_url: form.tinkercad_project_url || null,
            welcome_message: form.welcome_message || null, certificate_enabled: form.certificate_enabled,
            promo_video_url: form.promo_video_url || null, target_audience: form.target_audience || null,
            is_featured: form.is_featured, is_published: form.is_published,
            slug, display_order: editing ? undefined : courses.length
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (editing) delete (payload as any).display_order;

        if (editing) {
            const { error } = await supabase.from("learning_courses").update(payload).eq("id", editing.id);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Course updated" });
        } else {
            const { error } = await supabase.from("learning_courses").insert(payload);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast({ title: "Course created! Now add content.", description: "Go to Course Manager → Curriculum to add sections & modules.", action: onNavigate ? { label: "Add Content →", onClick: () => onNavigate("course-manager") } : undefined } as any);
        }
        resetForm(); setDialogOpen(false); fetchCourses();
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("learning_courses").delete().eq("id", id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Course deleted" }); fetchCourses();
    };

    const togglePublish = async (c: Course) => {
        await supabase.from("learning_courses").update({ is_published: !c.is_published }).eq("id", c.id);
        fetchCourses();
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map(c => c.id)));
    };

    const bulkPublish = async (publish: boolean) => {
        if (selected.size === 0) return;
        const ids = [...selected];
        for (const id of ids) {
            await supabase.from("learning_courses").update({ is_published: publish }).eq("id", id);
        }
        toast({ title: `${ids.length} course(s) ${publish ? "published" : "unpublished"}` });
        setSelected(new Set());
        fetchCourses();
    };

    const duplicateCourse = async (c: Course) => {
        const newSlug = `${c.slug}-copy-${Date.now().toString(36)}`;
        const { data: newCourse, error } = await supabase.from("learning_courses").insert({
            title: `${c.title} (Copy)`, slug: newSlug, description: c.description,
            category: c.category, level: c.level, content_type: c.content_type,
            content_url: c.content_url, thumbnail_url: c.thumbnail_url,
            instructor: c.instructor, instructor_bio: c.instructor_bio,
            instructor_avatar: c.instructor_avatar, duration: c.duration,
            skills: c.skills, learning_outcomes: c.learning_outcomes,
            prerequisites: c.prerequisites, language: c.language,
            long_description: c.long_description, tags: c.tags,
            tinkercad_classroom_url: c.tinkercad_classroom_url, tinkercad_project_url: c.tinkercad_project_url,
            welcome_message: c.welcome_message, certificate_enabled: c.certificate_enabled,
            promo_video_url: c.promo_video_url, target_audience: c.target_audience,
            is_featured: false, is_published: false,
            display_order: courses.length,
        }).select().single();
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        // Duplicate modules
        if (newCourse) {
            const { data: modules } = await supabase.from("learning_modules").select("*").eq("course_id", c.id).order("display_order");
            if (modules && modules.length > 0) {
                for (const m of modules) {
                    await supabase.from("learning_modules").insert({
                        course_id: newCourse.id, title: m.title, description: m.description,
                        content_type: m.content_type, content_url: m.content_url,
                        duration_minutes: m.duration_minutes, display_order: m.display_order,
                        is_published: m.is_published,
                    });
                }
            }
        }
        toast({ title: "Course duplicated", description: `"${c.title}" copied as draft` });
        fetchCourses();
    };

    const showQR = (c: Course) => {
        setQrUrl(`${SITE_URL}/learning-hub/course/${c.slug}`);
        setQrTitle(c.title); setQrDialogOpen(true);
    };

    const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {selected.size > 0 && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => bulkPublish(true)}><Eye className="w-4 h-4 mr-1" />Publish ({selected.size})</Button>
                            <Button variant="outline" size="sm" onClick={() => bulkPublish(false)}><EyeOff className="w-4 h-4 mr-1" />Unpublish ({selected.size})</Button>
                        </>
                    )}
                </div>
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                    <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Course</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editing ? "Edit Course" : "New Course"}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                                <div><Label>Instructor</Label><Input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} /></div>
                            </div>
                            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><Label>Category</Label>
                                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Level</Label>
                                    <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Content Type</Label>
                                    <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{CONTENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Content URL</Label><Input value={form.content_url} onChange={e => setForm(f => ({ ...f, content_url: e.target.value }))} placeholder="YouTube / TinkerCAD / NotebookLM URL" /></div>
                                <div><Label>Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Instructor avatar URL</Label><Input value={form.instructor_avatar} onChange={e => setForm(f => ({ ...f, instructor_avatar: e.target.value }))} placeholder="https://..." /></div>
                                <div><Label>Language</Label><Input value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} placeholder="English" /></div>
                            </div>
                            <div><Label>Instructor bio</Label><Textarea value={form.instructor_bio} onChange={e => setForm(f => ({ ...f, instructor_bio: e.target.value }))} rows={2} placeholder="Short bio for course page" /></div>
                            <div><Label>Learning outcomes (one per line)</Label><Textarea value={form.learning_outcomes} onChange={e => setForm(f => ({ ...f, learning_outcomes: e.target.value }))} rows={3} placeholder="What students will learn&#10;Line 1&#10;Line 2" /></div>
                            <div><Label>Prerequisites (one per line)</Label><Textarea value={form.prerequisites} onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))} rows={2} placeholder="Basic programming, etc." /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 12 weeks" /></div>
                                <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="Arduino, C++, Circuits" /></div>
                            </div>

                            {/* ─── Extended Course Fields ─── */}
                            <Separator />
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Extended Course Details</h4>

                            <div><Label>Long Description (rich HTML content for course page)</Label><Textarea value={form.long_description} onChange={e => setForm(f => ({ ...f, long_description: e.target.value }))} rows={5} placeholder="Full detailed description with HTML formatting..." /></div>
                            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Arduino, IoT, Sensors, Tinkercad" /></div>
                            <div><Label>Target Audience</Label><Textarea value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} rows={2} placeholder="Who should take this course? e.g. Students in grades 6-12 interested in electronics" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Tinkercad Classroom URL</Label><Input value={form.tinkercad_classroom_url} onChange={e => setForm(f => ({ ...f, tinkercad_classroom_url: e.target.value }))} placeholder="https://www.tinkercad.com/classrooms/..." /></div>
                                <div><Label>Tinkercad Project URL</Label><Input value={form.tinkercad_project_url} onChange={e => setForm(f => ({ ...f, tinkercad_project_url: e.target.value }))} placeholder="https://www.tinkercad.com/things/..." /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Promo / Intro Video URL</Label><Input value={form.promo_video_url} onChange={e => setForm(f => ({ ...f, promo_video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
                                <div><Label>Welcome Message</Label><Input value={form.welcome_message} onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))} placeholder="Shown after enrollment" /></div>
                            </div>

                            <div className="flex gap-6">
                                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} /><Label>Featured</Label></div>
                                <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} /><Label>Published</Label></div>
                                <div className="flex items-center gap-2"><Switch checked={form.certificate_enabled} onCheckedChange={v => setForm(f => ({ ...f, certificate_enabled: v }))} /><Label>Certificate Enabled</Label></div>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* QR Dialog */}
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <QRModal url={qrUrl} title={qrTitle} />
            </Dialog>

            {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No courses yet</p></CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded" />
                        <span>Select all ({filtered.length})</span>
                    </div>
                    {filtered.map(c => (
                        <Card key={c.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center gap-4">
                                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded flex-shrink-0" />
                                {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="w-16 h-16 rounded-lg object-cover" /> : <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center"><ContentIcon type={c.content_type} /></div>}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold truncate">{c.title}</h3>
                                        {c.is_featured && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
                                        <Badge variant={c.is_published ? "default" : "outline"}>{c.is_published ? "Published" : "Draft"}</Badge>
                                    </div>
                                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                        {c.category && <span>{c.category}</span>}
                                        {c.level && <span className="capitalize">• {c.level}</span>}
                                        {c.content_type && <span>• {c.content_type}</span>}
                                        {c.instructor && <span>• {c.instructor}</span>}
                                        <span>• {c.view_count || 0} views</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => togglePublish(c)} title={c.is_published ? "Unpublish" : "Publish"}>{c.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                                    <Button variant="ghost" size="icon" onClick={() => duplicateCourse(c)} title="Duplicate"><Copy className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => showQR(c)} title="QR Code"><QrCode className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setCourseToDelete(c.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the course and all its sections, modules, and content. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (courseToDelete) { handleDelete(courseToDelete); setCourseToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════
// MODULES TAB
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// CURRICULUM TAB (Formerly Modules)
// ═══════════════════════════════════════════
import CourseBuilder from "@/components/admin/learning/CourseBuilder";

function CurriculumTab() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");

    useEffect(() => {
        supabase.from("learning_courses").select("*").order("title").then(({ data }) => {
            setCourses(data || []);
        });
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Label>Select Course to Edit:</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-72"><SelectValue placeholder="Select a course" /></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
            </div>

            <Separator />

            {!selectedCourse ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><Layers className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Select a course to manage its curriculum</p></CardContent></Card>
            ) : (
                <CourseBuilder courseId={selectedCourse} />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// COURSE MANAGER TAB (full course: details, curriculum, enrollments, reviews)
// ═══════════════════════════════════════════
function CourseManagerTab() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [course, setCourse] = useState<Course | null>(null);
    const [subTab, setSubTab] = useState<"details" | "curriculum" | "enrollments" | "reviews">("details");
    const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
    const [courseReviews, setCourseReviews] = useState<Record<string, unknown>[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        supabase.from("learning_courses").select("*").order("title").then(({ data }) => setCourses(data || []));
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!selectedCourseId) {
            setCourse(null);
            setEnrollments([]);
            setCourseReviews([]);
            return;
        }
        supabase.from("learning_courses").select("*").eq("id", selectedCourseId).single().then(({ data }) => setCourse(data || null));
        supabase.from("learning_enrollments").select("id, user_id, course_id, enrolled_at, progress, profiles(full_name), learning_courses(title, slug)").eq("course_id", selectedCourseId).order("enrolled_at", { ascending: false }).then(({ data }) => setEnrollments((data as EnrollmentRow[]) || []));
        supabase.from("learning_reviews").select("*").eq("course_id", selectedCourseId).order("created_at", { ascending: false }).then(({ data }) => setCourseReviews(data || []));
    }, [selectedCourseId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (courses.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground">No courses. Create one in the Courses tab.</CardContent></Card>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
                <Label>Course:</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="w-[320px]"><SelectValue placeholder="Select a course" /></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
                {course && (
                    <Button variant="outline" size="sm" asChild>
                        <a href={`${SITE_URL}/learning-hub/course/${course.slug}`} target="_blank" rel="noopener noreferrer">View course page</a>
                    </Button>
                )}
            </div>

            {!selectedCourseId ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Select a course to manage.</CardContent></Card>
            ) : (
                <>
                    <Tabs value={subTab} onValueChange={(v) => setSubTab(v as "details" | "curriculum" | "enrollments" | "reviews")}>
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                            <TabsTrigger value="enrollments">Enrollments ({enrollments.length})</TabsTrigger>
                            <TabsTrigger value="reviews">Reviews ({courseReviews.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="space-y-4 mt-4">
                            {course && (
                                <Card>
                                    <CardHeader><CardTitle>Course details</CardTitle><CardDescription>View and edit on the Courses tab for full form.</CardDescription></CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p><span className="font-medium">Title:</span> {course.title}</p>
                                        <p><span className="font-medium">Instructor:</span> {course.instructor || "—"}</p>
                                        <p><span className="font-medium">Category / Level:</span> {course.category || "—"} / {course.level || "—"}</p>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        <p><span className="font-medium">Enrolled:</span> {(course as any).enrolled_count ?? 0} · <span className="font-medium">Rating:</span> {(course as any).rating_avg ?? 0} ({(course as any).rating_count ?? 0})</p>
                                        <Button variant="outline" size="sm" className="mt-2" asChild><a href={`${SITE_URL}/learning-hub/classroom/${course.id}`} target="_blank" rel="noopener noreferrer">Open classroom</a></Button>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                        <TabsContent value="curriculum" className="mt-4"><CourseBuilder courseId={selectedCourseId} /></TabsContent>
                        <TabsContent value="enrollments" className="mt-4">
                            <Table>
                                <TableHeader><TableRow><TableHead>Learner</TableHead><TableHead>Progress</TableHead><TableHead>Enrolled</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {enrollments.map((e) => (
                                        <TableRow key={e.id}>
                                            <TableCell>{e.profiles?.full_name || "—"}</TableCell>
                                            <TableCell>{e.progress ?? 0}%</TableCell>
                                            <TableCell>{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    {enrollments.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No enrollments</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="reviews" className="mt-4 space-y-3">
                            {courseReviews.map((r) => (
                                <Card key={r.id}>
                                    <CardContent className="p-4 flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-4 h-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}
                                                <Badge variant={r.is_approved ? "default" : "secondary"}>{r.is_approved ? "Approved" : "Hidden"}</Badge>
                                            </div>
                                            {r.review_text && <p className="text-sm">{r.review_text}</p>}
                                            <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {courseReviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No reviews for this course.</p>}
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// WORKSHOPS TAB
// ═══════════════════════════════════════════
function WorkshopsTab() {
    const { toast } = useToast();
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [qrUrl, setQrUrl] = useState("");
    const [qrTitle, setQrTitle] = useState("");
    const [editing, setEditing] = useState<Workshop | null>(null);
    const [form, setForm] = useState({
        title: "", description: "", workshop_date: "", workshop_time: "", location: "",
        max_capacity: 30, materials: "", instructor: "", category: "", registration_url: "",
        is_featured: false, is_published: false
    });

    const fetch = useCallback(async () => {
        const { data } = await supabase.from("learning_workshops").select("*").order("workshop_date", { ascending: false });
        setWorkshops(data || []); setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetch(); }, [fetch]);

    const resetForm = () => {
        setForm({ title: "", description: "", workshop_date: "", workshop_time: "", location: "", max_capacity: 30, materials: "", instructor: "", category: "", registration_url: "", is_featured: false, is_published: false });
        setEditing(null);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
        const slug = slugify(form.title);
        const payload = { ...form, slug };
        if (editing) {
            const { error } = await supabase.from("learning_workshops").update(payload).eq("id", editing.id);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Workshop updated" });
        } else {
            const { error } = await supabase.from("learning_workshops").insert(payload);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Workshop created" });
        }
        resetForm(); setDialogOpen(false); fetch();
    };

    const handleDelete = async (id: string) => {
        await supabase.from("learning_workshops").delete().eq("id", id);
        toast({ title: "Workshop deleted" }); fetch();
    };

    const showQR = (w: Workshop) => {
        setQrUrl(`${SITE_URL}/learning-hub/workshop/${w.id}`);
        setQrTitle(w.title); setQrDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                    <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Workshop</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editing ? "Edit Workshop" : "New Workshop"}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                                <div><Label>Instructor</Label><Input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} /></div>
                            </div>
                            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><Label>Date</Label><Input type="date" value={form.workshop_date} onChange={e => setForm(f => ({ ...f, workshop_date: e.target.value }))} /></div>
                                <div><Label>Time</Label><Input value={form.workshop_time} onChange={e => setForm(f => ({ ...f, workshop_time: e.target.value }))} placeholder="2:00 PM" /></div>
                                <div><Label>Max Capacity</Label><Input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: parseInt(e.target.value) || 0 }))} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                                <div><Label>Category</Label>
                                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div><Label>Materials Needed</Label><Textarea value={form.materials} onChange={e => setForm(f => ({ ...f, materials: e.target.value }))} rows={2} /></div>
                            <div><Label>Registration URL</Label><Input value={form.registration_url} onChange={e => setForm(f => ({ ...f, registration_url: e.target.value }))} /></div>
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} /><Label>Featured</Label></div>
                                <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} /><Label>Published</Label></div>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}><QRModal url={qrUrl} title={qrTitle} /></Dialog>

            {loading ? <p className="text-muted-foreground">Loading...</p> : workshops.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No workshops yet</p></CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    {workshops.map(w => (
                        <Card key={w.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold">{w.title}</h3>
                                        <Badge variant={w.is_published ? "default" : "outline"}>{w.is_published ? "Published" : "Draft"}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {w.workshop_date || "No date"} • {w.location || "TBD"} • {w.max_capacity} seats • {w.instructor || "N/A"}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => showQR(w)}><QrCode className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => { setEditing(w); setForm({ title: w.title, description: w.description || "", workshop_date: w.workshop_date || "", workshop_time: w.workshop_time || "", location: w.location || "", max_capacity: w.max_capacity || 30, materials: w.materials || "", instructor: w.instructor || "", category: w.category || "", registration_url: w.registration_url || "", is_featured: w.is_featured || false, is_published: w.is_published || false }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// RESOURCES TAB
// ═══════════════════════════════════════════
function ResourcesTab() {
    const { toast } = useToast();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Resource | null>(null);
    const [form, setForm] = useState({ title: "", description: "", resource_type: "tool", url: "", icon: "link" });

    const fetch = useCallback(async () => {
        const { data } = await supabase.from("learning_resources").select("*").order("display_order");
        setResources(data || []); setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetch(); }, [fetch]);

    const resetForm = () => { setForm({ title: "", description: "", resource_type: "tool", url: "", icon: "link" }); setEditing(null); };

    const handleSave = async () => {
        if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
        const payload = { ...form, display_order: resources.length, is_published: true };
        if (editing) {
            const { error } = await supabase.from("learning_resources").update(payload).eq("id", editing.id);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Resource updated" });
        } else {
            const { error } = await supabase.from("learning_resources").insert(payload);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Resource added" });
        }
        resetForm(); setDialogOpen(false); fetch();
    };

    const handleDelete = async (id: string) => {
        await supabase.from("learning_resources").delete().eq("id", id);
        toast({ title: "Resource deleted" }); fetch();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                    <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Resource</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editing ? "Edit Resource" : "New Resource"}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Type</Label>
                                    <Select value={form.resource_type} onValueChange={v => setForm(f => ({ ...f, resource_type: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{RESOURCE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Icon Name</Label><Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="lucide icon name" /></div>
                            </div>
                            <div><Label>URL</Label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            {loading ? <p className="text-muted-foreground">Loading...</p> : resources.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No resources yet</p></CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    {resources.map(r => (
                        <Card key={r.id}><CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Link2 className="w-5 h-5 text-primary" /></div>
                            <div className="flex-1">
                                <p className="font-medium">{r.title}</p>
                                <p className="text-xs text-muted-foreground">{r.resource_type} {r.url && `• ${r.url.slice(0, 40)}...`}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setForm({ title: r.title, description: r.description || "", resource_type: r.resource_type || "tool", url: r.url || "", icon: r.icon || "link" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </CardContent></Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Enrollment row with joined profile & course ───
type EnrollmentRow = {
    id: string;
    user_id: string;
    course_id: string;
    enrolled_at: string;
    progress: number | null;
    profiles: { full_name: string | null } | null;
    learning_courses: { title: string; slug: string } | null;
    _learner_email?: string;
    _learner_grade?: string;
    _is_token_based?: boolean;
};

// ═══════════════════════════════════════════
// ENROLLMENTS & MY LEARNING TAB (full manager)
// ═══════════════════════════════════════════
function EnrollmentsTab() {
    const { toast } = useToast();
    const [stats, setStats] = useState({ totalEnrollments: 0, totalReviews: 0, courses: [] as { id: string; title: string; enrolled_count: number | null; view_count: number | null; rating_avg: number | null; rating_count: number | null }[] });
    const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [addUserId, setAddUserId] = useState("");
    const [addCourseId, setAddCourseId] = useState("");
    const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);
    const [coursesForSelect, setCoursesForSelect] = useState<{ id: string; title: string }[]>([]);
    const [enrollmentToRemove, setEnrollmentToRemove] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        const [enrollRes, reviewRes, courseRes, enrollListRes, profilesRes] = await Promise.all([
            supabase.from("learning_enrollments").select("*", { count: "exact", head: true }),
            supabase.from("learning_reviews").select("*", { count: "exact", head: true }),
            supabase.from("learning_courses").select("id, title, enrolled_count, rating_avg, rating_count, view_count").order("enrolled_count", { ascending: false }).limit(10),
            supabase.from("learning_enrollments").select("id, user_id, course_id, enrolled_at, progress, profiles(full_name), learning_courses(title, slug)").order("enrolled_at", { ascending: false }).limit(500),
            supabase.from("profiles").select("id, full_name").order("full_name"),
        ]);
        setStats({ totalEnrollments: enrollRes.count || 0, totalReviews: reviewRes.count || 0, courses: courseRes.data || [] });
        setEnrollments((enrollListRes.data as EnrollmentRow[]) || []);
        setProfiles((profilesRes.data || []) as { id: string; full_name: string | null }[]);
        supabase.from("learning_courses").select("id, title").order("title").then(({ data }) =>
            setCoursesForSelect((data || []).map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })))
        );
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredEnrollments = search.trim()
        ? enrollments.filter(e => {
            const name = (e.profiles?.full_name || "").toLowerCase();
            const courseTitle = (e.learning_courses?.title || "").toLowerCase();
            const q = search.toLowerCase();
            return name.includes(q) || courseTitle.includes(q);
        })
        : enrollments;

    const handleAddEnrollment = async () => {
        if (!addUserId || !addCourseId) { toast({ title: "Select user and course", variant: "destructive" }); return; }
        const { error } = await supabase.from("learning_enrollments").insert({ user_id: addUserId, course_id: addCourseId });
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Enrollment added" });
        setAddOpen(false);
        setAddUserId("");
        setAddCourseId("");
        fetchAll();
    };

    const handleRemoveEnrollment = async (id: string) => {
        const { error } = await supabase.from("learning_enrollments").delete().eq("id", id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Enrollment removed" });
        fetchAll();
    };

    const exportCSV = () => {
        const headers = "User,Course,Progress %,Enrolled At\n";
        const rows = filteredEnrollments.map(e =>
            `"${(e.profiles?.full_name || "").replace(/"/g, '""')}","${(e.learning_courses?.title || "").replace(/"/g, '""')}",${e.progress ?? 0},"${new Date(e.enrolled_at).toISOString()}"`
        ).join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `enrollments-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast({ title: "CSV downloaded" });
    };

    if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-black">{stats.totalEnrollments}</div>
                    <p className="text-xs text-muted-foreground">Total Enrollments</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                    <div className="text-2xl font-black">{stats.totalReviews}</div>
                    <p className="text-xs text-muted-foreground">Total Reviews</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <BookOpen className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                    <div className="text-2xl font-black">{stats.courses.length}</div>
                    <p className="text-xs text-muted-foreground">Active Courses</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <BarChart3 className="w-6 h-6 mx-auto text-indigo-500 mb-2" />
                    <div className="text-2xl font-black">{stats.courses.reduce((s: number, c: { view_count: number | null }) => s + (c.view_count || 0), 0)}</div>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                </CardContent></Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Enrollments & My Learning</CardTitle>
                        <CardDescription>Manage all course enrollments. Add or remove access.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search by name or course..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                        </div>
                        <Button variant="outline" size="sm" onClick={exportCSV}><FileDown className="w-4 h-4 mr-1" /> Export CSV</Button>
                        <Dialog open={addOpen} onOpenChange={setAddOpen}>
                            <DialogTrigger asChild><Button size="sm"><UserPlus className="w-4 h-4 mr-1" /> Add enrollment</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add enrollment</DialogTitle><DialogDescription>Enroll a user in a course.</DialogDescription></DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div><Label>User</Label>
                                        <Select value={addUserId} onValueChange={setAddUserId}>
                                            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                                            <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Course</Label>
                                        <Select value={addCourseId} onValueChange={setAddCourseId}>
                                            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                                            <SelectContent>{coursesForSelect.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddEnrollment} disabled={!addUserId || !addCourseId}>Add</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px] rounded-md border">
                        <Table>
                            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Course</TableHead><TableHead>Progress</TableHead><TableHead>Enrolled</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredEnrollments.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-medium">{e.profiles?.full_name || "—"}</TableCell>
                                        <TableCell>{e.learning_courses?.title || "—"}</TableCell>
                                        <TableCell>{e.progress ?? 0}%</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{new Date(e.enrolled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setEnrollmentToRemove(e.id)} title="Remove enrollment"><Trash2 className="w-4 h-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredEnrollments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No enrollments</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Top Courses by Enrollment</CardTitle></CardHeader>
                <CardContent>
                    <div className="divide-y">
                        {stats.courses.map((c, i: number) => (
                            <div key={c.id} className="flex items-center gap-4 py-3">
                                <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                                <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{c.title}</p></div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.enrolled_count || 0}</span>
                                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {(c.rating_avg || 0).toFixed(1)} ({c.rating_count || 0})</span>
                                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {c.view_count || 0}</span>
                                </div>
                            </div>
                        ))}
                        {stats.courses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No courses yet</p>}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!enrollmentToRemove} onOpenChange={(open) => !open && setEnrollmentToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Enrollment?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove this enrollment. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (enrollmentToRemove) { handleRemoveEnrollment(enrollmentToRemove); setEnrollmentToRemove(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════
// REVIEWS MODERATION TAB
// ═══════════════════════════════════════════
function ReviewsTab() {
    const { toast } = useToast();
    type AdminReview = { id: string; user_id: string; course_id: string; rating: number; review_text: string | null; is_approved: boolean; admin_reply?: string | null; admin_reply_at?: string | null; created_at: string; };
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [courseNames, setCourseNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "hidden">("all");
    const [filterCourse, setFilterCourse] = useState("all");
    const [replyDialogOpen, setReplyDialogOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<AdminReview | null>(null);
    const [replyText, setReplyText] = useState("");
    const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

    const fetchReviews = useCallback(async () => {
        const { data, error } = await supabase.from("learning_reviews").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setReviews((data as AdminReview[]) || []);

        const courseIds = [...new Set((data || []).map((r: { course_id: string }) => r.course_id))];
        if (courseIds.length > 0) {
            const { data: coursesData } = await supabase.from("learning_courses").select("id, title").in("id", courseIds);
            const names: Record<string, string> = {};
            (coursesData || []).forEach((c: { id: string; title: string }) => { names[c.id] = c.title; });
            setCourseNames(names);
        }
        setLoading(false);
    }, [toast]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchReviews(); }, [fetchReviews]);

    const toggleApproval = async (id: string, current: boolean) => {
        await supabase.from("learning_reviews").update({ is_approved: !current }).eq("id", id);
        toast({ title: current ? "Review hidden" : "Review approved" });
        fetchReviews();
    };

    const deleteReview = async (id: string) => {
        await supabase.from("learning_reviews").delete().eq("id", id);
        toast({ title: "Review deleted" }); fetchReviews();
    };

    const openReplyDialog = (review: AdminReview) => {
        setReplyingTo(review);
        setReplyText(review.admin_reply || "");
        setReplyDialogOpen(true);
    };

    const submitReply = async () => {
        if (!replyingTo) return;
        const { error } = await supabase.from("learning_reviews").update({
            admin_reply: replyText.trim() || null,
            admin_reply_at: replyText.trim() ? new Date().toISOString() : null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).eq("id", replyingTo.id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: replyText.trim() ? "Reply saved" : "Reply removed" });
        setReplyDialogOpen(false);
        setReplyingTo(null);
        setReplyText("");
        fetchReviews();
    };

    const filtered = reviews.filter(r => {
        if (filterStatus === "approved" && !r.is_approved) return false;
        if (filterStatus === "hidden" && r.is_approved) return false;
        if (filterCourse !== "all" && r.course_id !== filterCourse) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            const courseName = (courseNames[r.course_id] || "").toLowerCase();
            const text = (r.review_text || "").toLowerCase();
            return courseName.includes(q) || text.includes(q);
        }
        return true;
    });

    const approvedCount = reviews.filter(r => r.is_approved).length;
    const hiddenCount = reviews.filter(r => !r.is_approved).length;
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const uniqueCourses = Object.entries(courseNames);

    if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading reviews...</p>;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto text-primary mb-1" />
                    <div className="text-2xl font-bold">{reviews.length}</div>
                    <p className="text-xs text-muted-foreground">Total Reviews</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <CheckCircle className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                    <div className="text-2xl font-bold">{approvedCount}</div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <XCircle className="w-6 h-6 mx-auto text-destructive mb-1" />
                    <div className="text-2xl font-bold">{hiddenCount}</div>
                    <p className="text-xs text-muted-foreground">Hidden</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <Star className="w-6 h-6 mx-auto text-amber-400 mb-1" />
                    <div className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterStatus} onValueChange={v => setFilterStatus(v as "all" | "approved" | "hidden")}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {uniqueCourses.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Review List */}
            {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No reviews match your filters</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => (
                        <Card key={r.id} className={r.is_approved ? "" : "opacity-60 border-destructive/30"}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                                                ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{courseNames[r.course_id] || "Unknown Course"}</span>
                                            <Badge variant={r.is_approved ? "default" : "destructive"} className="text-[10px] ml-auto">
                                                {r.is_approved ? "Approved" : "Hidden"}
                                            </Badge>
                                        </div>
                                        {r.review_text && <p className="text-sm text-foreground/80 mt-1">{r.review_text}</p>}
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </p>

                                        {/* Admin Reply */}
                                        {r.admin_reply && (
                                            <div className="mt-3 p-3 bg-primary/5 border-l-2 border-primary rounded-r-lg">
                                                <p className="text-xs font-medium text-primary mb-1">Admin Reply</p>
                                                <p className="text-sm">{r.admin_reply}</p>
                                                {r.admin_reply_at && <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.admin_reply_at).toLocaleDateString()}</p>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => openReplyDialog(r)} title="Reply">
                                            <MessageSquare className="w-4 h-4 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => toggleApproval(r.id, r.is_approved)} title={r.is_approved ? "Hide" : "Approve"}>
                                            {r.is_approved ? <XCircle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setReviewToDelete(r.id)} className="text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reply Dialog */}
            <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reply to Review</DialogTitle></DialogHeader>
                    {replyingTo && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <div className="flex mb-1">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= replyingTo.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}</div>
                                {replyingTo.review_text && <p className="text-sm">{replyingTo.review_text}</p>}
                            </div>
                            <div>
                                <Label>Admin Reply</Label>
                                <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} placeholder="Write your reply to this review..." />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitReply}>{replyText.trim() ? "Save Reply" : "Remove Reply"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!reviewToDelete} onOpenChange={(open) => !open && setReviewToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this review. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (reviewToDelete) { deleteReview(reviewToDelete); setReviewToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════
// DISCUSSIONS / Q&A ADMIN TAB
// ═══════════════════════════════════════════
function DiscussionsTab() {
    const { toast } = useToast();
    type Discussion = { id: string; course_id: string; module_id: string | null; user_id: string; title: string; content: string; is_pinned: boolean; is_instructor_answer: boolean; parent_id: string | null; created_at: string; };
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [courseNames, setCourseNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [filterCourse, setFilterCourse] = useState("all");
    const [search, setSearch] = useState("");
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyParent, setReplyParent] = useState<Discussion | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [replies, setReplies] = useState<Record<string, Discussion[]>>({});
    const [discussionToDelete, setDiscussionToDelete] = useState<string | null>(null);

    const fetchDiscussions = useCallback(async () => {
        const { data, error } = await supabase.from("learning_discussions").select("*").is("parent_id", null).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(100);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setDiscussions(data || []);

        const courseIds = [...new Set((data || []).map((d: { course_id: string }) => d.course_id))];
        if (courseIds.length > 0) {
            const { data: courses } = await supabase.from("learning_courses").select("id, title").in("id", courseIds);
            const names: Record<string, string> = {};
            (courses || []).forEach((c: { id: string; title: string }) => { names[c.id] = c.title; });
            setCourseNames(names);
        }

        // Fetch replies for all discussions
        if (data && data.length > 0) {
            const parentIds = data.map((d: { id: string }) => d.id);
            const { data: repliesData } = await supabase.from("learning_discussions").select("*").in("parent_id", parentIds).order("created_at", { ascending: true });
            const grouped: Record<string, Discussion[]> = {};
            (repliesData || []).forEach((r) => {
                const parentId = r.parent_id as string;
                if (!grouped[parentId]) grouped[parentId] = [];
                grouped[parentId].push(r as unknown as Discussion);
            });
            setReplies(grouped);
        }
        setLoading(false);
    }, [toast]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchDiscussions(); }, [fetchDiscussions]);

    const togglePin = async (d: Discussion) => {
        await supabase.from("learning_discussions").update({ is_pinned: !d.is_pinned }).eq("id", d.id);
        toast({ title: d.is_pinned ? "Unpinned" : "Pinned" });
        fetchDiscussions();
    };

    const toggleInstructorAnswer = async (d: Discussion) => {
        await supabase.from("learning_discussions").update({ is_instructor_answer: !d.is_instructor_answer }).eq("id", d.id);
        toast({ title: d.is_instructor_answer ? "Unmarked as instructor answer" : "Marked as instructor answer" });
        fetchDiscussions();
    };

    const deleteDiscussion = async (id: string) => {
        await supabase.from("learning_discussions").delete().eq("id", id);
        toast({ title: "Discussion deleted" });
        fetchDiscussions();
    };

    const openReply = (d: Discussion) => {
        setReplyParent(d);
        setReplyContent("");
        setReplyOpen(true);
    };

    const submitReply = async () => {
        if (!replyParent || !replyContent.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast({ title: "Not authenticated", variant: "destructive" }); return; }
        const { error } = await supabase.from("learning_discussions").insert({
            course_id: replyParent.course_id,
            user_id: user.id,
            parent_id: replyParent.id,
            title: "Instructor Reply",
            content: replyContent.trim(),
            is_instructor_answer: true,
        });
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Reply posted" });
        setReplyOpen(false);
        setReplyParent(null);
        setReplyContent("");
        fetchDiscussions();
    };

    const filtered = discussions.filter(d => {
        if (filterCourse !== "all" && d.course_id !== filterCourse) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q) || (courseNames[d.course_id] || "").toLowerCase().includes(q);
        }
        return true;
    });

    const uniqueCourses = Object.entries(courseNames);

    if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading discussions...</p>;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="p-4 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto text-primary mb-1" />
                    <div className="text-2xl font-bold">{discussions.length}</div>
                    <p className="text-xs text-muted-foreground">Total Questions</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <Pin className="w-6 h-6 mx-auto text-amber-500 mb-1" />
                    <div className="text-2xl font-bold">{discussions.filter(d => d.is_pinned).length}</div>
                    <p className="text-xs text-muted-foreground">Pinned</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <CheckCircle className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                    <div className="text-2xl font-bold">{Object.values(replies).flat().filter(r => r.is_instructor_answer).length}</div>
                    <p className="text-xs text-muted-foreground">Instructor Answers</p>
                </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {uniqueCourses.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Discussions List */}
            {filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No discussions found</p></CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(d => (
                        <Card key={d.id} className={d.is_pinned ? "border-amber-500/30" : ""}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {d.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                                            <h3 className="font-semibold text-sm">{d.title}</h3>
                                            <Badge variant="outline" className="text-[10px]">{courseNames[d.course_id] || "Unknown"}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{d.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            {" · "}{(replies[d.id] || []).length} replies
                                        </p>

                                        {/* Replies preview */}
                                        {(replies[d.id] || []).length > 0 && (
                                            <div className="mt-3 pl-4 border-l-2 border-muted space-y-2">
                                                {(replies[d.id] || []).map(r => (
                                                    <div key={r.id} className="text-sm">
                                                        <div className="flex items-center gap-1">
                                                            {r.is_instructor_answer && <Badge variant="secondary" className="text-[9px]">Instructor</Badge>}
                                                        </div>
                                                        <p className="text-muted-foreground line-clamp-1">{r.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openReply(d)} title="Reply as instructor">
                                            <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(d)} title={d.is_pinned ? "Unpin" : "Pin"}>
                                            <Pin className={`w-3.5 h-3.5 ${d.is_pinned ? "text-amber-500" : "text-muted-foreground"}`} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleInstructorAnswer(d)} title={d.is_instructor_answer ? "Unmark instructor answer" : "Mark as instructor answer"}>
                                            <CheckCircle className={`w-3.5 h-3.5 ${d.is_instructor_answer ? "text-emerald-500" : "text-muted-foreground"}`} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDiscussionToDelete(d.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reply Dialog */}
            <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reply as Instructor</DialogTitle></DialogHeader>
                    {replyParent && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <h4 className="font-semibold text-sm">{replyParent.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{replyParent.content}</p>
                            </div>
                            <div>
                                <Label>Your Reply</Label>
                                <Textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={4} placeholder="Write your instructor reply..." />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancel</Button>
                        <Button onClick={submitReply} disabled={!replyContent.trim()}>Post Reply</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!discussionToDelete} onOpenChange={(open) => !open && setDiscussionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Discussion?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this discussion and all its replies. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (discussionToDelete) { deleteDiscussion(discussionToDelete); setDiscussionToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// CONTENT TAB
// ═══════════════════════════════════════════
type LHContentBlock = {
    id: string;
    page_name: string;
    section_name: string;
    block_key: string;
    content_value: string | null;
    image_url: string | null;
    usage_description: string | null;
};

function ContentTab() {
    const [blocks, setBlocks] = useState<LHContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBlock, setEditingBlock] = useState<LHContentBlock | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [blockToDelete, setBlockToDelete] = useState<LHContentBlock | null>(null);
    const [newBlock, setNewBlock] = useState({ section_name: "", block_key: "", content_value: "", usage_description: "" });
    const { toast } = useToast();

    const fetchBlocks = useCallback(async () => {
        const { data, error } = await supabase.from("content_blocks").select("*").eq("page_name", "learning_hub").order("section_name");
        if (error) console.error(error);
        else setBlocks((data as LHContentBlock[]) || []);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBlock) return;

        const { error } = await supabase.from("content_blocks").update({
            content_value: editingBlock.content_value,
            usage_description: editingBlock.usage_description
        }).eq("id", editingBlock.id);

        if (error) {
            toast({ title: "Error", description: "Failed to update content", variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Content updated successfully" });
            setEditingBlock(null);
            fetchBlocks();
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBlock.section_name.trim() || !newBlock.block_key.trim()) {
            toast({ title: "Error", description: "Section name and block key are required.", variant: "destructive" });
            return;
        }

        const { error } = await supabase.from("content_blocks").insert({
            page_name: "learning_hub",
            section_name: newBlock.section_name.trim(),
            block_key: newBlock.block_key.trim(),
            content_value: newBlock.content_value || null,
            usage_description: newBlock.usage_description || null,
        });

        if (error) {
            toast({ title: "Error", description: "Failed to create block. " + error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Content block created" });
            setShowCreateDialog(false);
            setNewBlock({ section_name: "", block_key: "", content_value: "", usage_description: "" });
            fetchBlocks();
        }
    };

    const handleDelete = async () => {
        if (!blockToDelete) return;
        const { error } = await supabase.from("content_blocks").delete().eq("id", blockToDelete.id);
        if (error) {
            toast({ title: "Error", description: "Failed to delete block.", variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Content block deleted" });
            setBlockToDelete(null);
            fetchBlocks();
        }
    };

    // Group by section
    const sections = blocks.reduce((acc, block) => {
        if (!acc[block.section_name]) acc[block.section_name] = [];
        acc[block.section_name].push(block);
        return acc;
    }, {} as Record<string, LHContentBlock[]>);

    if (loading) return <div className="p-8 text-center">Loading content blocks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Learning Hub Content</h2>
                    <p className="text-muted-foreground">Manage text and properties for the learning hub page.</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Block
                </Button>
            </div>

            {Object.keys(sections).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p>No content blocks found. Click "Add Block" to create one.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {Object.entries(sections).map(([section, items]) => (
                        <Card key={section}>
                            <CardHeader>
                                <CardTitle className="capitalize">{section.replace(/_/g, ' ')} Section</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {items.map((block) => (
                                    <div key={block.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="space-y-1 flex-1 mr-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{block.block_key}</span>
                                                <span className="text-sm text-muted-foreground italic">({block.usage_description})</span>
                                            </div>
                                            <p className="font-medium line-clamp-2">{block.content_value}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingBlock(block)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setBlockToDelete(block)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Content</DialogTitle>
                    </DialogHeader>
                    {editingBlock && (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Section / Key</Label>
                                <div className="flex gap-2">
                                    <Badge variant="outline">{editingBlock.section_name}</Badge>
                                    <Badge variant="outline">{editingBlock.block_key}</Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea
                                    value={editingBlock.content_value || ""}
                                    onChange={e => setEditingBlock({ ...editingBlock, content_value: e.target.value })}
                                    className="min-h-[100px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description (Internal)</Label>
                                <Input
                                    value={editingBlock.usage_description || ""}
                                    onChange={e => setEditingBlock({ ...editingBlock, usage_description: e.target.value })}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingBlock(null)}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Content Block</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Section Name</Label>
                            <Input
                                value={newBlock.section_name}
                                onChange={e => setNewBlock({ ...newBlock, section_name: e.target.value })}
                                placeholder="e.g. hero, courses, workshops"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Block Key</Label>
                            <Input
                                value={newBlock.block_key}
                                onChange={e => setNewBlock({ ...newBlock, block_key: e.target.value })}
                                placeholder="e.g. heading, subtitle"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Content Value</Label>
                            <Textarea
                                value={newBlock.content_value}
                                onChange={e => setNewBlock({ ...newBlock, content_value: e.target.value })}
                                placeholder="The text content"
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Internal)</Label>
                            <Input
                                value={newBlock.usage_description}
                                onChange={e => setNewBlock({ ...newBlock, usage_description: e.target.value })}
                                placeholder="What this block is used for"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                            <Button type="submit">Create Block</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!blockToDelete} onOpenChange={(open) => !open && setBlockToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Content Block?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the block "{blockToDelete?.block_key}" from "{blockToDelete?.section_name}". This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
const LearningHubManager = () => {
    const [activeTab, setActiveTab] = useState("dashboard");

    return (
        <div className="min-h-screen bg-background border-l">
            <div className="h-full px-4 py-6 lg:px-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Learning Hub Manager</h2>
                            <p className="text-muted-foreground">Manage courses, classroom, curriculum, enrollments, and content.</p>
                        </div>
                    </div>
                    <Separator />
                    <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
                        <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="w-4 h-4" /> Dashboard</TabsTrigger>
                        <TabsTrigger value="courses">Courses</TabsTrigger>
                        <TabsTrigger value="course-manager" className="gap-1.5"><FolderOpen className="w-4 h-4" /> Course Manager</TabsTrigger>
                        <TabsTrigger value="classroom" className="gap-1.5"><School className="w-4 h-4" /> Classroom</TabsTrigger>
                        <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                        <TabsTrigger value="enrollments" className="gap-1.5"><UserPlus className="w-4 h-4" /> Enrollments</TabsTrigger>
                        <TabsTrigger value="workshops">Workshops</TabsTrigger>
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews</TabsTrigger>
                        <TabsTrigger value="discussions" className="gap-1.5"><MessageSquare className="w-4 h-4" /> Q&A</TabsTrigger>
                        <TabsTrigger value="content" className="gap-2"><Layout className="w-4 h-4" /> Content</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4"><DashboardTab onNavigate={setActiveTab} /></TabsContent>
                    <TabsContent value="courses" className="space-y-4"><CoursesTab onNavigate={setActiveTab} /></TabsContent>
                    <TabsContent value="course-manager" className="space-y-4"><CourseManagerTab /></TabsContent>
                    <TabsContent value="classroom" className="space-y-4"><ClassroomTab /></TabsContent>
                    <TabsContent value="curriculum" className="space-y-4"><CurriculumTab /></TabsContent>
                    <TabsContent value="enrollments" className="space-y-4"><EnrollmentsTab /></TabsContent>
                    <TabsContent value="workshops" className="space-y-4"><WorkshopsTab /></TabsContent>
                    <TabsContent value="resources" className="space-y-4"><ResourcesTab /></TabsContent>
                    <TabsContent value="reviews" className="space-y-4"><ReviewsTab /></TabsContent>
                    <TabsContent value="discussions" className="space-y-4"><DiscussionsTab /></TabsContent>
                    <TabsContent value="content" className="space-y-4"><ContentTab /></TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default LearningHubManager;

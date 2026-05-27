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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import QRCode from "qrcode";
import { logError } from "@/lib/errors";
import RichTextEditor from "@/components/admin/learning/RichTextEditor";
import { EnrollmentRow } from "./shared";

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
            <DialogHeader><DialogTitle>QR Code — {title}</DialogTitle></DialogHeader>
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
export default function EnrollmentsTab() {
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

    if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading&hellip;</p>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center">
                    <Users className="size-6 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-black">{stats.totalEnrollments}</div>
                    <p className="text-xs text-muted-foreground">Total Enrollments</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <MessageSquare className="size-6 mx-auto text-amber-500 mb-2" />
                    <div className="text-2xl font-black">{stats.totalReviews}</div>
                    <p className="text-xs text-muted-foreground">Total Reviews</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <BookOpen className="size-6 mx-auto text-emerald-500 mb-2" />
                    <div className="text-2xl font-black">{stats.courses.length}</div>
                    <p className="text-xs text-muted-foreground">Active Courses</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <BarChart3 className="size-6 mx-auto text-indigo-500 mb-2" />
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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input placeholder="Search by name or course..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                        </div>
                        <Button variant="outline" size="sm" onClick={exportCSV}><FileDown className="size-4 mr-1" /> Export CSV</Button>
                        <Dialog open={addOpen} onOpenChange={setAddOpen}>
                            <DialogTrigger asChild><Button size="sm"><UserPlus className="size-4 mr-1" /> Add enrollment</Button></DialogTrigger>
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
                                            <Button variant="ghost" size="icon" className="text-destructive size-8" onClick={() => setEnrollmentToRemove(e.id)} title="Remove enrollment"><Trash2 className="size-4" /></Button>
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
                                    <span className="flex items-center gap-1"><Users className="size-3" /> {c.enrolled_count || 0}</span>
                                    <span className="flex items-center gap-1"><Star className="size-3 text-amber-500" /> {(c.rating_avg || 0).toFixed(1)} ({c.rating_count || 0})</span>
                                    <span className="flex items-center gap-1"><Eye className="size-3" /> {c.view_count || 0}</span>
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

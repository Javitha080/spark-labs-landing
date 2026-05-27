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
export default function ClassroomTab() {
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
        // Fetch auth-based enrollments
        const { data: authRes } = await supabase
            .from("learning_enrollments")
            .select("id, user_id, course_id, enrolled_at, progress, profiles(full_name), learning_courses(title, slug)")
            .eq("course_id", courseId)
            .order("enrolled_at", { ascending: false });

        const authEnrollments = (authRes || []) as EnrollmentRow[];
        setEnrollmentsByCourse(prev => ({ ...prev, [courseId]: authEnrollments }));
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

    if (loading) return <p className="text-muted-foreground py-8">Loading classrooms&hellip;</p>;

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
                    <Button size="sm" onClick={() => setEnrollDialogOpen(true)}><UserPlus className="size-4 mr-1" /> Quick Enroll</Button>
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
                                            <Video className="size-4 mr-1" /> Open classroom
                                        </a>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => { setEnrollCourseId(c.id); setEnrollDialogOpen(true); }}>
                                        <UserPlus className="size-4 mr-1" /> Enroll
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
                                                    </TableCell>
                                                    <TableCell>{e.progress ?? 0}%</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="size-7" onClick={() => setConfirmAction({ type: "reset", id: e.id, courseId: c.id, userId: e.user_id })} title="Reset progress">
                                                                <BarChart3 className="size-3.5 text-amber-500" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setConfirmAction({ type: "unenroll", id: e.id, courseId: c.id })} title="Remove learner">
                                                                <Trash2 className="size-3.5" />
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

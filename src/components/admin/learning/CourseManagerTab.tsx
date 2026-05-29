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
import { EnrollmentRow } from "./shared";
import CourseBuilder from "./CourseBuilder";

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
export default function CourseManagerTab() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [course, setCourse] = useState<Course | null>(null);
    const [subTab, setSubTab] = useState<"details" | "curriculum" | "enrollments" | "reviews">("details");
    const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
    const [courseReviews, setCourseReviews] = useState<{ id: string; rating: number; review_text: string | null; is_approved: boolean | null; created_at: string; user_id: string | null; learner_token_id: string | null; reviewer_name: string | null }[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        supabase.from("learning_courses").select("*").order("title").then(({ data }) => setCourses(data || []));
    }, []);

    // react-doctor-disable no-chain-state-updates
    // react-doctor-disable no-cascading-set-state
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
                    <SelectTrigger className="w-full sm:w-[320px]"><SelectValue placeholder="Select a course" /></SelectTrigger>
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
                        <TabsContent value="enrollments" className="mt-4 overflow-x-auto">
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
                                                {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`size-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}
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

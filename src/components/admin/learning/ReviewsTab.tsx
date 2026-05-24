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
export default function ReviewsTab() {
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
        const { error } = await supabase.from("learning_reviews").update({ is_approved: !current }).eq("id", id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: current ? "Review hidden" : "Review approved" });
        fetchReviews();
    };

    const deleteReview = async (id: string) => {
        const { error } = await supabase.from("learning_reviews").delete().eq("id", id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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

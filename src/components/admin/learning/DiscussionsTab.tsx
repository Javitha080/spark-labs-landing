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
export default function DiscussionsTab() {
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
        const { error } = await supabase.from("learning_discussions").update({ is_pinned: !d.is_pinned }).eq("id", d.id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: d.is_pinned ? "Unpinned" : "Pinned" });
        fetchDiscussions();
    };

    const toggleInstructorAnswer = async (d: Discussion) => {
        const { error } = await supabase.from("learning_discussions").update({ is_instructor_answer: !d.is_instructor_answer }).eq("id", d.id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: d.is_instructor_answer ? "Unmarked as instructor answer" : "Marked as instructor answer" });
        fetchDiscussions();
    };

    const deleteDiscussion = async (id: string) => {
        const { error } = await supabase.from("learning_discussions").delete().eq("id", id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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

    if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading discussions&hellip;</p>;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardContent className="p-4 text-center">
                    <MessageSquare className="size-6 mx-auto text-primary mb-1" />
                    <div className="text-2xl font-bold">{discussions.length}</div>
                    <p className="text-xs text-muted-foreground">Total Questions</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <Pin className="size-6 mx-auto text-amber-500 mb-1" />
                    <div className="text-2xl font-bold">{discussions.filter(d => d.is_pinned).length}</div>
                    <p className="text-xs text-muted-foreground">Pinned</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <CheckCircle className="size-6 mx-auto text-emerald-500 mb-1" />
                    <div className="text-2xl font-bold">{Object.values(replies).flat().filter(r => r.is_instructor_answer).length}</div>
                    <p className="text-xs text-muted-foreground">Instructor Answers</p>
                </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
                <Card><CardContent className="py-12 text-center text-muted-foreground"><MessageSquare className="size-12 mx-auto mb-3 opacity-50" /><p>No discussions found</p></CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(d => (
                        <Card key={d.id} className={d.is_pinned ? "border-amber-500/30" : ""}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {d.is_pinned && <Pin className="size-3.5 text-amber-500 flex-shrink-0" />}
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
                                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openReply(d)} title="Reply as instructor">
                                            <MessageSquare className="size-3.5 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-7" onClick={() => togglePin(d)} title={d.is_pinned ? "Unpin" : "Pin"}>
                                            <Pin className={`size-3.5 ${d.is_pinned ? "text-amber-500" : "text-muted-foreground"}`} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-7" onClick={() => toggleInstructorAnswer(d)} title={d.is_instructor_answer ? "Unmark instructor answer" : "Mark as instructor answer"}>
                                            <CheckCircle className={`size-3.5 ${d.is_instructor_answer ? "text-emerald-500" : "text-muted-foreground"}`} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDiscussionToDelete(d.id)}>
                                            <Trash2 className="size-3.5" />
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


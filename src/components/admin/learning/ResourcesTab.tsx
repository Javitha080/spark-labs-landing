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
export default function ResourcesTab() {
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
        const { error } = await supabase.from("learning_resources").delete().eq("id", id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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

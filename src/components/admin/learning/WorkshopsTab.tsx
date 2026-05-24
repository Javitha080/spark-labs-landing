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
export default function WorkshopsTab() {
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
        const { error } = await supabase.from("learning_workshops").delete().eq("id", id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

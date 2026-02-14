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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
    Plus, Pencil, Trash2, Eye, EyeOff, QrCode, Download, Search,
    BookOpen, Layers, Wrench, Link2, GraduationCap, Video, Image as ImageIcon,
    ExternalLink, FileText, Star, X, Copy, Users, MessageSquare, BarChart3, CheckCircle, XCircle, Layout
} from "lucide-react";
import QRCode from "qrcode";

// ─── Types ───
type Course = {
    id: string; title: string; slug: string; description: string | null;
    category: string | null; level: string | null; content_type: string | null;
    content_url: string | null; thumbnail_url: string | null; instructor: string | null;
    duration: string | null; skills: string[] | null; is_featured: boolean | null;
    is_published: boolean | null; display_order: number | null; view_count: number | null;
    created_at: string; updated_at: string;
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
// COURSES TAB
// ═══════════════════════════════════════════
function CoursesTab() {
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [qrUrl, setQrUrl] = useState("");
    const [qrTitle, setQrTitle] = useState("");
    const [editing, setEditing] = useState<Course | null>(null);
    const [form, setForm] = useState({
        title: "", description: "", category: "", level: "beginner",
        content_type: "video", content_url: "", thumbnail_url: "",
        instructor: "", duration: "", skills: "", is_featured: false, is_published: false
    });

    const fetchCourses = useCallback(async () => {
        const { data, error } = await supabase.from("learning_courses").select("*").order("display_order");
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setCourses(data || []); setLoading(false);
    }, [toast]);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const resetForm = () => {
        setForm({ title: "", description: "", category: "", level: "beginner", content_type: "video", content_url: "", thumbnail_url: "", instructor: "", duration: "", skills: "", is_featured: false, is_published: false });
        setEditing(null);
    };

    const openEdit = (c: Course) => {
        setEditing(c);
        setForm({
            title: c.title, description: c.description || "", category: c.category || "",
            level: c.level || "beginner", content_type: c.content_type || "video",
            content_url: c.content_url || "", thumbnail_url: c.thumbnail_url || "",
            instructor: c.instructor || "", duration: c.duration || "",
            skills: (c.skills || []).join(", "), is_featured: c.is_featured || false,
            is_published: c.is_published || false,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
        const slug = slugify(form.title);
        const skills = form.skills.split(",").map(s => s.trim()).filter(Boolean);
        const payload = { ...form, slug, skills, display_order: courses.length };

        if (editing) {
            const { error } = await supabase.from("learning_courses").update(payload).eq("id", editing.id);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Course updated" });
        } else {
            const { error } = await supabase.from("learning_courses").insert(payload);
            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Course created" });
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
                                <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 12 weeks" /></div>
                                <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="Arduino, C++, Circuits" /></div>
                            </div>
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

            {/* QR Dialog */}
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <QRModal url={qrUrl} title={qrTitle} />
            </Dialog>

            {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No courses yet</p></CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(c => (
                        <Card key={c.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center gap-4">
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
                                    <Button variant="ghost" size="icon" onClick={() => showQR(c)} title="QR Code"><QrCode className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
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

// ═══════════════════════════════════════════
// STUDENTS ANALYTICS TAB
// ═══════════════════════════════════════════
function StudentsTab() {
    const [stats, setStats] = useState({ totalEnrollments: 0, totalReviews: 0, avgRating: 0, courses: [] as any[] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const [enrollRes, reviewRes, courseRes] = await Promise.all([
                supabase.from("learning_enrollments").select("*", { count: "exact", head: true }),
                supabase.from("learning_reviews").select("*", { count: "exact", head: true }),
                supabase.from("learning_courses").select("id, title, enrolled_count, rating_avg, rating_count, view_count").order("enrolled_count", { ascending: false }).limit(10),
            ]);
            setStats({
                totalEnrollments: enrollRes.count || 0,
                totalReviews: reviewRes.count || 0,
                avgRating: 0,
                courses: courseRes.data || [],
            });
            setLoading(false);
        };
        fetchStats();
    }, []);

    if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading analytics...</p>;

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
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
                    <div className="text-2xl font-black">{stats.courses.reduce((s: number, c: any) => s + (c.view_count || 0), 0)}</div>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                </CardContent></Card>
            </div>

            {/* Top Courses Table */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Top Courses by Enrollment</CardTitle></CardHeader>
                <CardContent>
                    <div className="divide-y">
                        {stats.courses.map((c: any, i: number) => (
                            <div key={c.id} className="flex items-center gap-4 py-3">
                                <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{c.title}</p>
                                </div>
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
        </div>
    );
}

// ═══════════════════════════════════════════
// REVIEWS MODERATION TAB
// ═══════════════════════════════════════════
function ReviewsTab() {
    const { toast } = useToast();
    type AdminReview = { id: string; user_id: string; course_id: string; rating: number; review_text: string | null; is_approved: boolean; created_at: string; };
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [courseNames, setCourseNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        const { data, error } = await supabase.from("learning_reviews").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setReviews(data || []);

        // Get course names
        const courseIds = [...new Set((data || []).map((r: any) => r.course_id))];
        if (courseIds.length > 0) {
            const { data: coursesData } = await supabase.from("learning_courses").select("id, title").in("id", courseIds);
            const names: Record<string, string> = {};
            (coursesData || []).forEach((c: any) => { names[c.id] = c.title; });
            setCourseNames(names);
        }
        setLoading(false);
    }, [toast]);

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

    if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading reviews...</p>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">All Reviews ({reviews.length})</h2>
            </div>
            {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No reviews yet</p>
            ) : (
                <div className="space-y-3">
                    {reviews.map(r => (
                        <Card key={r.id} className={r.is_approved ? "" : "opacity-60 border-destructive/30"}>
                            <CardContent className="p-4 flex items-start gap-4">
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
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => toggleApproval(r.id, r.is_approved)} title={r.is_approved ? "Hide" : "Approve"}>
                                        {r.is_approved ? <XCircle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteReview(r.id)} className="text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// CONTENT TAB
// ═══════════════════════════════════════════
function ContentTab() {
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBlock, setEditingBlock] = useState<any | null>(null);
    const { toast } = useToast();

    const fetchBlocks = useCallback(async () => {
        const { data, error } = await supabase.from("content_blocks").select("*").eq("page_name", "learning_hub").order("section_name");
        if (error) console.error(error);
        else setBlocks(data || []);
        setLoading(false);
    }, []);

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

    // Group by section
    const sections = blocks.reduce((acc, block) => {
        if (!acc[block.section_name]) acc[block.section_name] = [];
        acc[block.section_name].push(block);
        return acc;
    }, {} as Record<string, any[]>);

    if (loading) return <div className="p-8 text-center">Loading content blocks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Landing Page Content</h2>
                    <p className="text-muted-foreground">Manage text and properties for the public landing page.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {Object.entries(sections).map(([section, items]) => (
                    <Card key={section}>
                        <CardHeader>
                            <CardTitle className="capitalize">{section} Section</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {(items as any[]).map((block: any) => (
                                <div key={block.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="space-y-1 flex-1 mr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{block.block_key}</span>
                                            <span className="text-sm text-muted-foreground italic">({block.usage_description})</span>
                                        </div>
                                        <p className="font-medium line-clamp-2">{block.content_value}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setEditingBlock(block)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>

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
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
const LearningHubManager = () => {
    const [activeTab, setActiveTab] = useState("courses");

    return (
        <div className="min-h-screen bg-background border-l">
            <div className="h-full px-4 py-6 lg:px-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Learning Hub Manager</h2>
                            <p className="text-muted-foreground">Manage courses, workshops, students, and content.</p>
                        </div>
                    </div>
                    <Separator />
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 h-auto">
                        <TabsTrigger value="courses">Courses</TabsTrigger>
                        <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                        <TabsTrigger value="workshops">Workshops</TabsTrigger>
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                        <TabsTrigger value="students">Students</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews</TabsTrigger>
                        <TabsTrigger value="content" className="gap-2"><Layout className="w-4 h-4" /> Content</TabsTrigger>
                    </TabsList>

                    <TabsContent value="courses" className="space-y-4"><CoursesTab /></TabsContent>
                    <TabsContent value="curriculum" className="space-y-4"><div className="p-4 border rounded-lg bg-muted/10 text-center text-muted-foreground">Select a course in the "Courses" tab to edit its curriculum.</div></TabsContent>
                    <TabsContent value="workshops" className="space-y-4"><WorkshopsTab /></TabsContent>
                    <TabsContent value="resources" className="space-y-4"><ResourcesTab /></TabsContent>
                    <TabsContent value="students" className="space-y-4"><StudentsTab /></TabsContent>
                    <TabsContent value="reviews" className="space-y-4"><ReviewsTab /></TabsContent>
                    <TabsContent value="content" className="space-y-4"><ContentTab /></TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default LearningHubManager;

// react-doctor-disable no-giant-component
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
export default function CoursesTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
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

    useRealtimeSync(["learning_courses", "learning_sections", "learning_modules"], { onUpdate: fetchCourses });

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
        const skills = form.skills.split(",").flatMap(s => s.trim() ? [s.trim()] : []);
        const learning_outcomes = form.learning_outcomes.split(/\n|,/).flatMap(s => s.trim() ? [s.trim()] : []);
        const prerequisites = form.prerequisites.split(/\n|,/).flatMap(s => s.trim() ? [s.trim()] : []);
        const tags = form.tags.split(",").flatMap(s => s.trim() ? [s.trim()] : []);
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
        const { error } = await supabase.from("learning_courses").update({ is_published: !c.is_published }).eq("id", c.id);
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            return;
        }
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
        
        const results = await Promise.all(
            ids.map(id => supabase.from("learning_courses").update({ is_published: publish }).eq("id", id))
        );
        const errors = results.reduce<string[]>((acc, r) => { if (r.error) acc.push(r.error!.message); return acc; }, []);
        
        if (errors.length > 0) {
            toast({ title: "Partial Success", description: `Encountered ${errors.length} errors.`, variant: "destructive" });
        } else {
            toast({ title: `${ids.length} course(s) ${publish ? "published" : "unpublished"}` });
        }
        
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
                await Promise.all(
                    modules.map(m =>
                        supabase.from("learning_modules").insert({
                            course_id: newCourse.id, title: m.title, description: m.description,
                            content_type: m.content_type, content_url: m.content_url,
                            duration_minutes: m.duration_minutes, display_order: m.display_order,
                            is_published: m.is_published,
                        })
                    )
                );
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {selected.size > 0 && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => bulkPublish(true)}><Eye className="size-4 mr-1" />Publish ({selected.size})</Button>
                            <Button variant="outline" size="sm" onClick={() => bulkPublish(false)}><EyeOff className="size-4 mr-1" />Unpublish ({selected.size})</Button>
                        </>
                    )}
                </div>
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                    <DialogTrigger asChild><Button><Plus className="size-4 mr-2" />Add Course</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editing ? "Edit Course" : "New Course"}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                                <div><Label>Instructor</Label><Input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} /></div>
                            </div>
                            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                            <div><Label>Long Description (rich HTML content for course page)</Label><RichTextEditor content={form.long_description} onChange={(html) => setForm(f => ({ ...f, long_description: html }))} placeholder="Full detailed description with rich formatting..." /></div>
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

            {loading ? <p className="text-muted-foreground">Loading&hellip;</p> : filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><GraduationCap className="size-12 mx-auto mb-3 opacity-50" /><p>No courses yet</p></CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded" aria-label="Select all" />
                        <span>Select all ({filtered.length})</span>
                    </label>
                    {filtered.map(c => (
                        <Card key={c.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center gap-4">
                                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded flex-shrink-0" aria-label={`Select ${c.title}`} />
                                {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="size-16 rounded-lg object-cover" /> : <div className="size-16 rounded-lg bg-primary/10 flex items-center justify-center"><ContentIcon type={c.content_type} /></div>}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold truncate">{c.title}</h3>
                                        {c.is_featured && <Badge variant="secondary"><Star className="size-3 mr-1" />Featured</Badge>}
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
                                    <Button variant="ghost" size="icon" onClick={() => togglePublish(c)} title={c.is_published ? "Unpublish" : "Publish"}>{c.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                                    <Button variant="ghost" size="icon" onClick={() => duplicateCourse(c)} title="Duplicate"><Copy className="size-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => showQR(c)} title="QR Code"><QrCode className="size-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setCourseToDelete(c.id)} className="text-destructive"><Trash2 className="size-4" /></Button>
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


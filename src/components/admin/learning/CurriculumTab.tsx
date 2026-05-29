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
export default function CurriculumTab() {
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
                <Card><CardContent className="py-12 text-center text-muted-foreground"><Layers className="size-12 mx-auto mb-3 opacity-50" /><p>Select a course to manage its curriculum</p></CardContent></Card>
            ) : (
                <CourseBuilder courseId={selectedCourse} />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// COURSE MANAGER TAB (full course: details, curriculum, enrollments, reviews)
// ═══════════════════════════════════════════

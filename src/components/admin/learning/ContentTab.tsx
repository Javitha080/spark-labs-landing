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
import { LHContentBlock } from "./shared";

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
export default function ContentTab() {
    const [blocks, setBlocks] = useState<LHContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBlock, setEditingBlock] = useState<LHContentBlock | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [blockToDelete, setBlockToDelete] = useState<LHContentBlock | null>(null);
    const [newBlock, setNewBlock] = useState({ section_name: "", block_key: "", content_value: "", image_url: "", usage_description: "" });
    const { toast } = useToast();

    const fetchBlocks = useCallback(async () => {
        const { data, error } = await supabase.from("content_blocks").select("*").eq("page_name", "learning_hub").order("section_name");
        if (error) console.error(error);
        else setBlocks((data as LHContentBlock[]) || []);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBlock) return;

        const { error } = await supabase.from("content_blocks").update({
            content_value: editingBlock.content_value,
            image_url: editingBlock.image_url || null,
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBlock.section_name.trim() || !newBlock.block_key.trim()) {
            toast({ title: "Error", description: "Section name and block key are required.", variant: "destructive" });
            return;
        }

        const { error } = await supabase.from("content_blocks").insert({
            page_name: "learning_hub",
            section_name: newBlock.section_name.trim(),
            block_key: newBlock.block_key.trim(),
            content_value: newBlock.content_value || null,
            image_url: newBlock.image_url || null,
            usage_description: newBlock.usage_description || null,
        });

        if (error) {
            toast({ title: "Error", description: "Failed to create block. " + error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Content block created" });
            setShowCreateDialog(false);
            setNewBlock({ section_name: "", block_key: "", content_value: "", image_url: "", usage_description: "" });
            fetchBlocks();
        }
    };

    const handleDelete = async () => {
        if (!blockToDelete) return;
        const { error } = await supabase.from("content_blocks").delete().eq("id", blockToDelete.id);
        if (error) {
            toast({ title: "Error", description: "Failed to delete block.", variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Content block deleted" });
            setBlockToDelete(null);
            fetchBlocks();
        }
    };

    // Group by section
    const sections = blocks.reduce((acc, block) => {
        if (!acc[block.section_name]) acc[block.section_name] = [];
        acc[block.section_name].push(block);
        return acc;
    }, {} as Record<string, LHContentBlock[]>);

    if (loading) return <div className="p-8 text-center">Loading content blocks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Learning Hub Content</h2>
                    <p className="text-muted-foreground">Manage text and properties for the learning hub page.</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Block
                </Button>
            </div>

            {Object.keys(sections).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p>No content blocks found. Click "Add Block" to create one.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {(Object.entries(sections) as [string, LHContentBlock[]][]).map(([section, items]) => (
                        <Card key={section}>
                            <CardHeader>
                                <CardTitle className="capitalize">{section.replace(/_/g, ' ')} Section</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {items.map((block) => (
                                    <div key={block.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="space-y-1 flex-1 mr-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{block.block_key}</span>
                                                <span className="text-sm text-muted-foreground italic">({block.usage_description})</span>
                                            </div>
                                            <p className="font-medium line-clamp-2">{block.content_value}</p>
                                            {block.image_url && (
                                                <p className="text-xs text-muted-foreground truncate">Image: {block.image_url}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingBlock(block)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setBlockToDelete(block)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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
                                <Label htmlFor="image_url">Image</Label>
                                {editingBlock.image_url ? (
                                    <div className="aspect-video rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden relative group mb-2">
                                        <img src={editingBlock.image_url} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setEditingBlock({ ...editingBlock, image_url: "" })}
                                            >
                                                Change Image
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-2">
                                        <FileUpload
                                            onUploadComplete={(url) => setEditingBlock({ ...editingBlock, image_url: url })}
                                            bucketName="gallery"
                                            label="Video & Photo Upload — drag & drop or click to browse"
                                            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] }}
                                        />
                                    </div>
                                )}
                                <Input
                                    id="image_url"
                                    value={editingBlock.image_url || ""}
                                    onChange={(e) => setEditingBlock({ ...editingBlock, image_url: e.target.value })}
                                    placeholder="Or paste an image URL here"
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

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Content Block</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Section Name</Label>
                            <Input
                                value={newBlock.section_name}
                                onChange={e => setNewBlock({ ...newBlock, section_name: e.target.value })}
                                placeholder="e.g. hero, courses, workshops"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Block Key</Label>
                            <Input
                                value={newBlock.block_key}
                                onChange={e => setNewBlock({ ...newBlock, block_key: e.target.value })}
                                placeholder="e.g. heading, subtitle"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Content Value</Label>
                            <Textarea
                                value={newBlock.content_value}
                                onChange={e => setNewBlock({ ...newBlock, content_value: e.target.value })}
                                placeholder="The text content"
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_image">Image</Label>
                            {newBlock.image_url ? (
                                <div className="aspect-video rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden relative group mb-2">
                                    <img src={newBlock.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setNewBlock({ ...newBlock, image_url: "" })}
                                        >
                                            Change Image
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-2">
                                    <FileUpload
                                        onUploadComplete={(url) => setNewBlock({ ...newBlock, image_url: url })}
                                        bucketName="gallery"
                                        label="Video & Photo Upload — drag & drop or click to browse"
                                        accept={{ "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] }}
                                    />
                                </div>
                            )}
                            <Input
                                id="new_image"
                                value={newBlock.image_url}
                                onChange={(e) => setNewBlock({ ...newBlock, image_url: e.target.value })}
                                placeholder="Or paste an image URL here"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Internal)</Label>
                            <Input
                                value={newBlock.usage_description}
                                onChange={e => setNewBlock({ ...newBlock, usage_description: e.target.value })}
                                placeholder="What this block is used for"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                            <Button type="submit">Create Block</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!blockToDelete} onOpenChange={(open) => !open && setBlockToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Content Block?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the block "{blockToDelete?.block_key}" from "{blockToDelete?.section_name}". This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

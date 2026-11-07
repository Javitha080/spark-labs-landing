import { useCallback, useEffect, useState } from "react";
import { Megaphone, Pencil, Plus, Send, Trash2, Eye, EyeOff, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { logError } from "@/lib/errors";
import type { CourseAnnouncement } from "@/types/learning";

type CourseOption = { id: string; title: string; is_published: boolean | null };

// Udemy-style instructor announcements per course. Composed as a draft
// (is_published=false) or published immediately; publishing fans out an
// in-app notification to currently-enrolled students via the
// fn_announcement_fanout trigger.
const AnnouncementsTab = () => {
    const { toast } = useToast();
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [courseId, setCourseId] = useState<string>("");
    const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
    const [loading, setLoading] = useState(false);

    // Composer
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [publishNow, setPublishNow] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        supabase
            .from("learning_courses")
            .select("id, title, is_published")
            .order("title")
            .then(({ data }) => setCourses((data as CourseOption[]) || []));
    }, []);

    const fetchAnnouncements = useCallback(async () => {
        if (!courseId) { setAnnouncements([]); return; }
        setLoading(true);
        const { data, error } = await supabase
            .from("learning_announcements")
            .select("*")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });
        if (error) {
            logError(error, "AnnouncementsTab.fetch");
            toast({ title: "Couldn't load announcements", description: error.message, variant: "destructive" });
        } else {
            setAnnouncements((data as CourseAnnouncement[]) || []);
        }
        setLoading(false);
    }, [courseId, toast]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void fetchAnnouncements(); }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Live refresh while admins keep the tab open (students are notified via
    // learning_notifications in the same migration).
    useRealtimeSync(["learning_announcements"], { onUpdate: () => void fetchAnnouncements(), debounceMs: 800 });

    const resetComposer = () => {
        setTitle("");
        setBody("");
        setPublishNow(true);
        setEditingId(null);
    };

    const startEdit = (a: CourseAnnouncement) => {
        setEditingId(a.id);
        setTitle(a.title);
        setBody(a.body);
        setPublishNow(a.is_published);
    };

    const triggerNotifyEmailDrain = () => {
        // Best-effort drain of the notification email queue right after a
        // publish. The Worker's */10 cron runs the same pipeline with the
        // service role, but when the database is managed externally that
        // secret does not exist - this call, made with the admin's own JWT
        // (learning_hub permission), is what delivers announcement emails.
        void (async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) return;
            await fetch("/api/notify-emails/tick", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
        })().catch(() => {
            // Non-fatal: the cron or a later publish drains the queue too.
        });
    };

    const saveAnnouncement = async () => {
        if (!courseId) { toast({ title: "Pick a course first", variant: "destructive" }); return; }
        if (!title.trim() || !body.trim()) { toast({ title: "Title and message are required", variant: "destructive" }); return; }
        setSaving(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from("learning_announcements")
                    .update({ title: title.trim(), body: body.trim(), is_published: publishNow })
                    .eq("id", editingId);
                if (error) throw error;
                toast({ title: "Announcement updated" });
            } else {
                const { error } = await supabase
                    .from("learning_announcements")
                    .insert({ course_id: courseId, title: title.trim(), body: body.trim(), is_published: publishNow });
                if (error) throw error;
                toast({
                    title: publishNow ? "Announcement published" : "Draft saved",
                    description: publishNow
                        ? "An in-app notification was sent to every enrolled student."
                        : "It stays invisible to students until you publish it.",
                });
            }
            if (publishNow) triggerNotifyEmailDrain();
            resetComposer();
            await fetchAnnouncements();
        } catch (err: unknown) {
            logError(err, "AnnouncementsTab.save");
            toast({ title: "Save failed", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const togglePublished = async (a: CourseAnnouncement) => {
        const next = !a.is_published;
        const { error } = await supabase
            .from("learning_announcements")
            .update({ is_published: next })
            .eq("id", a.id);
        if (error) {
            logError(error, "AnnouncementsTab.toggle");
            toast({ title: "Update failed", description: error.message, variant: "destructive" });
            return;
        }
        // The fan-out trigger only runs on INSERT, so un-publishing hides the
        // row but re-publishing later does not re-notify — compose a fresh
        // announcement when in doubt.
        toast({ title: next ? "Announcement is visible to students" : "Announcement hidden (badge note: was already notified on first publish)" });
        if (next) triggerNotifyEmailDrain();
        await fetchAnnouncements();
    };

    const deleteAnnouncement = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from("learning_announcements").delete().eq("id", deleteId);
        if (error) {
            logError(error, "AnnouncementsTab.delete");
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Announcement deleted" });
        }
        setDeleteId(null);
        await fetchAnnouncements();
    };

    const courseLabel = (id: string | null) => courses.find(c => c.id === id)?.title || "Course";

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Megaphone className="size-4 text-primary" /> Course Announcements
                    </CardTitle>
                    <CardDescription>
                        Post notices students see in the Classroom. Saving a published announcement sends an
                        in-app notification to every currently enrolled student of that course.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="announcement-course">Course</Label>
                            <Select value={courseId} onValueChange={(v) => { setCourseId(v); resetComposer(); }}>
                                <SelectTrigger id="announcement-course" aria-label="Course">
                                    <SelectValue placeholder="Select a course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <div className="flex items-center justify-between rounded-lg border p-3 w-full">
                                <div className="space-y-0.5">
                                    <Label htmlFor="publish-now" className="text-sm">Publish immediately</Label>
                                    <p className="text-xs text-muted-foreground">Save as a draft to compose without notifying.</p>
                                </div>
                                <Switch id="publish-now" checked={publishNow} onCheckedChange={setPublishNow} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="announcement-title">Title</Label>
                        <Input id="announcement-title" placeholder="e.g. Live session moved to Thursday" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="announcement-body">Message</Label>
                        <Textarea id="announcement-body" rows={4} placeholder="Write the notice students will read…" value={body} onChange={e => setBody(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void saveAnnouncement()} disabled={saving || !courseId}>
                            {editingId ? <Pencil className="size-4 mr-2" /> : <Send className="size-4 mr-2" />}
                            {editingId ? "Save Changes" : publishNow ? "Publish & Notify" : "Save Draft"}
                        </Button>
                        {editingId && (
                            <Button variant="outline" onClick={resetComposer}>Cancel edit</Button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Info className="size-3.5 mt-0.5 flex-shrink-0" />
                        Notifications go out once, on the first publish. Flipping a draft to published later
                        does not re-notify — publish fresh announcements for new pushes.
                    </p>
                </CardContent>
            </Card>

            {courseId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">History — {courseLabel(courseId)}</CardTitle>
                        <CardDescription>{loading ? "Loading…" : `${announcements.length} announcement${announcements.length !== 1 ? "s" : ""}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {announcements.length === 0 && !loading && (
                            <p className="text-sm text-muted-foreground text-center py-6">No announcements for this course yet.</p>
                        )}
                        {announcements.map(a => (
                            <div key={a.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <Badge variant={a.is_published ? "default" : "secondary"}>{a.is_published ? "Published" : "Draft"}</Badge>
                                        <span className="font-medium text-sm truncate">{a.title}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
                                </div>
                                <div className="flex flex-shrink-0 gap-1">
                                    <Button variant="ghost" size="icon" className="min-h-[36px] min-w-[36px]" title={a.is_published ? "Hide from students" : "Make visible"} onClick={() => void togglePublished(a)}>
                                        {a.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="min-h-[36px] min-w-[36px]" title="Edit" onClick={() => startEdit(a)}>
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="min-h-[36px] min-w-[36px] text-destructive" title="Delete" onClick={() => setDeleteId(a.id)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Students stop seeing it right away; notifications already delivered stay in their feed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void deleteAnnouncement()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AnnouncementsTab;

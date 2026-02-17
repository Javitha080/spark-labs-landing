import { useState, useEffect } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Plus, GripVertical, Trash2, ChevronRight, ChevronDown, Archive, Save, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import RichTextEditor from "./RichTextEditor";
import { FileUpload } from "@/components/learning/FileUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Course, Module, Section } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { Textarea } from "@/components/ui/textarea"; // Keep generic textarea as fallback or for other inputs

interface CourseBuilderProps {
    courseId: string;
}

export default function CourseBuilder({ courseId }: CourseBuilderProps) {
    const [sections, setSections] = useState<Section[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // Module Editing State
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [moduleForm, setModuleForm] = useState({
        title: "",
        description: "",
        content_type: "video",
        content_url: "",
        duration_minutes: 0,
        section_id: ""
    });

    useEffect(() => {
        fetchContent();
    }, [courseId]);

    const fetchContent = async () => {
        try {
            setLoading(true);

            // Fetch sections
            const { data: sectionsData, error: sectionsError } = await supabase
                .from("learning_sections")
                .select("*")
                .eq("course_id", courseId)
                .order("display_order", { ascending: true });

            if (sectionsError) throw sectionsError;

            // Fetch modules
            const { data: modulesData, error: modulesError } = await supabase
                .from("learning_modules")
                .select("*")
                .eq("course_id", courseId)
                .order("display_order", { ascending: true });

            if (modulesError) throw modulesError;

            setSections(sectionsData || []);
            setModules(modulesData || []);

            // Expand all sections by default
            if (sectionsData) {
                setExpandedSections(new Set(sectionsData.map(s => s.id)));
            }

        } catch (error) {
            console.error("Error fetching course content:", error);
            toast.error("Failed to load course content");
        } finally {
            setLoading(false);
        }
    };

    const createSection = async () => {
        const title = prompt("Enter section title:");
        if (!title) return;

        try {
            const newOrder = sections.length > 0 ? (sections[sections.length - 1].display_order || 0) + 1 : 0;

            const { data, error } = await supabase
                .from("learning_sections")
                .insert({
                    course_id: courseId,
                    title,
                    display_order: newOrder
                })
                .select()
                .single();

            if (error) throw error;

            setSections([...sections, data]);
            setExpandedSections(prev => new Set(prev).add(data.id));
            toast.success("Section created");
        } catch (error) {
            toast.error("Failed to create section");
        }
    };

    const deleteSection = async (id: string) => {
        if (!confirm("Are you sure? This will delete all modules in this section.")) return;

        try {
            const { error } = await supabase
                .from("learning_sections")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setSections(sections.filter(s => s.id !== id));
            toast.success("Section deleted");
        } catch (error) {
            toast.error("Failed to delete section");
        }
    };

    const deleteModule = async (id: string) => {
        if (!confirm("Are you sure you want to delete this module?")) return;

        try {
            const { error } = await supabase
                .from("learning_modules")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setModules(modules.filter(m => m.id !== id));
            toast.success("Module deleted");
        } catch (error) {
            toast.error("Failed to delete module");
        }
    };

    const toggleSection = (id: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const createModule = async (sectionId: string) => {
        const title = prompt("Enter module title:");
        if (!title) return;

        try {
            // Find current max order in this section
            const sectionModules = modules.filter(m => m.section_id === sectionId);
            const newOrder = sectionModules.length > 0 ? (sectionModules[sectionModules.length - 1].display_order || 0) + 1 : 0;

            const { data, error } = await supabase
                .from("learning_modules")
                .insert({
                    course_id: courseId,
                    section_id: sectionId,
                    title,
                    display_order: newOrder,
                    is_published: true
                })
                .select()
                .single();

            if (error) throw error;

            setModules([...modules, data]);
            toast.success("Module created");

            // Open edit immediately
            openEditModule(data);
        } catch (error) {
            toast.error("Failed to create module");
        }
    };

    const openEditModule = (module: Module) => {
        setEditingModule(module);
        setModuleForm({
            title: module.title,
            description: module.description || "",
            content_type: module.content_type || "video",
            content_url: module.content_url || "",
            duration_minutes: module.duration_minutes || 0,
            section_id: module.section_id || ""
        });
    };

    const saveModule = async () => {
        if (!editingModule) return;

        try {
            const { error } = await supabase
                .from("learning_modules")
                .update({
                    title: moduleForm.title,
                    description: moduleForm.description,
                    content_type: moduleForm.content_type,
                    content_url: moduleForm.content_url,
                    duration_minutes: moduleForm.duration_minutes
                })
                .eq("id", editingModule.id);

            if (error) throw error;

            setModules(modules.map(m => m.id === editingModule.id ? { ...m, ...moduleForm } : m));
            setEditingModule(null);
            toast.success("Module updated");
        } catch (error) {
            toast.error("Failed to update module");
        }
    };

    // Reordering logic would go here (using Framer Motion Reorder)
    // For brevity in this first pass, I'm setting up the structure first.

    if (loading) return <div>Loading course builder...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Course Curriculum</h2>
                <Button onClick={createSection}>
                    <Plus className="mr-2 h-4 w-4" /> Add Section
                </Button>
            </div>

            <div className="space-y-4">
                {sections.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                        No sections yet. Create one to get started!
                    </div>
                )}

                <Reorder.Group axis="y" values={sections} onReorder={setSections} className="space-y-4">
                    {sections.map((section) => (
                        <Reorder.Item key={section.id} value={section}>
                            <Card>
                                <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-0 h-auto hover:bg-transparent"
                                        onClick={() => toggleSection(section.id)}
                                    >
                                        {expandedSections.has(section.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </Button>

                                    <div className="flex-1 font-semibold">{section.title}</div>

                                    <div className="flex items-center gap-2">
                                        <Badge variant={section.is_published ? "default" : "secondary"}>
                                            {section.is_published ? "Published" : "Draft"}
                                        </Badge>
                                        <Button variant="ghost" size="icon" onClick={() => deleteSection(section.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardHeader>

                                {expandedSections.has(section.id) && (
                                    <CardContent className="pt-0 pb-4 px-12">
                                        {/* Modules list for this section */}
                                        <div className="space-y-2 mt-2">
                                            {modules.filter(m => m.section_id === section.id).map(module => (
                                                <div key={module.id} className="p-3 bg-secondary/30 rounded-md flex items-center justify-between gap-3 border group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">{module.title}</span>
                                                        <Badge variant="outline" className="text-[10px] h-5 capitalize">{module.content_type}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModule(module)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteModule(module.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => createModule(section.id)}>
                                                <Plus className="mr-2 h-3 w-3" /> Add Module
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>

            {/* Edit Module Dialog */}
            <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Module: {editingModule?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Title</Label>
                                <Input
                                    value={moduleForm.title}
                                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Type</Label>
                                    <Select
                                        value={moduleForm.content_type || "video"}
                                        onValueChange={(v) => setModuleForm({ ...moduleForm, content_type: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="video">Video</SelectItem>
                                            <SelectItem value="article">Article</SelectItem>
                                            <SelectItem value="quiz">Quiz</SelectItem>
                                            <SelectItem value="project">Project</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Duration (min)</Label>
                                    <Input
                                        type="number"
                                        value={moduleForm.duration_minutes}
                                        onChange={(e) => setModuleForm({ ...moduleForm, duration_minutes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label>Content</Label>

                            <div className="border p-4 rounded-lg bg-card/50 space-y-4">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Upload Media</Label>
                                <FileUpload
                                    bucketName="course-content"
                                    folderPath={`courses/${courseId}/modules`}
                                    onUploadComplete={(url) => setModuleForm({ ...moduleForm, content_url: url })}
                                    accept={moduleForm.content_type === 'video' ? { 'video/*': ['.mp4', '.webm'] } : undefined}
                                    label={moduleForm.content_type === 'video' ? "Upload Video Lesson" : "Upload File/Resource"}
                                />
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">Or use URL</span>
                                    </div>
                                </div>
                                <Input
                                    value={moduleForm.content_url}
                                    onChange={(e) => setModuleForm({ ...moduleForm, content_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Description / Notes</Label>
                            <RichTextEditor
                                content={moduleForm.description}
                                onChange={(content) => setModuleForm({ ...moduleForm, description: content })}
                                placeholder="Write lesson content, add images, or formatted notes..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" onClick={() => setEditingModule(null)}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={saveModule}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

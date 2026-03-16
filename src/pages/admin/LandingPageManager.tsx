import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Loader2, Eye, Plus, Trash2 } from "lucide-react";
import { ContentBlock } from "@/types/landing";

// Map sections to their HTML IDs for scrolling
const sectionAnchors: Record<string, string> = {
    hero: "hero",
    about: "about",
    impact_stats: "impact",
    projects: "projects",
    team: "team",
    events: "events",
    gallery: "gallery",
    contact: "contact",
    join: "join",
    stem: "stem",
    teachers: "teachers",
};

export default function LandingPageManager() {
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
    const [saving, setSaving] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [blockToDelete, setBlockToDelete] = useState<ContentBlock | null>(null);
    const [newBlock, setNewBlock] = useState({ section_name: "", block_key: "", content_value: "", image_url: "", usage_description: "" });
    const { toast } = useToast();

    const fetchBlocks = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("content_blocks")
                .select("*")
                .eq("page_name", "landing_page")
                .order("section_name");

            if (error) {
                console.error("Error fetching blocks:", error);
                toast({ title: "Error", description: "Failed to fetch content details.", variant: "destructive" });
            } else {
                setBlocks((data as ContentBlock[]) || []);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBlock) return;

        setSaving(true);
        try {
            const { data, error } = await supabase.from("content_blocks").update({
                content_value: editingBlock.content_value,
                image_url: editingBlock.image_url || null,
                usage_description: editingBlock.usage_description
            }).eq("id", editingBlock.id)
                .select();

            if (error) {
                console.error("Update error:", error);
                toast({ title: "Error", description: "Failed to update content. " + error.message, variant: "destructive" });
            } else if (!data || data.length === 0) {
                toast({ title: "Error", description: "No rows updated. You might not have permission.", variant: "destructive" });
            } else {
                toast({ title: "Success", description: "Content updated successfully" });
                setEditingBlock(null);
                fetchBlocks();
            }
        } catch (err) {
            console.error("Unexpected save error:", err);
            toast({ title: "Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBlock.section_name.trim() || !newBlock.block_key.trim()) {
            toast({ title: "Error", description: "Section name and block key are required.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from("content_blocks").insert({
                page_name: "landing_page",
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
        } catch (err) {
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!blockToDelete) return;

        setSaving(true);
        try {
            const { error } = await supabase.from("content_blocks").delete().eq("id", blockToDelete.id);

            if (error) {
                toast({ title: "Error", description: "Failed to delete block. " + error.message, variant: "destructive" });
            } else {
                toast({ title: "Success", description: "Content block deleted" });
                setBlockToDelete(null);
                fetchBlocks();
            }
        } catch (err) {
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // Group by section
    const sections = blocks.reduce((acc, block) => {
        if (!acc[block.section_name]) acc[block.section_name] = [];
        acc[block.section_name].push(block);
        return acc;
    }, {} as Record<string, ContentBlock[]>);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Landing Page Content</h2>
                    <p className="text-muted-foreground">Manage text and properties for the public landing page.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowCreateDialog(true)} variant="default" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Block
                    </Button>
                    <Button onClick={() => window.open('/', '_blank')} variant="outline" className="gap-2">
                        <Eye className="w-4 h-4" /> Live Preview
                    </Button>
                </div>
            </div>

            {Object.keys(sections).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p>No content blocks found for the landing page.</p>
                        <p className="text-xs mt-2">Click "Add Block" to create your first content block, or run the seed migration.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {Object.entries(sections).map(([section, items]) => (
                        <Card key={section}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="capitalize text-xl">{section.replace(/_/g, ' ')} Section</CardTitle>
                                {sectionAnchors[section] && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 text-muted-foreground hover:text-primary"
                                        onClick={() => window.open(`/#${sectionAnchors[section]}`, '_blank')}
                                    >
                                        <Eye className="w-3 h-3" /> Preview Section
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="grid gap-4 mt-4">
                                {items.map((block) => (
                                    <div key={block.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="space-y-1 flex-1 mr-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="font-mono text-xs">{block.block_key}</Badge>
                                                <span className="text-xs text-muted-foreground italic">{block.usage_description}</span>
                                            </div>
                                            <p className="font-medium text-lg">{block.content_value}</p>
                                            {block.image_url && (
                                                <p className="text-xs text-muted-foreground truncate">Image: {block.image_url}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingBlock(block)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setBlockToDelete(block)}>
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
                                    <Badge variant="secondary">{editingBlock.section_name}</Badge>
                                    <Badge variant="outline">{editingBlock.block_key}</Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">Content Value</Label>
                                <Input
                                    id="content"
                                    value={editingBlock.content_value || ""}
                                    onChange={(e) => setEditingBlock({ ...editingBlock, content_value: e.target.value })}
                                    disabled={saving}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image_url">Image URL</Label>
                                <Input
                                    id="image_url"
                                    value={editingBlock.image_url || ""}
                                    onChange={(e) => setEditingBlock({ ...editingBlock, image_url: e.target.value })}
                                    disabled={saving}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Internal)</Label>
                                <Input
                                    id="description"
                                    value={editingBlock.usage_description || ""}
                                    onChange={(e) => setEditingBlock({ ...editingBlock, usage_description: e.target.value })}
                                    disabled={saving}
                                />
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" type="button" disabled={saving}>Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
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
                            <Label htmlFor="new_section">Section Name</Label>
                            <Input
                                id="new_section"
                                value={newBlock.section_name}
                                onChange={(e) => setNewBlock({ ...newBlock, section_name: e.target.value })}
                                disabled={saving}
                                placeholder="e.g. hero, contact, impact_stats"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new_key">Block Key</Label>
                            <Input
                                id="new_key"
                                value={newBlock.block_key}
                                onChange={(e) => setNewBlock({ ...newBlock, block_key: e.target.value })}
                                disabled={saving}
                                placeholder="e.g. heading_main, cta_primary"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new_content">Content Value</Label>
                            <Input
                                id="new_content"
                                value={newBlock.content_value}
                                onChange={(e) => setNewBlock({ ...newBlock, content_value: e.target.value })}
                                disabled={saving}
                                placeholder="The text content"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new_image">Image URL</Label>
                            <Input
                                id="new_image"
                                value={newBlock.image_url}
                                onChange={(e) => setNewBlock({ ...newBlock, image_url: e.target.value })}
                                disabled={saving}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new_desc">Description (Internal)</Label>
                            <Input
                                id="new_desc"
                                value={newBlock.usage_description}
                                onChange={(e) => setNewBlock({ ...newBlock, usage_description: e.target.value })}
                                disabled={saving}
                                placeholder="What this block is used for"
                            />
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" type="button" disabled={saving}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Block
                            </Button>
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
                            This will permanently delete the block "{blockToDelete?.block_key}" from the "{blockToDelete?.section_name}" section. This cannot be undone.
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

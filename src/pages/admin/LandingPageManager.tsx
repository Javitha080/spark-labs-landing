import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Loader2, Eye } from "lucide-react";
import { ContentBlock } from "@/types/landing";

export default function LandingPageManager() {
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
    const [saving, setSaving] = useState(false);
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
                // Ensure the data matches our type, though supabase types should handling this if generated
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

    // Group by section
    const sections = blocks.reduce((acc, block) => {
        if (!acc[block.section_name]) acc[block.section_name] = [];
        acc[block.section_name].push(block);
        return acc;
    }, {} as Record<string, ContentBlock[]>);

    // Map sections to their HTML IDs for scrolling
    const sectionAnchors: Record<string, string> = {
        hero: "hero",
        impact_stats: "impact",
        contact: "contact"
    };

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
                <Button onClick={() => window.open('/', '_blank')} variant="outline" className="gap-2">
                    <Eye className="w-4 h-4" /> Live Preview
                </Button>
            </div>

            {Object.keys(sections).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p>No content blocks found for the landing page.</p>
                        <p className="text-xs mt-2">Make sure you've run the migration to seed the data.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {Object.entries(sections).map(([section, items]) => (
                        <Card key={section}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="capitalize text-xl">{section.replace('_', ' ')} Section</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 text-muted-foreground hover:text-primary"
                                    onClick={() => window.open(`/#${sectionAnchors[section] || ''}`, '_blank')}
                                >
                                    <Eye className="w-3 h-3" /> Preview Section
                                </Button>
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
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setEditingBlock(block)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
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
        </div>
    );
}


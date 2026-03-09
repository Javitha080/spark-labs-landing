import { useState, useEffect, useCallback } from "react";
import { Reorder } from "framer-motion";
import { Plus, GripVertical, Trash2, Pencil, Save, Video, Image, FileText, Code, Link2, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ModuleContentBlock {
  id: string;
  module_id: string;
  block_type: string;
  title: string | null;
  content: string | null;
  code_language: string | null;
  display_order: number;
  is_published: boolean;
}

const BLOCK_TYPES = [
  { value: "video", label: "Video", icon: Video },
  { value: "image", label: "Image", icon: Image },
  { value: "text", label: "Text/HTML", icon: FileText },
  { value: "code", label: "Code", icon: Code },
  { value: "link", label: "Link", icon: Link2 },
  { value: "tinkercad", label: "Tinkercad", icon: Globe },
  { value: "embed", label: "Embed", icon: Globe },
];

const CODE_LANGUAGES = ["arduino", "cpp", "python", "javascript", "html", "css"];

function BlockTypeIcon({ type }: { type: string }) {
  const bt = BLOCK_TYPES.find((b) => b.value === type);
  const Icon = bt?.icon || FileText;
  return <Icon className="w-4 h-4" />;
}

interface ContentBlockEditorProps {
  moduleId: string;
  courseId: string;
}

export default function ContentBlockEditor({ moduleId, courseId }: ContentBlockEditorProps) {
  const [blocks, setBlocks] = useState<ModuleContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBlock, setEditingBlock] = useState<ModuleContentBlock | null>(null);
  const [form, setForm] = useState({
    block_type: "text",
    title: "",
    content: "",
    code_language: "",
  });

  const fetchBlocks = useCallback(async () => {
    const { data, error } = await supabase
      .from("module_content_blocks")
      .select("*")
      .eq("module_id", moduleId)
      .order("display_order");
    if (error) {
      console.error("Error fetching content blocks:", error);
      return;
    }
    setBlocks((data as ModuleContentBlock[]) || []);
    setLoading(false);
  }, [moduleId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch sets state in callback
    fetchBlocks();
  }, [fetchBlocks]);

  const addBlock = async () => {
    const newOrder = blocks.length;
    const { data, error } = await supabase
      .from("module_content_blocks")
      .insert({
        module_id: moduleId,
        block_type: "text",
        title: "New Block",
        content: "",
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add content block");
      return;
    }
    setBlocks([...blocks, data as ModuleContentBlock]);
    openEdit(data as ModuleContentBlock);
    toast.success("Block added");
  };

  const openEdit = (block: ModuleContentBlock) => {
    setEditingBlock(block);
    setForm({
      block_type: block.block_type,
      title: block.title || "",
      content: block.content || "",
      code_language: block.code_language || "",
    });
  };

  const saveBlock = async () => {
    if (!editingBlock) return;
    const { error } = await supabase
      .from("module_content_blocks")
      .update({
        block_type: form.block_type,
        title: form.title || null,
        content: form.content || null,
        code_language: form.code_language || null,
      })
      .eq("id", editingBlock.id);

    if (error) {
      toast.error("Failed to save block");
      return;
    }

    setBlocks(
      blocks.map((b) =>
        b.id === editingBlock.id
          ? { ...b, block_type: form.block_type, title: form.title, content: form.content, code_language: form.code_language }
          : b
      )
    );
    setEditingBlock(null);
    toast.success("Block saved");
  };

  const deleteBlock = async (id: string) => {
    const { error } = await supabase.from("module_content_blocks").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete block");
      return;
    }
    setBlocks(blocks.filter((b) => b.id !== id));
    toast.success("Block deleted");
  };

  const reorderBlocks = async (newBlocks: ModuleContentBlock[]) => {
    setBlocks(newBlocks);
    try {
      const results = await Promise.all(
        newBlocks.map((b, i) =>
          supabase.from("module_content_blocks").update({ display_order: i }).eq("id", b.id)
        )
      );
      const failed = results.filter(r => r.error);
      if (failed.length > 0) {
        toast.error("Some blocks failed to reorder");
        fetchBlocks();
      }
    } catch {
      toast.error("Failed to save new order");
      fetchBlocks();
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading content blocks...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Content Blocks ({blocks.length})</h4>
        <Button size="sm" variant="outline" onClick={addBlock}>
          <Plus className="w-3 h-3 mr-1" /> Add Block
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
          No content blocks. Add videos, code, images, or text.
        </div>
      ) : (
        <Reorder.Group axis="y" values={blocks} onReorder={reorderBlocks} className="space-y-2">
          {blocks.map((block) => (
            <Reorder.Item key={block.id} value={block}>
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-md border group">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move flex-shrink-0" />
                <BlockTypeIcon type={block.block_type} />
                <Badge variant="outline" className="text-[10px] capitalize">
                  {block.block_type}
                </Badge>
                <span className="flex-1 text-sm truncate">{block.title || "Untitled"}</span>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(block)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBlock(block.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Edit Block Dialog */}
      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content Block</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Block Type</Label>
                <Select value={form.block_type} onValueChange={(v) => setForm({ ...form, block_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOCK_TYPES.map((bt) => (
                      <SelectItem key={bt.value} value={bt.value}>
                        {bt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Block title" />
              </div>
            </div>

            {form.block_type === "code" && (
              <div>
                <Label>Language</Label>
                <Select value={form.code_language} onValueChange={(v) => setForm({ ...form, code_language: v })}>
                  <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {CODE_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>
                {form.block_type === "video" || form.block_type === "image" || form.block_type === "link" || form.block_type === "tinkercad" || form.block_type === "embed"
                  ? "URL"
                  : form.block_type === "code"
                  ? "Code"
                  : "Content (HTML)"}
              </Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={form.block_type === "code" ? 12 : form.block_type === "text" ? 8 : 3}
                placeholder={
                  form.block_type === "video"
                    ? "https://www.youtube.com/watch?v=..."
                    : form.block_type === "tinkercad"
                    ? "https://www.tinkercad.com/things/..."
                    : form.block_type === "code"
                    ? "// Paste your code here..."
                    : form.block_type === "image"
                    ? "https://example.com/image.jpg"
                    : form.block_type === "link"
                    ? "https://example.com"
                    : "<p>Write your content here...</p>"
                }
                className={form.block_type === "code" ? "font-mono text-xs" : ""}
              />
            </div>

            {/* Preview */}
            {form.block_type === "video" && form.content && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={getEmbedUrl(form.content)}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}
            {form.block_type === "image" && form.content && (
              <img src={form.content} alt="Preview" className="max-h-48 rounded-lg object-contain" />
            )}
            {(form.block_type === "tinkercad" || form.block_type === "embed") && form.content && (
              <div className="aspect-video rounded-lg overflow-hidden border">
                <iframe src={form.content} className="w-full h-full" allowFullScreen />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBlock(null)}>Cancel</Button>
            <Button onClick={saveBlock}><Save className="w-4 h-4 mr-2" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getEmbedUrl(url: string): string {
  if (url.includes("youtube.com/watch")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
}

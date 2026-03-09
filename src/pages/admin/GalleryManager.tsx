import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Image as ImageIcon, MapPin, GripVertical, Eye, X, Upload, Search, Video, Play } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

const gallerySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
  image_url: z.string().trim().url("Must be a valid URL").max(500, "URL must be less than 500 characters"),
  media_type: z.enum(["image", "video"]).default("image"),
  video_url: z.string().trim().url("Must be a valid URL").max(500, "URL must be less than 500 characters").optional().or(z.literal("")),
  thumbnail_url: z.string().trim().url("Must be a valid URL").max(500, "URL must be less than 500 characters").optional().or(z.literal("")),
  location_name: z.string().trim().max(200, "Location name must be less than 200 characters").optional(),
  location_lat: z.number().min(-90).max(90).optional().nullable(),
  location_lng: z.number().min(-180).max(180).optional().nullable(),
  display_order: z.number().int().min(0).max(999),
});

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  media_type: string;
  video_url: string | null;
  thumbnail_url: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  display_order: number;
  created_at: string;
}

type GalleryItemInsert = Database["public"]["Tables"]["gallery_items"]["Insert"];

const GalleryManager = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    media_type: "image" as "image" | "video",
    video_url: "",
    thumbnail_url: "",
    location_name: "",
    location_lat: "",
    location_lng: "",
    display_order: 0,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error loading gallery items",
        description: err.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToValidate = {
        ...formData,
        video_url: formData.video_url || undefined,
        thumbnail_url: formData.thumbnail_url || undefined,
        location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
        location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
      };

      const validationResult = gallerySchema.safeParse(dataToValidate);
      if (!validationResult.success) {
        toast({
          title: "Validation Error",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const dataToSubmit = validationResult.data as GalleryItemInsert;

      if (editingId) {
        const { error } = await supabase
          .from("gallery_items")
          .update(dataToSubmit)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Gallery item updated successfully" });
      } else {
        const { error } = await supabase.from("gallery_items").insert([dataToSubmit]);

        if (error) throw error;
        toast({ title: "Gallery item created successfully" });
      }

      fetchItems();
      resetForm();
      setShowForm(false);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error saving gallery item",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("gallery_items").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Gallery item deleted successfully" });
      fetchItems();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error deleting gallery item",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description || "",
      image_url: item.image_url,
      media_type: (item.media_type as "image" | "video") || "image",
      video_url: item.video_url || "",
      thumbnail_url: item.thumbnail_url || "",
      location_name: item.location_name || "",
      location_lat: item.location_lat?.toString() || "",
      location_lng: item.location_lng?.toString() || "",
      display_order: item.display_order,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      media_type: "image",
      video_url: "",
      thumbnail_url: "",
      location_name: "",
      location_lat: "",
      location_lng: "",
      display_order: items.length,
    });
    setEditingId(null);
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Gallery Manager
          </h1>
          <p className="text-muted-foreground text-lg">Manage your innovation gallery images</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          size="lg"
          className="btn-glow px-8 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Image
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: items.length, icon: ImageIcon, color: "text-primary" },
          { label: "Images", value: items.filter(i => i.media_type !== "video").length, icon: ImageIcon, color: "text-blue-500" },
          { label: "Videos", value: items.filter(i => i.media_type === "video").length, icon: Video, color: "text-purple-500" },
          { label: "With Location", value: items.filter(i => i.location_name).length, icon: MapPin, color: "text-green-500" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("text-3xl font-bold mb-1", stat.color)}>{stat.value}</div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
                <stat.icon className={cn("h-8 w-8 opacity-20", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search gallery items..."
          className="pl-10 w-full md:w-96 bg-background/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Form Card */}
      {showForm && (
        <Card className="glass-card border-primary/30 animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {editingId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                  {editingId ? "Edit Gallery Item" : "Add New Gallery Item"}
                </CardTitle>
                <CardDescription>Fill in the details for the gallery image</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column - Media Preview */}
                <div className="space-y-4">
                  {/* Media Type Toggle */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.media_type === "image" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, media_type: "image" })}
                      className="flex-1"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" /> Image
                    </Button>
                    <Button
                      type="button"
                      variant={formData.media_type === "video" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, media_type: "video" })}
                      className="flex-1"
                    >
                      <Video className="w-4 h-4 mr-2" /> Video
                    </Button>
                  </div>

                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {formData.media_type === "video" ? "Video Preview" : "Image Preview"}
                  </Label>
                  <div className="aspect-video rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden relative group">
                    {formData.media_type === "video" && formData.video_url ? (
                      <video
                        src={formData.video_url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : formData.image_url ? (
                      <>
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setFormData({ ...formData, image_url: "" })}
                          >
                            Change Image
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-2 p-8">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Enter {formData.media_type === "video" ? "video" : "image"} URL below
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="image_url">
                      {formData.media_type === "video" ? "Thumbnail Image URL *" : "Image URL *"}
                    </Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      required
                      maxLength={500}
                      className="mt-1.5"
                    />
                  </div>

                  {formData.media_type === "video" && (
                    <div>
                      <Label htmlFor="video_url">Video URL *</Label>
                      <Input
                        id="video_url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        placeholder="https://example.com/video.mp4 or YouTube/Vimeo URL"
                        required={formData.media_type === "video"}
                        maxLength={500}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports direct MP4/WebM links, YouTube, or Vimeo URLs
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column - Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      maxLength={200}
                      className="mt-1.5 text-lg font-medium"
                      placeholder="Innovation Day 2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      maxLength={1000}
                      className="mt-1.5"
                      placeholder="Describe this moment..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location_name">Location</Label>
                      <Input
                        id="location_name"
                        value={formData.location_name}
                        onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                        maxLength={200}
                        className="mt-1.5"
                        placeholder="Main Hall"
                      />
                    </div>
                    <div>
                      <Label htmlFor="display_order">Display Order</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={999}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location_lat">Latitude</Label>
                      <Input
                        id="location_lat"
                        type="number"
                        step="any"
                        value={formData.location_lat}
                        onChange={(e) => setFormData({ ...formData, location_lat: e.target.value })}
                        placeholder="6.9271"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location_lng">Longitude</Label>
                      <Input
                        id="location_lng"
                        type="number"
                        step="any"
                        value={formData.location_lng}
                        onChange={(e) => setFormData({ ...formData, location_lng: e.target.value })}
                        placeholder="79.8612"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button type="submit" className="btn-glow flex-1">
                  {editingId ? "Update Item" : "Create Item"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, index) => (
            <Card
              key={item.id}
              className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-black/50 backdrop-blur-sm">
                    #{item.display_order}
                  </Badge>
                  {item.media_type === "video" && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-purple-500/80 backdrop-blur-sm text-white">
                      <Play className="h-2 w-2 mr-1" /> Video
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white font-bold text-sm truncate">{item.title}</p>
                  {item.location_name && (
                    <p className="text-white/70 text-xs flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {item.location_name}
                    </p>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-primary/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-destructive/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card py-20">
          <div className="text-center space-y-4">
            <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <div>
              <p className="text-lg font-medium text-muted-foreground">No gallery items found</p>
              <p className="text-sm text-muted-foreground/70">Start by adding your first image</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add First Image
            </Button>
          </div>
        </Card>
      )}

      {/* Lightbox Preview */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            {selectedItem?.description && (
              <DialogDescription>
                {selectedItem.description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              {selectedItem && (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.title}
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {selectedItem?.location_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {selectedItem.location_name}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  if (selectedItem) {
                    handleEdit(selectedItem);
                    setSelectedItem(null);
                  }
                }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => {
                  if (selectedItem) {
                    setItemToDelete(selectedItem.id);
                    setSelectedItem(null);
                  }
                }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery Item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (itemToDelete) { handleDelete(itemToDelete); setItemToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GalleryManager;

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { z } from "zod";
import { LeadershipMember } from "./types";
import { optimizeImageFile } from "@/lib/image-optimizer";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const leadershipSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  role: z.string().trim().min(1, "Title/Role is required").max(100),
  description: z.string().max(1000, "Bio must be under 1000 characters").optional().default(""),
  tagline: z.string().max(200, "Tagline must be under 200 characters").optional().default(""),
  department: z.string().max(100).optional().default(""),
  image_url: z.string().max(500).optional().default(""),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  linkedin_url: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  github_url: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  twitter_url: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  website_url: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  tenure_start: z.string().optional().default(""),
  tenure_end: z.string().optional().default(""),
  display_order: z.number().int().min(0),
  is_leadership: z.boolean().default(true),
});

interface LeadershipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMember: LeadershipMember | null;
  onSuccess: () => void;
}

export function LeadershipFormModal({ isOpen, onClose, editingMember, onSuccess }: LeadershipFormModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // react-doctor-disable no-derived-state
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    description: "",
    tagline: "",
    department: "",
    image_url: "",
    email: "",
    linkedin_url: "",
    github_url: "",
    twitter_url: "",
    website_url: "",
    tenure_start: "",
    tenure_end: "",
    display_order: 0,
    is_leadership: true,
  });

  // react-doctor-disable no-adjust-state-on-prop-change
  useEffect(() => {
    if (editingMember) {
      setFormData({
        name: editingMember.name || "",
        role: editingMember.role || "",
        description: editingMember.description || "",
        tagline: editingMember.tagline || "",
        department: editingMember.department || "",
        image_url: editingMember.image_url || "",
        email: editingMember.email || "",
        linkedin_url: editingMember.linkedin_url || "",
        github_url: editingMember.github_url || "",
        twitter_url: editingMember.twitter_url || "",
        website_url: editingMember.website_url || "",
        tenure_start: editingMember.tenure_start || "",
        tenure_end: editingMember.tenure_end || "",
        display_order: editingMember.display_order,
        is_leadership: editingMember.is_leadership ?? true,
      });
    } else {
      setFormData({
        name: "", role: "", description: "", tagline: "", department: "",
        image_url: "", email: "", linkedin_url: "", github_url: "",
        twitter_url: "", website_url: "", tenure_start: "", tenure_end: "",
        display_order: 0, is_leadership: true,
      });
    }
  }, [editingMember, isOpen]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = file;
      let fileExt = file.name.split(".").pop() || "jpg";

      try {
        const optimized = await optimizeImageFile(file);
        fileToUpload = optimized.file;
        fileExt = "webp";
      } catch {
        console.warn("Image optimization failed, using original");
      }

      const filePath = `leaders/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("leadership")
        .upload(filePath, fileToUpload, {
          upsert: true,
          contentType: fileToUpload.type,
          cacheControl: "31536000, immutable",
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("leadership").getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: "Photo uploaded successfully!" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validationResult = leadershipSchema.safeParse(formData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(", ");
        toast({ title: "Validation Error", description: errors, variant: "destructive" });
        return;
      }

      const dataToSave: Record<string, unknown> = { ...validationResult.data };
      // Clean empty optional strings to null for DB
      for (const key of ["email", "linkedin_url", "github_url", "twitter_url", "website_url", "tenure_start", "tenure_end", "tagline", "department", "image_url", "description"]) {
        if (dataToSave[key] === "") dataToSave[key] = null;
      }

      if (editingMember) {
        const { error } = await supabase.from("team_members").update(dataToSave).eq("id", editingMember.id);
        if (error) throw error;
        toast({ title: "Leader updated successfully!" });
      } else {
        const { error } = await supabase.from("team_members").insert([dataToSave]);
        if (error) throw error;
        toast({ title: "Leader added successfully!" });
      }

      onSuccess();
      onClose();
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingMember ? "Edit Leader" : "Add Leader"}</DialogTitle>
          <DialogDescription>Enter the leader's details below. Upload a photo or provide an image URL.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload Zone */}
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Optimizing & uploading...</span>
                </div>
              ) : formData.image_url ? (
                <div className="flex items-center gap-4">
                  <Avatar className="size-20 border-2 border-border">
                    <AvatarImage src={formData.image_url} alt="Preview" />
                    <AvatarFallback><ImageIcon className="size-8 text-muted-foreground" /></AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">Photo uploaded</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{formData.image_url.split("/").pop()}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, image_url: "" })); }}
                    >
                      <X className="size-3 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <div className="text-center">
                    <span className="text-sm font-medium text-foreground">Click to upload or drag & drop</span>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP or GIF (max 5MB)</p>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {/* Or use URL directly */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">or paste URL:</span>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="flex-1 h-8 text-xs"
              />
            </div>
          </div>

          {/* Name & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="leader-name">Name *</Label>
              <Input id="leader-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-role">Title / Role *</Label>
              <Input id="leader-role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required placeholder="e.g. President & Chief Maker" />
            </div>
          </div>

          {/* Department & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="leader-department">Department</Label>
              <Input id="leader-department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Robotics, IoT, Solar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-tagline">Tagline</Label>
              <Input id="leader-tagline" value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} placeholder="A witty one-liner..." />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="leader-bio">Biography</Label>
            <Textarea id="leader-bio" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detailed biography..." rows={4} />
            <span className="text-xs text-muted-foreground">{formData.description.length}/1000</span>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="leader-email">Email</Label>
              <Input id="leader-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-linkedin">LinkedIn URL</Label>
              <Input id="leader-linkedin" value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="leader-github">GitHub URL</Label>
              <Input id="leader-github" value={formData.github_url} onChange={(e) => setFormData({ ...formData, github_url: e.target.value })} placeholder="https://github.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-twitter">Twitter / X URL</Label>
              <Input id="leader-twitter" value={formData.twitter_url} onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })} placeholder="https://x.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-website">Website URL</Label>
              <Input id="leader-website" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>

          {/* Tenure & Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="leader-tenure-start">Tenure Start</Label>
              <Input id="leader-tenure-start" type="date" value={formData.tenure_start} onChange={(e) => setFormData({ ...formData, tenure_start: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-tenure-end">Tenure End</Label>
              <Input id="leader-tenure-end" type="date" value={formData.tenure_end} onChange={(e) => setFormData({ ...formData, tenure_end: e.target.value })} />
              <span className="text-[10px] text-muted-foreground">Leave blank = current</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leader-order">Display Order</Label>
              <Input id="leader-order" type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" variant="hero" className="flex-1">
              {editingMember ? "Update Leader" : "Add Leader"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

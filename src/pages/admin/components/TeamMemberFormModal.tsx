import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { z } from "zod";
import { TeamMember } from "./types";
import { Database } from "@/integrations/supabase/types";

const teamMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  role: z.string().trim().min(1, "Role is required").max(100, "Role must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").transform(val => val || "").optional(),
  image_url: z.string().url("Invalid URL format").max(500, "URL too long").transform(val => val || "").optional().or(z.literal("")),
  email: z.string().email("Invalid email format").max(255, "Email too long").transform(val => val || "").optional().or(z.literal("")),
  linkedin_url: z.string().url("Invalid LinkedIn URL").max(500, "URL too long").transform(val => val || "").optional().or(z.literal("")),
  display_order: z.number().int().min(0, "Display order must be positive"),
});

type TeamMemberInsert = Database["public"]["Tables"]["team_members"]["Insert"];

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMember: TeamMember | null;
  onSuccess: () => void;
}

export function TeamMemberFormModal({ isOpen, onClose, editingMember, onSuccess }: TeamMemberFormModalProps) {
  const { toast } = useToast();
  // react-doctor-disable no-derived-state
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    description: "",
    image_url: "",
    email: "",
    linkedin_url: "",
    display_order: 0,
  });

  // react-doctor-disable no-adjust-state-on-prop-change
  // react-doctor-disable no-derived-state
  useEffect(() => {
    if (editingMember) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: editingMember.name,
        role: editingMember.role,
        description: editingMember.description || "",
        image_url: editingMember.image_url || "",
        email: editingMember.email || "",
        linkedin_url: editingMember.linkedin_url || "",
        display_order: editingMember.display_order,
      });
    } else {
      setFormData({
        name: "",
        role: "",
        description: "",
        image_url: "",
        email: "",
        linkedin_url: "",
        display_order: 0,
      });
    }
  }, [editingMember, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validationResult = teamMemberSchema.safeParse(formData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(", ");
        toast({
          title: "Validation Error",
          description: errors,
          variant: "destructive",
        });
        return;
      }

      const dataToSave = validationResult.data as TeamMemberInsert;

      if (editingMember) {
        const { error } = await supabase
          .from("team_members")
          .update(dataToSave)
          .eq("id", editingMember.id);

        if (error) throw error;
        toast({ title: "Team member updated successfully!" });
      } else {
        const { error } = await supabase
          .from("team_members")
          .insert([dataToSave]);

        if (error) throw error;
        toast({ title: "Team member added successfully!" });
      }

      onSuccess();
      onClose();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to save team member. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>Enter the details of the team member below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="member-name" className="block text-sm font-medium mb-2">Name</label>
              <Input
                id="member-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="member-role" className="block text-sm font-medium mb-2">Role</label>
              <Input
                id="member-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                placeholder="Chief Innovator"
              />
            </div>
          </div>
          <div>
            <label htmlFor="member-desc" className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              id="member-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of responsibilities..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="member-email" className="block text-sm font-medium mb-2">Email</label>
              <Input
                id="member-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label htmlFor="member-linkedin" className="block text-sm font-medium mb-2">LinkedIn URL</label>
              <Input
                id="member-linkedin"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="member-image" className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                id="member-image"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label htmlFor="member-order" className="block text-sm font-medium mb-2">Display Order</label>
              <Input
                id="member-order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" variant="hero" className="flex-1">
              {editingMember ? "Update Member" : "Add Member"}
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

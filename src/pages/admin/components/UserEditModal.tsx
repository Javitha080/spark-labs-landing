import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Key, Upload } from "lucide-react";
import { AppRole } from "@/contexts/RoleContext";
import { ROLE_OPTIONS } from "./constants";
import { logError } from "@/lib/errors";
import { optimizeImageFile } from "@/lib/image-optimizer";
import { UserWithRole } from "./types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function UserEditModal({ isOpen, onClose, user, onSuccess }: UserEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // react-doctor-disable no-derived-state
  const [formData, setFormData] = useState({
    fullName: "",
    role: "user" as AppRole,
    newPassword: "",
    avatarUrl: ""
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  // react-doctor-disable rerender-state-only-in-handlers
  // react-doctor-disable no-derived-state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // react-doctor-disable no-cascading-set-state
  // react-doctor-disable no-event-handler
  // react-doctor-disable no-derived-state
  useEffect(() => {
    if (user && isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        fullName: user.full_name || "",
        role: user.role || "user",
        newPassword: "",
        avatarUrl: user.avatar_url || ""
      });
      setAvatarPreview(user.avatar_url || null);
      setAvatarFile(null);
    }
  }, [user, isOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Avatar must be an image file",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Avatar must be less than 2MB",
          variant: "destructive"
        });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateUser = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to update users",
          variant: "destructive"
        });
        return;
      }

      let avatarUrl = formData.avatarUrl;
      if (avatarFile) {
        let fileToUpload = avatarFile;
        let fileExt = avatarFile.name.split('.').pop() || "jpg";

        try {
          const optimized = await optimizeImageFile(avatarFile);
          fileToUpload = optimized.file;
          fileExt = "webp";
        } catch (optErr) {
          console.warn("Avatar optimization failed, using original file", optErr);
        }

        const fileName = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, fileToUpload, { upsert: true, contentType: fileToUpload.type, cacheControl: "31536000, immutable" });

        if (uploadError) {
          throw new Error('Failed to upload avatar');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            fullName: formData.fullName,
            avatarUrl: avatarUrl,
            newPassword: formData.newPassword || undefined,
            role: formData.role
          }),
        }
      );

      const contentType = response.headers.get("content-type");
      let result: { error?: string } = {};
      if (contentType?.includes("application/json")) {
        try {
          result = await response.json();
        } catch { /* ignore */ }
      }

      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}` || "Failed to update user");
      }

      toast({
        title: "User Updated",
        description: `${user.email} has been updated successfully${formData.newPassword ? ' (password changed)' : ''}`
      });

      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      logError(error, "UserEditModal.handleUpdateUser");
      toast({
        title: "Error updating user",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback>
                  {(user?.full_name || user?.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-2" />
                  Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground">Max 2MB, JPG/PNG/GIF</p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-email" className="text-sm font-medium">Email</label>
              <Input
                id="edit-email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-fullname" className="text-sm font-medium">Full Name</label>
              <Input
                id="edit-fullname"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              {/* react-doctor-disable label-has-associated-control */}
              <label className="text-sm font-medium">Role</label>
              <Select
                value={formData.role}
                onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-2">
              <label htmlFor="edit-password" className="text-sm font-medium flex items-center gap-2">
                <Key className="size-4" />
                Reset Password (optional)
              </label>
              <Input
                id="edit-password"
                type="password"
                autoComplete="new-password"
                placeholder="Leave empty to keep current password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Min. 8 characters (must include uppercase, lowercase, and numbers)</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Saving&hellip;
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

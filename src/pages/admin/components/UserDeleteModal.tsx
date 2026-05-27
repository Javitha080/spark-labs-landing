import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { logError } from "@/lib/errors";
import { UserWithRole } from "./types";

interface UserDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function UserDeleteModal({ isOpen, onClose, user, onSuccess }: UserDeleteModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDeleteUser = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to delete users",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
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
        throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}` || "Failed to delete user");
      }

      toast({
        title: "User Deleted",
        description: `${user.email} has been completely removed from the system`
      });

      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user";
      logError(error, "UserDeleteModal.handleDeleteUser");
      toast({
        title: "Error deleting user",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {user?.email}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Deleting&hellip;
              </>
            ) : (
              "Delete User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

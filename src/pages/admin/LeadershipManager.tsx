import { useState, useEffect, useCallback, useReducer } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Crown, Loader2, Pencil, Trash2 } from "lucide-react";
import { LeadershipMember } from "./components/types";
import { LeadershipFormModal } from "./components/LeadershipFormModal";
import { LeadershipMemberRow } from "./components/LeadershipMemberRow";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface LeadershipState {
  members: LeadershipMember[];
  loading: boolean;
  error: string | null;
}

type LeadershipAction =
  | { type: "SET_MEMBERS"; payload: LeadershipMember[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string };

function leadershipReducer(state: LeadershipState, action: LeadershipAction): LeadershipState {
  switch (action.type) {
    case "SET_MEMBERS":
      return { ...state, members: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

const LeadershipManager = () => {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(leadershipReducer, { members: [], loading: true, error: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<LeadershipMember | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("is_leadership", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      dispatch({ type: "SET_MEMBERS", payload: (data || []) as LeadershipMember[] });
    } catch (error) {
      const err = error as Error;
      dispatch({ type: "SET_ERROR", payload: err.message });
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useRealtimeSync(["team_members"], { onUpdate: fetchMembers });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Leader removed successfully!" });
      fetchMembers();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (member: LeadershipMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  const getInitials = (name: string) =>
    name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Crown className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text">Leadership Manager</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Manage club leadership — upload photos, edit bios & social links</p>
            </div>
          </div>
        </div>
        <Button variant="hero" size="lg" onClick={handleAdd}>
          <Plus className="size-5 mr-2" />
          Add Leader
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Badge variant="secondary" className="gap-1.5">
          <Crown className="size-3" />
          {state.members.length} Leader{state.members.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          {state.members.filter(m => !m.tenure_end).length} Active
        </Badge>
      </div>

      <LeadershipFormModal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingMember={editingMember}
        onSuccess={fetchMembers}
      />

      {state.loading ? (
        <div className="text-center py-16">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Loading leadership&hellip;</p>
        </div>
      ) : state.members.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Crown className="size-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-1">No leaders yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Click 'Add Leader' to add your first leadership member.</p>
          <Button variant="hero" onClick={handleAdd}>
            <Plus className="size-4 mr-2" />
            Add First Leader
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leader</TableHead>
                    <TableHead>Title & Dept</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Links</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.members.map((member) => (
                    <LeadershipMemberRow
                      key={member.id}
                      member={member}
                      onEdit={handleEdit}
                      onDelete={setMemberToDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {state.members.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-12 border border-border shrink-0">
                    <AvatarImage src={member.image_url || undefined} alt={member.name} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    {member.department && (
                      <Badge variant="outline" className="text-[10px] mt-1">{member.department}</Badge>
                    )}
                    {member.tagline && (
                      <p className="text-xs text-muted-foreground/70 italic mt-1 line-clamp-1">"{member.tagline}"</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">#{member.display_order}</Badge>
                </div>
                <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => handleEdit(member)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="destructive" size="sm" className="size-8 p-0" onClick={() => setMemberToDelete(member.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Leader?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The leadership member will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (memberToDelete) { handleDelete(memberToDelete); setMemberToDelete(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadershipManager;

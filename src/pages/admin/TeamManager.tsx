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
import { Plus, Users, Loader2 } from "lucide-react";
import { TeamMember } from "./components/types";
import { TeamMemberFormModal } from "./components/TeamMemberFormModal";
import { TeamMemberRow } from "./components/TeamMemberRow";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";

interface TeamState {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
}

type TeamAction =
  | { type: 'SET_MEMBERS'; payload: TeamMember[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'SET_MEMBERS':
      return { ...state, members: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

const TeamManager = () => {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(teamReducer, { members: [], loading: true, error: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      dispatch({ type: 'SET_MEMBERS', payload: data || [] });
    } catch (error) {
      const err = error as Error;
      dispatch({ type: 'SET_ERROR', payload: err.message });
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
      toast({ title: "Team member deleted successfully!" });
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

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Team Manager</h1>
          <p className="text-muted-foreground mt-1">Manage club leadership and members</p>
        </div>
        <Button variant="hero" size="lg" onClick={handleAdd}>
          <Plus className="size-5 mr-2" />
          Add Member
        </Button>
      </div>

      <TeamMemberFormModal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingMember={editingMember}
        onSuccess={fetchMembers}
      />

      {state.loading ? (
        <div className="text-center py-16"><Loader2 className="size-8 animate-spin mx-auto text-primary" /><p className="text-muted-foreground mt-4">Loading team members&hellip;</p></div>
      ) : state.members.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Users className="size-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-1">No team members yet</h3>
          <p className="text-muted-foreground text-sm">Click 'Add Member' to add your first team member.</p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.members.map((member) => (
                    <TeamMemberRow
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

          <div className="sm:hidden space-y-3">
            {state.members.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">#{member.display_order}</Badge>
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
            <AlertDialogTitle>Delete Team Member?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The team member will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (memberToDelete) { handleDelete(memberToDelete); setMemberToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamManager;

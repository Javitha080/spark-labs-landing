// react-doctor-disable no-giant-component
//
// Role registry manager. The granular `permissions`/`role_permissions` tables
// were dropped (20261031000000_drop_permission_tables.sql): they were editable
// here but nothing in the stack ever enforced them. CMS permissions live in
// the static ROLE_PERMISSIONS map (src/lib/rbac.ts); this `roles` table is the
// identity store consumed by get_cms_role() (via users_management.role_id),
// is_admin_role() and UsersManager. Custom role names resolve to NULL in
// get_cms_role(), i.e. labels without CMS access - the UI now says so.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Shield, Plus, Database, RefreshCw, AlertCircle } from "lucide-react";
import { Loading } from "@/components/common/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CMS_ACCESS_ROLES } from "@/lib/rbac";
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

interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
}

// System roles that should exist
const SYSTEM_ROLES = [
  { name: 'admin', description: 'Full access to all features', is_system_role: true },
  { name: 'editor', description: 'Can manage content but not users or roles', is_system_role: true },
  { name: 'content_creator', description: 'Can create and manage blog, gallery, projects', is_system_role: true },
  { name: 'coordinator', description: 'Can manage events, enrollments, and schedules', is_system_role: true },
  { name: 'user', description: 'Basic user access (no CMS access)', is_system_role: true },
];

const RolesManager = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [seeding, setSeeding] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const { toast } = useToast();


  const fetchData = useCallback(async () => {
    try {
      const { error, data } = await supabase
        .from("roles")
        .select("*")
        .order("is_system_role", { ascending: false })
        .order("name");

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useRealtimeSync(["roles"], { onUpdate: fetchData });

  const seedSystemRoles = async () => {
    setSeeding(true);
    try {
      const roleResults = await Promise.all(
        SYSTEM_ROLES.map(role =>
          supabase.from("roles").upsert(role, { onConflict: 'name' })
        )
      );
      roleResults.forEach((result) => {
        if (result.error && !result.error.message.includes('duplicate')) {
          console.error('Error seeding role:', result.error);
        }
      });

      toast({ title: "Success", description: "System roles have been initialized" });
      await fetchData();
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("roles").insert({
        name: formData.name,
        description: formData.description,
        is_system_role: false
      });

      if (error) throw error;

      toast({ title: "Success", description: "Role created successfully" });
      fetchData();
      setDialogOpen(false);
      setFormData({ name: "", description: "" });
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setFormData({ name: role.name, description: role.description || "" });
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !formData.name.trim()) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("roles")
        .update({ name: formData.name, description: formData.description })
        .eq("id", selectedRole.id);

      if (error) throw error;

      toast({ title: "Success", description: "Role updated successfully" });
      fetchData();
      setEditDialogOpen(false);
      setSelectedRole(null);
      setFormData({ name: "", description: "" });
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteRole = async (id: string) => {
    try {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Success", description: "Role deleted successfully" });
      fetchData();
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <Loading size="lg" className="h-64" />;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="size-8" />
            Roles
          </h1>
          <p className="text-muted-foreground mt-1">
            Role identity store. CMS permissions are enforced by the static role map
            (src/lib/rbac.ts) - custom roles do not grant CMS access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={seedSystemRoles}
            disabled={seeding}
          >
            {seeding ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Initializing&hellip;
              </>
            ) : (
              <>
                <Database className="size-4 mr-2" />
                Initialize Roles
              </>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ name: "", description: "" }); setSelectedRole(null); }}>
                <Plus className="size-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Custom roles are labels only - they do not grant CMS access.
                  Assign one of the system roles to a user instead.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  {/* react-doctor-disable label-has-associated-control */}
                  <label htmlFor="role-name" className="text-sm font-medium">Role Name</label>
                  <Input
                    id="role-name"
                    placeholder="e.g., moderator"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  {/* react-doctor-disable label-has-associated-control */}
                  <label htmlFor="role-desc" className="text-sm font-medium">Description</label>
                  <Textarea
                    id="role-desc"
                    placeholder="Describe what this role is for..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateRole} className="w-full">Create Role</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {roles.filter(r => r.is_system_role).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custom Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter(r => !r.is_system_role).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {roles.length === 0 && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            No roles found. Click "Initialize Roles" to create the system roles.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            System roles grant CMS access per the static permission map (admin, editor,
            coordinator, content_creator). Custom roles are labels - get_cms_role()
            returns NULL for them.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>

            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>CMS Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const hasCMSAccess = CMS_ACCESS_ROLES.includes(role.name as never);
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium capitalize">{role.name.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-muted-foreground">{role.description}</TableCell>
                    <TableCell>
                      <Badge variant={role.is_system_role ? "default" : "secondary"}>
                        {role.is_system_role ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={hasCMSAccess ? "outline" : "secondary"} className={hasCMSAccess ? "border-green-500 text-green-500" : ""}>
                        {hasCMSAccess ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!role.is_system_role && (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditRole(role)}>
                            <Edit className="size-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRoleToDelete(role.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen && !!selectedRole} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Update the name or description. Naming it after a system CMS role
              (admin, editor, coordinator, content_creator) grants CMS access via
              get_cms_role().
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {/* react-doctor-disable label-has-associated-control */}
              <label htmlFor="edit-role-name" className="text-sm font-medium">Role Name</label>
              <Input
                id="edit-role-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              {/* react-doctor-disable label-has-associated-control */}
              <label htmlFor="edit-role-desc" className="text-sm font-medium">Description</label>
              <Textarea
                id="edit-role-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdateRole} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The role will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (roleToDelete) { handleDeleteRole(roleToDelete); setRoleToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolesManager;

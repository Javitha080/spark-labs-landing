import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Edit, Shield, Plus, Database, RefreshCw, AlertCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

// CMS Access permissions that should be available
const CMS_PERMISSIONS = [
  { resource: 'cms', action: 'access', description: 'Can access the CMS dashboard' },
  { resource: 'events', action: 'view', description: 'Can view events' },
  { resource: 'events', action: 'create', description: 'Can create events' },
  { resource: 'events', action: 'edit', description: 'Can edit events' },
  { resource: 'events', action: 'delete', description: 'Can delete events' },
  { resource: 'team', action: 'view', description: 'Can view team members' },
  { resource: 'team', action: 'create', description: 'Can create team members' },
  { resource: 'team', action: 'edit', description: 'Can edit team members' },
  { resource: 'team', action: 'delete', description: 'Can delete team members' },
  { resource: 'projects', action: 'view', description: 'Can view projects' },
  { resource: 'projects', action: 'create', description: 'Can create projects' },
  { resource: 'projects', action: 'edit', description: 'Can edit projects' },
  { resource: 'projects', action: 'delete', description: 'Can delete projects' },
  { resource: 'gallery', action: 'view', description: 'Can view gallery' },
  { resource: 'gallery', action: 'create', description: 'Can add gallery items' },
  { resource: 'gallery', action: 'edit', description: 'Can edit gallery items' },
  { resource: 'gallery', action: 'delete', description: 'Can delete gallery items' },
  { resource: 'blog', action: 'view', description: 'Can view blog posts' },
  { resource: 'blog', action: 'create', description: 'Can create blog posts' },
  { resource: 'blog', action: 'edit', description: 'Can edit blog posts' },
  { resource: 'blog', action: 'delete', description: 'Can delete blog posts' },
  { resource: 'enrollments', action: 'view', description: 'Can view enrollments' },
  { resource: 'enrollments', action: 'manage', description: 'Can manage enrollments' },
  { resource: 'users', action: 'view', description: 'Can view users' },
  { resource: 'users', action: 'create', description: 'Can create users' },
  { resource: 'users', action: 'edit', description: 'Can edit users' },
  { resource: 'users', action: 'delete', description: 'Can delete users' },
  { resource: 'roles', action: 'view', description: 'Can view roles' },
  { resource: 'roles', action: 'manage', description: 'Can manage roles and permissions' },
  { resource: 'analytics', action: 'view', description: 'Can view analytics' },
  { resource: 'schedule', action: 'view', description: 'Can view schedule' },
  { resource: 'schedule', action: 'manage', description: 'Can manage schedule' },
  { resource: 'notifications', action: 'view', description: 'Can view notifications' },
  { resource: 'notifications', action: 'send', description: 'Can send notifications' },
  { resource: 'api_keys', action: 'view', description: 'Can view API keys' },
  { resource: 'api_keys', action: 'manage', description: 'Can manage API keys' },
];

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
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

   
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        supabase.from("roles").select("*").order("is_system_role", { ascending: false }).order("name"),
        supabase.from("permissions").select("*").order("resource, action")
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permissionsRes.error) throw permissionsRes.error;

      setRoles(rolesRes.data || []);
      setPermissions(permissionsRes.data || []);
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const seedSystemData = async () => {
    setSeeding(true);
    try {
      // Seed system roles
      for (const role of SYSTEM_ROLES) {
        const { error } = await supabase
          .from("roles")
          .upsert(role, { onConflict: 'name' });

        if (error && !error.message.includes('duplicate')) {
          console.error('Error seeding role:', error);
        }
      }

      // Seed permissions
      for (const perm of CMS_PERMISSIONS) {
        const { error } = await supabase
          .from("permissions")
          .upsert(perm, { onConflict: 'resource,action' });

        if (error && !error.message.includes('duplicate')) {
          console.error('Error seeding permission:', error);
        }
      }

      toast({ title: "Success", description: "System roles and permissions have been initialized" });
      await fetchData();
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", roleId);

      if (error) throw error;
      setRolePermissions(data.map(rp => rp.permission_id));
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEditRole = async (role: Role) => {
    setSelectedRole(role);
    setFormData({ name: role.name, description: role.description || "" });
    await fetchRolePermissions(role.id);
    setDialogOpen(true);
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

  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;

    try {
      // Delete existing permissions
      await supabase.from("role_permissions").delete().eq("role_id", selectedRole.id);

      // Insert new permissions
      if (rolePermissions.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(
          rolePermissions.map(permId => ({
            role_id: selectedRole.id,
            permission_id: permId
          }))
        );

        if (error) throw error;
      }

      toast({ title: "Success", description: "Permissions updated successfully" });
      setDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteRole = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toast({ title: "Error", description: "Cannot delete system roles", variant: "destructive" });
      return;
    }

    if (!confirm("Are you sure you want to delete this role?")) return;

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

  const togglePermission = (permId: string) => {
    setRolePermissions(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) return <Loading size="lg" className="h-64" />;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and their CMS access permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={seedSystemData}
            disabled={seeding}
          >
            {seeding ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Initialize Roles
              </>
            )}
          </Button>
          <Dialog open={dialogOpen && !selectedRole} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ name: "", description: "" }); setSelectedRole(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Define a new role and its basic properties.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role Name</label>
                  <Input
                    placeholder="e.g., moderator"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe what this role can do..."
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
          </CardContent>
        </Card>
      </div>

      {roles.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No roles found. Click "Initialize Roles" to create system roles and permissions.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CMS Access Roles</CardTitle>
          <CardDescription>
            Configure which permissions each role has. Click "Edit" to customize CMS access for each role.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                const hasCMSAccess = ['admin', 'editor', 'content_creator', 'coordinator'].includes(role.name);
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium capitalize">{role.name.replace('_', ' ')}</TableCell>
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
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditRole(role)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Permissions
                        </Button>
                        {!role.is_system_role && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id, role.is_system_role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen && !!selectedRole} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Manage access rights for this role across the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <Card key={resource}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{resource}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {perms.map(perm => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={rolePermissions.includes(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id)}
                      />
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {perm.action} - {perm.description}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Button onClick={handleUpdatePermissions} className="w-full">Save Permissions</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManager;
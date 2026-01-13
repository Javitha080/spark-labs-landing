import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Edit, Shield } from "lucide-react";
import { Loading } from "@/components/ui/loading";

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

const RolesManager = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        supabase.from("roles").select("*").order("name"),
        supabase.from("permissions").select("*").order("resource, action")
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permissionsRes.error) throw permissionsRes.error;

      setRoles(rolesRes.data || []);
      
      // If no permissions exist, seed them
      if (!permissionsRes.data || permissionsRes.data.length === 0) {
        await seedPermissions();
      } else {
        setPermissions(permissionsRes.data || []);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const seedPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("permissions")
        .insert(CMS_PERMISSIONS)
        .select();

      if (error) throw error;
      setPermissions(data || []);
      toast({ title: "Success", description: "CMS permissions initialized" });
    } catch (error: any) {
      // Permissions might already exist, try to fetch them
      const { data } = await supabase.from("permissions").select("*").order("resource, action");
      setPermissions(data || []);
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Roles & Permissions
        </h1>
        <Dialog open={dialogOpen && !selectedRole} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setFormData({ name: "", description: "" }); setSelectedRole(null); }}>
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Role Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Button onClick={handleCreateRole} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    <Badge variant={role.is_system_role ? "default" : "secondary"}>
                      {role.is_system_role ? "System" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditRole(role)}>
                        <Edit className="h-4 w-4" />
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen && !!selectedRole} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions: {selectedRole?.name}</DialogTitle>
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
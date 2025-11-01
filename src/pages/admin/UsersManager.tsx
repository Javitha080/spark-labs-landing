import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Users } from "lucide-react";
import { Loading } from "@/components/ui/loading";

interface Profile {
  email: string;
  full_name: string | null;
}

interface RoleInfo {
  name: string;
  description: string;
}

interface UserManagement {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

const UsersManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", roleId: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch users_management with role info
      const { data: usersData, error: usersError } = await supabase
        .from("users_management")
        .select("*, roles(name, description)")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Fetch profiles separately for each user
      const usersWithProfiles = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", user.user_id)
            .maybeSingle();

          return { ...user, profiles: profile };
        })
      );

      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (rolesError) throw rolesError;

      setUsers(usersWithProfiles);
      setRoles(rolesData || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.roleId) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { emailRedirectTo: `${window.location.origin}/` }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Add user to management table with role
      const { error: mgmtError } = await supabase.from("users_management").insert({
        user_id: authData.user.id,
        role_id: formData.roleId,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

      if (mgmtError) throw mgmtError;

      toast({ title: "Success", description: "User created successfully" });
      fetchData();
      setDialogOpen(false);
      setFormData({ email: "", password: "", roleId: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from("users_management")
        .update({ role_id: roleId })
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Success", description: "User role updated successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (id: string, userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      // Delete from management table (will cascade to other tables)
      const { error } = await supabase.from("users_management").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Success", description: "User deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <Loading size="lg" className="h-64" />;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          User Management
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateUser} className="w-full">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage users and assign roles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.profiles?.email || "N/A"}</TableCell>
                  <TableCell>{user.profiles?.full_name || "N/A"}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role_id || ""}
                      onValueChange={(value) => handleUpdateRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-48">
                        <Badge>{user.roles?.name || "No Role"}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.user_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersManager;
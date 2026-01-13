import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Users, Edit, RefreshCw, Search, AlertCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: 'admin' | 'user' | null;
  role_id: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

const UsersManager = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "", 
    fullName: "",
    role: "user" as 'admin' | 'user'
  });
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    role: "user" as 'admin' | 'user'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles (admins can now see all due to updated RLS)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role");

      if (userRolesError) throw userRolesError;

      // Fetch available roles from roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, name, description")
        .order("name");

      if (rolesError) throw rolesError;

      // Map roles to users
      const usersWithRoles: UserWithRole[] = (profilesData || []).map(profile => {
        const userRole = userRolesData?.find(ur => ur.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: userRole?.role || null,
          role_id: userRole?.id || null
        };
      });

      setUsers(usersWithRoles);
      setRoles(rolesData || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({ 
        title: "Error loading users", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password) {
      toast({ 
        title: "Validation Error", 
        description: "Email and password are required", 
        variant: "destructive" 
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({ 
        title: "Validation Error", 
        description: "Password must be at least 6 characters", 
        variant: "destructive" 
      });
      return;
    }

    setActionLoading("create");
    try {
      // Create user in auth with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { 
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName || ''
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed - no user returned");

      // The profile should be created automatically by the trigger
      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update the profile with full name if provided
      if (formData.fullName) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ full_name: formData.fullName })
          .eq("id", authData.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }

      // Add user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: formData.role
        });

      if (roleError) throw roleError;

      toast({ 
        title: "User Created", 
        description: `${formData.email} has been added successfully as ${formData.role}` 
      });
      
      await fetchData();
      setDialogOpen(false);
      setFormData({ email: "", password: "", fullName: "", role: "user" });
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({ 
        title: "Error creating user", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setActionLoading("update");
    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: editFormData.fullName })
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      // Update or insert role
      if (selectedUser.role_id) {
        // Update existing role
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: editFormData.role })
          .eq("id", selectedUser.role_id);

        if (roleError) throw roleError;
      } else {
        // Insert new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: selectedUser.id,
            role: editFormData.role
          });

        if (roleError) throw roleError;
      }

      toast({ 
        title: "User Updated", 
        description: `${selectedUser.email} has been updated successfully` 
      });
      
      await fetchData();
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({ 
        title: "Error updating user", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading("delete");
    try {
      // Delete user role first
      if (selectedUser.role_id) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("id", selectedUser.role_id);

        if (roleError) throw roleError;
      }

      // Delete profile (note: this doesn't delete from auth.users - that requires admin API)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      toast({ 
        title: "User Removed", 
        description: `${selectedUser.email} has been removed from the system` 
      });
      
      await fetchData();
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({ 
        title: "Error deleting user", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.full_name || "",
      role: user.role || "user"
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) return <Loading size="lg" className="h-64" />;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users and their roles in the system
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with specified role
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password *</label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role *</label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <SelectItem key={role.id} value={role.name as 'admin' | 'user'}>
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description || 'No description'}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="admin">Admin - Full access to CMS</SelectItem>
                        <SelectItem value="user">User - Regular user access</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={actionLoading === "create"}
              >
                {actionLoading === "create" ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regular Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'user' || !u.role).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>View and manage all users in the system</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {searchQuery ? "No users found matching your search." : "No users found. Add your first user to get started."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name || <span className="text-muted-foreground">Not set</span>}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role || "No Role"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={selectedUser?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select 
                value={editFormData.role} 
                onValueChange={(value: 'admin' | 'user') => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <SelectItem key={role.id} value={role.name as 'admin' | 'user'}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description || 'No description'}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="admin">Admin - Full access to CMS</SelectItem>
                      <SelectItem value="user">User - Regular user access</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={actionLoading === "update"}
            >
              {actionLoading === "update" ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedUser?.email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteUser} 
              disabled={actionLoading === "delete"}
            >
              {actionLoading === "delete" ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManager;
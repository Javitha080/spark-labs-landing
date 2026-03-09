import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Users, Edit, RefreshCw, Search, AlertCircle, Key, Upload, Circle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppRole } from "@/contexts/RoleContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole | null;
  role_id: string | null;
  is_active?: boolean;
  last_activity?: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface ActiveSession {
  user_id: string;
  last_activity_at: string;
  is_active: boolean;
}

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'editor', label: 'Editor', description: 'Can manage content but not users or roles' },
  { value: 'content_creator', label: 'Content Creator', description: 'Can create and manage blog content' },
  { value: 'coordinator', label: 'Coordinator', description: 'Can manage events and enrollments' },
  { value: 'user', label: 'User', description: 'Regular user access' },
];

const UsersManager = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "user" as AppRole
  });
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    role: "user" as AppRole,
    newPassword: "",
    avatarUrl: ""
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();

    // Set up Realtime subscription for user status updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSession = payload.new as ActiveSession;
            // Update the specific user's status in the list
            setUsers(currentUsers =>
              currentUsers.map(user => {
                if (user.id === newSession.user_id) {
                  return {
                    ...user,
                    is_active: newSession.is_active,
                    last_activity: newSession.last_activity_at
                  };
                }
                return user;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const oldSession = payload.old as { id: string, user_id: string }; // Supabase sends old record with ID
            // Ideally we'd match by user_id, but DELETE payload might strictly contain PK.
            // Check Supabase config for REPLICA IDENTITY. Usually PK is sent.
            // user_sessions PK is likely id, but it has user_id FK. 
            // If we can't reliably get user_id from OLD on DELETE without full replica identity,
            // we might need to rely on the fact that we can infer it or just refresh.
            // However, assuming standard setup, we can try to refresh or if we track session IDs.
            // Let's assume we might need to match by scanning if user_id is missing.

            // safer approach for DELETE if we aren't sure of payload content:
            // inspect payload. If user_id is present, use it.
            // If not, we might need to refresh or just set offline if we have the session ID mapped.
            // BUT: UsersWithRole doesn't store session ID. 
            // So let's re-fetch data on DELETE to be safe and accurate, 
            // OR checks if payload.old has user_id.

            if (payload.old && (payload.old as { user_id: string }).user_id) {
              const userId = (payload.old as { user_id: string }).user_id;
              setUsers(currentUsers =>
                currentUsers.map(user => {
                  if (user.id === userId) {
                    return { ...user, is_active: false };
                  }
                  return user;
                })
              );
            } else {
              // Fallback: if we don't have user_id in delete payload, refreshing is safest
              // identifying which user went offline is hard without it.
              // But usually user_sessions DELETE means "logged out".
              // Let's trigger a background refresh for accuracy.
              fetchData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      // Don't set loading true on background refreshes if we have data
      // avoiding full screen spinner flicker
      if (users.length === 0) setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to view users",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Fetch all profiles with avatar_url
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      // Fetch all user roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role");

      if (userRolesError) {
        console.error("Error fetching user roles:", userRolesError);
        throw userRolesError;
      }

      // Fetch active sessions (last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("user_sessions")
        .select("user_id, last_activity_at, is_active")
        .eq("is_active", true)
        .gte("last_activity_at", thirtyMinutesAgo);

      if (!sessionsError && sessionsData) {
        setActiveSessions(sessionsData);
      }

      // Fetch available roles from roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, name, description")
        .order("name");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      // Map roles and active status to users
      const usersWithRoles: UserWithRole[] = (profilesData || []).map(profile => {
        const userRole = userRolesData?.find(ur => ur.user_id === profile.id);
        const userSession = sessionsData?.find(s => s.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: userRole?.role || null,
          role_id: userRole?.id || null,
          is_active: userSession?.is_active || false,
          last_activity: userSession?.last_activity_at || undefined
        };
      });

      setUsers(usersWithRoles);
      setRoles(rolesData || []);
    } catch (error) {
      const err = error as Error;
      console.error("Error fetching users:", err);
      toast({
        title: "Error loading users",
        description: err.message,
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

    if (formData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters",
        variant: "destructive"
      });
      return;
    }

    // Password complexity validation
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      toast({
        title: "Validation Error",
        description: "Password must contain uppercase, lowercase, and numbers",
        variant: "destructive"
      });
      return;
    }

    setActionLoading("create");
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to create users",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            role: formData.role,
          }),
        }
      );

      const contentType = response.headers.get("content-type");
      let result: { error?: string } = {};
      if (contentType?.includes("application/json")) {
        try {
          result = await response.json();
        } catch {
          // ignore parse error, use generic message
        }
      }

      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}` || "Failed to create user");
      }

      toast({
        title: "User Created",
        description: `${formData.email} has been added successfully as ${formData.role}`
      });

      await fetchData();
      setDialogOpen(false);
      setFormData({ email: "", password: "", fullName: "", role: "user" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      console.error("Error creating user:", error);
      toast({
        title: "Error creating user",
        description: message,
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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to update users",
          variant: "destructive"
        });
        return;
      }

      // Upload avatar if selected
      let avatarUrl = editFormData.avatarUrl;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${selectedUser.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) {
          throw new Error('Failed to upload avatar');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Call edge function for profile, password, and role updates
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            fullName: editFormData.fullName,
            avatarUrl: avatarUrl,
            newPassword: editFormData.newPassword || undefined,
            role: editFormData.role // Send role to be securely updated by edge function
          }),
        }
      );

      const contentType = response.headers.get("content-type");
      let result: { error?: string } = {};
      if (contentType?.includes("application/json")) {
        try {
          result = await response.json();
        } catch {
          // ignore parse error
        }
      }

      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}` || "Failed to update user");
      }

      toast({
        title: "User Updated",
        description: `${selectedUser.email} has been updated successfully${editFormData.newPassword ? ' (password changed)' : ''}`
      });

      await fetchData();
      setEditDialogOpen(false);
      setSelectedUser(null);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      console.error("Error updating user:", error);
      toast({
        title: "Error updating user",
        description: message,
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
            userId: selectedUser.id,
          }),
        }
      );

      const contentType = response.headers.get("content-type");
      let result: { error?: string } = {};
      if (contentType?.includes("application/json")) {
        try {
          result = await response.json();
        } catch {
          // ignore parse error
        }
      }

      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}` || "Failed to delete user");
      }

      toast({
        title: "User Deleted",
        description: `${selectedUser.email} has been completely removed from the system`
      });

      await fetchData();
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user";
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: message,
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
      role: user.role || "user",
      newPassword: "",
      avatarUrl: user.avatar_url || ""
    });
    setAvatarPreview(user.avatar_url || null);
    setAvatarFile(null);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeTab === "active") {
      return matchesSearch && user.is_active;
    }
    return matchesSearch;
  });

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

  const activeUserCount = users.filter(u => u.is_active).length;

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
            Manage users, roles, passwords, and profile photos
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
                  placeholder="Min. 8 characters with upper, lower & number"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role *</label>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <Circle className="h-3 w-3 fill-green-500" />
              {activeUserCount}
            </div>
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

      {/* Users Table with Tabs */}
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Circle className="h-2 w-2 fill-green-500" />
                Active ({activeUserCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredUsers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {searchQuery ? "No users found matching your search." :
                  activeTab === "active" ? "No active users at the moment." :
                    "No users found. Add your first user to get started."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                            <AvatarFallback>
                              {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || <span className="text-muted-foreground">Not set</span>}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role || "No Role"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Circle className={`h-2 w-2 ${user.is_active ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`} />
                          <span className="text-sm">{user.is_active ? 'Online' : 'Offline'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            title="Delete user"
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

      {/* Edit Dialog with Enhanced Features */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback>
                  {(selectedUser?.full_name || selectedUser?.email || "U").slice(0, 2).toUpperCase()}
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
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground">Max 2MB, JPG/PNG/GIF</p>
              </div>
            </div>

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
                onValueChange={(value: AppRole) => setEditFormData({ ...editFormData, role: value })}
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

            {/* Password Reset Section */}
            <div className="border-t pt-4 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Reset Password (optional)
              </label>
              <Input
                type="password"
                placeholder="Leave empty to keep current password"
                value={editFormData.newPassword}
                onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Min. 8 characters (must include uppercase, lowercase, and numbers)</p>
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

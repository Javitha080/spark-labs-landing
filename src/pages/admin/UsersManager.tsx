import { useState, useEffect, useCallback, useReducer } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, RefreshCw, Search, AlertCircle, Circle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logError } from "@/lib/errors";

import { UserWithRole, Role, ActiveSession } from "./components/types";
import { UserCreateModal } from "./components/UserCreateModal";
import { UserEditModal } from "./components/UserEditModal";
import { UserDeleteModal } from "./components/UserDeleteModal";
import { UsersStatsCards } from "./components/UsersStatsCards";
import { UsersTableRow } from "./components/UsersTableRow";

interface UsersState {
  users: UserWithRole[];
  roles: Role[];
  activeSessions: ActiveSession[];
  loading: boolean;
}

type UsersAction =
  | { type: 'SET_DATA'; payload: { users: UserWithRole[], roles: Role[], activeSessions: ActiveSession[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_USER_STATUS'; payload: { userId: string, isActive: boolean, lastActivity?: string } }
  | { type: 'MARK_USER_OFFLINE'; payload: string };

function usersReducer(state: UsersState, action: UsersAction): UsersState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, users: action.payload.users, roles: action.payload.roles, activeSessions: action.payload.activeSessions, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'UPDATE_USER_STATUS':
      return {
        ...state,
        users: state.users.map(user => 
          user.id === action.payload.userId 
            ? { ...user, is_active: action.payload.isActive, last_activity: action.payload.lastActivity }
            : user
        )
      };
    case 'MARK_USER_OFFLINE':
      return {
        ...state,
        users: state.users.map(user => 
          user.id === action.payload 
            ? { ...user, is_active: false }
            : user
        )
      };
    default:
      return state;
  }
}

const UsersManager = () => {
  const [state, dispatch] = useReducer(usersReducer, {
    users: [],
    roles: [],
    activeSessions: [],
    loading: true
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      if (state.users.length === 0) dispatch({ type: 'SET_LOADING', payload: true });

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to view users",
          variant: "destructive"
        });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) {
        logError(profilesError, "UsersManager.fetchData.profiles");
        throw profilesError;
      }

      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role");

      if (userRolesError) {
        logError(userRolesError, "UsersManager.fetchData.userRoles");
        throw userRolesError;
      }

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("user_sessions")
        .select("user_id, last_activity_at, is_active")
        .eq("is_active", true)
        .gte("last_activity_at", thirtyMinutesAgo);

      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, name, description")
        .order("name");

      if (rolesError) {
        logError(rolesError, "UsersManager.fetchData.roles");
      }

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

      dispatch({
        type: 'SET_DATA',
        payload: {
          users: usersWithRoles,
          roles: rolesData || [],
          activeSessions: sessionsData || []
        }
      });
    } catch (error) {
      const err = error as Error;
      logError(err, "UsersManager.fetchData");
      toast({
        title: "Error loading users",
        description: err.message,
        variant: "destructive"
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [toast, state.users.length]);

  // oxlint-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSession = payload.new as ActiveSession;
            dispatch({
              type: 'UPDATE_USER_STATUS',
              payload: {
                userId: newSession.user_id,
                isActive: newSession.is_active,
                lastActivity: newSession.last_activity_at
              }
            });
          } else if (payload.eventType === 'DELETE') {
            if (payload.old && (payload.old as { user_id: string }).user_id) {
              const userId = (payload.old as { user_id: string }).user_id;
              dispatch({ type: 'MARK_USER_OFFLINE', payload: userId });
            } else {
              fetchData();
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          toast({
            title: "Realtime connection lost",
            description: "User status updates may be delayed. Refresh to reconnect.",
            variant: "destructive",
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, toast]);

  useRealtimeSync(["profiles", "user_roles", "users_management"], { onUpdate: fetchData });

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const filteredUsers = state.users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeTab === "active") {
      return matchesSearch && user.is_active;
    }
    return matchesSearch;
  });

  const activeUserCount = state.users.filter(u => u.is_active).length;

  if (state.loading) return <Loading size="lg" className="h-64" />;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="size-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, passwords, and profile photos
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <UserPlus className="size-4" />
          Add User
        </Button>
      </div>

      <UsersStatsCards users={state.users} activeUserCount={activeUserCount} />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>View and manage all users in the system</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Users ({state.users.length})</TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Circle className="size-2 fill-green-500" />
                Active ({activeUserCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredUsers.length === 0 ? (
            <Alert>
              <AlertCircle className="size-4" />
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
                    <UsersTableRow
                      key={user.id}
                      user={user}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserCreateModal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchData}
      />

      <UserEditModal
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        user={selectedUser}
        onSuccess={fetchData}
      />

      <UserDeleteModal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        user={selectedUser}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default UsersManager;


import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "./useRealtime";

interface ActiveUser {
  id: string;
  user_id: string;
  session_started_at: string;
  last_activity_at: string;
  is_active: boolean;
  user_agent: string | null;
  ip_address: string | null;
  profile?: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface UseRealtimeUsersReturn {
  activeUsers: ActiveUser[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRealtimeUsers(): UseRealtimeUsersReturn {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchActiveUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get sessions that are active and have activity in the last 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .gte('last_activity_at', fifteenMinutesAgo)
        .order('last_activity_at', { ascending: false });
      
      if (sessionsError) throw sessionsError;
      
      if (!sessions || sessions.length === 0) {
        setActiveUsers([]);
        return;
      }
      
      // Get unique user IDs
      const userIds = [...new Set(sessions.map(s => s.user_id))];
      
      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combine sessions with profiles
      const usersWithProfiles = sessions.map(session => ({
        ...session,
        profile: profiles?.find(p => p.id === session.user_id),
      }));
      
      setActiveUsers(usersWithProfiles);
    } catch (err) {
      console.error('Error fetching active users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active users');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchActiveUsers();
  }, [fetchActiveUsers]);
  
  // Subscribe to realtime updates
  useRealtime({
    table: 'user_sessions',
    event: '*',
    onInsert: () => {
      fetchActiveUsers();
    },
    onUpdate: () => {
      fetchActiveUsers();
    },
    onDelete: () => {
      fetchActiveUsers();
    },
  });
  
  return {
    activeUsers,
    isLoading,
    error,
    refresh: fetchActiveUsers,
  };
}

export default useRealtimeUsers;

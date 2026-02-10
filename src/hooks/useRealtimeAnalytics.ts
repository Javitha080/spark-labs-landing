import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface ActiveUser {
  id: string;
  user_id: string;
  last_activity_at: string;
  is_active: boolean;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

interface RealtimeEvent {
  id: string;
  type: "enrollment" | "blog" | "event" | "session" | "gallery";
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface RealtimeAnalyticsState {
  activeUsers: ActiveUser[];
  recentEvents: RealtimeEvent[];
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  enrollmentCount: number;
  blogCount: number;
  eventCount: number;
}

// Payload type interfaces for Supabase realtime
interface EnrollmentPayload {
  name?: string;
}

interface BlogPostPayload {
  title?: string;
  status?: string;
}

interface EventPayload {
  title?: string;
}

export const useRealtimeAnalytics = () => {
  const [state, setState] = useState<RealtimeAnalyticsState>({
    activeUsers: [],
    recentEvents: [],
    connectionStatus: "connecting",
    enrollmentCount: 0,
    blogCount: 0,
    eventCount: 0,
  });

  const addRealtimeEvent = useCallback((event: Omit<RealtimeEvent, "id" | "timestamp">) => {
    const newEvent: RealtimeEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      recentEvents: [newEvent, ...prev.recentEvents].slice(0, 50), // Keep last 50 events
    }));
  }, []);

  const fetchActiveUsers = useCallback(async () => {
    try {
      // Get sessions active in the last 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: sessions, error } = await supabase
        .from("user_sessions")
        .select("id, user_id, last_activity_at, is_active")
        .eq("is_active", true)
        .gte("last_activity_at", fifteenMinutesAgo)
        .order("last_activity_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for active users
      const userIds = [...new Set(sessions?.map((s) => s.user_id) || [])];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const activeUsers: ActiveUser[] = (sessions || []).map((session) => ({
          ...session,
          profile: profileMap.get(session.user_id) || undefined,
        }));

        setState((prev) => ({ ...prev, activeUsers }));
      } else {
        setState((prev) => ({ ...prev, activeUsers: [] }));
      }
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const [enrollments, blogs, events] = await Promise.all([
        supabase.from("enrollment_submissions").select("id", { count: "exact", head: true }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
      ]);

      setState((prev) => ({
        ...prev,
        enrollmentCount: enrollments.count || 0,
        blogCount: blogs.count || 0,
        eventCount: events.count || 0,
      }));
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscriptions = async () => {
      // Initial data fetch
      await Promise.all([fetchActiveUsers(), fetchCounts()]);

      // Set up realtime channel
      channel = supabase
        .channel("analytics_realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_sessions" },
          () => {
            fetchActiveUsers();
            addRealtimeEvent({
              type: "session",
              title: "User Activity",
              description: "New session started",
              icon: "👤",
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "enrollment_submissions" },
          (payload) => {
            setState((prev) => ({ ...prev, enrollmentCount: prev.enrollmentCount + 1 }));
            addRealtimeEvent({
              type: "enrollment",
              title: "New Enrollment",
              description: `${(payload.new as EnrollmentPayload)?.name || "Someone"} submitted an enrollment`,
              icon: "📝",
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "blog_posts" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setState((prev) => ({ ...prev, blogCount: prev.blogCount + 1 }));
              addRealtimeEvent({
                type: "blog",
                title: "New Blog Post",
                description: `"${(payload.new as BlogPostPayload)?.title || "New post"}" was created`,
                icon: "📰",
              });
            } else if (payload.eventType === "UPDATE" && (payload.new as BlogPostPayload)?.status === "published") {
              addRealtimeEvent({
                type: "blog",
                title: "Blog Published",
                description: `"${(payload.new as BlogPostPayload)?.title || "A post"}" was published`,
                icon: "🎉",
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "events" },
          (payload) => {
            setState((prev) => ({ ...prev, eventCount: prev.eventCount + 1 }));
            addRealtimeEvent({
              type: "event",
              title: "New Event",
              description: `"${(payload.new as EventPayload)?.title || "New event"}" was added`,
              icon: "📅",
            });
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setState((prev) => ({ ...prev, connectionStatus: "connected" }));
          } else if (status === "CLOSED") {
            setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
          } else if (status === "CHANNEL_ERROR") {
            setState((prev) => ({ ...prev, connectionStatus: "error" }));
          }
        });
    };

    setupRealtimeSubscriptions();

    // Timeout: if still "connecting" after 5s, fallback to "connected" 
    const connectionTimeout = setTimeout(() => {
      setState((prev) => {
        if (prev.connectionStatus === "connecting") {
          return { ...prev, connectionStatus: "connected" };
        }
        return prev;
      });
    }, 5000);

    // Refresh active users periodically
    const refreshInterval = setInterval(fetchActiveUsers, 60000);

    return () => {
      clearTimeout(connectionTimeout);
      clearInterval(refreshInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchActiveUsers, fetchCounts, addRealtimeEvent]);

  return state;
};

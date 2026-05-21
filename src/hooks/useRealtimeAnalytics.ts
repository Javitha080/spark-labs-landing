import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { logError } from "@/lib/errors";

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

  // Refs for atomic counter increments (avoid lost updates from concurrent events)
  const countersRef = useRef({ enrollmentCount: 0, blogCount: 0, eventCount: 0 });
  const isSubscribedRef = useRef(true);
  const recentEventSignatures = useRef<Set<string>>(new Set());

  const addRealtimeEvent = useCallback((event: Omit<RealtimeEvent, "id" | "timestamp">) => {
    // Create a signature from event content to detect duplicates
    const signature = `${event.type}-${event.title}-${event.description}`;
    const now = Date.now();
    
    // Clean up old signatures (older than 5 seconds)
    if (recentEventSignatures.current.size > 100) {
      recentEventSignatures.current.clear();
    }
    
    // Skip if this exact event was recently added
    if (recentEventSignatures.current.has(signature)) {
      return;
    }
    
    recentEventSignatures.current.add(signature);
    
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
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: sessions, error } = await supabase
        .from("user_sessions")
        .select("id, user_id, last_activity_at, is_active")
        .eq("is_active", true)
        .gte("last_activity_at", fifteenMinutesAgo)
        .order("last_activity_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(sessions?.map((s) => s.user_id) || [])];

      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, email")
            .in("id", userIds);

          if (profileError) {
            logError(profileError, "useRealtimeAnalytics.profiles");
          }

          const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

          const activeUsers: ActiveUser[] = (sessions || []).map((session) => ({
            ...session,
            profile: profileMap.get(session.user_id) || undefined,
          }));

          setState((prev) => {
            if (!isSubscribedRef.current) return prev;
            return { ...prev, activeUsers };
          });
        } catch (profileErr) {
          logError(profileErr, "useRealtimeAnalytics.profile-fallback");
          const activeUsers: ActiveUser[] = (sessions || []).map((session) => ({
            ...session,
            profile: undefined,
          }));
          setState((prev) => {
            if (!isSubscribedRef.current) return prev;
            return { ...prev, activeUsers };
          });
        }
      } else {
        setState((prev) => {
          if (!isSubscribedRef.current) return prev;
          return { ...prev, activeUsers: [] };
        });
      }
    } catch (error) {
      logError(error, "useRealtimeAnalytics.fetchActiveUsers");
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const [enrollments, blogs, events] = await Promise.all([
        supabase.from("enrollment_submissions").select("id", { count: "exact", head: true }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
      ]);

      setState((prev) => {
        if (!isSubscribedRef.current) return prev;
        return {
          ...prev,
          enrollmentCount: enrollments.count || 0,
          blogCount: blogs.count || 0,
          eventCount: events.count || 0,
        };
      });
    } catch (error) {
      logError(error, "useRealtimeAnalytics.fetchCounts");
    }
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    isSubscribedRef.current = true;

    const setupRealtimeSubscriptions = async () => {
      try {
        await Promise.all([fetchActiveUsers(), fetchCounts()]);
        
        if (!isSubscribedRef.current) return;

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
            countersRef.current.enrollmentCount += 1;
            setState((prev) => ({ ...prev, enrollmentCount: countersRef.current.enrollmentCount }));
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
              countersRef.current.blogCount += 1;
              setState((prev) => ({ ...prev, blogCount: countersRef.current.blogCount }));
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
            countersRef.current.eventCount += 1;
            setState((prev) => ({ ...prev, eventCount: countersRef.current.eventCount }));
            addRealtimeEvent({
              type: "event",
              title: "New Event",
              description: `"${(payload.new as EventPayload)?.title || "New event"}" was added`,
              icon: "📅",
            });
          }
        )
        .subscribe((status, err) => {
          if (!isSubscribedRef.current) return;
          
          if (status === "SUBSCRIBED") {
            setState((prev) => ({ ...prev, connectionStatus: "connected" }));
          } else if (status === "CLOSED") {
            setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
          } else if (status === "CHANNEL_ERROR" || err) {
            logError(err, "useRealtimeAnalytics.channel");
            setState((prev) => ({ ...prev, connectionStatus: "error" }));
          }
        });
      } catch (error) {
        logError(error, "useRealtimeAnalytics.setup");
        if (isSubscribedRef.current) {
          setState((prev) => ({ ...prev, connectionStatus: "error" }));
        }
      }
    };

    setupRealtimeSubscriptions();

    const connectionTimeout = setTimeout(() => {
      setState((prev) => {
        if (prev.connectionStatus === "connecting") {
          return { ...prev, connectionStatus: "connected" };
        }
        return prev;
      });
    }, 5000);

    const refreshInterval = setInterval(fetchActiveUsers, 60000);

    return () => {
      isSubscribedRef.current = false;
      clearTimeout(connectionTimeout);
      clearInterval(refreshInterval);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [fetchActiveUsers, fetchCounts, addRealtimeEvent]);

  return state;
};

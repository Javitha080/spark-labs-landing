import { useEffect, useRef } from 'react';
import { supabase, getSharedSession } from '@/integrations/supabase/client';
import { logError } from '@/lib/errors';

const SESSION_UPDATE_INTERVAL = 60000; // Update every minute
const ACTIVITY_DEBOUNCE = 30000; // Debounce activity updates (30s)

/**
 * Hook to track user session activity
 * Updates last_activity_at in user_sessions table
 * Admins can see all active users
 */
export const useSessionTracking = () => {
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const initSession = async () => {
      try {
        // Use cached getSession() to avoid unnecessary network call
        const { data: { session } } = await getSharedSession();
        if (!session?.user) return; // Skip entirely for unauthenticated visitors

        // Mark any existing active sessions for this user as inactive
        // This prevents duplicate active sessions when user logs out and back in
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', session.user.id)
          .eq('is_active', true);

        // Create new session
        const { data: newSession } = await supabase
          .from('user_sessions')
          .insert({
            user_id: session.user.id,
            session_started_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
            is_active: true
          })
          .select('id')
          .single();

        if (newSession) {
          sessionIdRef.current = newSession.id;
        }

        // Set up periodic activity updates only if session was created
        intervalId = setInterval(updateActivity, SESSION_UPDATE_INTERVAL);
      } catch (error) {
        logError(error, "useSessionTracking.init");
      }
    };

    const updateActivity = async () => {
      if (!sessionIdRef.current) return;

      try {
        await supabase
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', sessionIdRef.current);
      } catch (error) {
        logError(error, "useSessionTracking.update");
      }
    };

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      
      // Debounce activity updates
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        updateActivity();
      }, ACTIVITY_DEBOUNCE);
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && sessionIdRef.current) {
        // Mark session as inactive when tab is hidden
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('id', sessionIdRef.current);
      } else if (document.visibilityState === 'visible') {
        // Reactivate session when tab becomes visible
        if (sessionIdRef.current) {
          await supabase
            .from('user_sessions')
            .update({ 
              is_active: true,
              last_activity_at: new Date().toISOString()
            })
            .eq('id', sessionIdRef.current);
        } else {
          initSession();
        }
      }
    };

    const cleanup = () => {
      if (sessionIdRef.current) {
        void supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('id', sessionIdRef.current);
      }
    };

    // Initialize session tracking
    lastActivityRef.current = Date.now();
    initSession();

    // Add activity listeners (only keydown and click to reduce noise)
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useSessionTracking;

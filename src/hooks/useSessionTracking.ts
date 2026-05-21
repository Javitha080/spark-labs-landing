import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const visibilityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let mounted = true;

    const initSession = async () => {
      if (isInitializingRef.current) return;
      if (sessionIdRef.current) return;
      isInitializingRef.current = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        if (!mounted) return;

        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', session.user.id)
          .eq('is_active', true);

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

        if (newSession && mounted) {
          sessionIdRef.current = newSession.id;
        }

        if (mounted) {
          intervalId = setInterval(updateActivity, SESSION_UPDATE_INTERVAL);
        }
      } catch (error) {
        logError(error, "useSessionTracking.init");
      } finally {
        isInitializingRef.current = false;
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
      if (visibilityDebounceRef.current) clearTimeout(visibilityDebounceRef.current);

      visibilityDebounceRef.current = setTimeout(async () => {
        if (!mounted) return;
        if (document.visibilityState === 'hidden' && sessionIdRef.current) {
          await supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('id', sessionIdRef.current);
        } else if (document.visibilityState === 'visible') {
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
      }, 500);
    };

    const cleanup = () => {
      if (sessionIdRef.current) {
        void supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('id', sessionIdRef.current);
      }
    };

    lastActivityRef.current = Date.now();
    initSession();

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (visibilityDebounceRef.current) clearTimeout(visibilityDebounceRef.current);

      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      cleanup();
    };
  }, []);
};

export default useSessionTracking;

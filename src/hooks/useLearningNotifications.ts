// react-doctor-disable no-derived-state
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/context/StudentAuthContext";
import { logError } from "@/lib/errors";
import type { LearningNotification } from "@/types/learning";

/**
 * In-app student notification feed. Rows are written server-side by the
 * fn_notify_* triggers (instructor Q&A reply, review response, announcement
 * fan-out) and delivered live over supabase_realtime; the bell shows the
 * unread count. RLS scopes every read/update to the owning student.
 */
export function useLearningNotifications() {
    const { student, isAuthenticated } = useStudentAuth();
    const authUserId = student?.authUserId ?? null;
    const [items, setItems] = useState<LearningNotification[]>([]);
    const unread = items.filter(n => !n.is_read).length;
    const [ready, setReady] = useState(false);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!authUserId || !isAuthenticated) {
            setItems([]);
            setReady(true);
            return;
        }
        const { data, error } = await supabase
            .from("learning_notifications")
            .select("*")
            .eq("user_id", authUserId)
            .order("created_at", { ascending: false })
            .limit(25);
        if (error) {
            logError(error, "useLearningNotifications.fetch");
        } else {
            setItems((data as LearningNotification[]) || []);
        }
        setReady(true);
    }, [authUserId, isAuthenticated]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

    // Live updates for this owner's feed while the student keeps the app open.
    // The 20261106 migration put learning_notifications into supabase_realtime.
    useEffect(() => {
        if (!isAuthenticated || !authUserId) {
            if (channelRef.current) {
                void supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            return;
        }
        const uid = authUserId;
        const channel = supabase
            .channel(`learning-notifications-${uid}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "learning_notifications",
                    filter: `user_id=eq.${uid}`,
                },
                () => void fetchNotifications(),
            )
            .subscribe();
        channelRef.current = channel;
        return () => {
            void supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [isAuthenticated, authUserId, fetchNotifications]);

    /** Mark one row read (used when a notification is opened). */
    const markRead = useCallback(async (id: string) => {
        if (!authUserId) return;
        setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
        const { error } = await supabase
            .from("learning_notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", authUserId);
        if (error) {
            logError(error, "useLearningNotifications.markRead");
            void fetchNotifications();
        }
    }, [authUserId, fetchNotifications]);

    /** Clear the unread badge after the student opens the panel. */
    const markAllRead = useCallback(async () => {
        if (!authUserId) return;
        setItems(prev => prev.map(n => ({ ...n, is_read: true })));
        const { error } = await supabase
            .from("learning_notifications")
            .update({ is_read: true })
            .eq("user_id", authUserId)
            .eq("is_read", false);
        if (error) {
            logError(error, "useLearningNotifications.markAllRead");
            void fetchNotifications();
        }
    }, [authUserId, fetchNotifications]);

    return { items, unread, ready, markRead, markAllRead, refresh: fetchNotifications };
}

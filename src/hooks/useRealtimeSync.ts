import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook that subscribes to Supabase Realtime changes on specified tables
 * and automatically invalidates React Query caches for instant UI updates.
 */
export function useRealtimeSync(
  tables: string[],
  queryKeys?: string[][]
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (tables.length === 0) return;

    const channel = supabase.channel("admin-realtime-sync");

    tables.forEach((table) => {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => {
          // Invalidate matching query keys
          if (queryKeys && queryKeys.length > 0) {
            queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
          } else {
            // Default: invalidate queries matching the table name
            queryClient.invalidateQueries({ queryKey: [table] });
          }
        }
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tables.join(",")]); // stable dependency
}

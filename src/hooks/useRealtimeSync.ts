import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Universal realtime sync hook.
 *
 * Subscribes to Postgres changes on specified tables via WebSocket
 * and triggers updates through two mechanisms:
 *
 * 1. **React Query** — automatically invalidates matching query keys
 * 2. **Callback** — fires an optional `onUpdate` callback for
 *    components that manage state with useState/useEffect
 *
 * Usage (React Query):
 *   useRealtimeSync(["events", "projects"]);
 *
 * Usage (Direct state):
 *   useRealtimeSync(["events"], { onUpdate: fetchEvents });
 *
 * Usage (Both + custom keys):
 *   useRealtimeSync(["events"], {
 *     queryKeys: [["events"], ["admin-events"]],
 *     onUpdate: (table, payload) => console.log(table, payload),
 *   });
 */

interface RealtimeSyncOptions {
  /** React Query keys to invalidate on change. Defaults to [[tableName]] per table. */
  queryKeys?: string[][];
  /** Callback fired when any watched table changes. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate?: (table: string, payload: any) => void;
  /** Debounce window in ms to batch rapid updates. Default: 150ms */
  debounceMs?: number;
  /** Unique channel name. Auto-generated if omitted. */
  channelName?: string;
}

export function useRealtimeSync(
  tables: string[],
  options?: RealtimeSyncOptions | string[][] // backward-compat: accept queryKeys array
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTablesRef = useRef<Set<string>>(new Set());

  // Normalize options (backward-compat with old signature)
  const opts: RealtimeSyncOptions = Array.isArray(options)
    ? { queryKeys: options }
    : options ?? {};

  const { queryKeys, onUpdate, debounceMs = 150, channelName } = opts;

  // Use refs so flush doesn't need queryKeys/onUpdate in its dep array
  const queryKeysRef = useRef(queryKeys);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    queryKeysRef.current = queryKeys;
    onUpdateRef.current = onUpdate;
  });

  const stableTablesKey = tables.join(",");

  const flush = useCallback(() => {
    const pending = new Set(pendingTablesRef.current);
    pendingTablesRef.current.clear();

    // Invalidate React Query caches
    const keys = queryKeysRef.current;
    if (keys && keys.length > 0) {
      keys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    } else {
      pending.forEach((table) =>
        queryClient.invalidateQueries({ queryKey: [table] })
      );
    }

    // Fire callback
    const callback = onUpdateRef.current;
    if (callback) {
      pending.forEach((table) => callback(table, null));
    }
  }, [queryClient]);

  useEffect(() => {
    if (tables.length === 0) return;

    const name = channelName || `rt-sync-${stableTablesKey.replace(/,/g, "-")}`;
    const channel = supabase.channel(name);

    tables.forEach((table) => {
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (_payload: any) => {
          pendingTablesRef.current.add(table);

          // Debounce to batch rapid successive changes
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(flush, debounceMs);
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.debug(`[RealtimeSync] Listening on: ${stableTablesKey}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [stableTablesKey, debounceMs, flush, channelName, tables]);
}
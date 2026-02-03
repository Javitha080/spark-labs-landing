import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
}

interface UseRealtimeOptions<T> {
  table: string;
  event?: RealtimeEvent;
  schema?: string;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: RealtimePayload<T>) => void;
}

export function useRealtime<T extends Record<string, unknown>>({
  table,
  event = '*',
  schema = 'public',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const handlePayload = useCallback((payload: RealtimePayload<T>) => {
    onChange?.(payload);
    
    switch (payload.eventType) {
      case 'INSERT':
        onInsert?.(payload.new);
        break;
      case 'UPDATE':
        onUpdate?.(payload.new);
        break;
      case 'DELETE':
        onDelete?.(payload.old);
        break;
    }
  }, [onChange, onInsert, onUpdate, onDelete]);
  
  useEffect(() => {
    const channelName = `realtime:${table}:${Date.now()}`;
    
    // Build the filter config
    type FilterConfig = {
      event: RealtimeEvent;
      schema: string;
      table: string;
      filter?: string;
    };
    
    const filterConfig: FilterConfig = {
      event,
      schema,
      table,
    };
    
    if (filter) {
      filterConfig.filter = filter;
    }
    
    // Use type assertion to work around Supabase SDK typing issues
    const channel = supabase
      .channel(channelName)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        filterConfig,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => handlePayload(payload as RealtimePayload<T>)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime subscribed to ${table}`);
        }
      });
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, event, schema, filter, handlePayload]);
  
  return channelRef.current;
}

export default useRealtime;

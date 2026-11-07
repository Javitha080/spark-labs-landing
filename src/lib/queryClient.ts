import { QueryClient } from "@tanstack/react-query";

/**
 * Single shared QueryClient instance.
 *
 * StudentAuthContext clears the cache on sign-out: data cached in a
 * module-scoped instance outlives the session, so the next identity on a
 * shared browser could briefly render the previous user's admin/CMS query
 * results from staleTime. Kept in its own module so the context and App.tsx
 * can share the instance without a circular import.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 10,
      // The customFetch wrapper in src/integrations/supabase/client.ts already
      // retries once on transient failures with exponential backoff. RQ
      // retrying on top of that produced 6+ attempts per query which felt like
      // "data didn't fetch" to users. Keep RQ retries at 0; let the lower
      // layer handle transient blips and surface real errors fast.
      retry: 0,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Don't keep queries around forever - staleTime above means data is
      // considered fresh for 30s, after which the next mount/focus refetches.
    },
    mutations: {
      retry: 0,
    },
  },
});

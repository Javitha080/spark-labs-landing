import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errors";

export const LANDING_BLOCKS_KEY = ["content-blocks", "landing_page"] as const;

interface LandingBlockRow {
  section_name: string;
  block_key: string;
  content_value: string | null;
}

/**
 * One cached request for every landing-page content block.
 *
 * Hero, StatsSection and Contact each used to run their own
 * `content_blocks` query (three round-trips to the same table, `select("*")`,
 * re-fired on every remount). They now share this query: React Query
 * de-duplicates in-flight requests and serves later mounts from cache.
 *
 * Failures resolve to an empty list so callers keep their built-in fallback
 * copy - the landing page is never blank because the CMS is unreachable.
 */
export function useLandingBlocks(section: string) {
  const { data, isLoading } = useQuery({
    queryKey: LANDING_BLOCKS_KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<LandingBlockRow[]> => {
      const { data: rows, error } = await supabase
        .from("content_blocks")
        .select("section_name, block_key, content_value")
        .eq("page_name", "landing_page");
      if (error) {
        logError(error, "useLandingBlocks.fetch");
        return [];
      }
      return (rows ?? []) as LandingBlockRow[];
    },
  });

  const blocks = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.section_name === section) map[row.block_key] = row.content_value ?? "";
    }
    return map;
  }, [data, section]);

  return { blocks, isLoading };
}

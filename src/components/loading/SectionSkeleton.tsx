import { Skeleton } from "@/components/ui/skeleton";

/**
 * Landing sections pull their content from Supabase after mount, and each
 * one used to flash a spinning loading wheel. That spinner meant a spinning
 * element on the marketing page itself, so these skeletons replace the
 * loaders: pulse blocks that mirror the section's final layout, mirroring
 * the public site's restraint around spinning chrome.
 */

interface SectionSkeletonProps {
  variant: "cards" | "bento" | "timeline";
}

export default function SectionSkeleton({ variant }: SectionSkeletonProps) {
  if (variant === "timeline") {
    // Events: date rail + wide card rows.
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className="max-w-4xl mx-auto px-3 sm:px-4 space-y-8 sm:space-y-12"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 sm:gap-8 items-start">
            <Skeleton className="mt-1 size-12 rounded-2xl bg-muted/60" />
            <div className="flex-1 min-h-[140px] sm:min-h-[160px] rounded-2xl border border-border/40 bg-muted/10 p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-48 bg-muted/60" />
                <Skeleton className="h-5 w-20 rounded-full bg-muted/40" />
              </div>
              <Skeleton className="h-4 w-full bg-muted/40" />
              <Skeleton className="h-4 w-3/4 bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "bento") {
    // LandingLeadership: responsive bento of flip cards.
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto px-4 sm:px-0"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton
            key={i}
            className={`rounded-3xl border border-border/40 bg-muted/20 ${i % 3 === 0 ? "sm:col-span-2 h-44" : "h-44"}`}
          />
        ))}
      </div>
    );
  }

  // Teachers: three-up card grid with portrait block + lines.
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 bg-muted/10 overflow-hidden"
        >
          <Skeleton className="h-40 sm:h-44 rounded-none bg-muted/50" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-2/3 bg-muted/50" />
            <Skeleton className="h-4 w-full bg-muted/40" />
            <Skeleton className="h-4 w-5/6 bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

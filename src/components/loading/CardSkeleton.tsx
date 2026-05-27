import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  className?: string;
  lines?: number;
  showImage?: boolean;
  showAvatar?: boolean;
}

/**
 * Shimmer skeleton for loading card states.
 * Matches the glassmorphic card style of the design system.
 */
export const CardSkeleton = ({
  className,
  lines = 3,
  showImage = true,
  showAvatar = false,
}: CardSkeletonProps) => {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl border border-border/50 p-6 animate-pulse",
        className
      )}
    >
      {showImage && (
        <div className="w-full h-48 rounded-xl bg-muted/50 mb-4" />
      )}

      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-full bg-muted/50" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-muted/50 rounded-full w-1/3" />
            <div className="h-2 bg-muted/30 rounded-full w-1/4" />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="h-4 bg-muted/50 rounded-full w-3/4" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-muted/30 rounded-full"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for admin data tables.
 */
export const TableSkeleton = ({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) => {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border/50 mb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-muted/50 rounded-full flex-1"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 px-4 py-4 border-b border-border/20"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-3 bg-muted/30 rounded-full flex-1"
              style={{ opacity: 1 - rowIdx * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Grid of card skeletons for listing pages.
 */
export const CardGridSkeleton = ({
  count = 6,
  showImage = true,
  className,
}: {
  count?: number;
  showImage?: boolean;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} showImage={showImage} />
      ))}
    </div>
  );
};

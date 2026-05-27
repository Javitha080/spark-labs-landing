import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Loading = ({ size = "md", className }: LoadingProps) => {
  const sizeClasses = {
    sm: "size-4",
    md: "size-8",
    lg: "size-12",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative">
        <div
          className={cn(
            "rounded-full border-2 border-muted animate-spin",
            sizeClasses[size]
          )}
          style={{
            borderTopColor: "hsl(var(--primary))",
            animationDuration: "0.8s",
          }}
        />
      </div>
    </div>
  );
};

export const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loading size="lg" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading&hellip;</p>
      </div>
    </div>
  );
};

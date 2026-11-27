import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteSkeletons() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/admin")) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="min-h-screen bg-background flex"
      >
        <span className="sr-only">Loading admin workspace...</span>
        <aside className="hidden md:flex w-64 shrink-0 border-r border-border/40 p-4 flex-col gap-3">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </aside>
        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (pathname === "/") {
    return (
      <div
        role="status"
        aria-busy="true"
        className="min-h-screen bg-background px-4 pt-6 pb-16"
      >
        <span className="sr-only">Loading landing page...</span>
        <div className="max-w-[1300px] mx-auto space-y-12">
          <Skeleton className="h-14 w-full rounded-full" />
          <div className="pt-8 md:pt-14 flex flex-col items-center text-center space-y-6">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-24 xs:h-28 sm:h-32 md:h-36 lg:h-40 w-full max-w-3xl rounded-2xl" />
            <Skeleton className="h-6 w-full max-w-xl rounded-lg" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-12 w-40 rounded-full" />
              <Skeleton className="h-12 w-36 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isDetailRoute =
    /^\/blog\/[^/]+/.test(pathname) ||
    /^\/project\/[^/]+/.test(pathname) ||
    /^\/learning-hub\/(course|workshop)\/[^/]+/.test(pathname);

  if (isDetailRoute) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="min-h-screen bg-background pt-28 pb-16 px-4"
      >
        <span className="sr-only">Loading article or detail page...</span>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-12 w-4/5 rounded-xl" />
          <div className="flex gap-3">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  const isListingOrLearning =
    pathname.startsWith("/blog") ||
    pathname.startsWith("/news") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/gallery") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/learning-hub") ||
    pathname.startsWith("/student");

  if (isListingOrLearning) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="min-h-screen bg-background pt-28 pb-16 px-4"
      >
        <span className="sr-only">Loading content...</span>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-12 w-72 sm:w-96 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      className="min-h-screen bg-background pt-28 pb-16 px-4"
    >
      <span className="sr-only">Loading page...</span>
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-5 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default RouteSkeletons;

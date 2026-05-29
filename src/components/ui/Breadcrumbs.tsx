import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { m } from "framer-motion";

/**
 * Human-readable labels for route segments.
 * Add entries here as new routes are added.
 */
const ROUTE_LABELS: Record<string, string> = {
  about: "About",
  projects: "Projects",
  project: "Project",
  team: "Team",
  events: "Events",
  gallery: "Gallery",
  contact: "Contact",
  blog: "Blog",
  "learning-hub": "Learning Hub",
  "my-learning": "My Learning",
  course: "Course",
  classroom: "Classroom",
  workshop: "Workshop",
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms of Service",
};

interface BreadcrumbsProps {
  /** Override the auto-generated label for the last segment */
  currentPageLabel?: string;
  className?: string;
}

const Breadcrumbs = ({ currentPageLabel, className = "" }: BreadcrumbsProps) => {
  const location = useLocation();
  const pathSegments = location.pathname
    .split("/")
    .filter((seg) => seg !== "");

  // Don't show on homepage or admin pages
  if (pathSegments.length === 0 || pathSegments[0] === "admin") {
    return null;
  }

  const crumbs = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    const isLast = index === pathSegments.length - 1;

    // Use override for last item, or try the lookup map, or capitalize the segment
    let label: string;
    if (isLast && currentPageLabel) {
      label = currentPageLabel;
    } else {
      label =
        ROUTE_LABELS[segment] ||
        segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // If it's a dynamic segment (UUID or slug), use a generic label
    if (/^[0-9a-f-]{36}$/i.test(segment) || /^\d+$/.test(segment)) {
      label = "Details";
    }

    return { path, label, isLast };
  });

  return (
    <m.nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-sm py-4 ${className}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
      >
        <Home className="size-3.5" />
        <span className="sr-only sm:not-sr-only text-xs font-medium">Home</span>
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight className="size-3 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors truncate max-w-[150px]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </m.nav>
  );
};

export default Breadcrumbs;

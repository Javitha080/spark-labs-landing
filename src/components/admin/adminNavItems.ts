import type { ComponentType } from "react";
import {
  Calendar,
  Users,
  ClipboardList,
  FolderKanban,
  Image,
  UserPlus,
  Shield,
  UserCog,
  Mail,
  BarChart3,
  BookOpen,
  Activity,
  GraduationCap,
  Layout,
  Crown,
} from "lucide-react";

export interface NavItem {
  path: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  permission: string;
}

/** Every CMS page with the permission key that guards it. Keep in sync with PAGE_PERMISSION_MAP in src/lib/rbac.ts. */
export const ALL_NAV_ITEMS: NavItem[] = [
  { path: "/admin/teachers", icon: Users, label: "Teachers", permission: "team" },
  { path: "/admin/events", icon: Calendar, label: "Events", permission: "events" },
  { path: "/admin/team", icon: Users, label: "Team", permission: "team" },
  { path: "/admin/schedule", icon: ClipboardList, label: "Schedule", permission: "schedule" },
  { path: "/admin/projects", icon: FolderKanban, label: "Projects", permission: "projects" },
  { path: "/admin/gallery", icon: Image, label: "Gallery", permission: "gallery" },
  { path: "/admin/blog", icon: BookOpen, label: "Blog", permission: "blog" },
  { path: "/admin/enrollments", icon: UserPlus, label: "Enrollments", permission: "enrollments" },
  { path: "/admin/users", icon: UserCog, label: "Users", permission: "users" },
  { path: "/admin/roles", icon: Shield, label: "Roles", permission: "roles" },
  { path: "/admin/notifications", icon: Mail, label: "Notifications", permission: "notifications" },
  { path: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
  { path: "/admin/activity-log", icon: Activity, label: "Activity Log", permission: "analytics" },
  { path: "/admin/landing", icon: Layout, label: "Landing Page", permission: "projects" },
  { path: "/admin/learning-hub", icon: GraduationCap, label: "Learning Hub", permission: "learning_hub" },
  { path: "/admin/leadership", icon: Crown, label: "Leadership", permission: "team" },
];

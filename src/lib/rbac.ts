export type AppRole = 'admin' | 'editor' | 'content_creator' | 'coordinator' | 'user' | null;

// Define which roles can access the CMS
export const CMS_ACCESS_ROLES: AppRole[] = ['admin', 'editor', 'content_creator', 'coordinator'];

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['all'],
  editor: ['home', 'events', 'team', 'schedule', 'projects', 'gallery', 'blog', 'learning_hub', 'profile'],
  content_creator: ['blog', 'gallery', 'projects', 'learning_hub', 'profile'],
  coordinator: ['events', 'enrollments', 'schedule', 'notifications', 'learning_hub', 'profile'],
};

// Map page paths to permission keys
export const PAGE_PERMISSION_MAP: Record<string, string> = {
  '/admin': 'home',
  '/admin/events': 'events',
  '/admin/team': 'team',
  '/admin/teachers': 'team',
  // Leadership manager writes the same team_members table (is_leadership=true),
  // so it shares the 'team' permission. Its absence here made /admin/leadership
  // admin-only even though the sidebar offered it to every 'team' role.
  '/admin/leadership': 'team',
  '/admin/schedule': 'schedule',
  '/admin/projects': 'projects',
  '/admin/gallery': 'gallery',
  '/admin/blog': 'blog',
  '/admin/blog/edit': 'blog',
  '/admin/enrollments': 'enrollments',
  '/admin/users': 'users',
  '/admin/roles': 'roles',
  '/admin/notifications': 'notifications',
  '/admin/analytics': 'analytics',
  '/admin/activity-log': 'analytics',
  '/admin/landing': 'projects',
  '/admin/learning-hub': 'learning_hub',
  // Every CMS role can edit its own profile (sidebar links here unconditionally).
  '/admin/profile': 'profile',
};

/**
 * Where to land a CMS user right after login. The login form used to
 * hardcode /admin/events, which instantly bounced roles without the
 * 'events' permission (e.g. content_creator) into the access-denied
 * redirect loop. Admins land on the dashboard; other roles get the first
 * page they're actually allowed to open.
 */
export function getCMSLandingPath(role: string | null): string {
  if (role === "admin") return "/admin";
  const perms = (role && ROLE_PERMISSIONS[role]) || [];
  for (const [path, permission] of Object.entries(PAGE_PERMISSION_MAP)) {
    if (path === "/admin") continue;
    if (perms.includes("all") || perms.includes(permission)) return path;
  }
  // No matching page (pending role etc.) — the AdminLayout guard will sort it out.
  return "/admin";
}

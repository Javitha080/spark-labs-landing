export type AppRole = 'admin' | 'editor' | 'content_creator' | 'coordinator' | 'user' | null;

// Define which roles can access the CMS
export const CMS_ACCESS_ROLES: AppRole[] = ['admin', 'editor', 'content_creator', 'coordinator'];

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['all'],
  editor: ['home', 'events', 'team', 'schedule', 'projects', 'gallery', 'blog', 'learning_hub'],
  content_creator: ['blog', 'gallery', 'projects', 'learning_hub'],
  coordinator: ['events', 'enrollments', 'schedule', 'notifications', 'learning_hub'],
};

// Map page paths to permission keys
export const PAGE_PERMISSION_MAP: Record<string, string> = {
  '/admin': 'home',
  '/admin/events': 'events',
  '/admin/team': 'team',
  '/admin/teachers': 'team',
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
  '/admin/profile': 'home',
};

import { AppRole } from "@/contexts/RoleContext";

export const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'editor', label: 'Editor', description: 'Can manage content but not users or roles' },
  { value: 'content_creator', label: 'Content Creator', description: 'Can create and manage blog content' },
  { value: 'coordinator', label: 'Coordinator', description: 'Can manage events and enrollments' },
  { value: 'user', label: 'User', description: 'Regular user access' },
];

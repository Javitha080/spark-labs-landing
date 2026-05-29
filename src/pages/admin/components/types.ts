import { AppRole } from "@/contexts/RoleContext";

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole | null;
  role_id: string | null;
  is_active?: boolean;
  last_activity?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface ActiveSession {
  user_id: string;
  last_activity_at: string;
  is_active: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string;
  image_url: string;
  email: string;
  linkedin_url: string;
  display_order: number;
}

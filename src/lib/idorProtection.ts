/**
 * IDOR (Insecure Direct Object References) Protection Utilities
 * 
 * This module provides functions to prevent unauthorized access to resources
 * through proper validation and authorization checks.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Validates if a user has access to a specific resource
 * @param resourceId - The ID of the resource being accessed
 * @param userId - The ID of the user attempting access
 * @param resourceType - The type of resource (e.g., 'project', 'event')
 * @param permissionLevel - Required permission level ('read', 'write', 'admin')
 * @returns Boolean indicating if access is allowed
 */
export async function validateResourceAccess(
  resourceId: string,
  userId: string,
  resourceType: string,
  permissionLevel: 'read' | 'write' | 'admin' = 'read'
): Promise<boolean> {
  // Validate resource ID format (prevent path traversal and injection)
  if (!/^[a-zA-Z0-9_-]+$/.test(resourceId)) {
    return false;
  }
  
  // Validate user ID format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return false;
  }
  
  // Check if user is admin (admins have access to everything)
  try {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (roleData?.role === 'admin') {
      return true;
    }
  } catch {
    // Continue with resource-specific checks
  }
  
  // Resource-specific access checks
  switch (resourceType) {
    case 'profile':
      // Users can only access their own profile
      return resourceId === userId;
    
    case 'blog_post':
      // For blog posts, check if user is the author or has editor role
      try {
        const { data: postData } = await supabase
          .from('blog_posts')
          .select('author_id')
          .eq('id', resourceId)
          .single();
        
        if (postData?.author_id === userId) {
          return true;
        }
        
        // Check for editor role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .in('role', ['editor', 'content_creator'])
          .single();
        
        return !!roleData;
      } catch {
        return false;
      }
    
    case 'project':
      // Check project ownership - requires 'created_by' column in projects table
      // If your projects table uses a different column name, update accordingly
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', resourceId)
          .single();
        
        // Check if user is the creator (adjust field name based on your schema)
        // Common field names: created_by, user_id, author_id, owner_id
        const ownerId = projectData && (
          (projectData as any).created_by || 
          (projectData as any).user_id || 
          (projectData as any).author_id ||
          (projectData as any).owner_id
        );
        
        return ownerId === userId;
      } catch {
        return false;
      }
    
    default:
      // Default: deny access for unknown resource types
      return false;
  }
}

/**
 * Validates resource ID format without database check
 * Use for client-side validation before making API calls
 * @param id - The ID to validate
 * @param pattern - Regex pattern for validation
 * @returns Boolean indicating if ID is valid
 */
export function validateId(id: string, pattern: RegExp = /^[a-zA-Z0-9_-]+$/): boolean {
  return pattern.test(id);
}

/**
 * Validates UUID format
 * @param id - The UUID to validate
 * @returns Boolean indicating if ID is a valid UUID
 */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Creates a secure reference token for a resource that can be safely exposed to clients
 * Note: This is a client-side only implementation. For production, use server-side hashing.
 * @param resourceId - The actual resource ID
 * @param salt - A random salt value
 * @returns A secure reference token
 */
export function createSecureReference(resourceId: string, salt: string): string {
  // In production, this should be done server-side with proper HMAC
  // This client-side version is for reference only
  const encoder = new TextEncoder();
  const data = encoder.encode(`${resourceId}:${salt}:${Date.now()}`);
  
  // Simple encoding for client-side use - NOT cryptographically secure
  return btoa(String.fromCharCode(...new Uint8Array(data)));
}

/**
 * Decodes a secure reference token back to the original resource ID
 * @param token - The secure reference token
 * @returns The original resource ID or null if invalid
 */
export function decodeSecureReference(token: string): string | null {
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    
    if (parts.length < 2) {
      return null;
    }
    
    return parts[0]; // Return the resource ID
  } catch (e) {
    return null;
  }
}

/**
 * Applies resource-level access control
 * @param resourceIds - Array of resource IDs
 * @param userId - The ID of the user
 * @param resourceType - The type of resources
 * @returns Array of resource IDs the user has access to
 */
export async function filterAccessibleResources(
  resourceIds: string[],
  userId: string,
  resourceType: string
): Promise<string[]> {
  const results = await Promise.all(
    resourceIds.map(async (id) => {
      const hasAccess = await validateResourceAccess(id, userId, resourceType, 'read');
      return hasAccess ? id : null;
    })
  );
  
  return results.filter((id): id is string => id !== null);
}

/**
 * Hook to check if current user owns a resource
 * @param resourceType - Type of resource
 * @param resourceId - ID of the resource
 * @returns Promise resolving to boolean
 */
export async function isResourceOwner(
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    return await validateResourceAccess(resourceId, user.id, resourceType, 'write');
  } catch {
    return false;
  }
}

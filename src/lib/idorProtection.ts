/**
 * IDOR (Insecure Direct Object References) Protection Utilities
 * 
 * This module provides functions to prevent unauthorized access to resources
 * through proper validation and authorization checks.
 */

/**
 * Validates if a user has access to a specific resource
 * @param resourceId - The ID of the resource being accessed
 * @param userId - The ID of the user attempting access
 * @param resourceType - The type of resource (e.g., 'project', 'event')
 * @param permissionLevel - Required permission level ('read', 'write', 'admin')
 * @returns Boolean indicating if access is allowed
 */
export function validateResourceAccess(
  resourceId: string,
  userId: string,
  resourceType: string,
  permissionLevel: 'read' | 'write' | 'admin' = 'read'
): boolean {
  // In a real implementation, this would check against a database
  // For now, we'll implement a basic validation pattern
  
  // Validate resource ID format (prevent path traversal and injection)
  if (!/^[a-zA-Z0-9_-]+$/.test(resourceId)) {
    return false;
  }
  
  // Validate user ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return false;
  }
  
  // In a real app, check permissions in database
  // This is a placeholder for demonstration
  return true;
}

/**
 * Creates a secure reference token for a resource that can be safely exposed to clients
 * @param resourceId - The actual resource ID
 * @param salt - A random salt value
 * @returns A secure reference token
 */
export function createSecureReference(resourceId: string, salt: string): string {
  // In a real implementation, this would use a cryptographic hash function
  // For demonstration, we'll use a simple encoding
  return btoa(`${resourceId}:${salt}:${Date.now()}`);
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
    
    if (parts.length !== 3) {
      return null;
    }
    
    // In a real implementation, verify the token hasn't expired
    // and validate against expected patterns
    
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
export function filterAccessibleResources(
  resourceIds: string[],
  userId: string,
  resourceType: string
): string[] {
  return resourceIds.filter(id => 
    validateResourceAccess(id, userId, resourceType)
  );
}
/**
 * IDOR (Insecure Direct Object References) Protection Utilities
 * SECURITY WARNING: These functions provide CLIENT-SIDE UI logic only.
 * All authorization MUST be enforced via Supabase Row Level Security (RLS) policies.
 */

/**
 * Validates UUID format.
 * @param id - The UUID to validate
 * @returns Boolean indicating if ID is a valid UUID
 */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

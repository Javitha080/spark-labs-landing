/**
 * Client-Side Development Mode Detection (NOT a security feature)
 * 
 * IMPORTANT: This is a deterrent for casual users only. It provides NO actual security.
 * All security-sensitive operations MUST be validated server-side.
 */

export function setAdminBypass(isAdmin: boolean): void {
  // Deprecated: Administrator role check should be done server-side via RLS and JWTs
  return;
}

export function clearAdminBypass(): void {
  // Deprecated
  return;
}

export function initAntiDebug(): void {
  // Disabled based on user feedback regarding UX and lack of real security
  return;
}

export function destroyAntiDebug(): void {
  return;
}

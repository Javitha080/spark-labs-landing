/**
 * Anti-Debug: Lightweight DevTools Detection Hooks
 *
 * Production builds strip all client `console.*` calls via `dropClientConsole`,
 * so running a 2-second polling `setInterval` that forced layout reads
 * (`outerWidth - innerWidth`) for an empty `printWarning()` had zero effect.
 * These exports remain intact as zero-cost no-ops so callers (`RoleContext`,
 * `securityMiddleware`) require no breaking changes.
 */

let adminBypass = false;

export function setAdminBypass(isAdmin: boolean): void {
  adminBypass = isAdmin;
}

export function clearAdminBypass(): void {
  adminBypass = false;
}

export function isAdminBypassActive(): boolean {
  return adminBypass;
}

export function initAntiDebug(): void {
  // Intentionally a no-op: avoids dead 2s forced-layout polling in production.
}

export function destroyAntiDebug(): void {
  // Intentionally a no-op.
}

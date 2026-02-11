/**
 * Client-Side Development Mode Detection (NOT a security feature)
 * 
 * IMPORTANT: This is a deterrent for casual users only. It provides NO actual security.
 * All security-sensitive operations MUST be validated server-side.
 * 
 * This module detects development tools being opened and can optionally
 * clear sensitive UI elements. It should NOT be relied upon for security.
 */

const ADMIN_BYPASS_KEY = '__admin_verified';
const CHECK_INTERVAL_MS = 2000;
const DEVTOOLS_THRESHOLD_PX = 160;

let cleanupFns: (() => void)[] = [];
let isInitialized = false;

/** Check if current user is a verified admin */
function isAdminBypassed(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_BYPASS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Set admin bypass flag (called from SecurityProvider after role verification) */
export function setAdminBypass(isAdmin: boolean): void {
  try {
    if (isAdmin) {
      sessionStorage.setItem(ADMIN_BYPASS_KEY, '1');
    } else {
      sessionStorage.removeItem(ADMIN_BYPASS_KEY);
    }
  } catch {
    // sessionStorage unavailable
  }
}

/** Clear admin bypass (called on logout) */
export function clearAdminBypass(): void {
  try {
    sessionStorage.removeItem(ADMIN_BYPASS_KEY);
  } catch {
    // sessionStorage unavailable
  }
}

/** Detect DevTools via window dimension comparison */
function detectDevToolsByDimension(): boolean {
  const widthDelta = window.outerWidth - window.innerWidth;
  const heightDelta = window.outerHeight - window.innerHeight;
  return widthDelta > DEVTOOLS_THRESHOLD_PX || heightDelta > DEVTOOLS_THRESHOLD_PX;
}

/** Handle detected DevTools opening - clears sensitive UI only */
function onDevToolsDetected(): void {
  if (isAdminBypassed()) return;

  // Clear sensitive content from DOM (UI only, not a security measure)
  const sensitiveElements = document.querySelectorAll('[data-sensitive]');
  sensitiveElements.forEach(el => {
    el.textContent = '';
  });
  
  // Dispatch event for components to handle
  window.dispatchEvent(new CustomEvent('devtools-detected'));
}

/** Block DevTools keyboard shortcuts */
function setupKeyboardBlocking(): void {
  const handler = (e: KeyboardEvent) => {
    if (isAdminBypassed()) return;

    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl+U (view source)
    if (e.ctrlKey && e.key.toUpperCase() === 'U') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  document.addEventListener('keydown', handler, true);
  cleanupFns.push(() => document.removeEventListener('keydown', handler, true));
}

/** Prevent right-click context menu on public pages */
function setupRightClickPrevention(): void {
  const handler = (e: MouseEvent) => {
    if (isAdminBypassed()) return;

    // Only prevent on public pages (not /admin routes)
    if (!window.location.pathname.startsWith('/admin')) {
      e.preventDefault();
    }
  };

  document.addEventListener('contextmenu', handler, true);
  cleanupFns.push(() => document.removeEventListener('contextmenu', handler, true));
}

/** Start periodic DevTools detection checks */
function startPeriodicChecks(): void {
  const intervalId = setInterval(() => {
    if (isAdminBypassed()) return;

    if (detectDevToolsByDimension()) {
      onDevToolsDetected();
    }
  }, CHECK_INTERVAL_MS);

  cleanupFns.push(() => clearInterval(intervalId));
}

/**
 * Initialize development mode detection.
 * Only activates in production mode and for non-admin users.
 * 
 * NOTE: This is NOT a security feature. Server-side validation is required for all security.
 */
export function initAntiDebug(): void {
  // Never run in development
  if (import.meta.env.DEV) return;

  // Prevent double initialization
  if (isInitialized) return;
  isInitialized = true;

  // Skip if admin is already verified
  if (isAdminBypassed()) return;

  // Apply UI protections only
  setupKeyboardBlocking();
  setupRightClickPrevention();
  startPeriodicChecks();
}

/**
 * Clean up all development mode detection.
 * Called on component unmount.
 */
export function destroyAntiDebug(): void {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  isInitialized = false;
}

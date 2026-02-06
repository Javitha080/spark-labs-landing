/**
 * Anti-Debugging Runtime Protection System
 * 
 * Production-only protections that are completely disabled for:
 * - Development mode (import.meta.env.DEV)
 * - Authenticated CMS admins (sessionStorage bypass)
 * 
 * Protections:
 * 1. DevTools detection (dimension + timing based)
 * 2. Console method override (no-ops in production)
 * 3. Keyboard shortcut blocking (F12, Ctrl+Shift+I/J/C)
 * 4. Right-click prevention on public pages
 * 5. Periodic DevTools open-state checks
 */

const ADMIN_BYPASS_KEY = '__admin_verified';
const CHECK_INTERVAL_MS = 2000;
const DEVTOOLS_THRESHOLD_PX = 160;
const TIMING_THRESHOLD_MS = 100;

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

/** Detect DevTools via debugger statement timing */
function detectDevToolsByTiming(): boolean {
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  const elapsed = performance.now() - start;
  return elapsed > TIMING_THRESHOLD_MS;
}

/** Handle detected DevTools opening */
function onDevToolsDetected(): void {
  if (isAdminBypassed()) return;

  // Clear sensitive content from DOM
  const sensitiveElements = document.querySelectorAll('[data-sensitive]');
  sensitiveElements.forEach(el => {
    el.textContent = '';
  });
}

/** Override console methods with no-ops */
function overrideConsole(): void {
  const noop = () => {};
  const methods: (keyof Console)[] = ['log', 'info', 'debug', 'warn'];

  methods.forEach(method => {
    try {
      (console as unknown as Record<string, unknown>)[method] = noop;
    } catch {
      // Some environments protect console
    }
  });
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
 * Initialize all anti-debugging protections.
 * Only activates in production mode and for non-admin users.
 */
export function initAntiDebug(): void {
  // Never run in development
  if (import.meta.env.DEV) return;

  // Prevent double initialization
  if (isInitialized) return;
  isInitialized = true;

  // Skip if admin is already verified
  if (isAdminBypassed()) return;

  // Apply protections
  overrideConsole();
  setupKeyboardBlocking();
  setupRightClickPrevention();
  startPeriodicChecks();
}

/**
 * Clean up all anti-debugging protections.
 * Called on component unmount.
 */
export function destroyAntiDebug(): void {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  isInitialized = false;
}

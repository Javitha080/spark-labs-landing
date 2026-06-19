/**
 * Anti-Debug: Lightweight DevTools Detection (Production Only)
 *
 * Purpose: Deters casual inspection of the production app. This is NOT
 * a security boundary — all real security is enforced server-side via
 * RLS, auth middleware, and CSP headers. This module simply discourages
 * non-technical users from poking around the console.
 *
 * Behaviour:
 * - In development mode (`import.meta.env.DEV`), everything is a no-op.
 * - In production, it periodically checks for open DevTools using a
 *   size-based heuristic and a `debugger` timing probe.
 * - When detected, it clears the console and prints a warning.
 * - Admin users (set via `setAdminBypass`) are exempt.
 *
 * Limitations (by design):
 * - Easily bypassed by knowledgeable users — this is intentional.
 * - Does NOT block functionality or redirect the page.
 * - Does NOT break the app if DevTools are open.
 */

let adminBypass = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let devtoolsOpen = false;

/**
 * Called by RoleContext when an admin logs in/out to exempt them
 * from anti-debug warnings.
 */
export function setAdminBypass(isAdmin: boolean): void {
  adminBypass = isAdmin;
}

export function clearAdminBypass(): void {
  adminBypass = false;
}

/**
 * Detect whether DevTools is open using a size-based heuristic.
 * When DevTools is docked, the outer/inner window size difference
 * increases significantly.
 */
function isDevToolsOpenBySize(): boolean {
  const widthThreshold = window.outerWidth - window.innerWidth > 160;
  const heightThreshold = window.outerHeight - window.innerHeight > 160;
  return widthThreshold || heightThreshold;
}

/**
 * Detect DevTools via a `debugger` timing probe.
 * When DevTools is open with the debugger panel active, hitting
 * a `debugger` statement causes a measurable delay (>100ms).
 * We run this in a Function() constructor so it's only a brief pause.
 */
function isDevToolsOpenByTiming(): boolean {
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  return performance.now() - start > 100;
}

/** Print a friendly deterrence message to the console */
function printWarning(): void {
  console.clear();

  const styles = [
    "color: #e74c3c",
    "font-size: 24px",
    "font-weight: bold",
    "font-family: 'Space Grotesk', sans-serif",
  ].join(";");

  const bodyStyles = [
    "color: #f39c12",
    "font-size: 14px",
    "font-family: 'Inter', sans-serif",
  ].join(";");

  console.log("%c⚠️ Warning!", styles);
  console.log(
    "%cThis browser feature is intended for developers. " +
      "If someone told you to copy-paste something here, " +
      "it is likely a scam. For your safety, please close this panel.\n\n" +
      "— Young Innovators Club • Dharmapala Vidyalaya",
    bodyStyles
  );
}

/**
 * Runs the detection loop. Called once from SecurityProvider on mount.
 * Only activates in production builds.
 */
export function initAntiDebug(): void {
  // Never run in development
  if (import.meta.env.DEV) return;

  // Check every 2 seconds (non-aggressive interval)
  intervalId = setInterval(() => {
    if (adminBypass) return;

    const open = isDevToolsOpenBySize();

    // Only act on state change (opened → print warning once)
    if (open && !devtoolsOpen) {
      devtoolsOpen = true;
      printWarning();
    } else if (!open && devtoolsOpen) {
      devtoolsOpen = false;
    }
  }, 2000);
}

/**
 * Tears down the detection loop. Called from SecurityProvider cleanup.
 */
export function destroyAntiDebug(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  devtoolsOpen = false;
}

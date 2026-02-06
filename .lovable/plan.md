

# Production Hardening: Minification, Tree-Shaking, Console Removal & Runtime Protections

## What This Does
Adds four layers of production security to your website while keeping full debugging access for CMS admins.

---

## 1. Enhanced Vite Production Build (`vite.config.ts`)

**Already in place:** esbuild minification, console/debugger dropping, no source maps in production, tree-shaking, code splitting.

**Additions:**
- Switch to **Terser** minifier for more aggressive mangling (variable name obfuscation, dead code elimination)
- Add `toplevel: true` and `passes: 3` for deeper minification
- Remove all comments from output
- Add asset hashing for cache-busting

## 2. Anti-Debugging Runtime System (`src/lib/antiDebug.ts`)

New file with production-only protections:
- **DevTools detection** via `window.outerWidth/innerWidth` delta and `debugger` timing checks
- **Console override** -- replaces `console.log/warn/info/debug` with no-ops in production
- **Keyboard shortcut blocking** -- prevents F12, Ctrl+Shift+I/J/C on public pages
- **Right-click prevention** on public pages
- **Periodic checks** every 2 seconds for DevTools open state
- On detection: redirects to home page or clears sensitive DOM content

**Admin bypass:** Checks `sessionStorage` flag set after verifying admin role via the existing `RoleContext`. CMS admins retain full debugging capability.

## 3. Security Middleware Update (`src/lib/securityMiddleware.tsx`)

- Import and initialize the anti-debug system on mount
- Pass admin status from auth context to control bypass
- Only activate protections when `import.meta.env.PROD` is true

## 4. App Integration (`src/main.tsx`)

- No structural changes needed; SecurityProvider already wraps the app
- Anti-debug initializes inside SecurityProvider's useEffect

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/antiDebug.ts` | Runtime anti-debugging protections |

## Files to Modify

| File | Changes |
|------|---------|
| `vite.config.ts` | Switch to Terser, add aggressive mangling options |
| `src/lib/securityMiddleware.tsx` | Initialize anti-debug, admin bypass logic |

---

## Technical Details

### Terser Config (vite.config.ts)
- `minify: 'terser'` with `compress.passes: 3`, `drop_console: true`, `drop_debugger: true`
- `mangle.toplevel: true` for maximum variable name mangling
- `format.comments: false` to strip all comments

### Anti-Debug Checks
- Timing-based: measures execution time of `debugger` statement (>100ms = DevTools open)
- Dimension-based: compares outer/inner window size (>160px difference = DevTools docked)
- Interval: runs checks every 2 seconds, cleans up on unmount
- All checks are no-ops in development mode (`import.meta.env.DEV`)

### Admin Bypass Flow
1. User logs into CMS
2. RoleContext verifies admin/editor role
3. SecurityProvider sets `sessionStorage.__admin_verified = '1'`
4. Anti-debug checks this flag before activating protections
5. Flag cleared on logout


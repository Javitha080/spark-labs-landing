

# Fix & Upgrade Plan

## Issues to Address

1. **406 Error on profiles queries** -- RLS blocks non-admin users from reading other users' profiles in `useRealtimeAnalytics.ts` and `AdminLayout.tsx`
2. **Active Users accuracy & spam reduction** -- `useSessionTracking` fires too many updates; `fetchActiveUsers` polls every 30s AND triggers on every session change event
3. **Header compression in Hero** -- Header nav items are cramped at certain viewport sizes
4. **Hero scroll indicator** -- Hide initially, reveal on scroll
5. **Loading animation upgrade** -- Real progress bar tied to actual page load, then blur-transition reveal
6. **STEM Learning Hub as separate page in header nav**
7. **Cloudflare deployment guide**

---

## 1. Fix 406 Profiles Error

**Root cause**: `useRealtimeAnalytics.ts` line 90-93 queries `profiles` for all active user IDs, but RLS only allows users to see their own profile (unless admin). Non-admin CMS users get 406.

**Fix**: Use `.maybeSingle()` instead of `.single()` where appropriate, and for the active users feature, add a broader SELECT policy that allows any authenticated user to read basic profile info (full_name, avatar_url) -- OR create a database view that exposes only public fields.

**Database migration**:
- Add an RLS policy: "Authenticated users can read basic profile info" on `profiles` for SELECT, so that CMS users can see active user names/avatars.

Alternatively, since this is a CMS-only feature and all CMS users are authenticated with roles, a simpler policy `auth.uid() IS NOT NULL` for SELECT is acceptable here (profiles only contain name, email, avatar -- no sensitive data beyond what CMS users should see).

**Code changes**:
- `src/hooks/useRealtimeAnalytics.ts`: Change `.single()` calls to `.maybeSingle()` where used
- `src/pages/admin/Analytics.tsx` line 93: Change `.single()` to `.maybeSingle()`

---

## 2. Active Users -- Accurate & No Spam

**Current problems**:
- `useSessionTracking` listens to mousemove, keydown, click, scroll -- all debounced to 5s but still noisy
- `fetchActiveUsers` runs every 30s via interval AND on every user_sessions realtime change
- Every session UPDATE triggers a realtime event which calls `fetchActiveUsers` again (cascade)

**Fix**:
- `useSessionTracking.ts`: Increase `ACTIVITY_DEBOUNCE` from 5000ms to 30000ms (30s). Remove `mousemove` and `scroll` listeners (too noisy). Keep only `keydown` and `click`.
- `useRealtimeAnalytics.ts`: Remove the `fetchActiveUsers()` call from the user_sessions realtime handler (it already runs on a 30s interval). Only keep the realtime event notification for INSERT (new session), not UPDATE.
- Increase the refresh interval from 30s to 60s.

---

## 3. Header Compression Fix

**Problem**: The header nav pill container tries to fit 8 section links + Blog in a rounded pill. On medium-large screens (1024-1280px), items get compressed.

**Fix in `src/components/Header.tsx`**:
- Reduce nav item padding from `px-5` to `px-3` and text from `text-[10px]` to `text-[9px]` for tighter fit
- Add a horizontal scroll wrapper for the nav pill on screens where items overflow
- Remove the duplicate "Logo" placeholder div (line 131-133) that wastes header space
- Add STEM Hub link to the header nav items

---

## 4. Hero Scroll Indicator -- Hidden First, Reveal on Scroll

**Fix in `src/components/Hero.tsx`**:
- The scroll indicator at the bottom should start hidden (`opacity: 0`) and only appear after 2-3 seconds delay
- When user scrolls past the hero (scrollY > 100), hide it with fade-out
- Use `useTransform` on `scrollY` to control opacity: visible only when scrollY is between 0-300

---

## 5. Loading Animation Upgrade

**Current AppLoader**: Shows a fake timed progress bar (3.5s minimum). Not tied to real loading.

**Upgrade in `src/components/loading/AppLoader.tsx`**:
- Track real loading: monitor when the DOM content is ready and when lazy-loaded route chunks finish
- Progress bar phases: 0-60% fast (CSS/JS loaded), 60-90% (data fetching), 90-100% (render complete)
- When page is fully loaded, show a "scroll down" text with animated chevron
- On scroll, blur the loading screen out and reveal the page underneath with a smooth transition
- Use `IntersectionObserver` or scroll event to trigger the blur transition

**Implementation**:
- Phase 1: Loading bar fills based on actual resource loading (use `performance.getEntriesByType`)
- Phase 2: At 100%, loading screen stays visible but shows "Scroll to explore" text with bouncing arrow
- Phase 3: On scroll, apply `backdrop-filter: blur()` transition and `opacity: 0` to loading screen, revealing page

---

## 6. STEM Learning Hub in Header

**Changes**:
- `src/components/Header.tsx`: Add "STEM" as a nav link (like Blog) pointing to `/stem-learning-hub`
- `src/App.tsx`: Change the STEM route from `/blog/stem-learning-hub` to `/stem-learning-hub` (standalone page)
- Update canonical URL in `StemLearningHub.tsx`

---

## 7. Cloudflare Deployment Guide

**Create `CLOUDFLARE_DEPLOY.md`** with:
- Cloudflare Pages setup instructions
- Build settings (command: `npm run build`, output: `dist`)
- SPA redirect rules (`_redirects` file or `_routes.json`)
- Environment variables configuration
- Custom domain setup
- Security headers via `_headers` file (matching current netlify.toml headers)
- Service Worker considerations for Cloudflare

Also create `public/_headers` file for Cloudflare Pages (same security headers as netlify.toml).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useRealtimeAnalytics.ts` | Remove fetchActiveUsers from UPDATE handler, increase interval to 60s |
| `src/hooks/useSessionTracking.ts` | Increase debounce to 30s, remove mousemove/scroll listeners |
| `src/pages/admin/Analytics.tsx` | Change `.single()` to `.maybeSingle()` on profiles query |
| `src/components/Header.tsx` | Remove placeholder logo div, reduce nav padding, add STEM link |
| `src/components/Hero.tsx` | Scroll-triggered reveal for scroll indicator |
| `src/components/loading/AppLoader.tsx` | Real progress tracking, scroll-to-reveal transition |
| `src/App.tsx` | Change STEM route to `/stem-learning-hub` |
| `src/pages/StemLearningHub.tsx` | Update canonical URL |

## Files to Create

| File | Purpose |
|------|---------|
| `CLOUDFLARE_DEPLOY.md` | Deployment guide for Cloudflare Pages |
| `public/_headers` | Cloudflare Pages security headers |

## Database Migration

Add a broader SELECT policy on `profiles` for authenticated users:
```sql
DROP POLICY IF EXISTS "Users can view own or admins view all" ON profiles;
CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
```

This is safe because profiles only contain: id, email, full_name, avatar_url, created_at, updated_at -- all appropriate for CMS users to see each other.

## Implementation Order

1. Database migration (fix 406 error)
2. Fix useSessionTracking spam
3. Fix useRealtimeAnalytics accuracy
4. Fix Analytics.tsx .single() calls
5. Header fix + STEM link
6. Hero scroll indicator
7. AppLoader upgrade
8. STEM route change
9. Cloudflare guide + headers file

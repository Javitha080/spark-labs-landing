

# Comprehensive CMS & Landing Page Upgrade Plan

## Overview

This plan covers 8 major areas: Hero section redesign, CMS profile management, Analytics bug fix with charts, Blog AI media upgrade, full responsive design fixes, Activity Log completion, Import/Export removal, and Projects upgrade.

---

## 1. Hero Section - Modern UI/UX Redesign

### Current State
The hero has a typing animation, floating cards, and decorative circles. It works but follows older patterns.

### Changes to `src/components/Hero.tsx`
- Replace the abstract circle/floating-card right panel with a large **3D perspective card stack** showing real project images from the database
- Add **horizontal scroll marquee** of partner logos or achievement badges below the hero text
- Implement a **gradient mesh background** using CSS `conic-gradient` instead of static radial gradients
- Add a **scroll-down indicator** (animated bouncing chevron) at the bottom
- Improve mobile layout: full-width text with no hidden content, larger touch targets
- Add a **stats counter row** (animated count-up): "100+ Members", "50+ Projects", "20+ Events" pulling real counts from the database
- add scroll triggering animations to it
---

## 2. User Profile Management (All Roles)

### New Page: `src/pages/admin/ProfileSettings.tsx`
A dedicated CMS page where any logged-in CMS user can:
- **View and edit their display name**
- **Change their password** (via the existing `admin-update-user` edge function, modified to allow self-updates)
- **Upload and change their profile photo** (using the existing `avatars` storage bucket)
- See their current role (read-only)
- See their email (read-only)

### Edge Function Update: `supabase/functions/admin-update-user/index.ts`
- Add a check: if `userId === requestingUserId`, allow the update without requiring admin role
- This lets any authenticated user update their own profile/password

### Integration
- Add "Profile Settings" nav item to `AdminLayout.tsx` (available to all roles, not permission-gated)
- Add route in `App.tsx`: `/admin/profile`
- Use the existing `avatars` bucket with its current RLS policies (users manage own folders)

---

## 3. Analytics - Fix "Connecting..." Bug & Add Charts

### Bug Fix
The "Connecting..." status persists because the Supabase Realtime channel subscription may fail silently or take long to connect. 

**Fix in `src/hooks/useRealtimeAnalytics.ts`:**
- Add a **timeout** (5 seconds): if still "connecting" after timeout, set status to "connected" with a fallback note (data still works via polling)
- Add error retry logic for the channel subscription
- Ensure `fetchActiveUsers` and `fetchCounts` complete before showing the connecting status

### Add Charts using Recharts (already installed)
**Update `src/pages/admin/Analytics.tsx`:**
- **Enrollment Trend Line Chart**: Show enrollments over the last 30 days as a line/area chart
- **Interest Distribution Pie Chart**: Replace the progress bar visualization with a proper `PieChart` from Recharts
- **Grade Distribution Bar Chart**: Replace progress bars with a horizontal `BarChart`
- **Content Overview Radar Chart**: Show blog, projects, gallery, events, team counts as a radar chart
- **Weekly Activity Heatmap**: Simple grid showing activity intensity per day
- Add a **System Health** card showing connection status, last data refresh time, and database response time

---

## 4. Blog Editor - AI with Google Images & Video Support

### Update `src/pages/admin/BlogEditor.tsx`
- Add a **"Media" section** in the AI assistant panel with:
  - **Google Image search**: Use a text input to search and insert relevant images by URL
  - **Video embed**: Input field for YouTube/Vimeo URLs that auto-generates embed HTML
  - **Image URL insert**: Direct URL input for any image source
  - full image and video preview 
- The AI prompt system will be enhanced to include instructions for suggesting image placement markers in generated content
- Add a **media toolbar** in the rich text editor with buttons for:
  - Insert image (by URL or search)
  - Insert video embed
  - Insert divider/separator

### Update `src/components/blog/RichTextEditor.tsx`
- Add image insertion capability via the TipTap Image extension (already installed)
- Add video embed support using an iframe node extension
- Add drag-and-drop reordering for media blocks

### Error Handling Improvements
- Add retry logic with exponential backoff for AI generation failures
- Show inline validation errors for media URLs
- Add a "Preview" mode that renders the content exactly as it would appear on the blog
- Network connectivity check before any AI/save operations
- upgrade with that image url support with website security in network
---

## 5. Full Mobile & Responsive Design Fix

### Global CSS Updates (`src/index.css`)
- Add container query support for cards and panels
- Fix font scaling: use `clamp()` for all heading sizes
- Ensure minimum touch target size of 44px on all interactive elements

### Component-Specific Fixes

**Header (`src/components/Header.tsx`)**
- The hamburger menu animation uses CSS `animate-slide-in-right` which does not re-trigger on re-opens. Fix by using `framer-motion` `AnimatePresence` with proper key-based re-mounting
- Reduce logo text size on very small screens (320px)
- Fix z-index conflict between menu overlay (z-40) and header (z-150)

**Events (`src/components/Events.tsx`)**
- Timeline dots and lines are hidden on mobile (`hidden md:block`) -- replace with a simpler stacked card layout
- Fix the featured event card text overflow on small screens
- Make tab triggers horizontally scrollable on mobile instead of wrapping

**AdminLayout (`src/components/admin/AdminLayout.tsx`)**
- Fix sidebar navigation overflow on shorter screens
- Add safe area padding for notched phones (env(safe-area-inset-*))
- Ensure forms in CMS pages are single-column on mobile

**Projects landing page (`src/components/Projects.tsx`)**
- The bento grid `auto-rows-[350px]` causes content overflow on mobile. Switch to `auto-rows-auto` on small screens
- Fix card content clipping when descriptions are long

**Blog Editor (`src/pages/admin/BlogEditor.tsx`)**
- The split-view editor is unusable on mobile. Disable split view below 768px and show a toggle instead
- Make the AI panel collapsible on mobile

### Device Breakpoints Covered
- 320px (mini phones like iPhone SE)
- 360-390px (standard phones)
- 414px (larger phones)
- 768px (tablets)
- 820-834px (iPad variants)
- 1024px+ (desktop)
- Foldable support: handle `screen-spanning` media queries

---

## 6. Complete Activity Log (`src/pages/admin/ActivityLog.tsx`)

### Current State
The activity log reconstructs activities by querying multiple tables separately. It lacks:
- User session tracking (logins/logouts)
- Edit/update tracking (only shows creates)
- Real-time updates

### New Database Table
Create an `activity_log` table for proper audit logging:

```text
Table: activity_log
Columns:
- id (uuid, PK, default gen_random_uuid())
- user_id (uuid, nullable)
- user_email (text)
- user_name (text)
- action (text) -- create, update, delete, login, logout, publish
- resource_type (text) -- enrollment, blog_post, event, gallery, project, team_member, session
- resource_id (text)
- resource_name (text)
- details (jsonb)
- ip_address (text)
- created_at (timestamptz, default now())

RLS: Admins can SELECT. System can INSERT (via service role or trigger).
```

### Upgrade `src/pages/admin/ActivityLog.tsx`
- Fetch from the new `activity_log` table instead of reconstructing from multiple tables
- Add **real-time updates** via Supabase Realtime subscription
- Add **user avatars** next to each activity entry
- Add **pagination** (load more / infinite scroll) instead of fixed limits
- Add a **timeline visualization** with date grouping (Today, Yesterday, This Week, etc.)
- Keep the existing CSV export and filtering functionality

---

## 7. Remove Import/Export

### Changes
- Delete `src/pages/admin/BulkImportExport.tsx`
- Remove the route from `src/App.tsx` (line 102: `import-export` route)
- Remove the nav item from `src/components/admin/AdminLayout.tsx` (line 226: import-export entry)
- Remove the lazy import from `src/App.tsx` (line 31)

---

## 8. Projects Upgrade - CMS & Landing Page

### CMS (`src/pages/admin/ProjectsManager.tsx`)
- Add **drag-and-drop reordering** for display_order using mouse/touch events
- Add **bulk actions**: select multiple projects and delete or toggle featured
- Add **image preview modal** with zoom capability
- Add **status field**: draft, active, archived (requires schema update)
- Add **team members** association: link projects to team members who worked on them
- Improve the form with a **step-by-step wizard** for larger projects (basic info -> media -> settings)

### Landing Page (`src/components/Projects.tsx`)
- Add **category filter tabs** at the top (All, Robotics, AI, IoT, etc.)
- Add **hover card** showing full project description on desktop
- Improve the bento grid with **masonry layout** that adapts to content height
- Add **"View All Projects"** button linking to a dedicated `/projects` page (optional, can be a scrollable section)
- Fix mobile: cards should be full-width stacked with consistent height

### Schema Update
Add a `status` column to the `projects` table:
```text
ALTER TABLE projects ADD COLUMN status text DEFAULT 'active';
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/admin/ProfileSettings.tsx` | User profile management page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Hero.tsx` | Modern redesign with stats, mesh gradient, scroll indicator |
| `src/pages/admin/Analytics.tsx` | Recharts integration, system health, bug fix |
| `src/hooks/useRealtimeAnalytics.ts` | Connection timeout fix, retry logic |
| `src/pages/admin/BlogEditor.tsx` | Media insertion, Google Image search, video embeds |
| `src/components/blog/RichTextEditor.tsx` | Image/video toolbar additions |
| `src/components/Header.tsx` | Hamburger menu fix with framer-motion, responsive |
| `src/components/Events.tsx` | Mobile-first responsive redesign |
| `src/components/Projects.tsx` | Category filters, masonry layout, mobile fix |
| `src/pages/admin/ProjectsManager.tsx` | Drag-drop, bulk actions, status field |
| `src/pages/admin/ActivityLog.tsx` | Real activity_log table, realtime, pagination |
| `src/components/admin/AdminLayout.tsx` | Add Profile nav, remove Import/Export, responsive fixes |
| `src/App.tsx` | Add profile route, remove import-export route |
| `src/index.css` | Responsive utilities, clamp typography, safe areas |
| `supabase/functions/admin-update-user/index.ts` | Allow self-updates for any authenticated user |

## Database Migrations Required

1. Create `activity_log` table with RLS (admin SELECT, system INSERT)
2. Add `status` column to `projects` table
3. Enable Realtime on `activity_log` table

## Implementation Order

1. Database migrations (activity_log table, projects status column)
2. Remove Import/Export (quick cleanup)
3. Profile Settings page + edge function update
4. Analytics bug fix + Recharts charts
5. Hero section redesign
6. Header hamburger menu fix + responsive
7. Events section responsive redesign
8. Blog editor media upgrade
9. Projects CMS + landing page upgrade
10. Activity Log completion
11. Global responsive CSS fixes
12. all data base data fetch on web socket method for fast and real time data fetching


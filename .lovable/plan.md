

## Fix Build Error and Complete Learning Hub CMS

### 1. Fix Critical Build Error
Remove the `@cloudflare/vite-plugin` import and plugin call from `vite.config.ts` (lines 5 and 26). The `workerd` binary is not available in this environment, preventing the app from starting entirely.

### 2. Create `course-content` Storage Bucket
The `FileUpload` component in `CourseBuilder` references a `course-content` bucket that doesn't exist. Create it via a database migration with public access and appropriate RLS policies so admins can upload course media (videos, images, documents).

### 3. Fix CSP to Allow YouTube Embeds
Update the `frame-src` directive in `vite.config.ts` to include `https://www.youtube.com` and `https://www.youtube-nocookie.com`, so classroom video embeds work.

### 4. Enhance CourseBuilder (Curriculum) with Missing CRUD

**Section operations to add:**
- Inline rename (edit button next to title, saves to database)
- Toggle published/draft status
- Persist drag-reorder to database (save `display_order` after reorder)

**Module operations to add:**
- Persist drag-reorder to database
- Toggle published/draft status per module

### 5. Enhance Classroom Tab with Admin Controls

Currently the Classroom tab is read-only (view learners, open classroom link). Add:
- Remove a learner from a classroom (delete enrollment)
- Reset a learner's progress
- Quick-enroll a user into a course directly from the classroom view

### Technical Details

**Files to modify:**
- `vite.config.ts` -- Remove cloudflare import (line 5) and plugin (line 26); update CSP frame-src
- `src/components/admin/learning/CourseBuilder.tsx` -- Add section rename, publish toggle, and reorder persistence for both sections and modules
- `src/pages/admin/LearningHubManager.tsx` -- Enhance ClassroomTab with enrollment management actions

**Database migration:**
- Create `course-content` storage bucket (public)
- Add RLS policies: authenticated users can upload, public can read


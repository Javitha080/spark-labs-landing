

## Complete Learning Hub: Token Identity, Classroom Content, Analytics & CMS UX

### Overview
This plan addresses 4 major areas: fixing the build error, creating a learner identity system based on enrollment forms, adding rich classroom content management, and improving the CMS with analytics charts.

---

### 1. Fix Critical Build Error
The `@cloudflare/vite-plugin` import on line 5 and `cloudflare()` plugin on line 27 of `vite.config.ts` must be removed. The `workerd` binary is not available in this environment, completely preventing the app from starting.

**File:** `vite.config.ts` -- Remove lines 5 and 27.

---

### 2. Learner Token Identity System

**Concept:** When a user fills the enrollment form (Full Name, Grade, Email, Phone), they receive a permanent "learner token" stored in `localStorage`. This token auto-identifies them on every visit without requiring login, enabling access to `/learning-hub`, `/my-learning`, course enrollments, and a personalized dashboard.

**Database changes:**
- New table `learner_tokens` with columns: `id (uuid)`, `enrollment_id (uuid, FK to enrollment_submissions)`, `token (text, unique)`, `browser_fingerprint (text)`, `name (text)`, `email (text)`, `grade (text)`, `phone (text)`, `created_at`, `last_seen_at`
- RLS: public can INSERT (for token creation), public can SELECT by token match, admins can view/manage all
- New table `learner_course_enrollments` linking learner tokens to courses: `id`, `learner_token_id (FK)`, `course_id (FK)`, `enrolled_at`, `progress (int)`, `completed_at`
- New table `learner_progress` for module-level tracking: `id`, `learner_token_id`, `course_id`, `module_id`, `is_completed`, `completed_at`

**Frontend changes:**
- New `LearnerContext` provider that checks `localStorage` for a saved token on mount, auto-fetches learner profile from the database
- If no token exists, redirect to enrollment form; after form submission, generate a UUID token, store it in `localStorage` and the database
- Browser fingerprint generated from `navigator.userAgent + screen dimensions + timezone` as a secondary identifier
- Update `MyLearning` page to work with learner tokens (not just Supabase Auth)
- Update `Classroom` page to track progress via learner tokens
- Learner dashboard showing: name, grade, enrolled courses, completion stats, XP

**Files to create:**
- `src/context/LearnerContext.tsx` -- Learner identity provider
- `src/lib/fingerprint.ts` -- Browser fingerprint utility

**Files to modify:**
- `src/pages/MyLearning.tsx` -- Support learner token identity alongside auth
- `src/pages/Classroom.tsx` -- Track progress via learner tokens
- `src/pages/LearningHub.tsx` -- Gate enrollment behind learner identity
- `src/App.tsx` -- Wrap with `LearnerProvider`

---

### 3. Rich Classroom Content Management

**Concept:** Each module can have multiple content blocks (not just a single URL). Content types include: videos (YouTube/uploaded), images, text/HTML, external links, code snippets (Arduino/C++/Python), and Tinkercad embeds.

**Database changes:**
- New table `module_content_blocks` with columns: `id (uuid)`, `module_id (uuid, FK)`, `block_type (text)` -- values: `video`, `image`, `text`, `link`, `code`, `tinkercad`, `embed`
- Additional columns: `title (text)`, `content (text)` -- stores HTML for text, URL for video/image/link/embed, code string for code blocks
- `code_language (text)` -- for code blocks: `arduino`, `python`, `cpp`, `javascript`
- `display_order (int)`, `is_published (boolean)`, `created_at`, `updated_at`
- RLS: admins can CRUD, public can read published blocks

**CMS changes (CourseBuilder.tsx):**
- When editing a module, show a "Content Blocks" section below the existing form
- Add/edit/delete/reorder content blocks within each module
- Each block type has a specialized editor:
  - **Video:** URL input (YouTube/upload) with preview
  - **Image:** URL or file upload with preview
  - **Text:** Rich text editor (reuse existing RichTextEditor)
  - **Code:** Code editor textarea with language selector
  - **Link:** URL + title + description
  - **Tinkercad/Embed:** iframe URL input with preview

**Classroom page updates:**
- Render content blocks in order below the main video player
- Code blocks rendered with syntax highlighting styling
- Tinkercad/embed blocks rendered as responsive iframes
- Images rendered with lightbox-style viewing

**Files to create:**
- `src/components/admin/learning/ContentBlockEditor.tsx` -- Content block CRUD UI for CMS

**Files to modify:**
- `src/components/admin/learning/CourseBuilder.tsx` -- Add content blocks section to module editor dialog
- `src/pages/Classroom.tsx` -- Render multiple content blocks per module

---

### 4. Dashboard Analytics Charts

**Add to the DashboardTab in LearningHubManager.tsx:**
- **Enrollment Trends Chart:** Line chart (Recharts) showing enrollments per week/month over the last 3 months
- **Course Completion Rates:** Bar chart showing completion percentage per course
- Data fetched from `learning_enrollments` with date grouping

**Files to modify:**
- `src/pages/admin/LearningHubManager.tsx` -- Add Recharts charts to DashboardTab, import from `recharts`

---

### 5. CMS UI/UX Improvements

- Add confirmation dialogs (replace `confirm()` and `prompt()` with proper Dialog components) throughout CourseBuilder
- Add section creation dialog with title + description fields instead of `prompt()`
- Module creation dialog instead of `prompt()`
- Add loading states and skeleton loaders to all tabs
- Add empty state illustrations with call-to-action buttons
- Improve card hover effects and visual hierarchy
- Add breadcrumb navigation within Course Manager sub-tabs

**Files to modify:**
- `src/components/admin/learning/CourseBuilder.tsx` -- Replace prompt/confirm with dialogs
- `src/pages/admin/LearningHubManager.tsx` -- UI polish across tabs

---

### Implementation Order

1. Fix build error (vite.config.ts) -- unblocks everything
2. Database migrations (learner_tokens, learner_course_enrollments, learner_progress, module_content_blocks)
3. Learner identity system (context + fingerprint + enrollment form integration)
4. Rich classroom content (content block editor + classroom renderer)
5. Analytics charts (dashboard)
6. CMS UX improvements (dialogs, loading states)

### Database Migration Summary

```text
Tables to create:
+---------------------------+
| learner_tokens            |
|---------------------------|
| id (uuid, PK)             |
| enrollment_id (uuid, FK)  |
| token (text, unique)      |
| browser_fingerprint (text)|
| name, email, grade, phone |
| created_at, last_seen_at  |
+---------------------------+

+---------------------------+
| learner_course_enrollments|
|---------------------------|
| id (uuid, PK)             |
| learner_token_id (uuid,FK)|
| course_id (uuid, FK)      |
| enrolled_at, progress     |
| completed_at              |
+---------------------------+

+---------------------------+
| learner_progress          |
|---------------------------|
| id (uuid, PK)             |
| learner_token_id (uuid,FK)|
| course_id, module_id      |
| is_completed, completed_at|
+---------------------------+

+---------------------------+
| module_content_blocks     |
|---------------------------|
| id (uuid, PK)             |
| module_id (uuid, FK)      |
| block_type (text)         |
| title, content            |
| code_language (text)      |
| display_order, is_published|
| created_at, updated_at    |
+---------------------------+
```


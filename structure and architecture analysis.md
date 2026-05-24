---
  Spark Labs Landing - Full Codebase Structure

  Project Overview

  Name: yicdvp (Spark Labs Landing)
  Type: React SPA + Cloudflare Workers backend
  Domain: dvpyic.dpdns.org
  Stack: React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + Supabase + Cloudflare Workers (Hono)

  ---
  Root Configuration Files

  spark-labs-landing/
  ├── package.json              # Dependencies & scripts
  ├── vite.config.ts            # Vite + Cloudflare plugin + security headers + code splitting
  ├── wrangler.json             # Cloudflare Workers config (worker name: "yic")
  ├── tailwind.config.ts        # Tailwind theme customization
  ├── tsconfig.json             # Base TS config
  ├── tsconfig.app.json         # App TS config
  ├── tsconfig.node.json        # Node TS config
  ├── tsconfig.worker.json      # Worker TS config
  ├── worker-configuration.d.ts # Cloudflare env type defs
  ├── eslint.config.js          # ESLint config
  ├── postcss.config.js         # PostCSS (Tailwind + Autoprefixer)
  ├── components.json           # shadcn/ui config
  ├── netlify.toml              # Netlify deploy config (alt deployment)
  ├── index.html                # SPA entry point
  ├── .env                      # Environment variables (Supabase keys)
  ├── .gitignore
  ├── ADMIN_SETUP.md            # Admin setup guide
  ├── CLOUDFLARE_DEPLOY.md      # Cloudflare deployment guide
  ├── CLOUDFLARE_EMAIL_SETUP.md # Email setup guide
  ├── SECURITY_FIXES_SUMMARY.md # Security audit summary
  └── README.md

  Source Structure (src/)

  Entry Points

  src/
  ├── main.tsx                  # App entry - wraps App in SecurityProvider
  ├── App.tsx                   # Router, providers, lazy-loaded routes
  ├── App.css                   # Global app styles
  ├── index.css                 # Tailwind base + custom CSS
  └── vite-env.d.ts             # Vite type declarations

  Provider Hierarchy (top to bottom)

  SecurityProvider              # XSS/security protections
    QueryClientProvider         # React Query
      HelmetProvider            # SEO meta tags
        ThemeProvider           # Dark/light theme (default: dark)
          ErrorBoundary         # Global error catching
            AppLoader           # Cinematic loading screen
              RoleProvider      # Admin role/permissions (Supabase auth)
                EnrollmentProvider  # Student enrollment state
                  GamificationProvider  # Achievements, XP, streaks
                    LearnerProvider     # Learning progress tracking
                      TooltipProvider   # UI tooltips
                        BrowserRouter   # React Router v6

  ---
  Pages (src/pages/)

  Public Pages

  ┌───────────────────────────────────┬────────────────────┬─────────────────────────┐
  │               Route               │        Page        │       Description       │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /                                 │ Index.tsx          │ Landing/home page       │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /about                            │ AboutPage.tsx      │ About section           │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /projects                         │ ProjectsPage.tsx   │ Projects listing        │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /project/:id                      │ ProjectDetail.tsx  │ Single project view     │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /team                             │ TeamPage.tsx       │ Team members            │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /events                           │ EventsPage.tsx     │ Events listing          │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /gallery                          │ GalleryPage.tsx    │ Photo gallery           │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /contact                          │ ContactPage.tsx    │ Contact form            │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /blog                             │ Blog.tsx           │ Blog listing            │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /blog/:slug                       │ BlogPost.tsx       │ Single blog post        │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /learning-hub                     │ LearningHub.tsx    │ Course catalog          │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /learning-hub/course/:slug        │ CourseDetail.tsx   │ Course details          │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /learning-hub/classroom/:courseId │ Classroom.tsx      │ Active learning         │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /learning-hub/workshop/:id        │ WorkshopDetail.tsx │ Workshop details        │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /learning-hub/my-learning         │ MyLearning.tsx     │ User's enrolled courses │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /privacy-policy                   │ PrivacyPolicy.tsx  │ Privacy policy          │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /terms-of-service                 │ TermsOfService.tsx │ Terms of service        │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ /error/:code                      │ ErrorPage.tsx      │ Error display           │
  ├───────────────────────────────────┼────────────────────┼─────────────────────────┤
  │ *                                 │ NotFound.tsx       │ 404 page                │
  └───────────────────────────────────┴────────────────────┴─────────────────────────┘

  Admin Pages (under /admin)

  ┌──────────────────────┬──────────────────────────┬──────────────────────────┐
  │        Route         │           Page           │       Description        │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/login         │ AdminLogin.tsx           │ Admin authentication     │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin (index)       │ Analytics.tsx            │ Dashboard/analytics      │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/teachers      │ TeachersManager.tsx      │ Manage teachers          │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/events        │ EventsManager.tsx        │ Manage events            │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/team          │ TeamManager.tsx          │ Manage team members      │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/schedule      │ ScheduleManager.tsx      │ Manage schedule          │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/projects      │ ProjectsManager.tsx      │ Manage projects          │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/gallery       │ GalleryManager.tsx       │ Manage gallery           │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/enrollments   │ EnrollmentManager.tsx    │ Manage enrollments       │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/users         │ UsersManager.tsx         │ Manage users             │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/roles         │ RolesManager.tsx         │ Manage roles/permissions │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/notifications │ NotificationsManager.tsx │ Manage notifications     │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/blog          │ BlogManager.tsx          │ Manage blog posts        │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/blog/edit     │ BlogEditor.tsx           │ Blog rich text editor    │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/activity-log  │ ActivityLog.tsx          │ View activity logs       │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/profile       │ ProfileSettings.tsx      │ Admin profile settings   │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/landing       │ LandingPageManager.tsx   │ Edit landing page CMS    │
  ├──────────────────────┼──────────────────────────┼──────────────────────────┤
  │ /admin/learning-hub  │ LearningHubManager.tsx   │ Manage courses/modules   │
  └──────────────────────┴──────────────────────────┴──────────────────────────┘

  ---
  Components (src/components/)

  Landing Page Sections

  components/
  ├── Hero.tsx                  # Main hero section
  ├── About.tsx                 # About section
  ├── Projects.tsx              # Projects showcase
  ├── Team.tsx                  # Team members display
  ├── Teachers.tsx              # Teachers display
  ├── Events.tsx                # Events section
  ├── Gallery.tsx               # Photo gallery
  ├── Impact.tsx                # Impact/stats section
  ├── Stem.tsx                  # STEM education section
  ├── Contact.tsx               # Contact form
  ├── JoinUs.tsx                # Call-to-action / enrollment
  ├── Map.tsx                   # MapLibre GL map
  ├── Footer.tsx                # Site footer
  ├── Header.tsx                # Navigation header
  ├── InnovationChatbot.tsx     # AI chatbot widget
  └── ThemeProvider.tsx          # Theme context (next-themes)

  Home Page Components

  components/home/
  ├── Hero.tsx                  # Alternate hero
  ├── FeatureGrid.tsx           # Feature cards grid
  └── StatsSection.tsx          # Statistics display

  Admin Components

  components/admin/
  ├── AdminLayout.tsx           # Admin sidebar + outlet (541 lines)
  ├── ThemeToggle.tsx           # Dark/light toggle
  └── learning/
      ├── CourseBuilder.tsx      # Course creation form
      ├── ContentBlockEditor.tsx # CMS content block editor
      └── RichTextEditor.tsx     # TipTap rich text editor

  Blog Components

  components/blog/
  ├── BlogCard.tsx              # Blog post card
  ├── BlogEmptyState.tsx        # Empty state display
  ├── BlogGuide.tsx             # Blog writing guide
  ├── ReadingPreferences.tsx    # Font size, theme prefs
  ├── RichTextEditor.tsx        # Blog TipTap editor
  └── TableOfContents.tsx       # Auto-generated TOC

  Animation Components

  components/animation/
  ├── ScrollAnimations.tsx      # Intersection observer animations
  ├── ScrollProgress.tsx        # Scroll progress indicator
  └── TextReveal.tsx            # Text reveal on scroll

  Loading Components

  components/loading/
  ├── AppLoader.tsx             # App startup loader
  ├── CinematicLoader.tsx       # Cinematic loading animation
  └── Logo3D.tsx                # 3D logo animation

  Learning Components

  components/learning/
  ├── FileUpload.tsx            # File upload (react-dropzone)
  └── VideoPlayer.tsx           # Video player (react-player)

  Effects

  components/effects/
  └── LaserFlow.tsx             # Laser flow visual effect

  Auth

  components/auth/
  └── LoginForm.tsx             # Login form component

  UI Components (shadcn/ui)

  components/ui/
  ├── accordion.tsx     ├── alert.tsx         ├── alert-dialog.tsx
  ├── aspect-ratio.tsx  ├── avatar.tsx        ├── badge.tsx
  ├── breadcrumb.tsx    ├── button.tsx        ├── calendar.tsx
  ├── card.tsx          ├── carousel.tsx      ├── chart.tsx
  ├── checkbox.tsx      ├── collapsible.tsx   ├── command.tsx
  ├── context-menu.tsx  ├── dialog.tsx        ├── drawer.tsx
  ├── dropdown-menu.tsx ├── form.tsx          ├── hover-card.tsx
  ├── input.tsx         ├── input-otp.tsx     ├── label.tsx
  ├── loading.tsx       ├── map.tsx           ├── menubar.tsx
  ├── navigation-menu.tsx ├── pagination.tsx  ├── popover.tsx
  ├── progress.tsx      ├── radio-group.tsx   ├── resizable.tsx
  ├── scroll-area.tsx   ├── select.tsx        ├── separator.tsx
  ├── sheet.tsx         ├── sidebar.tsx       ├── skeleton.tsx
  ├── slider.tsx        ├── sonner.tsx        ├── switch.tsx
  ├── table.tsx         ├── tabs.tsx          ├── textarea.tsx
  ├── toast.tsx         ├── toaster.tsx       ├── toggle.tsx
  ├── toggle-group.tsx  ├── tooltip.tsx       ├── use-toast.ts
  ├── ErrorBoundary.tsx ├── NeoCard.tsx       └── OptimizedImage.tsx

  ---
  State Management & Hooks

  Contexts

  contexts/
  └── RoleContext.tsx            # Admin roles: admin, user, content_creator, coordinator, editor

  context/
  ├── EnrollmentContext.tsx      # Enrollment form state
  ├── GamificationContext.tsx    # XP, achievements, streaks, leaderboard
  └── LearnerContext.tsx         # Course progress, enrolled courses

  Custom Hooks

  hooks/
  ├── useAutosave.ts            # Auto-save form data
  ├── useLearningRecommendations.ts  # AI course recommendations
  ├── use-mobile.tsx            # Mobile breakpoint detection
  ├── useRealtimeAnalytics.ts   # Supabase realtime analytics
  ├── useScrollAnimation.ts     # Scroll-triggered animations
  ├── useSessionTracking.ts     # User session tracking
  └── use-toast.ts              # Toast notification hook

  ---
  Backend / API

  Cloudflare Worker (src/worker/index.ts)

- Framework: Hono
- Auth: JWT via Supabase getUser()
- Endpoints:
  - GET /api/schedule — List schedule items
  - POST /api/schedule — Create schedule (auth required)
  - PUT /api/schedule/:id — Update schedule (auth required)
  - DELETE /api/schedule/:id — Delete schedule (auth required)
  - GET /api/activities — Aggregated activity log (enrollments, blogs, events, gallery, team, projects)
- Security: Input sanitization via sanitize-html, security headers middleware on /api/*

  Supabase Edge Functions (supabase/functions/)

  supabase/functions/
  ├── admin-create-user/        # Create user (admin)
  ├── admin-delete-user/        # Delete user (admin)
  ├── admin-update-user/        # Update user (admin)
  ├── blog-ai-assistant/        # AI blog writing assistant
  ├── discord-webhook/          # Discord notifications
  ├── innovation-chat/          # AI chatbot backend
  ├── send-contact-message/     # Contact form email
  ├── send-enrollment-notification/  # Enrollment email
  ├── send-enrollment-update/   # Enrollment status update email
  └── deno.json                 # Deno config for functions

  ---
  Database (Supabase - 37 tables)

  Core Tables

  ┌──────────────────┬────────────────────────────┐
  │      Table       │          Purpose           │
  ├──────────────────┼────────────────────────────┤
  │ profiles         │ User profiles              │
  ├──────────────────┼────────────────────────────┤
  │ roles            │ Role definitions           │
  ├──────────────────┼────────────────────────────┤
  │ user_roles       │ User-to-role mapping       │
  ├──────────────────┼────────────────────────────┤
  │ permissions      │ Permission definitions     │
  ├──────────────────┼────────────────────────────┤
  │ role_permissions │ Role-to-permission mapping │
  ├──────────────────┼────────────────────────────┤
  │ login_attempts   │ Login attempt tracking     │
  ├──────────────────┼────────────────────────────┤
  │ user_sessions    │ Session management         │
  ├──────────────────┼────────────────────────────┤
  │ users_management │ Admin user management view │
  └──────────────────┴────────────────────────────┘

  Content Tables

  ┌─────────────────────┬───────────────────────────────────────────┐
  │        Table        │                  Purpose                  │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ blog_posts          │ Blog articles (draft/in_review/published) │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ content_blocks      │ CMS content blocks (page/section/key)     │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ events              │ Events listing                            │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ gallery_items       │ Gallery photos                            │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ projects            │ Student projects                          │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ team_members        │ Team member profiles                      │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ team_members_public │ Public view of team members               │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ teachers            │ Teacher profiles                          │
  ├─────────────────────┼───────────────────────────────────────────┤
  │ schedule            │ Class schedule                            │
  └─────────────────────┴───────────────────────────────────────────┘

  Enrollment & Learning Tables

  ┌────────────────────────────┬────────────────────────────────┐
  │           Table            │            Purpose             │
  ├────────────────────────────┼────────────────────────────────┤
  │ enrollment_submissions     │ Student enrollment forms       │
  ├────────────────────────────┼────────────────────────────────┤
  │ enrollment_notifications   │ Enrollment email notifications │
  ├────────────────────────────┼────────────────────────────────┤
  │ enrollment_rate_limits     │ Rate limiting for enrollments  │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_courses           │ Course catalog                 │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_modules           │ Course modules                 │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_sections          │ Module sections                │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_resources         │ Downloadable resources         │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_workshops         │ Workshop events                │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_enrollments       │ Course enrollments             │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_progress          │ Module completion tracking     │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_discussions       │ Course discussions             │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_reviews           │ Course reviews                 │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_achievements      │ Achievement definitions        │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_user_interactions │ User activity tracking         │
  ├────────────────────────────┼────────────────────────────────┤
  │ learning_user_stats        │ Aggregated user stats          │
  ├────────────────────────────┼────────────────────────────────┤
  │ learner_course_enrollments │ Learner-specific enrollments   │
  ├────────────────────────────┼────────────────────────────────┤
  │ learner_progress           │ Learner progress tracking      │
  ├────────────────────────────┼────────────────────────────────┤
  │ learner_tokens             │ Gamification tokens            │
  ├────────────────────────────┼────────────────────────────────┤
  │ module_content_blocks      │ Rich content within modules    │
  └────────────────────────────┴────────────────────────────────┘

  Analytics Tables

  ┌──────────────────┬───────────────────────────┐
  │      Table       │          Purpose          │
  ├──────────────────┼───────────────────────────┤
  │ activity_log     │ Admin activity audit log  │
  ├──────────────────┼───────────────────────────┤
  │ analytics_events │ Frontend analytics events │
  └──────────────────┴───────────────────────────┘

  Enums

- app_role: admin | user | content_creator | coordinator | editor
- blog_post_status: draft | in_review | published

  ---
  Security Layer (src/lib/)

  lib/
  ├── security.ts               # XSS sanitization, CSP nonce generation
  ├── securityMiddleware.tsx     # React security provider wrapper
  ├── antiDebug.ts              # Anti-debugging protections
  ├── fingerprint.ts            # Browser fingerprinting
  ├── idorProtection.ts         # IDOR attack prevention
  ├── ssrfProtection.ts         # SSRF URL validation
  ├── gamification.ts           # Gamification logic/constants
  └── utils.ts                  # cn() utility (clsx + tailwind-merge)

  ---
  Types & Schemas

  types/
  ├── learning.ts               # Learning hub type definitions
  └── landing.ts                # Landing page types

  schemas/
  └── blog.ts                   # Zod blog validation schemas

  Public Assets

  public/
  ├── assets/
  │   ├── club logo.svg
  │   ├── school logo.svg
  │   └── unnamed.jpg
  ├── club-logo.png
  ├── manifest.json             # PWA manifest
  ├── offline.html              # Offline fallback page
  ├── placeholder.svg
  ├── robots.txt                # Search engine directives
  ├── sw.js                     # Service worker (offline support)
  └── _headers                  # Cloudflare Pages headers

  Database Migrations

- 46 migration files in supabase/migrations/ spanning from initial schema through learning hub, gamification, reviews, and rate
  limiting.

  ---
  Key Architecture Patterns

  1. Lazy Loading — All pages are lazy() loaded with Suspense fallback
  2. Code Splitting — Vite manual chunks: vendor-react, vendor-radix, vendor-motion, vendor-query, vendor-date, vendor-forms
  3. Dual Deployment — Cloudflare Workers (primary) + Netlify (fallback)
  4. CMS Pattern — content_blocks table for editable landing page content
  5. RBAC — Role-based access with 5 roles and granular permissions
  6. Gamification — XP, achievements, streaks, leaderboards in the learning hub
  7. Offline Support — Service worker + offline indicator + connectivity probing
  8. Security Hardened — CSP headers, input sanitization, anti-debug, fingerprinting, rate limiting, IDOR/SSRF protection

  ---
  Regarding your /skills command — the available skills I can use are:

- keybindings-help — Customize keyboard shortcuts
- simplify — Review changed code for quality/efficiency
- claude-api — Help build apps with the Claude API or Anthropic SDK

# Young Innovators Club

> The official web platform for the Young Innovators Club at Dharmapala Vidyalaya — a React SPA with a public site, learning hub, blog, and full admin CMS.

[![Cloudflare](https://img.shields.io/badge/deploy-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](http://dvpyic.dpdns.org)
[![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![React 19](https://img.shields.io/badge/frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Live site:** [dvpyic.dpdns.org](http://dvpyic.dpdns.org)

---

## Quick Start

```bash
# 1. Clone & install
git clone <repository-url> && cd spark-labs-landing
npm install

# 2. Set up environment variables
cp .env.example .env          # then fill in your keys (see below)

# 3. Run dev server
npm run dev                   # opens on http://localhost:8080
```

<details>
<summary><strong>Environment Variables</strong></summary>

Create a `.env` file in the project root:

```env
# Required — Supabase (see .env.example for placeholders)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Optional — Cloudflare Worker (server-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional — Email via Resend
VITE_RESEND_API_KEY=your-resend-key

# Optional — Cloudflare deployment
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

</details>

---

## What's Inside

| Area | Description |
|------|-------------|
| **Public Site** | Landing page, about, projects, team, events, gallery, contact |
| **Learning Hub** | Course catalog, gamified progress (XP, streaks, achievements, leaderboards) |
| **Blog** | Rich text posts with TipTap editor, table of contents, AI assistant |
| **Admin CMS** | Full dashboard at `/admin` with 4-role RBAC (`admin`, `editor`, `content_creator`, `coordinator`) for managing all content |
| **Innovation Chatbot** | AI-powered assistant for student queries |
| **Festive Themes** | Avurudu (Sri Lankan New Year) decorations, countdown, and games |

### Technical Highlights

- **PWA-ready** — service worker, offline fallback, installable
- **Security-hardened** — CSP, input sanitization, rate-limiting, IDOR/SSRF protection, anti-debugging
- **Dark/light mode** — system preference detection with manual toggle
- **Mobile-first** — responsive design with custom breakpoints
- **SEO-optimized** — meta tags, JSON-LD, sitemap, robots.txt
- **Lazy-loaded routes** — code-split for fast initial load

---

## Tech Stack

| | Technology |
|--|------------|
| **Frontend** | React 19 · TypeScript · Vite 7 (SWC) |
| **Styling** | Tailwind CSS 3 · shadcn/ui (Radix) · Framer Motion + GSAP (`useGSAP` from `@gsap/react`) |
| **Routing** | React Router v6 (lazy-loaded) |
| **Backend** | Cloudflare Workers (Hono) · Supabase (Postgres, Auth, Storage) |
| **Data** | TanStack React Query · Supabase Realtime |
| **Content** | TipTap (rich text) · Zod (validation) |
| **Infra** | Cloudflare Pages/Workers · Resend (email) |

---

## Project Structure

```
spark-labs-landing/
├── public/                  Static assets, PWA manifest, sitemap, robots.txt
├── src/
│   ├── App.tsx              Main app — routing & provider hierarchy
│   ├── main.tsx             Entry point
│   ├── index.css            Global styles & Tailwind directives
│   │
│   ├── components/
│   │   ├── ui/              shadcn/ui primitives (auto-generated — don't edit)
│   │   ├── admin/           Admin dashboard components
│   │   ├── blog/            Blog cards, editor, table of contents
│   │   ├── festive/         Avurudu theme (countdown, decorations, games)
│   │   ├── home/            Landing page sections (Hero, Features, Stats)
│   │   ├── learning/       Learning hub components
│   │   ├── loading/         App loader, cinematic intro
│   │   ├── animation/       Scroll animations, text reveal
│   │   └── *.tsx            Shared components (Header, Footer, Gallery, etc.)
│   │
│   ├── pages/               Route-level page components (all lazy-loaded)
│   │   ├── Index.tsx        Home page
│   │   ├── LearningHub.tsx  Course catalog
│   │   ├── Blog.tsx         Blog listing
│   │   └── admin/           15+ admin pages (Analytics, BlogManager, etc.)
│   │
│   ├── context/             StudentAuthContext, GamificationContext
│   ├── contexts/            RoleContext (RBAC)
│   ├── hooks/               Custom hooks (autosave, analytics, scroll, etc.)
│   ├── lib/                 Utilities (seo, security, gamification, hashing)
│   ├── schemas/             Zod validation schemas
│   ├── types/               Shared TypeScript types
│   ├── integrations/        Auto-generated Supabase client & types
│   └── worker/              Cloudflare Worker entry (Hono API at /api/*, 19 routes — server logic lives here, not in supabase/functions)
│
├── supabase/
│   └── migrations/          ~90 database migration SQL files
│
├── docs/                    PRDs and documentation
├── .env.example             Placeholder env keys (no secrets — copy to .env / .dev.vars)
├── vite.config.ts           Vite + SWC + chunk splitting
├── tailwind.config.ts       Custom breakpoints, animations, fonts
├── wrangler.json            Cloudflare Workers config
└── eslint.config.js         ESLint flat config
```

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Build + preview production output |
| `npm run check` | Full check: types + build + dry-run deploy |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run deploy:pages` | Deploy to Cloudflare Pages |

---

## Routes

<details>
<summary><strong>Public Routes</strong></summary>

| Path | Page |
|------|------|
| `/` | Home |
| `/about` | About |
| `/projects` | Projects listing |
| `/project/:id` | Project detail |
| `/team` | Team members |
| `/leadership` | Leadership / advisory board |
| `/events` | Events |
| `/gallery` | Photo gallery |
| `/contact` | Contact form |
| `/blog` | Blog listing |
| `/blog/:slug` | Blog post |
| `/privacy-policy` | Privacy policy |
| `/terms-of-service` | Terms of service |

</details>

<details>
<summary><strong>Learning Hub</strong></summary>

| Path | Page |
|------|------|
| `/learning-hub` | Course catalog |
| `/learning-hub/my-learning` | Enrolled courses |
| `/learning-hub/course/:slug` | Course detail |
| `/learning-hub/classroom/:courseId` | Virtual classroom |
| `/learning-hub/workshop/:id` | Workshop detail |

</details>

<details>
<summary><strong>Student Portal</strong></summary>

| Path | Page |
|------|------|
| `/student/login` | Student login |
| `/student/forgot-password` | Forgot password |
| `/student/reset-password` | Reset password |
| `/student/change-password` | Change password (guarded) |
| `/student/dashboard` | Student dashboard (guarded) |

</details>

<details>
<summary><strong>System</strong></summary>

| Path | Page |
|------|------|
| `/error/:code` | Error page (status-code driven) |

</details>

<details>
<summary><strong>Admin Panel</strong></summary>

| Path | Page |
|------|------|
| `/admin/login` | Admin login |
| `/admin` | Analytics dashboard |
| `/admin/analytics` | Analytics dashboard (alias) |
| `/admin/leadership` | Manage leadership |
| `/admin/teachers` | Manage teachers |
| `/admin/events` | Manage events |
| `/admin/team` | Manage team |
| `/admin/schedule` | Manage schedule |
| `/admin/projects` | Manage projects |
| `/admin/gallery` | Manage gallery |
| `/admin/enrollments` | Manage enrollments |
| `/admin/users` | Manage users |
| `/admin/roles` | Manage roles |
| `/admin/notifications` | Send notifications |
| `/admin/blog` | Manage blog |
| `/admin/blog/edit` | Edit blog posts |
| `/admin/activity-log` | Activity logs |
| `/admin/profile` | Profile settings |
| `/admin/landing` | Landing page content |
| `/admin/learning-hub` | Learning hub content |

</details>

---

## Role-Based Access Control

CMS roles (`src/lib/rbac.ts` `ROLE_PERMISSIONS`, enforced in DB via `is_admin` / `is_content_admin` helpers):

| Role | Access |
|------|--------|
| **admin** | Everything (`all`) — user management, role assignment |
| **editor** | `home`, `events`, `team`, `schedule`, `projects`, `gallery`, `blog`, `learning_hub` |
| **content_creator** | `blog`, `gallery`, `projects`, `learning_hub` |
| **coordinator** | `events`, `enrollments`, `schedule`, `notifications`, `learning_hub` |

---

## Gamification

Students earn **XP** for learning activities:

| Action | Reward |
|--------|--------|
| Complete lesson | 50 XP |
| Complete course | 500 XP |
| Daily login | 10 XP |
| Quiz passed (90%+) | 100 XP |
| 7-day streak | 200 XP |

The system also tracks **achievements**, **streaks**, **levels**, and **leaderboards**.

---

## Security

| Layer | Protection |
|-------|-----------|
| Headers | Strict Content Security Policy, HSTS, X-Content-Type-Options |
| Input | DOMPurify (client) + sanitize-html (server) |
| Rate Limiting | KV-backed Worker middleware with in-memory fallback |
| Bot Protection | Cloudflare Turnstile on public forms |
| IDOR | Object-level access control + Supabase RLS |
| SSRF | URL validation, domain allowlist & private IP blocking |
| Anti-Debug | Production DevTools detection & console warning |
| Identity | Browser fingerprint detection for learner sessions |

---

## Deployment

```bash
# Build for production
npm run build

# Deploy to Cloudflare Workers (recommended)
npm run deploy

# Or deploy to Cloudflare Pages
npm run deploy:pages
```

See the detailed guides:
- [Cloudflare Deployment](./CLOUDFLARE_DEPLOY.md)
- [Email Setup](./CLOUDFLARE_EMAIL_SETUP.md)
- [Admin Setup](./ADMIN_SETUP.md)

---

## Database Setup

1. Create a [Supabase](https://supabase.com) project
2. Apply the migrations in `supabase/migrations/` (via dashboard or CLI)
3. Configure Row Level Security (RLS) policies
4. Set up authentication providers

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m "Add amazing feature"`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

---

## Documentation

| File | Content |
|------|---------|
| [CLAUDE.md](./CLAUDE.md) | AI assistant instructions for this codebase |
| [ADMIN_SETUP.md](./ADMIN_SETUP.md) | Setting up admin accounts |
| [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) | Cloudflare deployment guide |
| [CLOUDFLARE_EMAIL_SETUP.md](./CLOUDFLARE_EMAIL_SETUP.md) | Email service configuration |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |

---

## Acknowledgments

- **Dharmapala Vidyalaya** — for supporting the Young Innovators Club
- **Supabase** — for the backend infrastructure
- **Cloudflare** — for edge computing
- **shadcn/ui** — for the component library

---

<p align="center">
  Made with ❤️ by the Young Innovators Club · Dharmapala Vidyalaya
</p>
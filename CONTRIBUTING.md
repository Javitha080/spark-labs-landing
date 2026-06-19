# Contributing to the Young Innovators Club Platform

Thank you for your interest in contributing to the **Young Innovators Club** platform! 🎉
This guide will help you get started, whether you're reporting a bug, suggesting a feature, or submitting code.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Setup](#local-setup)
  - [Environment Variables](#environment-variables)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Your First Contribution](#your-first-contribution)
- [Development Workflow](#development-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Commit Messages](#commit-messages)
  - [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
  - [TypeScript & React](#typescript--react)
  - [Styling & CSS](#styling--css)
  - [Animation Guidelines](#animation-guidelines)
  - [Component Guidelines](#component-guidelines)
- [Architecture Overview](#architecture-overview)
  - [Project Structure](#project-structure)
  - [Key Boundaries](#key-boundaries)
- [Testing & Verification](#testing--verification)
- [Deployment](#deployment)
- [Security](#security)
- [License](#license)

---

## Code of Conduct

By participating in this project, you agree to uphold a welcoming and inclusive environment. We expect all contributors to:

- **Be respectful** — Treat everyone with kindness and empathy.
- **Be constructive** — Offer helpful feedback and accept it graciously.
- **Be collaborative** — Work together towards shared goals.
- **Be inclusive** — Welcome people of all backgrounds and experience levels.

Harassment, discrimination, and disruptive behavior of any kind are not tolerated.

---

## Getting Started

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 22.x | See `.node-version` / `.nvmrc` |
| **npm** | 10+ | Comes with Node.js |
| **Git** | 2.40+ | For version control |
| **Wrangler** | 4.x | Installed as a dev dependency; used for Cloudflare Workers |

**Optional but recommended:**
- [Supabase CLI](https://supabase.com/docs/guides/cli) — for local database development
- [VS Code](https://code.visualstudio.com/) — recommended editor (see `.vscode/` for workspace settings)

### Local Setup

```bash
# 1. Fork the repository on GitHub
#    Click the "Fork" button at https://github.com/Javitha080/spark-labs-landing

# 2. Clone your fork
git clone https://github.com/<your-username>/spark-labs-landing.git
cd spark-labs-landing

# 3. Add the upstream remote
git remote add upstream https://github.com/Javitha080/spark-labs-landing.git

# 4. Install dependencies
npm install

# 5. Start the dev server
npm run dev
# → Opens on http://localhost:8080
```

### Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Service role key (Worker-side only, goes in `.dev.vars`) |
| `VITE_RESEND_API_KEY` | ❌ | Resend API key for email |
| `CLOUDFLARE_ACCOUNT_ID` | ❌ | Cloudflare account ID (deployment only) |
| `CLOUDFLARE_API_TOKEN` | ❌ | Cloudflare API token (deployment only) |

> [!CAUTION]
> **Never commit `.env`, `.env.*`, or `.dev.vars` files.** They contain live secrets and are gitignored. Only `.env.example` is tracked.

---

## How to Contribute

### Reporting Bugs

Found a bug? Open an issue on [GitHub Issues](https://github.com/Javitha080/spark-labs-landing/issues) with:

1. **Clear title** — Summarize the issue in a sentence.
2. **Steps to reproduce** — Numbered steps to trigger the bug.
3. **Expected behavior** — What should have happened.
4. **Actual behavior** — What actually happened.
5. **Environment** — Browser, OS, screen size, dark/light mode.
6. **Screenshots/recordings** — If applicable.

**Example title:** `[Bug] Gallery upload fails on Safari when image exceeds 5MB`

### Suggesting Features

Have an idea? Open an issue with the `enhancement` label:

1. **Problem statement** — What problem does this solve?
2. **Proposed solution** — How should it work?
3. **Alternatives considered** — What else did you think about?
4. **Target audience** — Students, admins, educators, or public visitors?

### Your First Contribution

Not sure where to start? Look for issues tagged:

- 🏷️ `good first issue` — Small, well-scoped tasks ideal for newcomers.
- 🏷️ `help wanted` — Tasks where the team needs community support.
- 🏷️ `documentation` — Improvements to docs, README, or guides.

---

## Development Workflow

### Branching Strategy

We use `main` as the production branch. All work happens in feature branches.

```
main
 └── feature/amazing-feature     ← New features
 └── fix/gallery-upload-safari   ← Bug fixes
 └── docs/update-contributing    ← Documentation changes
 └── refactor/auth-flow          ← Code refactoring
 └── chore/update-deps           ← Dependency updates
```

**Branch naming convention:**

| Prefix | Use case | Example |
|--------|----------|---------|
| `feature/` | New features | `feature/leaderboard-weekly` |
| `fix/` | Bug fixes | `fix/dark-mode-flash` |
| `docs/` | Documentation | `docs/api-reference` |
| `refactor/` | Code restructuring | `refactor/learner-context` |
| `chore/` | Maintenance tasks | `chore/bump-react-19` |

```bash
# Always start from an up-to-date main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Changes that don't affect code meaning (whitespace, formatting) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `chore` | Maintenance (deps, CI, tooling) |
| `revert` | Reverts a previous commit |

**Scopes** (optional but encouraged):

`admin`, `blog`, `learning`, `auth`, `worker`, `gamification`, `ui`, `seo`, `a11y`, `security`, `gallery`, `festive`, `deps`

**Examples:**

```
feat(learning): add weekly leaderboard with streak bonuses
fix(worker): use c.req.raw.formData() to prevent stream hang
docs: add animation guidelines to CONTRIBUTING.md
refactor(auth): consolidate learner token validation
chore(deps): bump @supabase/supabase-js to v2.99
perf(home): reduce hero particle count from 12 to 8
```

### Pull Request Process

1. **Sync with upstream** before pushing:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run pre-submission checks:**
   ```bash
   npm run lint          # ESLint passes
   npm run build         # TypeScript compiles and Vite builds
   ```

3. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request** against `main` on GitHub with:
   - A descriptive title following the commit convention.
   - A clear description of **what** changed and **why**.
   - Screenshots or recordings for any UI changes.
   - Reference to the related issue (e.g., `Closes #42`).

5. **Address review feedback** — Maintainers may request changes. Push additional commits to the same branch.

6. **Merge** — Once approved, a maintainer will merge your PR (squash merge preferred).

> [!IMPORTANT]
> **Do not push directly to `main`.** All changes must go through a pull request.

---

## Coding Standards

### TypeScript & React

- **Strict mode is OFF** — The project uses relaxed TypeScript (`strict: false`, `noImplicitAny: false`).
- **ESLint** — Always run `npm run lint` before submitting. The `@typescript-eslint/no-unused-vars` rule is disabled.
- **Path aliases** — Use `@/` to reference `./src/`. Example: `import { Button } from '@/components/ui/button'`
- **Lazy loading** — All route-level pages must be lazy-loaded in `App.tsx`.
- **React 19** — We use the latest React with concurrent features. Use functional components and hooks exclusively.

### Styling & CSS

- **Tailwind CSS 3** with custom configuration in `tailwind.config.ts`.
- **Dark mode by default** — `ThemeProvider` with `defaultTheme="dark"`.
- **CSS custom properties** — Colors use `hsl(var(--primary))` format.
- **Custom breakpoints:**

  | Name | Width |
  |------|-------|
  | `xs` | 480px |
  | `tablet` | 900px |
  | `smartboard` | 1280px |
  | `wide` | 1920px |

- **Font stack:**

  | Font | Usage |
  |------|-------|
  | Space Grotesk | Display / Headings |
  | Inter | Body / UI text |
  | JetBrains Mono | Code / Technical data |

- **`src/components/ui/`** — These are **auto-generated shadcn/ui** primitives. **Do not edit them manually.** Use the shadcn CLI to add or update components.

### Animation Guidelines

> [!WARNING]
> Animation quality directly impacts user experience and performance. Follow these rules strictly.

- **Never animate `filter: blur()`** — Use `opacity` + `transform` only (compositor-safe).
- **`prefers-reduced-motion`** kills all animations globally via CSS in `index.css`.
- **Hero particles: 8 max** — Do not increase.
- **GSAP is the primary animation library:**
  - Always use the `useGSAP()` hook from `@gsap/react` (not `useEffect`).
  - Always pass a `scope` ref for scoping selectors.
  - Register plugins at module level: `gsap.registerPlugin(useGSAP, ScrollTrigger)`.
  - Never combine `scrub` and `toggleActions` on the same ScrollTrigger.
  - Animate only compositor-safe properties: `opacity`, `x`, `y`, `scale`, `rotation`.

### Component Guidelines

- **Keep components small and focused** — One component, one responsibility.
- **Reuse over reinvent** — Check `src/components/` before creating new components.
- **Props over state** — Prefer props for data flow; use state only for local UI concerns.
- **Naming convention:**
  - Components: `PascalCase` (e.g., `CourseCard.tsx`)
  - Hooks: `camelCase` with `use` prefix (e.g., `useAutosave.ts`)
  - Utilities: `camelCase` (e.g., `formatDate.ts`)
  - Types: `PascalCase` (e.g., `CourseType.ts`)
- **File colocation** — Place components close to where they're used:
  - `src/components/admin/` for admin UI
  - `src/components/blog/` for blog UI
  - `src/components/learning/` for learning hub UI
  - `src/components/home/` for landing page sections

---

## Architecture Overview

### Project Structure

```
spark-labs-landing/
├── public/                  Static assets, PWA manifest, sitemap
├── src/
│   ├── App.tsx              Routes & provider hierarchy
│   ├── main.tsx             Entry point
│   ├── index.css            Global styles & Tailwind directives
│   ├── components/
│   │   ├── ui/              shadcn/ui primitives (DO NOT EDIT)
│   │   ├── admin/           Admin dashboard components
│   │   ├── blog/            Blog UI components
│   │   ├── festive/         Avurudu theme components
│   │   ├── home/            Landing page sections
│   │   ├── learning/        Learning hub components
│   │   ├── loading/         App loader, cinematic intro
│   │   └── animation/       Scroll animations, text reveal
│   ├── pages/               Route-level pages (lazy-loaded)
│   │   └── admin/           Admin pages
│   ├── context/             GamificationContext, LearnerContext
│   ├── contexts/            RoleContext (RBAC)
│   ├── hooks/               Custom React hooks
│   ├── lib/                 Utilities & helpers
│   ├── schemas/             Zod validation schemas
│   ├── types/               Shared TypeScript types
│   ├── integrations/        Auto-generated Supabase client & types
│   └── worker/              Cloudflare Worker (Hono API)
├── supabase/
│   ├── functions/           Edge Functions (Deno)
│   └── migrations/          Database migration SQL files
├── d1-migrations/           D1 database migrations
└── docs/                    PRDs and documentation
```

### Key Boundaries

| Boundary | Details |
|----------|---------|
| **Frontend entry** | `src/main.tsx` → `src/App.tsx` |
| **API entry** | `src/worker/index.ts` (Hono, serves `/api/*`) |
| **Provider order** | `QueryClient → Helmet → Theme → ErrorBoundary → AppLoader → Role → Learner → Gamification → Tooltip → Router` |
| **Student auth** | Token-based via `LearnerContext` (localStorage + fingerprint, no Supabase auth) |
| **Admin auth** | Supabase Auth with role verification via `RoleContext` |
| **RBAC roles** | `admin`, `editor`, `content_creator`, `coordinator` |

> [!NOTE]
> `EnrollmentContext.tsx` is **dead code**. All enrollment flows go through `LearnerContext`.

---

## Testing & Verification

> No test framework is currently configured. We plan to add Vitest in the future.

Before submitting, verify your changes manually:

```bash
# 1. Lint your code
npm run lint

# 2. Type-check + build
npm run build

# 3. Full pre-deploy verification (types + build + Cloudflare dry-run)
npm run check

# 4. Preview the production build locally
npm run preview
```

**UI changes checklist:**
- [ ] Works in both **dark mode** and **light mode**
- [ ] Responsive across **mobile**, **tablet**, and **desktop**
- [ ] Respects `prefers-reduced-motion` (animations disabled)
- [ ] No console errors or warnings
- [ ] Accessible — keyboard navigable, proper ARIA attributes
- [ ] Tested in Chrome, Firefox, and Safari (if possible)

---

## Deployment

Deployment is handled by maintainers. However, you can verify your changes will deploy correctly:

```bash
# Full check: TypeScript + Vite build + Cloudflare deploy dry-run
npm run check
```

The production site runs on **Cloudflare Workers** at [dvpyic.dpdns.org](http://dvpyic.dpdns.org).

| Command | Target |
|---------|--------|
| `npm run deploy` | Cloudflare Workers (recommended) |
| `npm run deploy:pages` | Cloudflare Pages (alternative) |

> [!IMPORTANT]
> Only maintainers with Cloudflare access can deploy. Contributors submit PRs and the team handles deployment.

---

## Security

This project handles student data and admin operations. Security is paramount.

**When contributing, keep these rules in mind:**

- **Never commit secrets** — API keys, tokens, and service role keys stay in `.env` / `.dev.vars`.
- **Never set `Cross-Origin-Embedder-Policy`** in the Worker — it blocks Supabase Storage requests.
- **Worker must use `SUPABASE_SERVICE_ROLE_KEY`** — Never fall back to the anon key for admin operations.
- **Use `c.req.raw.formData()`** in the Worker — Hono's `parseBody()` consumes the stream and causes 504s.
- **Sanitize all user input** — Use DOMPurify for HTML content.
- **Respect RLS policies** — Don't bypass Row Level Security without explicit reason.

If you discover a **security vulnerability**, please **do not** open a public issue. Instead, email the maintainers directly or use GitHub's private vulnerability reporting feature.

---

## License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

```
MIT License
Copyright (c) 2026 Young Innovators Club - Dharmapala Vidyalaya
```

---

<p align="center">
  Thank you for helping build the Young Innovators Club platform! 💜<br>
  Every contribution makes a difference.
</p>

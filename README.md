# Spark Labs Landing (Young Innovators Club)

Welcome to the **Spark Labs Landing** repository, the official web application for the Young Innovators Club at Dharmapala Vidyalaya.

## 🚀 Overview

This project is a modern, fast, and feature-rich Single Page Application (SPA) built to showcase the club's activities, projects, and events, as well as serve as a **Learning Hub** for students with an integrated **Admin CMS**.

**Live Domain:** [dvpyic.dpdns.org](http://dvpyic.dpdns.org)

## 🛠 Tech Stack

- **Frontend Framework:** React 19
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3, shadcn/ui, Radix UI
- **Routing:** React Router v6
- **Backend/API:** Cloudflare Workers (Hono)
- **Database & Auth:** Supabase (PostgreSQL, Edge Functions)
- **State Management:** React Query, Context API
- **Animations:** Framer Motion

## ✨ Key Features

- **Dynamic Landing Page:** Hero section, About, Projects showcase, Team/Teachers display, Events, Gallery, Interactive Map, and more.
- **Learning Hub:** A built-in course catalog for students with gamification features including XP progression, achievements, streaks, and leaderboards.
- **Admin Dashboard (CMS):** A comprehensive administration panel to manage users, roles, pages, blog posts, events, and learning modules. Uses Role-Based Access Control (RBAC) with 5 distinct roles.
- **Blog & Content:** Integrated Markdown/TipTap rich text editor for blogging and content creation with AI assistant capabilities.
- **Offline Support:** Progressive Web App (PWA) capabilities utilizing service workers for offline fallback.
- **Security Hardened:** Implements strict CSP headers, input sanitization, anti-debugging, fingerprinting, rate-limiting, and IDOR/SSRF protections.
- **AI Integration:** Includes an Innovation Chatbot widget.

## 📂 Project Structure

```text
spark-labs-landing/
├── public/                 # Static assets, PWA manifest, offline fallback
├── src/
│   ├── components/         # Reusable UI components (admin, auth, learning, home)
│   ├── components/ui/      # shadcn/ui components
│   ├── contexts/           # React Context providers (auth, gamification, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utils, security middlewares, protections
│   ├── pages/              # Route entry points (Public, Admin, Learning Hub)
│   └── worker/             # Cloudflare Workers (Hono API backend)
├── supabase/
│   ├── functions/          # Supabase Edge Functions (Deno)
│   └── migrations/         # PostgreSQL database migrations
└── ...                     # Config files (Vite, Tailwind, TypeScript, Wrangler)
```

## ⚙️ Local Development Setup

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Use `nvm` to manage versions)
- `npm` (comes with Node.js)
- A [Supabase](https://supabase.com/) project (for database/auth)

### Installation Steps

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd spark-labs-landing
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory based on the variables needed (e.g., Supabase keys). You will need at minimum:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   The app will typically be available at `http://localhost:8080` (or whatever port Vite assigns).

## 🚀 Deployment

The project utilises a dual deployment strategy:

- **Frontend / Fullstack:** Cloudflare Pages & Workers
- **Database:** Supabase

To build the project locally:

```bash
npm run build
```

To deploy to Cloudflare:

```bash
npm run deploy:pages
```

For more detailed deployment instructions, refer to `CLOUDFLARE_DEPLOY.md`.
For email service setup, refer to `CLOUDFLARE_EMAIL_SETUP.md`.
For admin setup, refer to `ADMIN_SETUP.md`.

## 📜 Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the application for production.
- `npm run lint`: Runs ESLint to check for code issues.
- `npm run preview`: Builds the app and serves the production bundle locally.
- `npm run deploy`: Deploys the Cloudflare worker.
- `npm run deploy:pages`: Deploys the built static assets to Cloudflare Pages.

## 🤝 Contributing

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

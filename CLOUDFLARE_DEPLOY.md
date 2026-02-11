# Deploying to Cloudflare Workers & Pages

This project now uses the **Cloudflare Vite React Template** setup, which provides:
- **Vite** for fast frontend development
- **React** for UI
- **Hono** for lightweight API routes in Cloudflare Workers
- **Cloudflare Workers** for edge deployment

## Architecture

```
┌─────────────────┐      ┌──────────────────┐
│  Static Assets  │      │  Cloudflare      │
│  (React SPA)    │◄────►│  Worker (Hono)   │
│  /dist/client   │      │  /src/worker     │
└─────────────────┘      └──────────────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
         ┌─────────────────┐
         │  Cloudflare     │
         │  Edge Network   │
         └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Development

```bash
npm run dev
```

This starts the Vite dev server with the Cloudflare plugin, which simulates the Workers runtime locally.

### 3. Build

```bash
npm run build
```

This creates:
- `dist/client/` - Static assets (React app)
- Worker bundle for Cloudflare

### 4. Deploy

```bash
npm run deploy
```

Or using wrangler directly:

```bash
wrangler deploy
```

## Configuration Files

### wrangler.json

Main configuration for Cloudflare Workers:

```json
{
  "name": "spark-labs-landing",
  "main": "./src/worker/index.ts",
  "compatibility_date": "2025-10-08",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application"
  }
}
```

### vite.config.ts

Includes the `@cloudflare/vite-plugin` for local development:

```typescript
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
});
```

## API Routes

API routes are defined in `src/worker/index.ts` using Hono:

```typescript
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Your API endpoints
app.get("/api/info", (c) => c.json({ name: "Spark Labs" }));

export default app;
```

### Available Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check with timestamp |
| `GET /api/info` | App information |
| `GET /api/stats` | Server-side stats (protected) |

## Environment Variables

Add secrets and environment variables using Wrangler:

```bash
# Set a secret
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Set environment variables
wrangler vars put NODE_ENV
```

Or add to `wrangler.json`:

```json
{
  "vars": {
    "NODE_ENV": "production"
  }
}
```

## Type Generation

Generate TypeScript types from your Wrangler configuration:

```bash
npm run cf-typegen
```

This updates `worker-configuration.d.ts` with your environment bindings.

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run cf-typegen` | Generate Worker types |
| `npm run check` | Type check + build + dry-run deploy |
| `npm run deploy:pages` | Deploy static to Cloudflare Pages (legacy) |

## Migration from Cloudflare Pages

The previous setup used Cloudflare Pages static hosting. The new setup uses **Cloudflare Workers with Static Assets**, which provides:

- **Server-side API routes** - Handle requests at the edge
- **Better performance** - Dynamic content at edge speed
- **More flexible** - Full Worker runtime capabilities
- **Simplified deployment** - Single `wrangler deploy` command

### Key Differences

| Feature | Old (Pages) | New (Workers + Assets) |
|---------|-------------|------------------------|
| Hosting | Static only | Static + Dynamic API |
| Config | `public/_redirects` | `wrangler.json` |
| API | None (client-only) | Hono routes in Worker |
| Build Output | `dist/` | `dist/client/` |

## Troubleshooting

### Build Errors

If you see TypeScript errors in the worker:

```bash
npm run cf-typegen
```

### API Routes Not Working

Ensure the route path starts with `/api/`:

```typescript
// Correct
app.get("/api/users", handler);

// Will be served as static (incorrect for API)
app.get("/users", handler);
```

### Environment Variables

Client-side environment variables must start with `VITE_`:

```env
# Client can access
VITE_SUPABASE_URL=https://...

# Server only (Worker)
SUPABASE_SERVICE_ROLE_KEY=...
```

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [Cloudflare Vite Plugin](https://developers.cloudflare.com/workers/vite-plugin/)

# Deploying to Cloudflare Pages

## 1. Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create**
2. Select **Pages** → **Connect to Git**
3. Choose your repository and branch (e.g., `main`)

## 2. Build Settings

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20` |

## 3. Environment Variables

Add these in **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID |
| `NODE_VERSION` | `20` |

## 4. SPA Routing

The project includes `public/_redirects` with `/* /index.html 200` which Cloudflare Pages respects automatically.

Alternatively, create `public/_routes.json`:

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*"]
}
```

## 5. Security Headers

Security headers are configured in `public/_headers` (same as the Netlify `netlify.toml` headers). Cloudflare Pages automatically reads this file.

## 6. Custom Domain

1. Go to your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain and follow DNS instructions
4. Cloudflare automatically provisions SSL

## 7. Service Worker

The project includes `public/sw.js`. Cloudflare Pages serves static files from `public/` directly, so the service worker will work as-is. Ensure your CSP `worker-src` directive includes `'self' blob:`.

## 8. Preview Deployments

Cloudflare Pages creates preview deployments for every PR automatically. Preview URLs follow the pattern: `<commit-hash>.<project>.pages.dev`.

## 9. Build Caching

Cloudflare Pages caches `node_modules` automatically. No additional configuration needed.

## 10. Troubleshooting

- **Blank page**: Ensure `_redirects` file is in `public/` (copied to `dist/` on build)
- **404 on refresh**: Same fix — SPA redirect rule needed
- **CORS issues**: Update your Supabase project's allowed origins to include your Cloudflare Pages domain
- **Environment variables not working**: Ensure they start with `VITE_` for client-side access

# Saarthi – Interview Companion (UI)

React + Vite single-page app.

## Local development
```
cp .env.example .env.local   # set VITE_API_URL (default http://localhost:3001/api) and VITE_GOOGLE_CLIENT_ID
npm install
npm run dev                  # http://localhost:5173
```

## Deploying to AWS (S3 + CloudFront)
The build output (`dist/`) is fully static. Config is baked in at build time, so set these first
(see `.env.production.example`):

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Public API URL incl. `/api`. **Required** – production builds fail without it. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

Then `S3_BUCKET=<bucket> CLOUDFRONT_DISTRIBUTION_ID=<id> ./deploy.sh`.

Setup notes:
- S3 bucket: keep it private and serve through CloudFront with Origin Access Control; default root object `index.html`.
- The app has no URL routing (navigation is in-memory), so no SPA rewrite rules are needed.
- Auth uses a session cookie (`credentials: 'include'`). Serve UI and API on sibling subdomains of one domain
  (e.g. `app.example.com` / `api.example.com`), or use `COOKIE_SAMESITE=none` on the server (HTTPS required).
- Server `FRONTEND_URL` (CORS) must equal the CloudFront/custom domain exactly.
- Add the CloudFront/custom domain to the Google OAuth client's "Authorized JavaScript origins".

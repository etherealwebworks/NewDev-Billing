# Deployment Guide

Three pieces: Supabase (DB + Auth), Render (Express API), Vercel or Netlify
(the React frontend). None of these require modifying source code — every
environment-specific value is an env var.

## 1. Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_client_project_phase2.sql`, then
   `supabase/migrations/0003_phase8.sql`, in that order.
3. **Project Settings → API** → copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never
     put this in the frontend build)
4. **Authentication → Providers** → Email should be enabled by default;
   nothing else is needed since this app has no OAuth/social login.
5. **Authentication → URL Configuration** → set **Site URL** to your
   deployed frontend URL (step 3 below) once you have it. This app doesn't
   use magic-link/OAuth redirects, but Supabase still uses this field for
   some auth emails, so it's worth setting correctly rather than leaving it
   at `localhost`.
6. Create your first admin account (there is no public registration form —
   see the main README's Setup section for the exact SQL).
7. Optionally run the seed script (`npm run seed` from `server/`, against
   this project) for realistic sample data — see `server/scripts/seed.js`.

## 2. Backend → Render

1. Push this repo to GitHub/GitLab.
2. Render → **New → Web Service** → connect the repo → set **Root
   Directory** to `server`.
3. Build command: `npm install`
   Start command: `npm start`
4. Environment variables (Render → Environment):
   ```
   SUPABASE_URL=<from Supabase>
   SUPABASE_ANON_KEY=<from Supabase>
   SUPABASE_SERVICE_ROLE_KEY=<from Supabase>
   NODE_ENV=production
   PORT=4000                          # Render sets its own PORT; the app reads process.env.PORT either way
   CLIENT_ORIGIN=https://your-frontend-domain.com
   AUTH_RATE_LIMIT_WINDOW_MS=900000
   AUTH_RATE_LIMIT_MAX=10
   ```
   `CLIENT_ORIGIN` drives the CORS allow-list in `src/app.js` — it must
   exactly match the frontend's deployed origin (including `https://`, no
   trailing slash), or every browser request from the frontend will be
   blocked by CORS.
5. Deploy. Note the resulting Render URL (e.g.
   `https://billing-app-api.onrender.com`) — the frontend needs it next.

## 3. Frontend → Vercel or Netlify

Both work the same way; pick one.

### Vercel
1. **New Project** → import the repo → set **Root Directory** to `client`.
2. Framework preset: Vite. Build command `npm run build`, output directory
   `dist` (Vercel usually detects these automatically).
3. Environment variable:
   ```
   VITE_API_URL=https://billing-app-api.onrender.com/api
   ```
4. Deploy. Vercel gives you a URL — that's what you set as
   `CLIENT_ORIGIN` on Render (step 2.4 above) and as Supabase's Site URL
   (step 1.5).

### Netlify
1. **Add new site → Import an existing project** → set **Base directory**
   to `client`.
2. Build command: `npm run build`. Publish directory: `client/dist`.
3. Same `VITE_API_URL` environment variable as above.
4. Add a `client/public/_redirects` file with `/* /index.html 200` if you
   don't already have one — this app uses React Router's browser history
   mode, and without that rewrite rule, refreshing on e.g. `/admin/clients`
   will 404 on Netlify.

## 4. After both are deployed

- Go back to Render and confirm `CLIENT_ORIGIN` matches the live frontend
  URL exactly.
- Go back to Supabase → Authentication → URL Configuration and set the
  Site URL to the same frontend URL.
- Log in at `<frontend-url>/login` with the admin account from step 1.6.

## Production build commands (for reference / CI)

```bash
# backend — no build step, just install + start
cd server && npm install && npm start

# frontend
cd client && npm install && npm run build   # outputs to client/dist
npm run preview                              # optional local check of the production build
```

## Rotating credentials

If `SUPABASE_SERVICE_ROLE_KEY` is ever exposed (e.g. committed by
mistake), rotate it immediately in Supabase → Project Settings → API, and
update it on Render. This key bypasses Row Level Security entirely, which
is why the backend is the only place it should ever live.

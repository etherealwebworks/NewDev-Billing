# Billing & Project Management — All 7 Phases Complete

Digital marketing billing & client/project management app. Admin + Staff roles,
Supabase Postgres/Auth backend, Express API, React/Vite/Tailwind v4 frontend.

**Status:** feature-complete per the original spec, across 7 build phases.
See `DEPLOYMENT.md` for going live and `TESTING.md` for what's automated
vs. what needs a manual pass against a real Supabase project.

## What's in Phase 1

- Full database schema + RLS policies (`supabase/migrations/0001_init.sql`)
- Express backend scaffold with auth: login, session refresh, `/me`, logout,
  admin-only staff account creation
- Role-verification middleware (`requireAuth`, `requireRole`) — the backend
  never trusts a role claim from the frontend
- React frontend scaffold: routing, `AuthProvider`, `ProtectedRoute`, login
  page (black/white premium design), placeholder admin/staff dashboards

## What's in Phase 2

- `supabase/migrations/0002_client_project_phase2.sql`:
  - `create_client_with_project()` — atomic client+project creation (the Add
    Client form creates both in one transaction)
  - `staff_summary` view — per-staff counts for the Staff Management table
  - `project_effective_status` view — folds "overdue" into work status
- Backend: full Clients CRUD (`/api/clients`, admin-only, search/filter by
  staff & status/sort/pagination), Staff management (`/api/staff` — list
  with performance counts, update, activate/deactivate, project reassignment)
- Frontend: `AdminLayout`/`StaffLayout` sidebar shells (collapsible desktop,
  mobile drawer), **Clients** page (table, search, filters, pagination, Add
  Client modal with live deadline auto-calc, Edit, Archive-with-confirm),
  **Staff Management** page (table with live counts, Add/Edit staff,
  activate/deactivate with confirm)

Nav items not yet wired to real pages (Projects, Invoices, Payments,
Reports, Settings) show a plain "coming in a later phase" panel rather than
a fake working screen.

## What's in Phase 3

- Backend `/api/projects`:
  - Admin: list (filter by staff/client/status incl. computed "overdue",
    search, sort, pagination), detail, full edit (deadline recalculates
    server-side unless pinned manually), archive, `/stats` for dashboard cards
  - Staff: `/mine` (their own projects only — the endpoint ignores any id in
    the request and always scopes to the authenticated user),
    `PATCH /:id/status` — the **only** field this route ever writes is
    `work_status` (plus the resulting `completion_date`/`completed_by`), no
    matter what else is in the request body, so a staff user can't smuggle a
    deadline or amount change through it
- Frontend:
  - Admin **Projects** page — table, filters, edit modal (deadline,
    amount, staff reassignment, video count)
  - Admin **Dashboard** — real stat cards (clients, projects, in
    progress/completed/pending/overdue) and an upcoming-deadlines widget,
    all computed from live data
  - Staff **My Clients** — read-only cards: project, videos, dates, status,
    admin notes
  - Staff **My Projects** — status filter chips + the status-update control
    (Not Started / In Progress / Completed dropdown, with a save
    indicator); completing a project stamps the completion date
  - Staff **Dashboard** — assigned-client/project counts and upcoming
    deadlines from their own projects

## What's in Phase 4

- Backend `/api/invoices` (admin only):
  - `POST /` — generates an invoice for a project: pulls a fresh client +
    company_settings snapshot, prices line items server-side (no GST
    anywhere in the codebase), assigns the next number via the
    per-year `next_invoice_number()` sequence from migration 0001
  - `POST /:id/cancel` — soft-cancels with a required reason, audit-logged,
    never deletes the row
  - `POST /:id/reissue` — the deliberate correction workflow: cancels the
    original ("Superseded by a revised invoice") and creates a new invoice
    with a fresh number/snapshot, linked via `supersedes_invoice_id`
  - `GET /`, `GET /:id` — list (search/filter/paginate) and detail
- Frontend:
  - **Generate Invoice** from a project row on the Projects page — prefills
    one line item from the project, fully editable before saving
  - **Invoices** list page + **Invoice detail** page with an A4 / 80mm
    thermal / 58mm thermal preview toggle, **Print** (dynamic `@page` size
    per format), **Download PDF** (client-side via html2canvas + jsPDF —
    no backend PDF service), **Cancel** (reason required), **Revise**
    (reissue workflow)
  - Print isolation: printing from anywhere in the app only ever prints
    `#invoice-print-root` — sidebar, buttons, and modals never print
    (`index.css`)

**Implementation note (ambiguous requirement, resolved):** the spec's
invoice workflow mentions a `draft` status, but "generate → review → save"
collapses into one step here — clicking Generate Invoice in the modal
issues the invoice immediately (status `issued`), since the line-item
editor already gives the admin a review/edit step before that submit.
Draft-then-issue as two separate persisted states isn't implemented.
"Mark as Paid" / "Record Payment" are intentionally deferred to Phase 5,
since they require the payments table this phase doesn't touch yet.

## What's in Phase 5

- `server/src/utils/invoiceBalance.js` — the single place that derives
  `amount_paid` / `outstanding_amount` / `payment_status` (Unpaid /
  Partially Paid / Paid / Overdue) from live payment rows, both for one
  invoice and batched across many; and `syncInvoiceStatusFromPayments()`,
  which flips `invoices.invoice_status` between `issued` and `paid` after
  every payment or reversal
- Backend `/api/payments` (admin only):
  - `POST /` — records full/partial/advance/multiple payments against an
    invoice; **rejects** (doesn't clamp) an amount greater than the current
    outstanding balance, so the outstanding total can never go negative
  - `POST /:id/reverse` — reason required, audit-logged, never deletes the
    row, re-syncs the invoice's paid/issued status afterward
  - `GET /`, `GET /:id` — list (filter by invoice/client/method) and detail
  - `GET /stats` — revenue/received/outstanding/overdue figures for the
    dashboard, computed live; an unpaid invoice is never counted as
    received revenue
- Invoices (`GET /`, `GET /:id`) now come back with `amount_paid` /
  `outstanding_amount` / `payment_status` attached
- Client billing totals (Phase 2's Clients page) now include `paid`
  invoices, not just `issued`
- Frontend:
  - **Record Payment** from the invoice detail page — defaults to the
    current outstanding balance, full method/date/reference/notes capture
  - Invoice detail page: balance summary cards (Total / Paid / Due),
    payment-status badge, payment history list with per-payment **Reverse**
  - A4 and thermal invoice layouts now show Amount Paid / Balance Due once
    any payment exists
  - **Payments** page — the full ledger, filterable by method, with Reverse
  - **Invoices** list now shows Outstanding + payment status per row
  - Admin **Dashboard** — real Total Revenue / Amount Received / Outstanding
    / Overdue Payments cards alongside the Phase 3 project cards

## What's in Phase 6

- Backend `/api/settings` (admin only) — `GET`/`PUT` on the single
  `company_settings` row (created back in migration 0001). Editing it only
  affects **new** invoices from this point forward — every already-issued
  invoice keeps its frozen snapshot from Phase 4, unaffected by later edits
  here, exactly as the spec requires
- Backend `/api/reports` (admin only) — one consolidated payload:
  revenue/collected in the selected range, total outstanding, project
  work-status counts, a trailing-12-month revenue trend, payments-by-date,
  outstanding-by-client, and staff completion — instead of five separate
  endpoints
- Frontend:
  - **Company Settings** page — Company Information, Invoice Settings
    (including the invoice number prefix used by `next_invoice_number()`),
    and Application Settings, all editable and persisted
  - **Reports** page — Today / This Week / This Month / This Year / Custom
    date filter, stat cards, a revenue-by-month bar chart and a
    payments-received line chart (Recharts), an outstanding-by-client
    table, and a staff completion-summary table

**Implementation note (documented, ambiguous-requirement resolution):**
revenue and "collected" figures are filtered by the selected date range
(genuinely period numbers), but project work-status counts and the
12-month revenue chart are current-state / trailing-window snapshots
regardless of the filter — narrowing "Projects Completed" to only "this
week" would hide the bigger picture those numbers are for. This is called
out in the Reports page footer, not hidden.

Every admin sidebar item is now a real page — there's no more
`ComingSoon` route left.

## What's in Phase 7 (final)

- **Responsive pass**: Clients and Projects — the two busiest tables —
  now render as touch-friendly cards below the `sm` breakpoint and as full
  tables above it (spec explicitly allows either "cards or horizontally
  scrollable tables"; Staff Management/Invoices/Payments use the
  horizontal-scroll option, already in place since their phases). Dashboard
  stat grids, modals, and forms were already responsive from earlier
  phases and are unchanged.
- **Seed data** (`server/scripts/seed.js`, `npm run seed` from `server/`):
  1 admin, 2 staff, 5 fictional clients each with a project (mixing
  not-started/in-progress/completed/overdue), 3 invoices covering fully
  paid / partially paid / unpaid-and-overdue scenarios. Idempotent — safe
  to re-run.
- **Automated tests** (`server/tests/`, `npm test` from `server/`, zero
  extra dependencies — Node's built-in test runner): 30 unit tests over the
  logic that doesn't need a live database — invoice pricing (no GST,
  ever), deadline date math, payment-status derivation, report date
  ranges, and the RBAC role checks themselves. `src/middleware/auth.js`
  and `src/utils/invoiceBalance.js` were each split so the pure logic
  (`authorize.js`, `paymentStatus.js`) is testable without Supabase
  credentials, while the DB-touching half stays where it was. See
  `TESTING.md` for the full manual/integration checklist covering what a
  live-database test would need (invoice-number uniqueness under
  concurrency, cross-role access attempts, snapshot immutability, etc.) —
  documented rather than faked with a mocked Supabase client.
- **Deployment** (`DEPLOYMENT.md`): Supabase project setup, Render for the
  backend, Vercel or Netlify for the frontend, exact env vars for each,
  CORS (`CLIENT_ORIGIN`), Supabase Auth Site URL configuration, and
  production build commands.

This closes out the roadmap — every phase from the original plan is built.

## Setup

### 1. Supabase project
1. Create a project at supabase.com.
2. In the SQL editor, run the migrations in order: `0001_init.sql`,
   `0002_client_project_phase2.sql`, then `0003_phase8.sql`.
3. Grab your Project URL, anon key, and service_role key from
   Project Settings → API.
4. Create your first admin manually (there is no public registration):
   - Supabase dashboard → Authentication → Add user → set email/password.
   - In the SQL editor:
     ```sql
     insert into profiles (id, full_name, email, role, is_active)
     values ('<the-user-uuid-from-auth>', 'Admin Name', 'admin@yourcompany.com', 'admin', true);
     ```

### 2. Backend
```bash
cd server
cp .env.example .env   # fill in Supabase URL + keys
npm install
npm run dev             # http://localhost:4000
```

### 3. Frontend
```bash
cd client
cp .env.example .env    # points at the backend above
npm install
npm run dev              # http://localhost:5173
```

Log in at `/login` with the admin account you created — you should land on
`/admin`. Staff accounts can only be created by an admin, via
`POST /api/auth/staff` or the Staff Management page.

### 4. (Optional) Seed sample data
```bash
cd server
npm run seed
```
Creates 1 admin, 2 staff, 5 clients with projects in varied states, and a
few invoices/payments so the dashboards and Reports page have something
to show immediately. Prints the generated login credentials to the
console. Safe to re-run — it skips anything that already exists by email
or phone number.

### 5. Run the test suite
```bash
cd server
npm test
```
See `TESTING.md` for what these 30 unit tests cover and what still needs
a manual pass against a real Supabase project.

## Security notes baked in from Phase 1
- `SUPABASE_SERVICE_ROLE_KEY` lives only in `server/.env`, never sent to the
  client, never logged.
- Every protected route re-verifies the JWT and re-fetches the role from
  `profiles` on every request — a stale or forged frontend role is never
  trusted.
- RLS is enabled on every table as a second layer, in case a bug ever lets a
  request past the Express middleware.
- Auth endpoints are rate-limited.
- Staff account creation is admin-only; there is no self-registration route.

---

## Phase 8 — Branding, theming, Services, and a batch of UX additions

Built on top of the completed 7-phase app above. Run
`supabase/migrations/0003_phase8.sql` after the first two migrations.

- **NewDev Digital Solutions branding** — real logo assets
  (`client/src/assets/newdev-light.png` navy mark, `newdev-dark.jpg`
  white-on-black mark), a `<Logo />` component that swaps between them
  based on the active theme, and matching favicons.
- **Light/dark theme system** — a real app-wide toggle (top-right of every
  admin/staff screen and the login page), not just the sidebar. Light
  theme's page background is Porcelain Gray `#F2F2F2`; dark theme reuses
  the app's original black palette. Implemented as CSS custom-property
  overrides under `[data-theme="dark"]` in `index.css`, so the existing
  `bg-paper` / `text-text-dark` / etc. utility classes already used
  throughout the app adapt automatically — no per-component rewrite
  needed. Persisted in `localStorage`, defaults to the OS preference.
  **Design choice:** the sidebar nav strip stays black in both themes
  (deliberate constant chrome), so it always shows the dark-background
  logo regardless of the active theme — only screens whose background
  actually changes (login, top header bar, main content) show the
  theme-following logo.
- **Splash screen** — always shows the dark logo variant while the app's
  initial session check runs, fading into the real app once ready,
  regardless of the user's saved theme preference (a deliberate exception
  to the theme-follows-logo rule above).
- **"Duo smudge" background** — two slow-drifting, heavily blurred
  monochrome gradient blobs behind the login page only (`SmudgeBackground`
  component), respecting `prefers-reduced-motion`.
- **Services** (new admin page + `/api/services`) — reusable package
  definitions (name, video count, poster count, budget) that prefill the
  Add Client project form via a "Start from a Service" dropdown; deleting
  a service already used on a project deactivates it instead of deleting.
- **Delete, not just archive/deactivate** — Clients and Staff now have a
  real Delete action alongside Archive/Deactivate, gated server-side: a
  client can only be hard-deleted with zero invoices on record, a staff
  account only with zero project history. Otherwise the delete is refused
  and the UI explains why, pointing back to Archive/Deactivate.
- **Assignment fix + event videos** — confirmed/kept staff free to be
  assigned to any number of clients at once (no one-client limit existed
  or was added); added a Project Type (Standard/Event) selector with a
  required Event Name field for event-style projects, shown throughout the
  Projects page and staff views.
- **Invoice display & template changes** — Total/Paid/Due were already all
  shown on the invoice detail page (Phase 5); the Generate Invoice modal
  now also surfaces the project's recorded advance and can log it as the
  invoice's first payment in the same step. The printed invoice no longer
  has a Payment Instructions section, and now prints two phone numbers
  (`company_settings.phone_2` is new) — the header never had a "(GST-Free)"
  label to begin with, so nothing to remove there.
- **Staff photos** — a Profile Photo URL field on Add/Edit Staff, shown via
  a shared `<Avatar />` component (photo or initials fallback) in Staff
  Management, the Clients table, and the Projects table wherever an
  assigned staff member appears.

See `newdev-phase8-addendum-prompt.md` (delivered separately) for the
original requirements list this phase was built from, including the
ambiguity calls made along the way.

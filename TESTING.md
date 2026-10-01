# Testing

## Automated: unit tests (offline, no Supabase needed)

```bash
cd server
npm install
npm test
```

30 tests, `server/tests/`, using Node's built-in test runner (no extra
dependency). They cover the pure logic that doesn't need a database:

| File | Covers |
|---|---|
| `money.test.js` | Invoice line-item pricing — confirms `total_amount` never diverges from `subtotal` (i.e. no tax/GST layer exists anywhere), rounding behavior |
| `dates.test.js` | Submission-deadline date math (`start_date + allowed_submission_days`), including the exact worked example from the spec (23 Sep 2026 + 7 days → 30 Sep 2026), month/year/leap-year boundaries |
| `paymentStatus.test.js` | Unpaid / Partially Paid / Paid / Overdue derivation — fully-paid-but-past-due still reads "Paid" (not "Overdue"), a cancelled invoice has no payment status, overpayment doesn't produce a negative outstanding read |
| `dateRange.test.js` | Reports date-range resolution (today/week/month/year/custom) |
| `authorize.test.js` | **The core RBAC enforcement** — `requireRole('admin')` rejects a staff user with 403, allows an admin, rejects an unauthenticated request with 401; `requireOwnershipOrAdmin` lets a staff user touch only their own resource and always lets an admin through |

These were split out from files that otherwise import the Supabase client
specifically so they're testable without live credentials —
`src/middleware/authorize.js` (pure RBAC checks) vs.
`src/middleware/authenticate.js` (the part that actually talks to
Supabase), and `src/utils/paymentStatus.js` (pure) vs.
`src/utils/invoiceBalance.js` (the part that queries the DB).

## Not automated here — needs a real Supabase project

Everything that touches the database, Supabase Auth, or a full HTTP
request/response cycle needs a live (or local, via the Supabase CLI)
Postgres instance with the migrations applied — there's no in-memory or
mocked Supabase in this repo. Rather than hand-wave that as "done," here's
the concrete manual/integration checklist the spec asks for (Section 24),
to run against a real (ideally a disposable/staging) Supabase project:

**Auth & RBAC**
- [ ] Login with valid admin credentials → lands on `/admin`
- [ ] Login with valid staff credentials → lands on `/staff`
- [ ] Login with wrong password → rejected, no session created
- [ ] A deactivated staff account can't log in (and an *existing* session
      is rejected on the next request — `requireAuth` checks `is_active`
      every time, not just at login)
- [ ] Staff hitting an admin-only endpoint directly (e.g.
      `PUT /api/clients/:id`) with their own valid token → 403
- [ ] Staff calling `GET /api/projects/mine` never returns another staff
      member's projects, no matter what's passed in the query string
- [ ] Staff calling `PATCH /api/projects/:id/status` on a project *not*
      assigned to them → 403
- [ ] Staff calling `PATCH /api/projects/:id/status` with extra fields in
      the body (e.g. `project_amount`) → only `work_status` changes,
      confirmed by re-fetching the project as admin
- [ ] No public registration endpoint exists; staff accounts are only
      created via `POST /api/auth/staff` by an authenticated admin

**Business logic**
- [ ] Two invoices generated back-to-back get sequential, non-colliding
      numbers (`next_invoice_number()` — verify under concurrent requests
      too, since it's the DB sequence function, not app-side counting)
- [ ] An invoice's `total_amount` never includes GST/CGST/SGST/IGST —
      confirmed by inspecting the generated invoice's `items` and totals
- [ ] Recording a payment larger than the outstanding balance is rejected
      (400), not silently clamped
- [ ] Two partial payments that exactly sum to the total flip
      `invoice_status` from `issued` to `paid` automatically
- [ ] Reversing a payment that had completed the invoice flips
      `invoice_status` back to `issued`
- [ ] Editing a client's address after an invoice was issued does **not**
      change that invoice's `client_details_snapshot`
- [ ] Editing Company Settings after an invoice was issued does **not**
      change that invoice's `company_details_snapshot`

**Printing / PDF**
- [ ] A4 print preview only prints the invoice — no sidebar/buttons
      (inspect via browser print preview, not just the download)
- [ ] Thermal 58mm and 80mm previews render without horizontal overflow
- [ ] PDF download produces a readable file at both A4 and thermal widths

**Responsive**
- [ ] Clients and Projects pages show the card layout below the `sm`
      breakpoint (~640px) and the table above it
- [ ] Staff dashboard and My Projects status dropdown are usable on a
      real phone screen (a touch target, not just a mouse hover target)

This list is intentionally written as manual/integration steps rather
than another layer of mocked unit tests — mocking the entire Supabase
client to test, say, "does `next_invoice_number()` avoid collisions"
would just be testing the mock, not the actual Postgres sequence
function. Running these against a real project (Supabase's free tier is
enough for this) is the more honest signal.

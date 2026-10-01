-- ============================================================
-- Digital Marketing Billing & Project Management — Initial Schema
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type user_role as enum ('admin', 'staff');
create type work_status as enum ('not_started', 'in_progress', 'completed');
create type invoice_status as enum ('draft', 'issued', 'paid', 'cancelled');
create type payment_status as enum ('unpaid', 'partially_paid', 'paid', 'overdue');
create type payment_method as enum ('cash', 'upi', 'bank_transfer', 'card', 'other');

-- ---------- PROFILES ----------
-- One row per auth.users entry. Role lives here, never on the client.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role user_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CLIENTS ----------
create table clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  company_name text,
  email text,
  phone text not null,
  address text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_clients_archived on clients(archived_at);

-- ---------- PROJECTS ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  project_name text not null,
  description text,
  number_of_videos integer not null check (number_of_videos > 0),
  allowed_submission_days integer not null check (allowed_submission_days > 0),
  start_date date not null,
  submission_deadline date not null,
  deadline_manually_set boolean not null default false,
  assigned_staff_id uuid references profiles(id),
  work_status work_status not null default 'not_started',
  completion_date timestamptz,
  completed_by uuid references profiles(id),
  project_amount numeric(12,2) not null check (project_amount >= 0),
  advance_amount numeric(12,2) default 0 check (advance_amount >= 0),
  payment_due_date date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_projects_client on projects(client_id);
create index idx_projects_staff on projects(assigned_staff_id);
create index idx_projects_status on projects(work_status);
create index idx_projects_deadline on projects(submission_deadline);

-- ---------- INVOICE NUMBERING ----------
-- Per-year sequence so numbers look like INV-2026-0001 and never collide.
create table invoice_number_sequences (
  year integer primary key,
  last_number integer not null default 0
);

create or replace function next_invoice_number(prefix text default 'INV')
returns text
language plpgsql
as $$
declare
  yr integer := extract(year from now());
  n integer;
begin
  insert into invoice_number_sequences(year, last_number)
  values (yr, 1)
  on conflict (year) do update set last_number = invoice_number_sequences.last_number + 1
  returning last_number into n;

  return prefix || '-' || yr || '-' || lpad(n::text, 4, '0');
end;
$$;

-- ---------- INVOICES ----------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid not null references clients(id),
  project_id uuid references projects(id),
  invoice_date date not null default current_date,
  due_date date,
  -- Snapshots: frozen at issue time so later edits to clients/settings never alter a past invoice.
  client_details_snapshot jsonb not null,
  company_details_snapshot jsonb not null,
  items jsonb not null, -- [{description, quantity, unit_price, total}]
  subtotal numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  invoice_status invoice_status not null default 'draft',
  cancelled_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references profiles(id),
  supersedes_invoice_id uuid references invoices(id), -- for corrected/reissued invoices
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoices_client on invoices(client_id);
create index idx_invoices_project on invoices(project_id);
create index idx_invoices_status on invoices(invoice_status);

-- ---------- PAYMENTS ----------
create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  amount numeric(12,2) not null check (amount > 0),
  payment_method payment_method not null,
  payment_date date not null default current_date,
  transaction_reference text,
  notes text,
  is_reversed boolean not null default false,
  reversed_at timestamptz,
  reversed_by uuid references profiles(id),
  reversal_reason text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_payments_invoice on payments(invoice_id);

-- ---------- COMPANY SETTINGS ----------
-- Single-row table (enforced by check on id).
create table company_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'Your Company',
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  invoice_prefix text not null default 'INV',
  invoice_footer text,
  payment_instructions text,
  authorized_signatory_name text,
  default_invoice_description text,
  default_currency text not null default 'INR',
  thermal_paper_width text not null default '80mm' check (thermal_paper_width in ('58mm', '80mm')),
  default_invoice_format text not null default 'a4' check (default_invoice_format in ('a4', 'thermal')),
  time_zone text not null default 'Asia/Kolkata',
  date_format text not null default 'DD/MM/YYYY',
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

insert into company_settings (id) values (1);

-- ---------- AUDIT LOG ----------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,          -- e.g. 'invoice.cancel', 'payment.reverse', 'staff.deactivate'
  entity_type text not null,     -- e.g. 'invoice', 'payment', 'client'
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_actor on audit_logs(actor_id);
create index idx_audit_entity on audit_logs(entity_type, entity_id);

-- ---------- HELPER VIEWS ----------
-- Outstanding balance per invoice, ignoring reversed payments, never negative.
create or replace view invoice_balances as
select
  i.id as invoice_id,
  i.total_amount,
  coalesce(sum(p.amount) filter (where not p.is_reversed), 0) as amount_paid,
  greatest(i.total_amount - coalesce(sum(p.amount) filter (where not p.is_reversed), 0), 0) as outstanding_amount
from invoices i
left join payments p on p.invoice_id = i.id
group by i.id, i.total_amount;

-- ---------- TRIGGERS: updated_at ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();
create trigger trg_invoices_updated before update on invoices
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (defense in depth — Express middleware is primary)
-- ============================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table company_settings enable row level security;
alter table audit_logs enable row level security;

create or replace function is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- profiles: everyone can read their own row; admin can read/write all
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles for insert with check (is_admin());
create policy profiles_admin_update on profiles for update using (is_admin());

-- clients: admin full access; staff read-only for clients they have an assigned project on
create policy clients_admin_all on clients for all using (is_admin()) with check (is_admin());
create policy clients_staff_read on clients for select
  using (
    exists (select 1 from projects p where p.client_id = clients.id and p.assigned_staff_id = auth.uid())
  );

-- projects: admin full access; staff read + limited update on their own rows
create policy projects_admin_all on projects for all using (is_admin()) with check (is_admin());
create policy projects_staff_read on projects for select
  using (assigned_staff_id = auth.uid());
-- Staff updates are further restricted to work_status/completion fields at the API layer;
-- RLS here only gates row visibility for the update.
create policy projects_staff_update on projects for update
  using (assigned_staff_id = auth.uid());

-- invoices & payments: admin only
create policy invoices_admin_all on invoices for all using (is_admin()) with check (is_admin());
create policy payments_admin_all on payments for all using (is_admin()) with check (is_admin());

-- company_settings: everyone can read, only admin can write
create policy settings_read on company_settings for select using (true);
create policy settings_admin_write on company_settings for update using (is_admin());

-- audit_logs: admin read-only; writes happen via service role from the backend
create policy audit_admin_read on audit_logs for select using (is_admin());

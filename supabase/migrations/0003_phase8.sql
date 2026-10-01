-- ============================================================
-- Phase 8 additions: Services catalog, event-video projects,
-- staff avatars, second company phone number
-- ============================================================

-- ---------- SERVICES ----------
-- Reusable package definitions the admin sets up once (name, video/poster
-- counts, price) and reuses when creating a project, instead of typing the
-- same package details from scratch each time.
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  number_of_videos integer not null default 1 check (number_of_videos > 0),
  number_of_posters integer not null default 0 check (number_of_posters >= 0),
  budget numeric(12,2) not null check (budget >= 0),
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_services_updated before update on services
  for each row execute function set_updated_at();

alter table services enable row level security;
create policy services_admin_all on services for all using (is_admin()) with check (is_admin());
-- Everyone authenticated can read active services (e.g. to show package
-- names on a project they're assigned to); only admin writes.
create policy services_read on services for select using (true);

-- ---------- PROJECTS: event videos + poster count + service link ----------
create type project_type as enum ('standard', 'event');

alter table projects
  add column project_type project_type not null default 'standard',
  add column event_name text,
  add column number_of_posters integer not null default 0 check (number_of_posters >= 0),
  add column service_id uuid references services(id);

-- An event project must have an event name; a standard one shouldn't.
alter table projects
  add constraint projects_event_name_check
  check (
    (project_type = 'event' and event_name is not null and length(trim(event_name)) > 0)
    or (project_type = 'standard')
  );

-- ---------- PROFILES: staff avatar ----------
alter table profiles add column avatar_url text;

-- ---------- COMPANY SETTINGS: second phone number ----------
alter table company_settings add column phone_2 text;

-- Rebrand the seeded default row for this deployment. Harmless no-op if
-- the admin already customized it away from the "Your Company" default.
update company_settings
set company_name = 'NewDev Digital Solutions'
where id = 1 and company_name = 'Your Company';

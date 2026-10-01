-- ============================================================
-- Phase 2 additions: atomic client+project creation, list helpers
-- ============================================================

-- Creates a client and its first project in a single transaction so the
-- Add Client workflow (client + project + billing details) never leaves a
-- client with no project, or vice versa, if something fails midway.
create or replace function create_client_with_project(
  p_client_name text,
  p_company_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_project_name text,
  p_description text,
  p_number_of_videos integer,
  p_allowed_submission_days integer,
  p_start_date date,
  p_submission_deadline date,
  p_deadline_manually_set boolean,
  p_assigned_staff_id uuid,
  p_notes text,
  p_project_amount numeric,
  p_advance_amount numeric,
  p_payment_due_date date,
  p_created_by uuid
)
returns table (client_id uuid, project_id uuid)
language plpgsql
as $$
declare
  v_client_id uuid;
  v_project_id uuid;
begin
  insert into clients (client_name, company_name, phone, email, address, created_by)
  values (p_client_name, p_company_name, p_phone, nullif(p_email, ''), p_address, p_created_by)
  returning id into v_client_id;

  insert into projects (
    client_id, project_name, description, number_of_videos, allowed_submission_days,
    start_date, submission_deadline, deadline_manually_set, assigned_staff_id, notes,
    project_amount, advance_amount, payment_due_date, created_by
  ) values (
    v_client_id, p_project_name, p_description, p_number_of_videos, p_allowed_submission_days,
    p_start_date, p_submission_deadline, p_deadline_manually_set, p_assigned_staff_id, p_notes,
    p_project_amount, p_advance_amount, p_payment_due_date, p_created_by
  )
  returning id into v_project_id;

  return query select v_client_id, v_project_id;
end;
$$;

-- Per-staff rollup used by the Staff Management page.
create or replace view staff_summary as
select
  p.id as staff_id,
  count(distinct pr.client_id) filter (where pr.archived_at is null) as assigned_clients,
  count(pr.id) filter (where pr.work_status = 'in_progress' and pr.archived_at is null) as active_projects,
  count(pr.id) filter (where pr.work_status = 'completed' and pr.archived_at is null) as completed_projects,
  count(pr.id) filter (where pr.work_status = 'not_started' and pr.archived_at is null) as pending_projects
from profiles p
left join projects pr on pr.assigned_staff_id = p.id
where p.role = 'staff'
group by p.id;

-- Derived, read-only "effective status" that folds overdue into the status
-- set the UI filters by, without duplicating logic in every query.
create or replace view project_effective_status as
select
  pr.*,
  case
    when pr.work_status <> 'completed' and pr.submission_deadline < current_date
      then 'overdue'
    else pr.work_status::text
  end as effective_status
from projects pr;

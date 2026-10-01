import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { updateProjectSchema, updateStatusSchema, projectQuerySchema } from "../validators/projectValidators.js";
import { addDays } from "../utils/dates.js";

const PROJECT_SELECT = `
  id, project_name, description, number_of_videos, allowed_submission_days,
  start_date, submission_deadline, deadline_manually_set, work_status,
  completion_date, project_amount, advance_amount, payment_due_date, notes,
  created_at, assigned_staff_id, project_type, event_name, number_of_posters,
  service_id, service:services ( id, name ),
  client:clients ( id, client_name, company_name, phone, email, archived_at ),
  assigned_staff:profiles!projects_assigned_staff_id_fkey ( id, full_name, avatar_url )
`;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function withEffectiveStatus(project) {
  const overdue = project.work_status !== "completed" && project.submission_deadline < today();
  return { ...project, effective_status: overdue ? "overdue" : project.work_status };
}

/**
 * GET /api/projects — admin only. Filter/sort/paginate across all projects.
 */
export async function listProjects(req, res, next) {
  try {
    const q = projectQuerySchema.parse(req.query);
    const from = (q.page - 1) * q.page_size;
    const to = from + q.page_size - 1;

    let query = supabaseAdmin
      .from("projects")
      .select(PROJECT_SELECT, { count: "exact" })
      .is("archived_at", null)
      .order(q.sort, { ascending: q.order === "asc" })
      .range(from, to);

    if (q.staff_id) query = query.eq("assigned_staff_id", q.staff_id);
    if (q.client_id) query = query.eq("client_id", q.client_id);
    if (q.search) query = query.ilike("project_name", `%${q.search}%`);
    if (q.status && q.status !== "overdue") query = query.eq("work_status", q.status);
    if (q.status === "overdue") {
      query = query.neq("work_status", "completed").lt("submission_deadline", today());
    }

    const { data, error, count } = await query;
    if (error) throw new ApiError(500, "Could not load projects.");

    res.json({
      projects: data.map(withEffectiveStatus),
      pagination: { page: q.page, page_size: q.page_size, total: count ?? data.length },
    });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid query parameters." });
    next(err);
  }
}

/**
 * GET /api/projects/:id — admin only.
 */
export async function getProject(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("id", req.params.id)
      .single();

    if (error || !data) throw new ApiError(404, "Project not found.");
    res.json({ project: withEffectiveStatus(data) });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/projects/:id — admin only. Full edit: deadline, amount, staff
 * assignment, video count, notes. Staff never reach this endpoint
 * (see updateStatus below for their one allowed action).
 */
export async function updateProject(req, res, next) {
  try {
    const body = updateProjectSchema.parse(req.body);

    // If start_date or allowed_submission_days changed and the deadline
    // isn't manually pinned, recompute it server-side rather than trusting
    // whatever the client sent.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("projects")
      .select("start_date, allowed_submission_days, deadline_manually_set")
      .eq("id", req.params.id)
      .single();
    if (fetchError || !existing) throw new ApiError(404, "Project not found.");

    const willBeManual = body.deadline_manually_set ?? existing.deadline_manually_set;
    const nextStartDate = body.start_date ?? existing.start_date;
    const nextAllowedDays = body.allowed_submission_days ?? existing.allowed_submission_days;

    if (!willBeManual) {
      body.submission_deadline = addDays(nextStartDate, nextAllowedDays);
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(body)
      .eq("id", req.params.id)
      .select(PROJECT_SELECT)
      .single();

    if (error || !data) throw new ApiError(404, "Project not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "project.update",
      entity_type: "project",
      entity_id: req.params.id,
      details: body,
    });

    res.json({ project: withEffectiveStatus(data) });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

/**
 * DELETE /api/projects/:id — admin only. Soft delete.
 */
export async function archiveProject(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) throw new ApiError(404, "Project not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "project.archive",
      entity_type: "project",
      entity_id: req.params.id,
    });

    res.json({ message: "Project archived." });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/mine — staff only. Only rows assigned to the
 * authenticated staff member; a staff user can never pass a different id
 * because this endpoint ignores any id in the request entirely.
 */
export async function myProjects(req, res, next) {
  try {
    const status = req.query.status;
    let query = supabaseAdmin
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("assigned_staff_id", req.user.id)
      .is("archived_at", null)
      .order("submission_deadline", { ascending: true });

    if (status && status !== "overdue") query = query.eq("work_status", status);
    if (status === "overdue") query = query.neq("work_status", "completed").lt("submission_deadline", today());

    const { data, error } = await query;
    if (error) throw new ApiError(500, "Could not load your projects.");

    res.json({ projects: data.map(withEffectiveStatus) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:id/status — staff (own projects only) or admin.
 * The ONLY field this endpoint ever writes is work_status (+ the
 * completion bookkeeping that follows from it) — regardless of what else
 * is in the request body, so a staff user cannot smuggle in a deadline,
 * amount, or reassignment through this route.
 */
export async function updateStatus(req, res, next) {
  try {
    const { work_status } = updateStatusSchema.parse(req.body);

    const { data: project, error: fetchError } = await supabaseAdmin
      .from("projects")
      .select("id, assigned_staff_id, work_status")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !project) throw new ApiError(404, "Project not found.");

    if (req.user.role !== "admin" && project.assigned_staff_id !== req.user.id) {
      throw new ApiError(403, "You do not have access to this project.");
    }

    const patch = { work_status };
    if (work_status === "completed") {
      patch.completion_date = new Date().toISOString();
      patch.completed_by = req.user.id;
    } else if (project.work_status === "completed" && work_status !== "completed") {
      // Moving back off Completed clears the completion record.
      patch.completion_date = null;
      patch.completed_by = null;
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(patch)
      .eq("id", req.params.id)
      .select(PROJECT_SELECT)
      .single();

    if (error || !data) throw new ApiError(500, "Could not update status.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "project.status_update",
      entity_type: "project",
      entity_id: req.params.id,
      details: { work_status },
    });

    res.json({ project: withEffectiveStatus(data), message: "Status updated successfully." });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid status." });
    next(err);
  }
}

/**
 * GET /api/projects/stats — admin only. Dashboard overview counts, all
 * computed from live rows (never hardcoded).
 */
export async function getStats(req, res, next) {
  try {
    const [{ count: totalClients }, { data: projects }] = await Promise.all([
      supabaseAdmin.from("clients").select("id", { count: "exact", head: true }).is("archived_at", null),
      supabaseAdmin
        .from("projects")
        .select("work_status, submission_deadline, client:clients(client_name)")
        .is("archived_at", null),
    ]);

    const t = today();
    const stats = {
      total_clients: totalClients ?? 0,
      total_projects: projects?.length ?? 0,
      in_progress: 0,
      completed: 0,
      not_started: 0,
      overdue: 0,
    };
    const upcoming = [];

    for (const p of projects || []) {
      const overdue = p.work_status !== "completed" && p.submission_deadline < t;
      if (overdue) stats.overdue += 1;
      else stats[p.work_status] = (stats[p.work_status] || 0) + 1;

      const daysAway = Math.ceil((new Date(p.submission_deadline) - new Date(t)) / 86400000);
      if (!overdue && p.work_status !== "completed" && daysAway >= 0 && daysAway <= 7) {
        upcoming.push({ deadline: p.submission_deadline, client_name: p.client?.client_name });
      }
    }

    upcoming.sort((a, b) => a.deadline.localeCompare(b.deadline));

    res.json({ stats, upcoming_deadlines: upcoming.slice(0, 10) });
  } catch (err) {
    next(err);
  }
}

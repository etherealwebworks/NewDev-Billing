import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";

/**
 * GET /api/staff — admin only. Joins staff_summary for the counts the
 * Staff Management table needs (assigned clients, active/completed/pending).
 */
export async function listStaff(req, res, next) {
  try {
    const { data: staff, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, is_active, created_at")
      .eq("role", "staff")
      .order("full_name", { ascending: true });

    if (error) throw new ApiError(500, "Could not load staff.");

    const { data: summaries } = await supabaseAdmin.from("staff_summary").select("*");
    const summaryMap = Object.fromEntries((summaries || []).map((s) => [s.staff_id, s]));

    res.json({
      staff: staff.map((s) => ({
        ...s,
        assigned_clients: summaryMap[s.id]?.assigned_clients ?? 0,
        active_projects: summaryMap[s.id]?.active_projects ?? 0,
        completed_projects: summaryMap[s.id]?.completed_projects ?? 0,
        pending_projects: summaryMap[s.id]?.pending_projects ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/:id — admin only. Includes the clients/projects assigned
 * to this staff member for the "view staff performance" detail view.
 */
export async function getStaff(req, res, next) {
  try {
    const { data: staff, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, is_active, created_at")
      .eq("id", req.params.id)
      .eq("role", "staff")
      .single();

    if (error || !staff) throw new ApiError(404, "Staff member not found.");

    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, project_name, work_status, submission_deadline, client:clients(id, client_name)")
      .eq("assigned_staff_id", req.params.id)
      .is("archived_at", null)
      .order("submission_deadline", { ascending: true });

    res.json({ staff, projects: projects || [] });
  } catch (err) {
    next(err);
  }
}

const updateStaffSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
});

/**
 * PUT /api/staff/:id — admin only. Name/phone/avatar — email changes go
 * through Supabase Auth separately since it's also the login identifier.
 */
export async function updateStaff(req, res, next) {
  try {
    const body = updateStaffSchema.parse(req.body);
    if (body.avatar_url === "") body.avatar_url = null;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(body)
      .eq("id", req.params.id)
      .eq("role", "staff")
      .select()
      .single();

    if (error || !data) throw new ApiError(404, "Staff member not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "staff.update",
      entity_type: "profile",
      entity_id: req.params.id,
      details: body,
    });

    res.json({ staff: data });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

const statusSchema = z.object({ is_active: z.boolean() });

/**
 * PATCH /api/staff/:id/status — admin only. Deactivating sets is_active =
 * false, which requireAuth already checks on every request, so a
 * deactivated staff member is locked out immediately without needing to
 * hunt down and revoke individual sessions.
 */
export async function setStaffStatus(req, res, next) {
  try {
    const { is_active } = statusSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active })
      .eq("id", req.params.id)
      .eq("role", "staff")
      .select()
      .single();

    if (error || !data) throw new ApiError(404, "Staff member not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: is_active ? "staff.activate" : "staff.deactivate",
      entity_type: "profile",
      entity_id: req.params.id,
    });

    res.json({ staff: data });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid input." });
    next(err);
  }
}

const reassignSchema = z.object({ project_id: z.string().uuid(), staff_id: z.string().uuid() });

/**
 * POST /api/staff/reassign — admin only. Moves one project to a different
 * staff member. (Project CRUD proper lands in Phase 3; this endpoint covers
 * the "reassign clients" requirement from Staff Management now.)
 */
export async function reassignProject(req, res, next) {
  try {
    const { project_id, staff_id } = reassignSchema.parse(req.body);

    const { data: staff, error: staffError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", staff_id)
      .eq("role", "staff")
      .eq("is_active", true)
      .single();
    if (staffError || !staff) throw new ApiError(400, "Selected staff member is not valid or is inactive.");

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .update({ assigned_staff_id: staff_id })
      .eq("id", project_id)
      .select()
      .single();

    if (error || !project) throw new ApiError(404, "Project not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "project.reassign",
      entity_type: "project",
      entity_id: project_id,
      details: { new_staff_id: staff_id },
    });

    res.json({ project });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid input." });
    next(err);
  }
}

/**
 * DELETE /api/staff/:id/permanent — admin only. A REAL delete of the auth
 * user + profile (profiles.id -> auth.users cascades). Only allowed when
 * the staff member has never been assigned to or completed a project —
 * otherwise this is refused and Deactivate remains the only option, same
 * "don't orphan history" principle used for clients.
 */
export async function deleteStaffPermanently(req, res, next) {
  try {
    const { count } = await supabaseAdmin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .or(`assigned_staff_id.eq.${req.params.id},completed_by.eq.${req.params.id}`);

    if (count && count > 0) {
      throw new ApiError(
        400,
        "This staff member has project history and can only be deactivated, not permanently deleted."
      );
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (deleteAuthError) throw new ApiError(500, "Could not delete staff account.");
    // profiles row cascades automatically via its FK to auth.users.

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "staff.delete_permanent",
      entity_type: "profile",
      entity_id: req.params.id,
    });

    res.json({ message: "Staff account permanently deleted." });
  } catch (err) {
    next(err);
  }
}

import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createServiceSchema, updateServiceSchema } from "../validators/serviceValidators.js";

/**
 * GET /api/services — any authenticated user can read (so a staff member
 * can see the package name behind their assigned project); only admin can
 * write (enforced per-route below).
 */
export async function listServices(req, res, next) {
  try {
    const includeInactive = req.query.include_inactive === "true";
    let query = supabaseAdmin.from("services").select("*").order("name", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw new ApiError(500, "Could not load services.");
    res.json({ services: data });
  } catch (err) {
    next(err);
  }
}

export async function getService(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin.from("services").select("*").eq("id", req.params.id).single();
    if (error || !data) throw new ApiError(404, "Service not found.");
    res.json({ service: data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/services — admin only.
 */
export async function createService(req, res, next) {
  try {
    const body = createServiceSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("services")
      .insert({ ...body, created_by: req.user.id })
      .select()
      .single();
    if (error) throw new ApiError(500, "Could not create service.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "service.create",
      entity_type: "service",
      entity_id: data.id,
    });

    res.status(201).json({ service: data });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    next(err);
  }
}

/**
 * PUT /api/services/:id — admin only. Also how a service is
 * activated/deactivated (via is_active in the same payload).
 */
export async function updateService(req, res, next) {
  try {
    const body = updateServiceSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("services")
      .update(body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error || !data) throw new ApiError(404, "Service not found.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "service.update",
      entity_type: "service",
      entity_id: req.params.id,
      details: body,
    });

    res.json({ service: data });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    next(err);
  }
}

/**
 * DELETE /api/services/:id — admin only. Hard delete ONLY if no project
 * has ever used it; otherwise force a deactivate so past projects keep a
 * valid reference and their own snapshot of what they used at the time.
 */
export async function deleteService(req, res, next) {
  try {
    const { count } = await supabaseAdmin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("service_id", req.params.id);

    if (count && count > 0) {
      const { data, error } = await supabaseAdmin
        .from("services")
        .update({ is_active: false })
        .eq("id", req.params.id)
        .select()
        .single();
      if (error || !data) throw new ApiError(404, "Service not found.");
      return res.json({
        service: data,
        message: "This service has been used on existing projects, so it was deactivated instead of deleted.",
      });
    }

    const { error } = await supabaseAdmin.from("services").delete().eq("id", req.params.id);
    if (error) throw new ApiError(500, "Could not delete service.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "service.delete",
      entity_type: "service",
      entity_id: req.params.id,
    });

    res.json({ message: "Service deleted." });
  } catch (err) {
    next(err);
  }
}

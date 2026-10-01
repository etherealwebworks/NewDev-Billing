import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { updateSettingsSchema } from "../validators/settingsValidators.js";

/**
 * GET /api/settings — admin only.
 */
export async function getSettings(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin.from("company_settings").select("*").eq("id", 1).single();
    if (error || !data) throw new ApiError(500, "Company settings are not configured.");
    res.json({ settings: data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/settings — admin only. Updates the single settings row used to
 * populate NEW invoices — issued invoices keep their frozen snapshot
 * regardless of what changes here (see invoicesController).
 */
export async function updateSettings(req, res, next) {
  try {
    const body = updateSettingsSchema.parse(req.body);
    if (body.email === "") body.email = null;
    if (body.logo_url === "") body.logo_url = null;

    const { data, error } = await supabaseAdmin
      .from("company_settings")
      .update({ ...body, updated_by: req.user.id })
      .eq("id", 1)
      .select()
      .single();

    if (error || !data) throw new ApiError(500, "Could not save settings.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "settings.update",
      entity_type: "company_settings",
      entity_id: null,
      details: body,
    });

    res.json({ settings: data });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

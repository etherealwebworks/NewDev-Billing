import { z } from "zod";
import { supabaseAdmin, supabaseAnon } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 * Exchanges email/password for a Supabase session via the anon client, then
 * loads the profile so the frontend gets role info from a trusted source.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, is_active, phone, avatar_url")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: "No profile found for this account." });
    }

    if (!profile.is_active) {
      // Immediately invalidate the session we just created.
      await supabaseAdmin.auth.admin.signOut(data.session.access_token).catch(() => {});
      return res.status(403).json({ error: "This account has been deactivated." });
    }

    res.json({
      user: profile,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Please provide a valid email and password." });
    }
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) throw new ApiError(400, "Missing refresh token.");

    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token });
    if (error || !data.session) {
      return res.status(401).json({ error: "Session could not be refreshed. Please log in again." });
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me — requires requireAuth middleware
 */
export async function me(req, res) {
  res.json({ user: req.user });
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res, next) {
  try {
    await supabaseAdmin.auth.admin.signOut(req.token).catch(() => {});
    res.json({ message: "Logged out." });
  } catch (err) {
    next(err);
  }
}

const createStaffSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/**
 * POST /api/auth/staff — admin only (requireAuth + requireRole("admin"))
 * Creates the auth user AND the profile row in one controlled operation.
 * This is the ONLY way a staff account can be created — there is no public
 * registration endpoint.
 */
export async function createStaffAccount(req, res, next) {
  try {
    const { full_name, email, phone, avatar_url, password } = createStaffSchema.parse(req.body);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      return res.status(400).json({ error: createError?.message || "Could not create account." });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: created.user.id,
        full_name,
        email,
        phone: phone || null,
        avatar_url: avatar_url || null,
        role: "staff",
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      // Roll back the auth user so we don't leave an orphaned account.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw new ApiError(500, "Could not create staff profile.");
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "staff.create",
      entity_type: "profile",
      entity_id: profile.id,
      details: { email },
    });

    res.status(201).json({ staff: profile });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

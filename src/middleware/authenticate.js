import { supabaseAdmin } from "../config/supabase.js";

/**
 * Verifies the bearer JWT against Supabase, loads the profile row (which is
 * the ONLY place role lives), and rejects inactive/deactivated accounts.
 * Never trust a role sent from the client — this middleware is what makes
 * every downstream `requireRole` check meaningful.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing authentication token." });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, is_active, avatar_url")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: "No profile found for this account." });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: "This account has been deactivated." });
    }

    req.user = profile; // { id, full_name, email, role, is_active }
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Service-role client: full DB access, used ONLY by trusted backend code.
// Never send this key to the frontend, never log it.
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client: used only to verify user JWTs / proxy login. No elevated privileges.
export const supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

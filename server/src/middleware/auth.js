// Re-exported from two files so every existing `from "../middleware/auth.js"`
// import keeps working: authenticate.js needs Supabase (requireAuth),
// authorize.js is pure logic (requireRole, requireOwnershipOrAdmin) and is
// what the unit tests import directly, without needing live credentials.
export { requireAuth } from "./authenticate.js";
export { requireRole, requireOwnershipOrAdmin } from "./authorize.js";

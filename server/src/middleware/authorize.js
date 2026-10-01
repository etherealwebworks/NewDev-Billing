/**
 * Usage: requireRole("admin") or requireRole("admin", "staff")
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

/**
 * For staff-scoped resources (projects, clients-through-projects): ensures a
 * staff user can only touch rows where assigned_staff_id === req.user.id.
 * Admins bypass this check. Call after the resource has been loaded onto
 * req.resource (e.g. by a controller) — see projectsController for usage.
 */
export function requireOwnershipOrAdmin(getOwnerId) {
  return (req, res, next) => {
    if (req.user.role === "admin") return next();
    const ownerId = getOwnerId(req);
    if (ownerId && ownerId === req.user.id) return next();
    return res.status(403).json({ error: "You do not have access to this resource." });
  };
}

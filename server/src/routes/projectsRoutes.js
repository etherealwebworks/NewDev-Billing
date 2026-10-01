import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listProjects,
  getProject,
  updateProject,
  archiveProject,
  myProjects,
  updateStatus,
  getStats,
} from "../controllers/projectsController.js";

const router = Router();

router.use(requireAuth);

// Staff-scoped routes — available to both roles, but myProjects only ever
// returns the authenticated user's own rows, and updateStatus checks
// ownership internally (admins bypass it).
router.get("/mine", requireRole("staff", "admin"), myProjects);
router.patch("/:id/status", requireRole("staff", "admin"), updateStatus);

// Admin-only routes
router.get("/stats", requireRole("admin"), getStats);
router.get("/", requireRole("admin"), listProjects);
router.get("/:id", requireRole("admin"), getProject);
router.put("/:id", requireRole("admin"), updateProject);
router.delete("/:id", requireRole("admin"), archiveProject);

export default router;

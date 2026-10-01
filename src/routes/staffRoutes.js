import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listStaff,
  getStaff,
  updateStaff,
  setStaffStatus,
  reassignProject,
  deleteStaffPermanently,
} from "../controllers/staffController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listStaff);
router.get("/:id", getStaff);
router.put("/:id", updateStaff);
router.patch("/:id/status", setStaffStatus);
router.post("/reassign", reassignProject);
router.delete("/:id/permanent", deleteStaffPermanently);

// Note: account creation stays at POST /api/auth/staff (Phase 1) since it
// touches Supabase Auth, not just the profiles table.

export default router;

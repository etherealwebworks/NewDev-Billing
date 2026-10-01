import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getReports } from "../controllers/reportsController.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), getReports);

export default router;

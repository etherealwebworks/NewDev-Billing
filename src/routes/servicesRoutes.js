import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listServices, getService, createService, updateService, deleteService } from "../controllers/servicesController.js";

const router = Router();

router.use(requireAuth);

router.get("/", listServices);
router.get("/:id", getService);
router.post("/", requireRole("admin"), createService);
router.put("/:id", requireRole("admin"), updateService);
router.delete("/:id", requireRole("admin"), deleteService);

export default router;

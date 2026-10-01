import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  archiveClient,
  deleteClientPermanently,
} from "../controllers/clientsController.js";

const router = Router();

// Every client route is admin-only. Staff see clients only through their
// assigned projects (see /api/projects/mine in Phase 3), never here.
router.use(requireAuth, requireRole("admin"));

router.get("/", listClients);
router.get("/:id", getClient);
router.post("/", createClient);
router.put("/:id", updateClient);
router.delete("/:id", archiveClient);
router.delete("/:id/permanent", deleteClientPermanently);

export default router;

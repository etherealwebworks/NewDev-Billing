import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listInvoices,
  getInvoice,
  createInvoice,
  cancelInvoice,
  reissueInvoice,
} from "../controllers/invoicesController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listInvoices);
router.get("/:id", getInvoice);
router.post("/", createInvoice);
router.post("/:id/cancel", cancelInvoice);
router.post("/:id/reissue", reissueInvoice);

export default router;

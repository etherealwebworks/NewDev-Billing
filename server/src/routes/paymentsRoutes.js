import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listPayments,
  getPayment,
  createPayment,
  reversePayment,
  getFinancialStats,
} from "../controllers/paymentsController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/stats", getFinancialStats);
router.get("/", listPayments);
router.get("/:id", getPayment);
router.post("/", createPayment);
router.post("/:id/reverse", reversePayment);

export default router;

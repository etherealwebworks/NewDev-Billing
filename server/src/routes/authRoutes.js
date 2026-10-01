import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { login, refresh, me, logout, createStaffAccount } from "../controllers/authController.js";
import { env } from "../config/env.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

// Admin-only: create a staff account. No public registration route exists.
router.post("/staff", requireAuth, requireRole("admin"), createStaffAccount);

export default router;

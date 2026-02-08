import { Router } from "express";
import {
  registerUser,
  loginUser,
  registerVet,
  loginVet,
  refreshToken,
} from "../controllers/authController";

const router = Router();

// ─── User Auth ──────────────────────────────────────────────
router.post("/register", registerUser);
router.post("/login", loginUser);

// ─── Vet Auth ───────────────────────────────────────────────
router.post("/vet/register", registerVet);
router.post("/vet/login", loginVet);

// ─── Token Refresh (shared) ─────────────────────────────────
router.post("/refresh", refreshToken);

export default router;

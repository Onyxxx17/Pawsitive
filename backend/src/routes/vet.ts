import { Router } from "express";
import { authenticate, authorizeVet } from "../middleware/auth";
import {
  getMyVetProfile,
  updateMyVetProfile,
  getVetPublicProfile,
  listVets,
  deactivateVetAccount,
} from "../controllers/vetController";

const router = Router();

// ─── Protected routes (vet only) — must be above /:id ───────
router.get("/me/profile", authenticate, authorizeVet, getMyVetProfile);
router.put("/me/profile", authenticate, authorizeVet, updateMyVetProfile);
router.delete("/me/profile", authenticate, authorizeVet, deactivateVetAccount);

// ─── Public routes (any authenticated user can browse vets) ──
router.get("/", authenticate, listVets);
router.get("/:id", authenticate, getVetPublicProfile);

export default router;

import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getMyVetProfile,
  updateMyVetProfile,
  getVetPublicProfile,
  listVets,
  deactivateVetAccount,
} from "../controllers/vetController";

const router = Router();

// ─── Protected routes (vet only) — must be above /:id ───────
router.get("/me/profile", authenticate, authorize("vet"), getMyVetProfile);
router.put("/me/profile", authenticate, authorize("vet"), updateMyVetProfile);
router.delete("/me/profile", authenticate, authorize("vet"), deactivateVetAccount);

// ─── Public routes (any authenticated user can browse vets) ──
router.get("/", authenticate, listVets);
router.get("/:id", authenticate, getVetPublicProfile);

export default router;

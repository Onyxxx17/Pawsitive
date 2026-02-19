import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
} from "../controllers/userController";

const router = Router();

// All routes require a valid Supabase JWT
router.use(authenticate);

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.delete("/me", deleteMyAccount);

export default router;

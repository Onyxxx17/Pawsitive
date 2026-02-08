import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
} from "../controllers/userController";

const router = Router();

// All routes require authentication as a "user"
router.use(authenticate);
router.use(authorize("user"));

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.delete("/me", deleteMyAccount);

export default router;

import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get("/profile", UserController.getProfile);
router.put("/profile", UserController.updateProfile);
router.put("/change-password", UserController.changePassword);

// Delegate routes
router.get("/delegate", UserController.getDelegate);

// Dependants routes (for future implementation)
router.get("/dependants", UserController.getDependants);

// Documents routes (for future implementation)
router.get("/documents", UserController.getDocuments);

export default router;

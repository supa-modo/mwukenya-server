import { Router } from "express";
import { MedicalSchemeController } from "../controllers/MedicalSchemeController";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();
const medicalSchemeController = new MedicalSchemeController();

// Public routes (for members to view available schemes)
router.get("/", medicalSchemeController.getAllSchemes);
router.get("/active", medicalSchemeController.getActiveSchemes);
router.get("/:id", medicalSchemeController.getSchemeById);

// Admin only routes (authentication + authorization)
router.post(
  "/",
  authenticate,
  requireAdmin,
  medicalSchemeController.createScheme
);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  medicalSchemeController.updateScheme
);
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  medicalSchemeController.deleteScheme
);
router.get(
  "/:id/subscribers",
  authenticate,
  requireAdmin,
  medicalSchemeController.getSchemeSubscribers
);

export default router;

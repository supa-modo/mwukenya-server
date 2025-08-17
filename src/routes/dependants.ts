import { Router } from "express";
import { DependantController } from "../controllers/DependantController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Member routes (authenticated users can manage their own dependants)
router.post("/", DependantController.createDependant);
router.get("/", DependantController.getUserDependants);
router.get("/stats", DependantController.getDependantStats);
router.get("/:dependantId", DependantController.getDependantById);
router.put("/:dependantId", DependantController.updateDependant);
router.delete("/:dependantId", DependantController.deleteDependant);

// Admin/Delegate routes (for verification and management)
router.get(
  "/admin/pending-verification",
  DependantController.getPendingVerificationDependants
);
router.post("/admin/:dependantId/verify", DependantController.verifyDependant);

export default router;

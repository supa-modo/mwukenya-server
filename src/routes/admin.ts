import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { authenticate } from "../middleware/auth";
import { emailService } from "../utils/emailService";

const router = Router();

// All routes require authentication
router.use(authenticate);

// TODO: Add admin middleware to check if user has admin privileges
// router.use(isAdmin);

// User management routes
router.get("/users", AdminController.getAllUsers);
router.get("/users/stats", AdminController.getUserStats);
router.post("/users", AdminController.createUser);
router.put("/users/:id", AdminController.updateUser);
router.delete("/users/:id", AdminController.deleteUser);

// Dashboard statistics
router.get("/dashboard/stats", AdminController.getDashboardStats);
router.get(
  "/dashboard/hierarchy-performance",
  AdminController.getHierarchyPerformance
);

// Member verification routes
router.get(
  "/verification/members",
  AdminController.getMembersPendingVerification
);
router.get(
  "/verification/members/:id",
  AdminController.getMemberVerificationDetails
);
router.post("/verification/members/:id", AdminController.verifyMember);

// Hierarchy management routes
router.get(
  "/coordinators/:coordinatorId/delegates",
  AdminController.getDelegatesByCoordinator
);
router.get(
  "/delegates/:delegateId/members",
  AdminController.getMembersByDelegate
);

export default router;

import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../types";

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

/**
 * @route GET /api/users/my-delegates
 * @desc Get delegates under current coordinator
 * @access Coordinator only
 */
router.get(
  "/my-delegates",
  authorize([UserRole.COORDINATOR]),
  UserController.getMyDelegates
);

/**
 * @route GET /api/users/my-members
 * @desc Get members under current delegate
 * @access Delegate only
 */
router.get(
  "/my-members",
  authorize([UserRole.DELEGATE]),
  UserController.getMyMembers
);

/**
 * @route POST /api/users/create-delegate
 * @desc Create a new delegate under current coordinator
 * @access Coordinator only
 */
router.post(
  "/create-delegate",
  authorize([UserRole.COORDINATOR]),
  UserController.createDelegate
);

/**
 * @route PUT /api/users/delegates/:delegateId
 * @desc Update delegate information
 * @access Coordinator only
 */
router.put(
  "/delegates/:delegateId",
  authorize([UserRole.COORDINATOR]),
  UserController.updateDelegate
);

/**
 * @route DELETE /api/users/delegates/:delegateId
 * @desc Deactivate/remove delegate
 * @access Coordinator only
 */
router.delete(
  "/delegates/:delegateId",
  authorize([UserRole.COORDINATOR]),
  UserController.deactivateDelegate
);

/**
 * @route GET /api/users/delegate-stats
 * @desc Get delegate statistics (for delegate dashboard)
 * @access Delegate only
 */
router.get(
  "/delegate-stats",
  authorize([UserRole.DELEGATE]),
  UserController.getDelegateStats
);

/**
 * @route GET /api/users/coordinator-stats
 * @desc Get coordinator statistics (for coordinator dashboard)
 * @access Coordinator only
 */
router.get(
  "/coordinator-stats",
  authorize([UserRole.COORDINATOR]),
  UserController.getCoordinatorStats
);

export default router;

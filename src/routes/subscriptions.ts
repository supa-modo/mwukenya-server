import { Router } from "express";
import { SubscriptionController } from "../controllers/SubscriptionController";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();
const subscriptionController = new SubscriptionController();

// Member routes (authentication required)
router.get(
  "/my-subscription",
  authenticate,
  subscriptionController.getMySubscription
);
router.post(
  "/subscribe",
  authenticate,
  subscriptionController.createSubscription
);
router.put("/change-scheme", authenticate, subscriptionController.changeScheme);
router.delete(
  "/cancel",
  authenticate,
  subscriptionController.cancelSubscription
);

// Admin routes (authentication + admin authorization required)
router.get(
  "/",
  authenticate,
  requireAdmin,
  subscriptionController.getAllSubscriptions
);
router.get(
  "/:id",
  authenticate,
  requireAdmin,
  subscriptionController.getSubscriptionById
);
router.put(
  "/:id/status",
  authenticate,
  requireAdmin,
  subscriptionController.updateSubscriptionStatus
);

export default router;

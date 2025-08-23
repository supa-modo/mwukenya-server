"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SubscriptionController_1 = require("../controllers/SubscriptionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const subscriptionController = new SubscriptionController_1.SubscriptionController();
router.get("/my-subscription", auth_1.authenticate, subscriptionController.getMySubscription);
router.post("/subscribe", auth_1.authenticate, subscriptionController.createSubscription);
router.put("/change-scheme", auth_1.authenticate, subscriptionController.changeScheme);
router.delete("/cancel", auth_1.authenticate, subscriptionController.cancelSubscription);
router.get("/", auth_1.authenticate, auth_1.requireAdmin, subscriptionController.getAllSubscriptions);
router.get("/:id", auth_1.authenticate, auth_1.requireAdmin, subscriptionController.getSubscriptionById);
router.put("/:id/status", auth_1.authenticate, auth_1.requireAdmin, subscriptionController.updateSubscriptionStatus);
exports.default = router;
//# sourceMappingURL=subscriptions.js.map
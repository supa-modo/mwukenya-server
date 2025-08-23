"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.post("/login", (0, rateLimiter_1.rateLimitMiddleware)("auth", 5, 60), AuthController_1.AuthController.login);
router.post("/register", (0, rateLimiter_1.rateLimitMiddleware)("register", 10, 60), auth_1.optionalAuthenticate, AuthController_1.AuthController.register);
router.post("/refresh", (0, rateLimiter_1.rateLimitMiddleware)("refresh", 20, 60), AuthController_1.AuthController.refreshToken);
router.post("/logout", (0, rateLimiter_1.rateLimitMiddleware)("logout", 30, 60), auth_1.authenticate, AuthController_1.AuthController.logout);
router.post("/forgot-password", (0, rateLimiter_1.rateLimitMiddleware)("forgot-password", 3, 60), AuthController_1.AuthController.forgotPassword);
router.post("/reset-password/:token", (0, rateLimiter_1.rateLimitMiddleware)("reset-password", 5, 60), AuthController_1.AuthController.resetPasswordWithToken);
router.post("/reset-password-code", (0, rateLimiter_1.rateLimitMiddleware)("reset-password-code", 5, 60), AuthController_1.AuthController.resetPasswordWithCode);
exports.default = router;
//# sourceMappingURL=auth.js.map
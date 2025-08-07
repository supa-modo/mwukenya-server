import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rateLimiter";

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    User login
 * @access  Public
 * @rate    5 requests per minute
 */
router.post(
  "/login",
  rateLimitMiddleware("auth", 5, 60), // 5 requests per minute
  AuthController.login
);

/**
 * @route   POST /api/v1/auth/register
 * @desc    User registration
 * @access  Public for members (with delegate code), Protected for others
 * @rate    10 requests per minute
 */
router.post(
  "/register",
  rateLimitMiddleware("register", 10, 60), // 10 requests per minute
  optionalAuthenticate,
  AuthController.register
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires valid refresh token)
 * @rate    20 requests per minute
 */
router.post(
  "/refresh",
  rateLimitMiddleware("refresh", 20, 60), // 20 requests per minute
  AuthController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    User logout
 * @access  Protected
 * @rate    30 requests per minute
 */
router.post(
  "/logout",
  rateLimitMiddleware("logout", 30, 60), // 30 requests per minute
  authenticate,
  AuthController.logout
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @rate    3 requests per minute
 */
router.post(
  "/forgot-password",
  rateLimitMiddleware("forgot-password", 3, 60), // 3 requests per minute
  AuthController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with code
 * @access  Public
 * @rate    5 requests per minute
 */
router.post(
  "/reset-password",
  rateLimitMiddleware("reset-password", 5, 60), // 5 requests per minute
  AuthController.resetPassword
);

export default router;

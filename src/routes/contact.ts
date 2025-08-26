import { Router } from "express";
import { ContactController } from "../controllers/ContactController";
import { rateLimitMiddleware } from "../middleware/rateLimiter";

const router = Router();

// Apply rate limiting to contact form submissions (5 requests per 15 minutes per IP)
router.post(
  "/submit",
  rateLimitMiddleware(
    "contact_form",
    5, // 5 requests
    15 * 60, // 15 minutes in seconds
    (req) => `contact_form:${req.ip}`
  ),
  ContactController.submitContactForm
);

// Get contact information (no rate limiting needed)
router.get("/info", ContactController.getContactInfo);

export default router;

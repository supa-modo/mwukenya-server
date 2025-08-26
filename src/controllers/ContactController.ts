import { Request, Response } from "express";
import { emailService } from "../utils/emailService";
import { ApiError } from "../utils/apiError";
import logger, { apiLogger } from "../utils/logger";
import Joi from "joi";

// Validation schema for contact form
const contactFormSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name cannot exceed 100 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be in valid format",
    }),
  subject: Joi.string().min(5).max(200).required().messages({
    "string.min": "Subject must be at least 5 characters long",
    "string.max": "Subject cannot exceed 200 characters",
    "any.required": "Subject is required",
  }),
  message: Joi.string().min(10).max(2000).required().messages({
    "string.min": "Message must be at least 10 characters long",
    "string.max": "Message cannot exceed 2000 characters",
    "any.required": "Message is required",
  }),
  category: Joi.string()
    .valid("payment", "insurance", "claim", "account", "other")
    .required()
    .messages({
      "any.only":
        "Category must be one of: payment, insurance, claim, account, other",
      "any.required": "Category is required",
    }),
});

export class ContactController {
  /**
   * Submit contact form
   */
  public static async submitContactForm(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      // Validate request body
      const { error, value } = contactFormSchema.validate(req.body);
      if (error) {
        apiLogger(
          "POST",
          "/contact/submit",
          400,
          Date.now() - startTime,
          undefined,
          error.details[0].message
        );

        return res.status(400).json({
          success: false,
          error: {
            code: "CONTACT_001",
            message: error.details[0].message,
            field: error.details[0].path[0],
          },
        });
      }

      const { name, email, phone, subject, message, category } = value;

      // Log the contact form submission
      logger.info("CONTACT_FORM_SUBMISSION", {
        name,
        email,
        phone: phone || "not provided",
        subject,
        category,
        messageLength: message.length,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Check if email service is configured
      if (!emailService.isEmailConfigured()) {
        logger.error("Email service not configured - cannot send contact form");
        return res.status(500).json({
          success: false,
          error: {
            code: "CONTACT_002",
            message: "Email service is not configured. Please try again later.",
          },
        });
      }

      // Send the contact form email
      const emailSent = await emailService.sendContactFormEmail({
        name,
        email,
        phone,
        subject,
        message,
        category,
      });

      if (!emailSent) {
        logger.error("Failed to send contact form email", {
          name,
          email,
          subject,
          category,
        });

        return res.status(500).json({
          success: false,
          error: {
            code: "CONTACT_003",
            message: "Failed to send your message. Please try again later.",
          },
        });
      }

      // Log successful submission
      apiLogger("POST", "/contact/submit", 200, Date.now() - startTime);

      return res.status(200).json({
        success: true,
        data: {
          message:
            "Your support request has been submitted successfully. We'll get back to you soon!",
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      apiLogger(
        "POST",
        "/contact/submit",
        500,
        processingTime,
        undefined,
        error instanceof Error ? error.message : "Unknown error"
      );

      logger.error("Contact form submission error:", error);

      return res.status(500).json({
        success: false,
        error: {
          code: "CONTACT_004",
          message: "Internal server error. Please try again later.",
        },
      });
    }
  }

  /**
   * Get contact information
   */
  public static async getContactInfo(req: Request, res: Response) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          supportEmail: "support@mwukenya.co.ke",
          phone: "+254 700 123 456", // TODO: Update with actual phone number
          address: "Matatu Workers Union Kenya",
          businessHours: "Monday - Friday: 8:00 AM - 5:00 PM (EAT)",
          responseTime: "We typically respond within 24 hours",
        },
      });
    } catch (error) {
      logger.error("Error getting contact info:", error);

      return res.status(500).json({
        success: false,
        error: {
          code: "CONTACT_005",
          message: "Failed to retrieve contact information",
        },
      });
    }
  }
}

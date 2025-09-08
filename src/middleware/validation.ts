import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "date" | "email" | "uuid";
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  body?: ValidationRule[];
  params?: ValidationRule[];
  query?: ValidationRule[];
}

/**
 * Validates a single field based on the given rule
 */
const validateField = (value: any, rule: ValidationRule): string | null => {
  const {
    field,
    required,
    type,
    minLength,
    maxLength,
    min,
    max,
    pattern,
    custom,
  } = rule;

  // Check if field is required
  if (required && (value === undefined || value === null || value === "")) {
    return `${field} is required`;
  }

  // If field is not required and empty, skip other validations
  if (!required && (value === undefined || value === null || value === "")) {
    return null;
  }

  // Type validation
  if (type) {
    switch (type) {
      case "string":
        if (typeof value !== "string") {
          return `${field} must be a string`;
        }
        break;
      case "number":
        if (typeof value !== "number" && isNaN(Number(value))) {
          return `${field} must be a number`;
        }
        value = Number(value);
        break;
      case "boolean":
        if (
          typeof value !== "boolean" &&
          value !== "true" &&
          value !== "false"
        ) {
          return `${field} must be a boolean`;
        }
        break;
      case "date":
        if (isNaN(Date.parse(value))) {
          return `${field} must be a valid date`;
        }
        break;
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${field} must be a valid email address`;
        }
        break;
      case "uuid":
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          return `${field} must be a valid UUID`;
        }
        break;
    }
  }

  // Length validation for strings
  if (typeof value === "string") {
    if (minLength !== undefined && value.length < minLength) {
      return `${field} must be at least ${minLength} characters long`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `${field} must be at most ${maxLength} characters long`;
    }
  }

  // Numeric range validation
  if (typeof value === "number" || !isNaN(Number(value))) {
    const numValue = Number(value);
    if (min !== undefined && numValue < min) {
      return `${field} must be at least ${min}`;
    }
    if (max !== undefined && numValue > max) {
      return `${field} must be at most ${max}`;
    }
  }

  // Pattern validation
  if (pattern && !pattern.test(String(value))) {
    return `${field} format is invalid`;
  }

  // Custom validation
  if (custom) {
    const customResult = custom(value);
    if (customResult !== true) {
      return typeof customResult === "string"
        ? customResult
        : `${field} is invalid`;
    }
  }

  return null;
};

/**
 * Validates request data based on the provided schema
 */
export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      for (const rule of schema.body) {
        const error = validateField(req.body[rule.field], rule);
        if (error) {
          errors.push(error);
        }
      }
    }

    // Validate params
    if (schema.params) {
      for (const rule of schema.params) {
        const error = validateField(req.params[rule.field], rule);
        if (error) {
          errors.push(error);
        }
      }
    }

    // Validate query
    if (schema.query) {
      for (const rule of schema.query) {
        const error = validateField(req.query[rule.field], rule);
        if (error) {
          errors.push(error);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "VAL_001",
          message: "Validation failed",
          details: { validationErrors: errors },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

/**
 * Common validation schemas
 */
export const commonValidations = {
  uuid: (field: string, required = true): ValidationRule => ({
    field,
    required,
    type: "uuid",
  }),

  date: (field: string, required = true): ValidationRule => ({
    field,
    required,
    type: "date",
  }),

  positiveNumber: (field: string, required = true): ValidationRule => ({
    field,
    required,
    type: "number",
    min: 0,
  }),

  nonEmptyString: (field: string, required = true): ValidationRule => ({
    field,
    required,
    type: "string",
    minLength: 1,
  }),

  paginationLimit: (field: string = "limit"): ValidationRule => ({
    field,
    required: false,
    type: "number",
    min: 1,
    max: 100,
  }),

  paginationOffset: (field: string = "offset"): ValidationRule => ({
    field,
    required: false,
    type: "number",
    min: 0,
  }),
};

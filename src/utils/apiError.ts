/**
 * Custom API Error class for standardized error handling
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    code: string = "GENERIC_ERROR",
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Ensure the name of this error is the same as the class name
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Convert error to JSON response format
   */
  public toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Static factory methods for common errors
   */

  // Authentication errors
  static unauthorized(message: string = "Authentication required"): ApiError {
    return new ApiError(message, "AUTH_001", 401);
  }

  static forbidden(message: string = "Insufficient permissions"): ApiError {
    return new ApiError(message, "AUTH_004", 403);
  }

  static tokenExpired(message: string = "Token expired"): ApiError {
    return new ApiError(message, "AUTH_002", 401);
  }

  static invalidToken(message: string = "Invalid token"): ApiError {
    return new ApiError(message, "AUTH_003", 401);
  }

  static accountLocked(message: string = "Account is locked"): ApiError {
    return new ApiError(message, "AUTH_005", 401);
  }

  // Validation errors
  static validation(message: string, details?: any): ApiError {
    return new ApiError(message, "VAL_001", 400, details);
  }

  static invalidFormat(field: string, format?: string): ApiError {
    const message = format
      ? `Invalid format for ${field}. Expected: ${format}`
      : `Invalid format for ${field}`;
    return new ApiError(message, "VAL_002", 400);
  }

  static outOfRange(field: string, min?: number, max?: number): ApiError {
    let message = `Value for ${field} is out of range`;
    if (min !== undefined && max !== undefined) {
      message += ` (${min}-${max})`;
    } else if (min !== undefined) {
      message += ` (minimum: ${min})`;
    } else if (max !== undefined) {
      message += ` (maximum: ${max})`;
    }
    return new ApiError(message, "VAL_003", 400);
  }

  static duplicate(field: string): ApiError {
    return new ApiError(`${field} already exists`, "VAL_004", 409);
  }

  static invalidRelationship(message: string): ApiError {
    return new ApiError(message, "VAL_005", 400);
  }

  // Business logic errors
  static memberAlreadyRegistered(): ApiError {
    return new ApiError("Member is already registered", "BUS_001", 409);
  }

  static invalidDelegateCode(): ApiError {
    return new ApiError("Invalid or expired delegate code", "BUS_002", 400);
  }

  static insufficientBalance(): ApiError {
    return new ApiError("Insufficient account balance", "BUS_003", 400);
  }

  static paymentAlreadyProcessed(): ApiError {
    return new ApiError("Payment has already been processed", "BUS_004", 409);
  }

  static subscriptionNotActive(): ApiError {
    return new ApiError(
      "Medical scheme subscription is not active",
      "BUS_005",
      400
    );
  }

  static commissionAlreadyPaid(): ApiError {
    return new ApiError(
      "Commission has already been paid for this period",
      "BUS_006",
      409
    );
  }

  // System errors
  static databaseError(
    message: string = "Database operation failed"
  ): ApiError {
    return new ApiError(message, "SYS_001", 500);
  }

  static externalServiceUnavailable(service: string): ApiError {
    return new ApiError(
      `${service} service is currently unavailable`,
      "SYS_002",
      503
    );
  }

  static rateLimitExceeded(): ApiError {
    return new ApiError(
      "Rate limit exceeded. Please try again later",
      "SYS_003",
      429
    );
  }

  static maintenanceMode(): ApiError {
    return new ApiError(
      "System is currently under maintenance",
      "SYS_004",
      503
    );
  }

  static internalError(message: string = "Internal server error"): ApiError {
    return new ApiError(message, "SYS_005", 500);
  }

  // Resource errors
  static notFound(resource: string = "Resource"): ApiError {
    return new ApiError(`${resource} not found`, "RES_001", 404);
  }

  static alreadyExists(resource: string): ApiError {
    return new ApiError(`${resource} already exists`, "RES_002", 409);
  }

  static gone(resource: string): ApiError {
    return new ApiError(`${resource} is no longer available`, "RES_003", 410);
  }

  // File upload errors
  static fileTooLarge(maxSize: string): ApiError {
    return new ApiError(
      `File size exceeds maximum allowed size of ${maxSize}`,
      "FILE_001",
      413
    );
  }

  static invalidFileType(allowedTypes: string[]): ApiError {
    return new ApiError(
      `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
      "FILE_002",
      400
    );
  }

  static uploadFailed(reason?: string): ApiError {
    const message = reason
      ? `File upload failed: ${reason}`
      : "File upload failed";
    return new ApiError(message, "FILE_003", 500);
  }

  // Payment errors
  static paymentFailed(reason?: string): ApiError {
    const message = reason
      ? `Payment failed: ${reason}`
      : "Payment processing failed";
    return new ApiError(message, "PAY_001", 400);
  }

  static invalidPaymentAmount(): ApiError {
    return new ApiError("Invalid payment amount", "PAY_002", 400);
  }

  static paymentMethodNotSupported(): ApiError {
    return new ApiError("Payment method not supported", "PAY_003", 400);
  }

  // USSD errors
  static ussdSessionExpired(): ApiError {
    return new ApiError("USSD session has expired", "USSD_001", 400);
  }

  static invalidUssdInput(): ApiError {
    return new ApiError("Invalid USSD input", "USSD_002", 400);
  }

  // Custom error from details
  static fromValidationErrors(
    errors: Array<{ field: string; message: string }>
  ): ApiError {
    return new ApiError("Validation failed", "VAL_001", 400, {
      validationErrors: errors,
    });
  }
}

export default ApiError;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    constructor(message, code = "GENERIC_ERROR", statusCode = 500, details) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
    toJSON() {
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
    static unauthorized(message = "Authentication required") {
        return new ApiError(message, "AUTH_001", 401);
    }
    static forbidden(message = "Insufficient permissions") {
        return new ApiError(message, "AUTH_004", 403);
    }
    static tokenExpired(message = "Token expired") {
        return new ApiError(message, "AUTH_002", 401);
    }
    static invalidToken(message = "Invalid token") {
        return new ApiError(message, "AUTH_003", 401);
    }
    static accountLocked(message = "Account is locked") {
        return new ApiError(message, "AUTH_005", 401);
    }
    static validation(message, details) {
        return new ApiError(message, "VAL_001", 400, details);
    }
    static invalidFormat(field, format) {
        const message = format
            ? `Invalid format for ${field}. Expected: ${format}`
            : `Invalid format for ${field}`;
        return new ApiError(message, "VAL_002", 400);
    }
    static outOfRange(field, min, max) {
        let message = `Value for ${field} is out of range`;
        if (min !== undefined && max !== undefined) {
            message += ` (${min}-${max})`;
        }
        else if (min !== undefined) {
            message += ` (minimum: ${min})`;
        }
        else if (max !== undefined) {
            message += ` (maximum: ${max})`;
        }
        return new ApiError(message, "VAL_003", 400);
    }
    static duplicate(field) {
        return new ApiError(`${field} already exists`, "VAL_004", 409);
    }
    static invalidRelationship(message) {
        return new ApiError(message, "VAL_005", 400);
    }
    static memberAlreadyRegistered() {
        return new ApiError("Member is already registered", "BUS_001", 409);
    }
    static invalidDelegateCode() {
        return new ApiError("Invalid or expired delegate code", "BUS_002", 400);
    }
    static insufficientBalance() {
        return new ApiError("Insufficient account balance", "BUS_003", 400);
    }
    static paymentAlreadyProcessed() {
        return new ApiError("Payment has already been processed", "BUS_004", 409);
    }
    static subscriptionNotActive() {
        return new ApiError("Medical scheme subscription is not active", "BUS_005", 400);
    }
    static commissionAlreadyPaid() {
        return new ApiError("Commission has already been paid for this period", "BUS_006", 409);
    }
    static databaseError(message = "Database operation failed") {
        return new ApiError(message, "SYS_001", 500);
    }
    static externalServiceUnavailable(service) {
        return new ApiError(`${service} service is currently unavailable`, "SYS_002", 503);
    }
    static rateLimitExceeded() {
        return new ApiError("Rate limit exceeded. Please try again later", "SYS_003", 429);
    }
    static maintenanceMode() {
        return new ApiError("System is currently under maintenance", "SYS_004", 503);
    }
    static internalError(message = "Internal server error") {
        return new ApiError(message, "SYS_005", 500);
    }
    static notFound(resource = "Resource") {
        return new ApiError(`${resource} not found`, "RES_001", 404);
    }
    static alreadyExists(resource) {
        return new ApiError(`${resource} already exists`, "RES_002", 409);
    }
    static gone(resource) {
        return new ApiError(`${resource} is no longer available`, "RES_003", 410);
    }
    static fileTooLarge(maxSize) {
        return new ApiError(`File size exceeds maximum allowed size of ${maxSize}`, "FILE_001", 413);
    }
    static invalidFileType(allowedTypes) {
        return new ApiError(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`, "FILE_002", 400);
    }
    static uploadFailed(reason) {
        const message = reason
            ? `File upload failed: ${reason}`
            : "File upload failed";
        return new ApiError(message, "FILE_003", 500);
    }
    static paymentFailed(reason) {
        const message = reason
            ? `Payment failed: ${reason}`
            : "Payment processing failed";
        return new ApiError(message, "PAY_001", 400);
    }
    static invalidPaymentAmount() {
        return new ApiError("Invalid payment amount", "PAY_002", 400);
    }
    static paymentMethodNotSupported() {
        return new ApiError("Payment method not supported", "PAY_003", 400);
    }
    static ussdSessionExpired() {
        return new ApiError("USSD session has expired", "USSD_001", 400);
    }
    static invalidUssdInput() {
        return new ApiError("Invalid USSD input", "USSD_002", 400);
    }
    static fromValidationErrors(errors) {
        return new ApiError("Validation failed", "VAL_001", 400, {
            validationErrors: errors,
        });
    }
}
exports.ApiError = ApiError;
exports.default = ApiError;
//# sourceMappingURL=apiError.js.map
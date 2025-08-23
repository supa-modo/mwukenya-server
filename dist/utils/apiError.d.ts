export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: any;
    constructor(message: string, code?: string, statusCode?: number, details?: any);
    toJSON(): {
        success: boolean;
        error: any;
        timestamp: string;
    };
    static unauthorized(message?: string): ApiError;
    static forbidden(message?: string): ApiError;
    static tokenExpired(message?: string): ApiError;
    static invalidToken(message?: string): ApiError;
    static accountLocked(message?: string): ApiError;
    static validation(message: string, details?: any): ApiError;
    static invalidFormat(field: string, format?: string): ApiError;
    static outOfRange(field: string, min?: number, max?: number): ApiError;
    static duplicate(field: string): ApiError;
    static invalidRelationship(message: string): ApiError;
    static memberAlreadyRegistered(): ApiError;
    static invalidDelegateCode(): ApiError;
    static insufficientBalance(): ApiError;
    static paymentAlreadyProcessed(): ApiError;
    static subscriptionNotActive(): ApiError;
    static commissionAlreadyPaid(): ApiError;
    static databaseError(message?: string): ApiError;
    static externalServiceUnavailable(service: string): ApiError;
    static rateLimitExceeded(): ApiError;
    static maintenanceMode(): ApiError;
    static internalError(message?: string): ApiError;
    static notFound(resource?: string): ApiError;
    static alreadyExists(resource: string): ApiError;
    static gone(resource: string): ApiError;
    static fileTooLarge(maxSize: string): ApiError;
    static invalidFileType(allowedTypes: string[]): ApiError;
    static uploadFailed(reason?: string): ApiError;
    static paymentFailed(reason?: string): ApiError;
    static invalidPaymentAmount(): ApiError;
    static paymentMethodNotSupported(): ApiError;
    static ussdSessionExpired(): ApiError;
    static invalidUssdInput(): ApiError;
    static fromValidationErrors(errors: Array<{
        field: string;
        message: string;
    }>): ApiError;
}
export default ApiError;
//# sourceMappingURL=apiError.d.ts.map
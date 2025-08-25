"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_MESSAGES = exports.SUCCESS_MESSAGES = exports.ERROR_MESSAGES = exports.VALIDATION_PATTERNS = exports.DEFAULT_CONFIG = exports.ENV_VARS = exports.SMS_CONSTANTS = void 0;
exports.SMS_CONSTANTS = {
    MODES: {
        AFRICAS_TALKING: "africas_talking",
        MOCK: "mock",
        DISABLED: "disabled",
    },
    TEMPLATES: {
        REGISTRATION_SUCCESS: "registration_success",
        PASSWORD_RESET: "password_reset",
        WELCOME: "welcome",
        CUSTOM: "custom",
    },
    CONFIG: {
        DEFAULT_RETRY_ATTEMPTS: 3,
        DEFAULT_RETRY_DELAY: 1000,
        MAX_RETRY_ATTEMPTS: 10,
        MAX_RETRY_DELAY: 10000,
        RESET_CODE_LENGTH: 6,
        RESET_CODE_EXPIRY: 600,
    },
    AFRICAS_TALKING: {
        API_URL: "https://api.africastalking.com/version1/messaging",
        DEFAULT_SENDER_ID: "MWU_KENYA",
        DEFAULT_USERNAME: "sandbox",
        DEFAULT_ENVIRONMENT: "sandbox",
    },
    PHONE_FORMATS: {
        KENYA: {
            COUNTRY_CODE: "+254",
            PREFIXES: ["7", "1"],
            LENGTH: 9,
            TOTAL_LENGTH: 12,
        },
    },
    MESSAGE_LIMITS: {
        MAX_LENGTH: 160,
        MAX_LENGTH_UNICODE: 70,
    },
};
exports.ENV_VARS = {
    SMS: {
        MODE: "SMS_MODE",
        AFRICAS_TALKING_API_KEY: "AFRICAS_TALKING_API_KEY",
        AFRICAS_TALKING_USERNAME: "AFRICAS_TALKING_USERNAME",
        AFRICAS_TALKING_SENDER_ID: "AFRICAS_TALKING_SENDER_ID",
        AFRICAS_TALKING_ENVIRONMENT: "AFRICAS_TALKING_ENVIRONMENT",
    },
    EMAIL: {
        MODE: "EMAIL_MODE",
        HOST: "EMAIL_HOST",
        PORT: "EMAIL_PORT",
        USER: "EMAIL_USER",
        PASSWORD: "EMAIL_PASSWORD",
        SECURE: "EMAIL_SECURE",
    },
    APP: {
        NODE_ENV: "NODE_ENV",
        FRONTEND_URL: "FRONTEND_URL",
        PORT: "PORT",
        DATABASE_URL: "DATABASE_URL",
        REDIS_URL: "REDIS_URL",
    },
};
exports.DEFAULT_CONFIG = {
    SMS: {
        MODE: exports.SMS_CONSTANTS.MODES.MOCK,
        RETRY_ATTEMPTS: exports.SMS_CONSTANTS.CONFIG.DEFAULT_RETRY_ATTEMPTS,
        RETRY_DELAY: exports.SMS_CONSTANTS.CONFIG.DEFAULT_RETRY_DELAY,
    },
    EMAIL: {
        MODE: "smtp",
        PORT: 587,
        SECURE: false,
    },
    APP: {
        PORT: 5000,
        NODE_ENV: "development",
    },
};
exports.VALIDATION_PATTERNS = {
    PHONE: {
        KENYA: /^(\+254|0)[17]\d{8}$/,
        INTERNATIONAL: /^\+[1-9]\d{1,14}$/,
    },
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ID_NUMBER: /^\d{8}$/,
    MEMBERSHIP_NUMBER: /^MWU-\d{2}[A-Z]{2}\d{4}$/,
};
exports.ERROR_MESSAGES = {
    SMS: {
        NOT_CONFIGURED: "SMS service is not configured",
        SEND_FAILED: "Failed to send SMS message",
        INVALID_PHONE: "Invalid phone number format",
        RATE_LIMIT: "SMS rate limit exceeded",
        INSUFFICIENT_CREDIT: "Insufficient SMS credit",
    },
    VALIDATION: {
        REQUIRED_FIELD: "This field is required",
        INVALID_FORMAT: "Invalid format",
        INVALID_LENGTH: "Invalid length",
        INVALID_VALUE: "Invalid value",
    },
};
exports.SUCCESS_MESSAGES = {
    SMS: {
        SENT: "SMS sent successfully",
        REGISTRATION_SUCCESS: "Registration success SMS sent",
        PASSWORD_RESET: "Password reset SMS sent",
        WELCOME: "Welcome SMS sent",
    },
    REGISTRATION: {
        SUCCESS: "Registration successful",
        PENDING_APPROVAL: "Registration successful. Account pending approval.",
    },
    PASSWORD_RESET: {
        REQUEST_SENT: "Password reset instructions sent",
        SUCCESS: "Password reset successful",
    },
};
exports.LOG_MESSAGES = {
    SMS: {
        INITIALIZED: "SMS service initialized successfully",
        CONFIG_ERROR: "Failed to initialize SMS service",
        SEND_ATTEMPT: "SMS send attempt {attempt} for {phoneNumber}",
        SEND_SUCCESS: "SMS sent successfully to {phoneNumber}",
        SEND_FAILED: "Failed to send SMS to {phoneNumber}",
        RETRY_ATTEMPT: "Retrying SMS send (attempt {attempt}/{maxAttempts})",
    },
    REGISTRATION: {
        USER_CREATED: "User created successfully: {userId}",
        MEMBERSHIP_GENERATED: "Generated membership number: {membershipNumber}",
        SMS_SENT: "Registration success SMS sent to {phoneNumber}",
        SMS_FAILED: "Failed to send registration SMS to {phoneNumber}",
    },
    PASSWORD_RESET: {
        REQUEST_RECEIVED: "Password reset request received for {identifier}",
        TOKEN_GENERATED: "Password reset token generated: {token}",
        CODE_GENERATED: "Password reset code generated: {code}",
        RESET_SUCCESS: "Password reset successful for user {userId}",
    },
};
exports.default = {
    SMS_CONSTANTS: exports.SMS_CONSTANTS,
    ENV_VARS: exports.ENV_VARS,
    DEFAULT_CONFIG: exports.DEFAULT_CONFIG,
    VALIDATION_PATTERNS: exports.VALIDATION_PATTERNS,
    ERROR_MESSAGES: exports.ERROR_MESSAGES,
    SUCCESS_MESSAGES: exports.SUCCESS_MESSAGES,
    LOG_MESSAGES: exports.LOG_MESSAGES,
};
//# sourceMappingURL=index.js.map
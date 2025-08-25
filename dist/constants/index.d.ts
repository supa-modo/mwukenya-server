export declare const SMS_CONSTANTS: {
    MODES: {
        AFRICAS_TALKING: string;
        MOCK: string;
        DISABLED: string;
    };
    TEMPLATES: {
        REGISTRATION_SUCCESS: string;
        PASSWORD_RESET: string;
        WELCOME: string;
        CUSTOM: string;
    };
    CONFIG: {
        DEFAULT_RETRY_ATTEMPTS: number;
        DEFAULT_RETRY_DELAY: number;
        MAX_RETRY_ATTEMPTS: number;
        MAX_RETRY_DELAY: number;
        RESET_CODE_LENGTH: number;
        RESET_CODE_EXPIRY: number;
    };
    AFRICAS_TALKING: {
        API_URL: string;
        DEFAULT_SENDER_ID: string;
        DEFAULT_USERNAME: string;
        DEFAULT_ENVIRONMENT: string;
    };
    PHONE_FORMATS: {
        KENYA: {
            COUNTRY_CODE: string;
            PREFIXES: string[];
            LENGTH: number;
            TOTAL_LENGTH: number;
        };
    };
    MESSAGE_LIMITS: {
        MAX_LENGTH: number;
        MAX_LENGTH_UNICODE: number;
    };
};
export declare const ENV_VARS: {
    SMS: {
        MODE: string;
        AFRICAS_TALKING_API_KEY: string;
        AFRICAS_TALKING_USERNAME: string;
        AFRICAS_TALKING_SENDER_ID: string;
        AFRICAS_TALKING_ENVIRONMENT: string;
    };
    EMAIL: {
        MODE: string;
        HOST: string;
        PORT: string;
        USER: string;
        PASSWORD: string;
        SECURE: string;
    };
    APP: {
        NODE_ENV: string;
        FRONTEND_URL: string;
        PORT: string;
        DATABASE_URL: string;
        REDIS_URL: string;
    };
};
export declare const DEFAULT_CONFIG: {
    SMS: {
        MODE: string;
        RETRY_ATTEMPTS: number;
        RETRY_DELAY: number;
    };
    EMAIL: {
        MODE: string;
        PORT: number;
        SECURE: boolean;
    };
    APP: {
        PORT: number;
        NODE_ENV: string;
    };
};
export declare const VALIDATION_PATTERNS: {
    PHONE: {
        KENYA: RegExp;
        INTERNATIONAL: RegExp;
    };
    EMAIL: RegExp;
    ID_NUMBER: RegExp;
    MEMBERSHIP_NUMBER: RegExp;
};
export declare const ERROR_MESSAGES: {
    SMS: {
        NOT_CONFIGURED: string;
        SEND_FAILED: string;
        INVALID_PHONE: string;
        RATE_LIMIT: string;
        INSUFFICIENT_CREDIT: string;
    };
    VALIDATION: {
        REQUIRED_FIELD: string;
        INVALID_FORMAT: string;
        INVALID_LENGTH: string;
        INVALID_VALUE: string;
    };
};
export declare const SUCCESS_MESSAGES: {
    SMS: {
        SENT: string;
        REGISTRATION_SUCCESS: string;
        PASSWORD_RESET: string;
        WELCOME: string;
    };
    REGISTRATION: {
        SUCCESS: string;
        PENDING_APPROVAL: string;
    };
    PASSWORD_RESET: {
        REQUEST_SENT: string;
        SUCCESS: string;
    };
};
export declare const LOG_MESSAGES: {
    SMS: {
        INITIALIZED: string;
        CONFIG_ERROR: string;
        SEND_ATTEMPT: string;
        SEND_SUCCESS: string;
        SEND_FAILED: string;
        RETRY_ATTEMPT: string;
    };
    REGISTRATION: {
        USER_CREATED: string;
        MEMBERSHIP_GENERATED: string;
        SMS_SENT: string;
        SMS_FAILED: string;
    };
    PASSWORD_RESET: {
        REQUEST_RECEIVED: string;
        TOKEN_GENERATED: string;
        CODE_GENERATED: string;
        RESET_SUCCESS: string;
    };
};
declare const _default: {
    SMS_CONSTANTS: {
        MODES: {
            AFRICAS_TALKING: string;
            MOCK: string;
            DISABLED: string;
        };
        TEMPLATES: {
            REGISTRATION_SUCCESS: string;
            PASSWORD_RESET: string;
            WELCOME: string;
            CUSTOM: string;
        };
        CONFIG: {
            DEFAULT_RETRY_ATTEMPTS: number;
            DEFAULT_RETRY_DELAY: number;
            MAX_RETRY_ATTEMPTS: number;
            MAX_RETRY_DELAY: number;
            RESET_CODE_LENGTH: number;
            RESET_CODE_EXPIRY: number;
        };
        AFRICAS_TALKING: {
            API_URL: string;
            DEFAULT_SENDER_ID: string;
            DEFAULT_USERNAME: string;
            DEFAULT_ENVIRONMENT: string;
        };
        PHONE_FORMATS: {
            KENYA: {
                COUNTRY_CODE: string;
                PREFIXES: string[];
                LENGTH: number;
                TOTAL_LENGTH: number;
            };
        };
        MESSAGE_LIMITS: {
            MAX_LENGTH: number;
            MAX_LENGTH_UNICODE: number;
        };
    };
    ENV_VARS: {
        SMS: {
            MODE: string;
            AFRICAS_TALKING_API_KEY: string;
            AFRICAS_TALKING_USERNAME: string;
            AFRICAS_TALKING_SENDER_ID: string;
            AFRICAS_TALKING_ENVIRONMENT: string;
        };
        EMAIL: {
            MODE: string;
            HOST: string;
            PORT: string;
            USER: string;
            PASSWORD: string;
            SECURE: string;
        };
        APP: {
            NODE_ENV: string;
            FRONTEND_URL: string;
            PORT: string;
            DATABASE_URL: string;
            REDIS_URL: string;
        };
    };
    DEFAULT_CONFIG: {
        SMS: {
            MODE: string;
            RETRY_ATTEMPTS: number;
            RETRY_DELAY: number;
        };
        EMAIL: {
            MODE: string;
            PORT: number;
            SECURE: boolean;
        };
        APP: {
            PORT: number;
            NODE_ENV: string;
        };
    };
    VALIDATION_PATTERNS: {
        PHONE: {
            KENYA: RegExp;
            INTERNATIONAL: RegExp;
        };
        EMAIL: RegExp;
        ID_NUMBER: RegExp;
        MEMBERSHIP_NUMBER: RegExp;
    };
    ERROR_MESSAGES: {
        SMS: {
            NOT_CONFIGURED: string;
            SEND_FAILED: string;
            INVALID_PHONE: string;
            RATE_LIMIT: string;
            INSUFFICIENT_CREDIT: string;
        };
        VALIDATION: {
            REQUIRED_FIELD: string;
            INVALID_FORMAT: string;
            INVALID_LENGTH: string;
            INVALID_VALUE: string;
        };
    };
    SUCCESS_MESSAGES: {
        SMS: {
            SENT: string;
            REGISTRATION_SUCCESS: string;
            PASSWORD_RESET: string;
            WELCOME: string;
        };
        REGISTRATION: {
            SUCCESS: string;
            PENDING_APPROVAL: string;
        };
        PASSWORD_RESET: {
            REQUEST_SENT: string;
            SUCCESS: string;
        };
    };
    LOG_MESSAGES: {
        SMS: {
            INITIALIZED: string;
            CONFIG_ERROR: string;
            SEND_ATTEMPT: string;
            SEND_SUCCESS: string;
            SEND_FAILED: string;
            RETRY_ATTEMPT: string;
        };
        REGISTRATION: {
            USER_CREATED: string;
            MEMBERSHIP_GENERATED: string;
            SMS_SENT: string;
            SMS_FAILED: string;
        };
        PASSWORD_RESET: {
            REQUEST_RECEIVED: string;
            TOKEN_GENERATED: string;
            CODE_GENERATED: string;
            RESET_SUCCESS: string;
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map
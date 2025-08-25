"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isProduction = exports.isDevelopment = exports.validateConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const requiredEnvVars = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
const isProdEnv = process.env.NODE_ENV === "production";
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasRedisUrl = !!process.env.REDIS_URL;
const parseRedisUrl = (url) => {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port || "6379", 10),
            password: parsed.password || "",
            db: parseInt(parsed.pathname.slice(1) || "0", 10),
        };
    }
    catch (error) {
        throw new Error(`Invalid REDIS_URL: ${error}`);
    }
};
if (isProdEnv && !hasDatabaseUrl) {
    requiredEnvVars.push("DATABASE_URL");
}
else if (!isProdEnv && !hasDatabaseUrl) {
    requiredEnvVars.push("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD");
}
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
    }
}
if (hasRedisUrl) {
    try {
        parseRedisUrl(process.env.REDIS_URL);
    }
    catch (error) {
        throw new Error(`Invalid REDIS_URL: ${error}`);
    }
}
const parseDatabaseUrl = (url) => {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port || "5432", 10),
            name: parsed.pathname.slice(1),
            user: parsed.username,
            password: parsed.password,
            dialect: parsed.protocol.replace(":", ""),
        };
    }
    catch (error) {
        throw new Error(`Invalid DATABASE_URL: ${error}`);
    }
};
const getDatabaseConfig = () => {
    if (hasDatabaseUrl) {
        const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
        return {
            host: parsed.host,
            port: parsed.port,
            name: parsed.name,
            user: parsed.user,
            password: parsed.password,
            dialect: parsed.dialect === "postgresql" ? "postgres" : parsed.dialect,
            logging: process.env.DB_LOGGING === "true",
        };
    }
    else {
        return {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10),
            name: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            dialect: process.env.DB_DIALECT || "postgres",
            logging: process.env.DB_LOGGING === "true",
        };
    }
};
const getRedisConfig = () => {
    if (process.env.REDIS_URL) {
        const parsed = parseRedisUrl(process.env.REDIS_URL);
        return {
            host: parsed.host,
            port: parsed.port,
            password: parsed.password,
            db: parsed.db,
        };
    }
    else {
        return {
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379", 10),
            password: process.env.REDIS_PASSWORD || "",
            db: parseInt(process.env.REDIS_DB || "0", 10),
        };
    }
};
exports.config = {
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "3001", 10),
    appName: process.env.APP_NAME || "MWU Kenya Platform",
    apiVersion: process.env.API_VERSION || "v1",
    apiUrl: process.env.API_URL || "http://localhost:5000",
    database: getDatabaseConfig(),
    redis: getRedisConfig(),
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "15", 10),
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    },
    external: {
        mpesa: {
            consumerKey: process.env.MPESA_CONSUMER_KEY || "",
            consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
            environment: process.env.MPESA_ENVIRONMENT || "sandbox",
            paybillNumber: process.env.MPESA_PAYBILL_NUMBER || "400200",
            passkey: process.env.MPESA_PASSKEY || "",
        },
        africasTalking: {
            apiKey: process.env.AFRICAS_TALKING_API_KEY || "",
            username: process.env.AFRICAS_TALKING_USERNAME || "",
        },
        sha: {
            baseUrl: process.env.SHA_API_BASE_URL || "https://api.sha.gov.ke",
            apiKey: process.env.SHA_API_KEY || "",
        },
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587", 10),
        user: process.env.EMAIL_USER || "",
        password: process.env.EMAIL_PASSWORD || "",
        from: process.env.EMAIL_FROM || "noreply@mwu.co.ke",
    },
    upload: {
        maxFileSize: process.env.MAX_FILE_SIZE || "5MB",
        uploadPath: process.env.UPLOAD_PATH || "uploads/",
    },
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || "af-south-1",
        s3Bucket: process.env.AWS_S3_BUCKET || "mwukenya-bucket",
    },
    ussd: {
        serviceCode: process.env.USSD_SERVICE_CODE || "*384*8888#",
    },
    system: {
        defaultGracePeriodDays: parseInt(process.env.DEFAULT_GRACE_PERIOD_DAYS || "3", 10),
        maxAdvancePaymentDays: parseInt(process.env.MAX_ADVANCE_PAYMENT_DAYS || "30", 10),
        commissionPayoutFrequency: process.env.COMMISSION_PAYOUT_FREQUENCY || "daily",
        shaTransferFrequency: process.env.SHA_TRANSFER_FREQUENCY || "daily",
    },
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
    },
};
const validateConfig = () => {
    const errors = [];
    if (isNaN(exports.config.port) || exports.config.port < 1 || exports.config.port > 65535) {
        errors.push("PORT must be a valid number between 1 and 65535");
    }
    if (isNaN(exports.config.database.port) ||
        exports.config.database.port < 1 ||
        exports.config.database.port > 65535) {
        errors.push("DB_PORT must be a valid number between 1 and 65535");
    }
    if (isNaN(exports.config.redis.port) ||
        exports.config.redis.port < 1 ||
        exports.config.redis.port > 65535) {
        errors.push("REDIS_PORT must be a valid number between 1 and 65535");
    }
    if (isNaN(exports.config.security.bcryptRounds) ||
        exports.config.security.bcryptRounds < 4 ||
        exports.config.security.bcryptRounds > 31) {
        errors.push("BCRYPT_ROUNDS must be a number between 4 and 31");
    }
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
    }
};
exports.validateConfig = validateConfig;
exports.isDevelopment = exports.config.env === "development";
exports.isProduction = exports.config.env === "production";
exports.isTest = exports.config.env === "test";
exports.default = exports.config;
//# sourceMappingURL=index.js.map
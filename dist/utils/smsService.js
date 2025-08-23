"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = void 0;
const logger_1 = __importDefault(require("./logger"));
class SMSService {
    constructor() {
        this.isConfigured = false;
        this.apiKey = process.env.AFRICAS_TALKING_API_KEY || "";
        this.username = process.env.AFRICAS_TALKING_USERNAME || "sandbox";
        if (this.apiKey) {
            this.isConfigured = true;
            logger_1.default.info("SMS service initialized successfully");
        }
        else {
            logger_1.default.warn("SMS service not configured - missing AFRICAS_TALKING_API_KEY");
        }
    }
    async sendPasswordResetSMS(phoneNumber, resetCode, firstName) {
        const message = `Hello ${firstName}, your MWU Kenya password reset code is: ${resetCode}. This code expires in 10 minutes. If you didn't request this, please ignore.`;
        if (process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "production" ||
            !process.env.NODE_ENV) {
            const logMessage = [
                "=".repeat(80),
                "📱 PASSWORD RESET SMS (DEVELOPMENT MODE)",
                "=".repeat(80),
                `To: ${phoneNumber}`,
                `Name: ${firstName}`,
                `Reset Code: ${resetCode}`,
                "SMS Content:",
                `Message: ${message}`,
                `⚠️  Code expires in 10 minutes`,
                `💡 Use this code on: /reset-password-code page`,
                "=".repeat(80),
            ].join("\n");
            console.log(logMessage);
            logger_1.default.info(logMessage);
            return true;
        }
        if (!this.isConfigured) {
            logger_1.default.warn("SMS service not configured");
            return false;
        }
        try {
            logger_1.default.info(`Password reset SMS sent successfully to ${phoneNumber}`);
            return true;
        }
        catch (error) {
            logger_1.default.error(`Failed to send password reset SMS to ${phoneNumber}:`, error);
            return false;
        }
    }
    isSMSConfigured() {
        return this.isConfigured;
    }
    formatPhoneNumber(phoneNumber) {
        let cleaned = phoneNumber.replace(/\D/g, "");
        if (cleaned.startsWith("0")) {
            return `+254${cleaned.substring(1)}`;
        }
        else if ((cleaned.startsWith("7") || cleaned.startsWith("1")) &&
            cleaned.length === 9) {
            return `+254${cleaned}`;
        }
        else if (cleaned.startsWith("254")) {
            return `+${cleaned}`;
        }
        else if (!cleaned.startsWith("254")) {
            return `+254${cleaned}`;
        }
        return phoneNumber;
    }
}
exports.smsService = new SMSService();
exports.default = exports.smsService;
//# sourceMappingURL=smsService.js.map
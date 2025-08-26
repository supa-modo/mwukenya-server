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
        this.currentMode = "disabled";
        this.africasTalkingConfig = null;
        this.initializeService();
    }
    initializeService() {
        const smsMode = (process.env.SMS_MODE || "disabled").toLowerCase();
        this.currentMode = smsMode;
        if (smsMode === "production" || smsMode === "sandbox") {
            this.initializeAfricasTalkingService(smsMode);
        }
        else {
            logger_1.default.info("SMS service is disabled - SMS content will be logged to console");
        }
    }
    initializeAfricasTalkingService(mode) {
        try {
            const apiKey = mode === "sandbox"
                ? process.env.AFRICAS_TALKING_SANDBOX_API_KEY
                : process.env.AFRICAS_TALKING_API_KEY;
            const username = process.env.AFRICAS_TALKING_USERNAME || "sandbox";
            const senderId = process.env.AFRICAS_TALKING_SENDER_ID || "";
            if (!apiKey || !username) {
                logger_1.default.warn(`Africa's Talking SMS service not configured - missing API key or username for ${mode} mode`);
                this.currentMode = "disabled";
                return;
            }
            this.africasTalkingConfig = {
                apiKey,
                username,
                senderId,
            };
            this.isConfigured = true;
            logger_1.default.info(`SMS service initialized in ${mode.toUpperCase()} mode with Africa's Talking`, {
                username,
                senderId: "",
                apiKeyLength: apiKey ? apiKey.length : 0,
                mode,
            });
        }
        catch (error) {
            logger_1.default.error("Failed to initialize SMS service:", error);
            this.currentMode = "disabled";
        }
    }
    async sendRegistrationSuccessSMS(phoneNumber, userData) {
        const template = {
            type: "registration_success",
            message: `Hello ${userData.firstName} ${userData.lastName}! Welcome to Matatu Workers Union Kenya. Your registration is successful. ID: ${userData.idNumber}, Membership: ${userData.membershipNumber}, SACCO: ${userData.sacco}, Delegate: ${userData.delegateName} (${userData.delegateCode}). You will receive further instructions via SMS.`,
            variables: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                idNumber: userData.idNumber,
                membershipNumber: userData.membershipNumber,
                sacco: userData.sacco,
                delegateName: userData.delegateName,
                delegateCode: userData.delegateCode,
                role: userData.role,
            },
        };
        return this.sendSMS(phoneNumber, template);
    }
    async sendPasswordResetSMS(phoneNumber, resetCode, firstName) {
        const template = {
            type: "password_reset",
            message: `Hello ${firstName}, your Matatu Workers Union Kenya password reset code is: ${resetCode}. This code expires in 10 minutes. If you didn't request this, please ignore.`,
            variables: {
                firstName,
                resetCode,
            },
        };
        return this.sendSMS(phoneNumber, template);
    }
    async sendWelcomeSMS(phoneNumber, userData) {
        const template = {
            type: "welcome",
            message: `Welcome ${userData.firstName} ${userData.lastName} to Matatu Workers Union Kenya! Your membership number is ${userData.membershipNumber}. You're registered under ${userData.sacco}. We'll keep you updated on health insurance benefits and union activities.`,
            variables: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                membershipNumber: userData.membershipNumber,
                sacco: userData.sacco,
            },
        };
        return this.sendSMS(phoneNumber, template);
    }
    async sendCustomSMS(phoneNumber, message, variables) {
        const template = {
            type: "custom",
            message,
            variables,
        };
        return this.sendSMS(phoneNumber, template);
    }
    async sendSMS(phoneNumber, template) {
        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        const message = this.processTemplate(template);
        if (this.currentMode === "disabled") {
            return this.logSMS(formattedPhone, template);
        }
        if ((this.currentMode === "production" || this.currentMode === "sandbox") &&
            this.isConfigured) {
            return this.sendViaAfricasTalking(formattedPhone, message);
        }
        return this.logSMS(formattedPhone, template);
    }
    async sendViaAfricasTalking(phoneNumber, message) {
        if (!this.africasTalkingConfig) {
            logger_1.default.error("Africa's Talking configuration not available");
            return false;
        }
        try {
            const apiUrl = "https://api.africastalking.com/version1/messaging";
            const requestBody = {
                username: this.africasTalkingConfig.username,
                to: phoneNumber,
                message: message,
            };
            if (this.africasTalkingConfig.senderId &&
                this.africasTalkingConfig.senderId.trim() !== "") {
                requestBody.from = this.africasTalkingConfig.senderId;
                logger_1.default.info(`Sending SMS with sender ID: ${this.africasTalkingConfig.senderId}`);
            }
            else {
                logger_1.default.info("Sending SMS without sender ID (will use Africa's Talking default)");
            }
            console.log("🔍 SMS API Request Debug:");
            console.log("  URL:", apiUrl);
            console.log("  Username:", this.africasTalkingConfig.username);
            console.log("  API Key (first 20 chars):", this.africasTalkingConfig.apiKey
                ? this.africasTalkingConfig.apiKey.substring(0, 20) + "..."
                : "undefined");
            console.log("  Request Body:", JSON.stringify(requestBody, null, 2));
            console.log("  Phone Number:", phoneNumber);
            console.log("  Formatted Phone:", this.formatPhoneNumber(phoneNumber));
            console.log("  Mode:", this.currentMode);
            logger_1.default.info(`Sending SMS to ${phoneNumber} via Africa's Talking API`, {
                url: apiUrl,
                username: this.africasTalkingConfig.username,
                hasSenderId: !!requestBody.from,
                mode: this.currentMode,
                apiKeyLength: this.africasTalkingConfig.apiKey
                    ? this.africasTalkingConfig.apiKey.length
                    : 0,
            });
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    apiKey: this.africasTalkingConfig.apiKey,
                },
                body: new URLSearchParams(requestBody),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.log("🔍 SMS API Error Response:");
                console.log("  Status:", response.status);
                console.log("  Status Text:", response.statusText);
                console.log("  Error Body:", errorText);
                logger_1.default.error(`Africa's Talking API error: ${response.status} ${response.statusText} - ${errorText}`);
                return false;
            }
            const responseText = await response.text();
            let result;
            if (responseText.includes("<AfricasTalkingResponse>")) {
                const messageMatch = responseText.match(/<Message>(.*?)<\/Message>/);
                const message = messageMatch ? messageMatch[1] : "Unknown response";
                if (message.includes("Success") || message.includes("Sent to")) {
                    logger_1.default.info(`SMS sent successfully to ${phoneNumber}`, {
                        response: message,
                        mode: this.currentMode,
                        senderId: requestBody.from || "default",
                    });
                    return true;
                }
                else {
                    logger_1.default.error(`SMS delivery failed: ${message}`, {
                        phoneNumber,
                        mode: this.currentMode,
                        senderId: requestBody.from || "default",
                    });
                    return false;
                }
            }
            else {
                try {
                    result = JSON.parse(responseText);
                }
                catch (parseError) {
                    logger_1.default.error(`Failed to parse response: ${responseText}`);
                    return false;
                }
            }
            if (result && result.SMSMessageData && result.SMSMessageData.Recipients) {
                const recipient = result.SMSMessageData.Recipients[0];
                if (recipient.status === "Success") {
                    logger_1.default.info(`SMS sent successfully to ${phoneNumber}`, {
                        messageId: recipient.messageId,
                        cost: recipient.cost,
                        mode: this.currentMode,
                        senderId: requestBody.from || "default",
                    });
                    return true;
                }
                else {
                    logger_1.default.error(`SMS delivery failed: ${recipient.status}`, {
                        phoneNumber,
                        mode: this.currentMode,
                        senderId: requestBody.from || "default",
                    });
                    return false;
                }
            }
            return false;
        }
        catch (error) {
            logger_1.default.error(`Failed to send SMS via Africa's Talking to ${phoneNumber}:`, error);
            return false;
        }
    }
    processTemplate(template) {
        let message = template.message;
        if (template.variables) {
            Object.entries(template.variables).forEach(([key, value]) => {
                const placeholder = `{${key}}`;
                message = message.replace(new RegExp(placeholder, "g"), String(value));
            });
        }
        return message;
    }
    logSMS(phoneNumber, template) {
        const logMessage = [
            "=".repeat(80),
            "📱 SMS CONTENT (DISABLED MODE)",
            "=".repeat(80),
            `To: ${phoneNumber}`,
            `Template: ${template.type}`,
            `Message: ${template.message}`,
            `Variables: ${JSON.stringify(template.variables, null, 2)}`,
            `⚠️  This is a logged SMS - no actual message was sent`,
            "=".repeat(80),
        ].join("\n");
        console.log(logMessage);
        logger_1.default.info(logMessage);
        return true;
    }
    formatPhoneNumber(phoneNumber) {
        let cleaned = phoneNumber.replace(/\D/g, "");
        if (cleaned.startsWith("0")) {
            return `+254${cleaned.substring(1)}`;
        }
        else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
            return `+254${cleaned}`;
        }
        else if (cleaned.startsWith("254")) {
            return `+${cleaned}`;
        }
        return phoneNumber;
    }
    isSMSConfigured() {
        return this.isConfigured;
    }
    getCurrentMode() {
        return this.currentMode;
    }
    getServiceStatus() {
        return {
            configured: this.isConfigured,
            mode: this.currentMode,
            africasTalkingConfigured: this.africasTalkingConfig !== null,
        };
    }
    async testConnectivity() {
        if (this.currentMode === "disabled") {
            return {
                success: true,
                message: "SMS service is in disabled mode - SMS content will be logged to console",
                details: {
                    mode: this.currentMode,
                    timestamp: new Date().toISOString(),
                },
            };
        }
        if (!this.isConfigured) {
            return {
                success: false,
                message: "SMS service not configured",
            };
        }
        try {
            const testPhone = "+254790193402";
            const testMessage = "<Matatu Workers Union Kenya> SMS Service Test - " +
                new Date().toISOString();
            const success = await this.sendCustomSMS(testPhone, testMessage);
            return {
                success,
                message: success
                    ? "SMS service test successful"
                    : "SMS service test failed",
                details: {
                    mode: this.currentMode,
                    timestamp: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            return {
                success: false,
                message: "SMS service test failed",
                details: {
                    error: error instanceof Error ? error.message : "Unknown error",
                    mode: this.currentMode,
                    timestamp: new Date().toISOString(),
                },
            };
        }
    }
}
exports.smsService = new SMSService();
exports.default = exports.smsService;
//# sourceMappingURL=smsService.js.map
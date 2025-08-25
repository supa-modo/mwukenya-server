#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailService_1 = require("../utils/emailService");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function testEmailService() {
    console.log("🧪 Testing Email Service (ZeptoMail/SMTP)...\n");
    const status = emailService_1.emailService.getServiceStatus();
    console.log("📊 Service Status:");
    console.log(JSON.stringify(status, null, 2));
    console.log();
    const mode = emailService_1.emailService.getCurrentMode();
    console.log(`🔧 Current Mode: ${mode.toUpperCase()}`);
    console.log();
    if (!status.configured) {
        console.log("❌ Email service is not configured!");
        console.log("Please check your environment variables.");
        return;
    }
    const testEmail = process.env.TEST_EMAIL || "eddie.oodhiambo@gmail.com";
    if (mode === "zeptomail") {
        console.log("Testing ZeptoMail email service...");
        const emailSent = await emailService_1.emailService.sendEmail(testEmail, "Test Email from MWU Kenya", "<h1>Test Email</h1><p>This is a test email sent via ZeptoMail.</p>");
        if (emailSent) {
            console.log("✅ ZeptoMail test email sent successfully!");
        }
        else {
            console.log("❌ Failed to send ZeptoMail test email");
        }
    }
    else {
        console.log("Testing SMTP email service...");
        const emailSent = await emailService_1.emailService.sendEmail(testEmail, "Test Email from MWU Kenya", "<h1>Test Email</h1><p>This is a test email sent via SMTP.</p>");
        if (emailSent) {
            console.log("✅ SMTP test email sent successfully!");
        }
        else {
            console.log("❌ Failed to send SMTP test email");
        }
    }
    console.log("\n📧 Email service test completed!");
    console.log("To test ZeptoMail integration, set EMAIL_MODE=zeptomail in your .env file");
}
testEmailService().catch(console.error);
//# sourceMappingURL=test-zoho-email.js.map
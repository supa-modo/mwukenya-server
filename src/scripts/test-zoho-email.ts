#!/usr/bin/env ts-node

import { emailService } from "../utils/emailService";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testEmailService() {
  console.log("🧪 Testing Email Service (ZeptoMail/SMTP)...\n");

  // Check service status
  const status = emailService.getServiceStatus();
  console.log("📊 Service Status:");
  console.log(JSON.stringify(status, null, 2));
  console.log();

  // Check current mode
  const mode = emailService.getCurrentMode();
  console.log(`🔧 Current Mode: ${mode.toUpperCase()}`);
  console.log();

  if (!status.configured) {
    console.log("❌ Email service is not configured!");
    console.log("Please check your environment variables.");
    return;
  }

  // Define test email
  const testEmail = process.env.TEST_EMAIL || "eddie.oodhiambo@gmail.com";

  if (mode === "zeptomail") {
    console.log("Testing ZeptoMail email service...");
    const emailSent = await emailService.sendEmail(
      testEmail,
      "Test Email from MWU Kenya",
      "<h1>Test Email</h1><p>This is a test email sent via ZeptoMail.</p>"
    );

    if (emailSent) {
      console.log("✅ ZeptoMail test email sent successfully!");
    } else {
      console.log("❌ Failed to send ZeptoMail test email");
    }
  } else {
    console.log("Testing SMTP email service...");
    const emailSent = await emailService.sendEmail(
      testEmail,
      "Test Email from MWU Kenya",
      "<h1>Test Email</h1><p>This is a test email sent via SMTP.</p>"
    );

    if (emailSent) {
      console.log("✅ SMTP test email sent successfully!");
    } else {
      console.log("❌ Failed to send SMTP test email");
    }
  }

  console.log("\n📧 Email service test completed!");
  console.log(
    "To test ZeptoMail integration, set EMAIL_MODE=zeptomail in your .env file"
  );
}

// Run the test
testEmailService().catch(console.error);

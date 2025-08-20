#!/usr/bin/env ts-node

import { emailService } from "../utils/emailService";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testZohoEmailService() {
  console.log("🧪 Testing Zoho Email Service...\n");

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

  if (mode === "zoho") {
    console.log("✅ Zoho Mail API mode detected");

    // Test sending a simple email
    console.log("📧 Testing email sending...");

    try {
      const testEmail = process.env.TEST_EMAIL || "test@example.com";
      const result = await emailService.sendEmail(
        testEmail,
        "Test Email - Zoho Integration",
        `
        <h2>Test Email</h2>
        <p>This is a test email to verify Zoho Mail API integration.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Service Mode:</strong> ${mode}</p>
        <hr>
        <p><em>If you receive this email, the Zoho integration is working correctly!</em></p>
        `
      );

      if (result) {
        console.log("✅ Test email sent successfully!");
        console.log(`📬 Sent to: ${testEmail}`);
      } else {
        console.log("❌ Failed to send test email");
      }
    } catch (error) {
      console.log("❌ Error sending test email:", error);
    }
  } else {
    console.log("ℹ️  SMTP mode detected - Zoho integration not active");
    console.log(
      "To test Zoho integration, set EMAIL_MODE=zoho in your .env file"
    );
  }

  console.log("\n🏁 Test completed!");
}

// Run the test
testZohoEmailService().catch(console.error);

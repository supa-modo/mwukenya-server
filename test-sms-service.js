#!/usr/bin/env node

/**
 * SMS Service Test Script
 *
 * This script tests the SMS service functionality.
 * Run with: node test-sms-service.js
 */

// Load environment variables first
require("dotenv").config();

const { smsService } = require("./dist/utils/smsService");

async function testSMSService() {
  console.log("🧪 Testing SMS Service...\n");

  try {
    // Test 1: Service Status
    console.log("1️⃣ Testing Service Status:");
    const status = smsService.getServiceStatus();
    console.log("   Status:", JSON.stringify(status, null, 2));
    console.log("");

    // Test 2: Phone Number Formatting
    console.log("2️⃣ Testing Phone Number Formatting:");
    const testNumbers = [
      "0790193402",
      "0790193402",
      "+254790193402",
      "254790193402",
      "7901934029",
    ];

    testNumbers.forEach((number) => {
      const formatted = smsService.formatPhoneNumber(number);
      console.log(`   ${number} → ${formatted}`);
    });
    console.log("");

    // Test 3: Registration Success SMS
    console.log("3️⃣ Testing Registration Success SMS:");
    const registrationSMS = await smsService.sendRegistrationSuccessSMS(
      "+254790193402",
      {
        firstName: "John",
        lastName: "Doe",
        idNumber: "12345678",
        membershipNumber: "MWU-24AB1234",
        sacco: "Super Metro",
        delegateName: "Jane Smith",
        delegateCode: "DEL123456",
        role: "member",
      }
    );
    console.log(`   Registration SMS sent: ${registrationSMS ? "✅" : "❌"}`);
    console.log("");

    // Test 4: Password Reset SMS
    console.log("4️⃣ Testing Password Reset SMS:");
    const resetSMS = await smsService.sendPasswordResetSMS(
      "+254790193402",
      "123456",
      "John"
    );
    console.log(`   Password reset SMS sent: ${resetSMS ? "✅" : "❌"}`);
    console.log("");

    // Test 5: Welcome SMS
    console.log("5️⃣ Testing Welcome SMS:");
    const welcomeSMS = await smsService.sendWelcomeSMS("+254790193402", {
      firstName: "John",
      lastName: "Doe",
      membershipNumber: "MWU-24AB1234",
      sacco: "Super Metro",
    });
    console.log(`   Welcome SMS sent: ${welcomeSMS ? "✅" : "❌"}`);
    console.log("");

    // Test 6: Custom SMS
    console.log("6️⃣ Testing Custom SMS:");
    const customSMS = await smsService.sendCustomSMS(
      "+254790193402",
      "Hello {name}, your payment of {amount} has been received. Thank you!",
      {
        name: "John Doe",
        amount: "KES 1,000",
      }
    );
    console.log(`   Custom SMS sent: ${customSMS ? "✅" : "❌"}`);
    console.log("");

    // Test 7: Connectivity Test
    console.log("7️⃣ Testing Connectivity:");
    const connectivityTest = await smsService.testConnectivity();
    console.log(
      `   Connectivity test: ${connectivityTest.success ? "✅" : "❌"}`
    );
    console.log(`   Message: ${connectivityTest.message}`);
    if (connectivityTest.details) {
      console.log(
        `   Details: ${JSON.stringify(connectivityTest.details, null, 2)}`
      );
    }
    console.log("");

    console.log("🎉 SMS Service Test Completed!");
    console.log("");

    if (status.mode === "disabled") {
      console.log("📝 Note: SMS service is in DISABLED mode.");
      console.log(
        "   All SMS messages are logged to console instead of being sent."
      );
      console.log(
        "   To enable real SMS sending, set SMS_MODE=production in your .env file."
      );
    } else if (status.mode === "production") {
      console.log("📝 Note: SMS service is in PRODUCTION mode.");
      console.log(
        "   Real SMS messages are being sent via Africa's Talking API."
      );
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSMSService().catch(console.error);
}

module.exports = { testSMSService };

#!/usr/bin/env node

/**
 * M-Pesa Production Configuration Diagnostic Tool
 *
 * This script helps diagnose M-Pesa configuration issues in production.
 * Run this on your production server to check configuration.
 */

const dotenv = require("dotenv");
const axios = require("axios");

// Load environment variables
dotenv.config();

console.log("🔍 M-Pesa Production Configuration Diagnostic");
console.log("=".repeat(50));

// Check environment
console.log("\n📋 Environment Check:");
console.log(`NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`MPESA_ENVIRONMENT: ${process.env.MPESA_ENVIRONMENT || "not set"}`);

// Check required variables
const requiredVars = [
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_PAYBILL_NUMBER",
  "MPESA_PASSKEY",
  "MPESA_CALLBACK_URL",
];

console.log("\n🔑 Required Environment Variables:");
let allVarsSet = true;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const isSet = !!value;
  const displayValue = isSet ? `${value.substring(0, 10)}...` : "NOT SET";

  console.log(`${varName}: ${isSet ? "✅" : "❌"} ${displayValue}`);

  if (!isSet) {
    allVarsSet = false;
  }
});

// Determine API URL
const isProduction = process.env.MPESA_ENVIRONMENT === "production";
const baseUrl = isProduction
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

console.log(`\n🌐 API Configuration:`);
console.log(`Environment: ${isProduction ? "Production" : "Sandbox"}`);
console.log(`Base URL: ${baseUrl}`);

// Test authentication if credentials are available
async function testAuthentication() {
  if (allVarsSet) {
    console.log("\n🔐 Testing Authentication...");

    try {
      const consumerKey = process.env.MPESA_CONSUMER_KEY;
      const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

      const credentials = Buffer.from(
        `${consumerKey}:${consumerSecret}`
      ).toString("base64");

      const response = await axios.get(
        `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
          timeout: 10000,
        }
      );

      if (response.data.access_token) {
        console.log("✅ Authentication successful");
        console.log(`Token: ${response.data.access_token.substring(0, 20)}...`);
      } else {
        console.log("❌ Authentication failed - no access token received");
      }
    } catch (error) {
      console.log("❌ Authentication failed");
      console.log(`Error: ${error.response?.data?.error || error.message}`);
      console.log(`Status: ${error.response?.status}`);
    }
  } else {
    console.log(
      "\n⚠️  Cannot test authentication - missing required variables"
    );
  }
}

// Check callback URL
async function testCallbackUrl() {
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (callbackUrl) {
    console.log("\n🔗 Callback URL Check:");
    console.log(`URL: ${callbackUrl}`);

    if (isProduction && !callbackUrl.startsWith("https://")) {
      console.log("❌ Production requires HTTPS callback URL");
    } else {
      console.log("✅ Callback URL format looks correct");
    }

    // Test if callback URL is accessible with POST request (M-Pesa uses POST)
    try {
      const response = await axios.post(
        callbackUrl,
        {
          // Mock M-Pesa callback data
          Body: {
            stkCallback: {
              MerchantRequestID: "test-request-id",
              CheckoutRequestID: "test-checkout-id",
              ResultCode: 0,
              ResultDesc: "Test callback",
            },
          },
        },
        {
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`✅ Callback URL is accessible (Status: ${response.status})`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`❌ Callback URL returns 404 - route not found`);
        console.log(`   Expected: POST ${callbackUrl}`);
        console.log(`   Make sure the route is properly configured`);
      } else if (error.response?.status === 405) {
        console.log(`❌ Callback URL returns 405 - method not allowed`);
        console.log(`   The route exists but doesn't accept POST requests`);
      } else {
        console.log(`❌ Callback URL not accessible: ${error.message}`);
        console.log(`   Status: ${error.response?.status}`);
      }
    }
  }
}

// Run all tests
async function runDiagnostic() {
  await testAuthentication();
  await testCallbackUrl();

  console.log("\n" + "=".repeat(50));
  console.log("🏁 Diagnostic Complete");

  if (!allVarsSet) {
    console.log("\n❌ ISSUES FOUND:");
    console.log("- Missing required environment variables");
    console.log("- Please set all required M-Pesa variables");
    process.exit(1);
  } else {
    console.log("\n✅ All required variables are set");
    console.log(
      "If you're still having issues, check the detailed logs after testing a payment"
    );
  }
}

// Start the diagnostic
runDiagnostic().catch(console.error);

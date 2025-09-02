#!/usr/bin/env node

/**
 * M-Pesa STK Push Debug Script
 *
 * This script helps debug M-Pesa STK Push issues by testing the exact
 * request that would be sent to M-Pesa.
 */

const dotenv = require("dotenv");
const axios = require("axios");

// Load environment variables
dotenv.config();

console.log("🔍 M-Pesa STK Push Debug Script");
console.log("=".repeat(50));

// Configuration
const environment = process.env.MPESA_ENVIRONMENT || "sandbox";
const baseUrl =
  environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const paybillNumber = process.env.MPESA_PAYBILL_NUMBER;
const passkey = process.env.MPESA_PASSKEY;

console.log("📋 Configuration:");
console.log(`Environment: ${environment}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Consumer Key: ${consumerKey ? "✅ Set" : "❌ Not set"}`);
console.log(`Consumer Secret: ${consumerSecret ? "✅ Set" : "❌ Not set"}`);
console.log(`Paybill Number: ${paybillNumber || "❌ Not set"}`);
console.log(`Passkey: ${passkey ? "✅ Set" : "❌ Not set"}`);

if (!consumerKey || !consumerSecret || !paybillNumber || !passkey) {
  console.log("\n❌ Missing required configuration. Cannot proceed.");
  process.exit(1);
}

// Test data
const testData = {
  phoneNumber: "254708374149", // Test number
  amount: 15, // Test amount
  userId: "test-user-123",
  subscriptionId: "test-sub-456",
  description: "Test Payment",
};

console.log("\n🧪 Test Data:");
console.log(`Phone: ${testData.phoneNumber}`);
console.log(`Amount: ${testData.amount} KES`);
console.log(`User ID: ${testData.userId}`);
console.log(`Subscription ID: ${testData.subscriptionId}`);

// Generate password and timestamp
const timestamp = new Date()
  .toISOString()
  .replace(/[^0-9]/g, "")
  .slice(0, -3);
const password = Buffer.from(`${paybillNumber}${passkey}${timestamp}`).toString(
  "base64"
);

console.log("\n🔐 Generated Data:");
console.log(`Timestamp: ${timestamp}`);
console.log(`Password: ${password.substring(0, 20)}...`);

// Test authentication first
async function testAuth() {
  console.log("\n🔐 Testing Authentication...");

  try {
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
      return response.data.access_token;
    } else {
      console.log("❌ Authentication failed - no access token");
      return null;
    }
  } catch (error) {
    console.log("❌ Authentication failed");
    console.log(`Error: ${error.response?.data?.error || error.message}`);
    console.log(`Status: ${error.response?.status}`);
    return null;
  }
}

// Test STK Push
async function testSTKPush(accessToken) {
  console.log("\n💳 Testing STK Push...");

  const stkPushData = {
    BusinessShortCode: paybillNumber,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(testData.amount).toString(),
    PartyA: testData.phoneNumber,
    PartyB: paybillNumber,
    PhoneNumber: testData.phoneNumber,
    CallBackURL:
      process.env.MPESA_CALLBACK_URL ||
      "https://your-domain.com/api/v1/payments/mpesa/callback",
    AccountReference: `MWU${testData.userId.slice(
      -4
    )}${testData.subscriptionId.slice(-4)}${Date.now().toString().slice(-6)}`,
    TransactionDesc: testData.description,
  };

  console.log("📤 Request Data:");
  console.log(JSON.stringify(stkPushData, null, 2));

  try {
    const response = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("✅ STK Push successful");
    console.log("📥 Response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("❌ STK Push failed");
    console.log(`Status: ${error.response?.status}`);
    console.log(`Status Text: ${error.response?.statusText}`);
    console.log("📥 Error Response:");
    console.log(JSON.stringify(error.response?.data, null, 2));

    // Analyze the error
    const errorData = error.response?.data;
    if (errorData?.errorCode) {
      console.log(`\n🔍 Error Analysis:`);
      console.log(`Error Code: ${errorData.errorCode}`);
      console.log(`Error Message: ${errorData.errorMessage}`);
    }

    if (errorData?.ResponseCode && errorData.ResponseCode !== "0") {
      console.log(`\n🔍 Response Code Analysis:`);
      console.log(`Response Code: ${errorData.ResponseCode}`);
      console.log(`Response Description: ${errorData.ResponseDescription}`);
    }
  }
}

// Run tests
async function runTests() {
  const accessToken = await testAuth();
  if (accessToken) {
    await testSTKPush(accessToken);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🏁 Debug Complete");
}

runTests().catch(console.error);

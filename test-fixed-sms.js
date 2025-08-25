#!/usr/bin/env node

/**
 * Test Fixed SMS Configuration
 * This script tests the SMS service with corrected sender ID
 */

async function testFixedSMS() {
  console.log("🧪 Testing Fixed SMS Configuration...\n");

  // Test with corrected production config
  const config = {
    apiKey:
      "atsk_88a545c6ee576956ff255610da3e957512898fa6f0aa0764f63c8f626559f66d908ef8a2",
    username: "mwukenya",
    senderId: "mwukenya", // Using username instead of custom name
  };

  console.log("📱 Testing with corrected configuration:");
  console.log("   Username:", config.username);
  console.log("   Sender ID:", config.senderId);
  console.log("   API Key:", config.apiKey.substring(0, 20) + "...");

  try {
    const response = await testAPICall(config);
    console.log("   ✅ Success! Response:", response);
  } catch (error) {
    console.log("   ❌ Error:", error.message);
  }
}

async function testAPICall(config) {
  const apiUrl = "https://api.africastalking.com/version1/messaging";

  const requestBody = {
    username: config.username,
    to: "+254700000000",
    message: "Test SMS from MWU Kenya - " + new Date().toISOString(),
    from: config.senderId,
  };

  console.log("   Making request to:", apiUrl);
  console.log("   Request body:", requestBody);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey: config.apiKey,
    },
    body: new URLSearchParams(requestBody),
  });

  console.log("   Response status:", response.status);

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} - ${responseText}`
    );
  }

  // Parse XML response
  if (responseText.includes("<AfricasTalkingResponse>")) {
    // Extract message from XML
    const messageMatch = responseText.match(/<Message>(.*?)<\/Message>/);
    const message = messageMatch ? messageMatch[1] : "Unknown response";

    if (message === "Success") {
      return { status: "Success", message: "SMS sent successfully" };
    } else {
      return { status: "Response received", message: message };
    }
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    return { rawResponse: responseText, parseError: error.message };
  }
}

// Run the test
testFixedSMS().catch(console.error);

/**
 * Test script for contact form functionality
 * Run with: node test-contact-form.js
 */

const testContactForm = async () => {
  const testData = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+254700123456",
    subject: "Test Support Request",
    message:
      "This is a test message to verify the contact form is working correctly.",
    category: "payment",
  };

  try {
    console.log("🧪 Testing Contact Form API...");
    console.log("📤 Sending test data:", JSON.stringify(testData, null, 2));

    const response = await fetch(
      "http://localhost:5000/api/v1/contact/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      }
    );

    const result = await response.json();

    console.log("📊 Response Status:", response.status);
    console.log("📋 Response Body:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("✅ Contact form test PASSED!");
      console.log("📧 Email should be sent to: support@mwukenya.co.ke");
    } else {
      console.log("❌ Contact form test FAILED!");
      console.log("🚨 Error:", result.error);
    }
  } catch (error) {
    console.error("💥 Test failed with error:", error.message);
    console.log("🔧 Make sure the server is running on http://localhost:5000");
  }
};

// Test contact info endpoint
const testContactInfo = async () => {
  try {
    console.log("\n🧪 Testing Contact Info API...");

    const response = await fetch("http://localhost:5000/api/v1/contact/info");
    const result = await response.json();

    console.log("📊 Response Status:", response.status);
    console.log("📋 Response Body:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("✅ Contact info test PASSED!");
      console.log("📧 Support Email:", result.data.supportEmail);
    } else {
      console.log("❌ Contact info test FAILED!");
    }
  } catch (error) {
    console.error("💥 Contact info test failed:", error.message);
  }
};

// Run tests
const runTests = async () => {
  console.log("🚀 Starting Contact Form Tests...\n");

  await testContactInfo();
  await testContactForm();

  console.log("\n🏁 Tests completed!");
  console.log("📝 Check your email service logs to verify email delivery");
};

runTests();

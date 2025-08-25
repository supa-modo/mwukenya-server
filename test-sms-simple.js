const { smsService } = require("./dist/utils/smsService");

async function testSimpleSMS() {
  console.log("🧪 Simple SMS Test...\n");

  // Check service status
  const status = smsService.getServiceStatus();
  console.log("📊 Service Status:", JSON.stringify(status, null, 2));

  // Test a simple SMS
  console.log("\n📱 Testing Simple SMS...");
  try {
    const result = await smsService.sendCustomSMS(
      "+254700000000",
      "Test SMS from MWU Kenya - " + new Date().toISOString()
    );

    console.log("✅ SMS Result:", result);

    if (result) {
      console.log("🎉 SMS service is working!");
    } else {
      console.log("❌ SMS service failed");
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
  }
}

testSimpleSMS().catch(console.error);

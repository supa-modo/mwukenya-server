const { s3Service, testS3Connection } = require("./dist/config/s3");
const { config } = require("./dist/config/index");

async function runS3Tests() {
  try {
    console.log("🔍 Testing S3 connection...");
    console.log("📍 Region:", config.aws.region);
    console.log("🪣 Bucket:", config.aws.s3Bucket);
    console.log(
      "🔑 Access Key ID:",
      config.aws.accessKeyId ? "✓ Set" : "✗ Missing"
    );
    console.log(
      "🔐 Secret Access Key:",
      config.aws.secretAccessKey ? "✓ Set" : "✗ Missing"
    );

    // Test basic connection
    console.log("\n📡 Testing basic S3 connection...");
    const isConnected = await testS3Connection();

    if (isConnected) {
      console.log("✅ S3 connection successful!");

      // Test file operations
      console.log("\n📁 Testing file operations...");

      // Test upload
      const testBuffer = Buffer.from("Hello S3! This is a test file.");
      const testKey = "test/connection-test.txt";

      console.log("📤 Testing file upload...");
      const uploadResult = await s3Service.uploadFile(
        testBuffer,
        testKey,
        "text/plain",
        "test.txt"
      );
      console.log("✅ Upload successful:", uploadResult);

      // Test signed URL generation
      console.log("🔗 Testing signed URL generation...");
      const signedUrl = await s3Service.getSignedUrl(testKey, 3600);
      console.log("✅ Signed URL generated:", signedUrl);

      // Test file metadata
      console.log("📋 Testing file metadata retrieval...");
      const metadata = await s3Service.getFileMetadata(testKey);
      console.log("✅ File metadata retrieved:", {
        size: metadata.ContentLength,
        lastModified: metadata.LastModified,
        contentType: metadata.ContentType,
      });

      // Test file deletion
      console.log("🗑️ Testing file deletion...");
      await s3Service.deleteFile(testKey);
      console.log("✅ Test file deleted successfully");

      console.log("\n🎉 All S3 tests passed successfully!");
      console.log("🚀 Your S3 integration is ready to use.");
    } else {
      console.log("❌ S3 connection failed!");
      console.log(
        "🔧 Please check your AWS credentials and bucket configuration."
      );
    }
  } catch (error) {
    console.error("💥 Test failed with error:", error);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
    console.log("2. Verify your AWS_REGION is correct");
    console.log("3. Ensure your S3 bucket exists and is accessible");
    console.log("4. Check your IAM user has proper S3 permissions");
  }
}

// Run the test
runS3Tests();

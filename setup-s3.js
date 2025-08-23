const fs = require("fs");
const path = require("path");

console.log("🚀 AWS S3 Setup Helper for MWU Kenya");
console.log("=====================================\n");

// Check if .env file exists
const envPath = path.join(__dirname, ".env");
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log("✅ .env file found");

  // Read and check AWS configuration
  const envContent = fs.readFileSync(envPath, "utf8");
  const awsConfig = {
    region: envContent.match(/AWS_REGION=(.+)/)?.[1],
    accessKey: envContent.match(/AWS_ACCESS_KEY_ID=(.+)/)?.[1],
    secretKey: envContent.match(/AWS_SECRET_ACCESS_KEY=(.+)/)?.[1],
    bucket: envContent.match(/AWS_S3_BUCKET=(.+)/)?.[1],
  };

  console.log("\n📋 Current AWS Configuration:");
  console.log(`📍 Region: ${awsConfig.region || "❌ Not set"}`);
  console.log(`🔑 Access Key: ${awsConfig.accessKey || "❌ Not set"}`);
  console.log(`🔐 Secret Key: ${awsConfig.secretKey || "❌ Not set"}`);
  console.log(`🪣 Bucket: ${awsConfig.bucket || "❌ Not set"}`);

  if (awsConfig.accessKey && awsConfig.secretKey && awsConfig.bucket) {
    console.log("\n✅ All AWS configuration is set!");
    console.log("🚀 You can now run: node test-s3.js");
  } else {
    console.log("\n❌ Some AWS configuration is missing.");
    console.log("🔧 Please update your .env file with the required values.");
  }
} else {
  console.log("❌ .env file not found");
  console.log("\n🔧 To create your .env file:");
  console.log("1. Copy env.example to .env");
  console.log("2. Update the AWS configuration values");
  console.log("3. Run this script again");

  // Create .env from example if it exists
  const envExamplePath = path.join(__dirname, "env.example");
  if (fs.existsSync(envExamplePath)) {
    console.log("\n📋 Creating .env from env.example...");
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log("✅ .env file created from env.example");
      console.log("🔧 Please update the AWS configuration values in .env");
    } catch (error) {
      console.log("❌ Failed to create .env file:", error.message);
    }
  }
}

console.log("\n📚 Next Steps:");
console.log("1. Set up your AWS S3 bucket");
console.log("2. Create an IAM user with S3 permissions");
console.log("3. Update your .env file with AWS credentials");
console.log("4. Run: node test-s3.js");
console.log("5. Check the AWS_S3_SETUP_GUIDE.md for detailed instructions");

console.log("\n🔗 Useful Links:");
console.log("- AWS S3 Console: https://console.aws.amazon.com/s3/");
console.log("- AWS IAM Console: https://console.aws.amazon.com/iam/");
console.log("- Setup Guide: AWS_S3_SETUP_GUIDE.md");


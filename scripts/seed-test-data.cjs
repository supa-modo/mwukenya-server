#!/usr/bin/env node

/**
 * Standalone script to seed test data (CommonJS version)
 * This script creates 25+ test members under one delegate and one coordinator
 * Perfect for testing table pagination and data display
 */

require("dotenv").config();

console.log("🧪 Starting test data seeding...");
console.log("This will create:");
console.log("  • 1 Test Coordinator");
console.log("  • 1 Test Delegate");
console.log("  • 25 Active Test Members");
console.log("  • 2 Pending Test Members");
console.log("  • 2 Inactive Test Members");
console.log("  • Total: 31 test users\n");

// Import the compiled JavaScript version
const { seedTestData } = require("../dist/seeders/testDataSeeder.js");

seedTestData()
  .then(() => {
    console.log("\n✅ Test data seeding completed successfully!");
    console.log("You can now test your tables with multiple records.");
    console.log("Default password for all test users: Password123!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test data seeding failed:", error);
    process.exit(1);
  });

#!/usr/bin/env node

/**
 * Standalone script to seed test data
 * This script creates 25+ test members under one delegate and one coordinator
 * Perfect for testing table pagination and data display
 */

import dotenv from "dotenv";
import { seedTestData } from "../dist/seeders/testDataSeeder.js";

// Load environment variables
dotenv.config();

console.log("🧪 Starting test data seeding...");
console.log("This will create:");
console.log("  • 1 Test Coordinator");
console.log("  • 1 Test Delegate");
console.log("  • 25 Active Test Members");
console.log("  • 2 Pending Test Members");
console.log("  • 2 Inactive Test Members");
console.log("  • Total: 31 test users\n");

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

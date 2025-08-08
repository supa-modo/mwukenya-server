import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import sequelize from "../config/database";
import { seedUsers } from "./userSeeder";
import { seedMedicalSchemes } from "./medicalSchemeSeeder";
import logger from "../utils/logger";
import { config } from "../config";

export async function runSeeders() {
  const transaction = await sequelize.transaction();

  try {
    logger.info("Starting database seeding...");

    // Log database connection info for debugging
    if (process.env.DATABASE_URL) {
      logger.info("Using DATABASE_URL for seeding");
      // Mask the password in the URL for logging
      const maskedUrl = process.env.DATABASE_URL.replace(
        /:([^:@]+)@/,
        ":****@"
      );
      logger.info(`Database URL: ${maskedUrl}`);
    } else {
      logger.info("Using individual database configuration for seeding");
      logger.info(`Host: ${config.database.host}`);
      logger.info(`Port: ${config.database.port}`);
      logger.info(`Database: ${config.database.name}`);
      logger.info(`User: ${config.database.user}`);
    }

    // Test database connection before seeding
    await sequelize.authenticate();
    logger.info("Database connection established for seeding");

    // Run seeders in order (dependencies first)
    await seedUsers(transaction);
    await seedMedicalSchemes(transaction);

    await transaction.commit();
    logger.info("Database seeding completed successfully");
  } catch (error) {
    await transaction.rollback();
    logger.error(`Database seeding failed: ${error}`);

    // Log additional error details for debugging
    if (error instanceof Error) {
      logger.error(`Error name: ${error.name}`);
      logger.error(`Error message: ${error.message}`);
      if (error.stack) {
        logger.error(`Error stack: ${error.stack}`);
      }
    }

    throw error;
  }
}

// Run seeders if this file is executed directly
if (require.main === module) {
  runSeeders()
    .then(() => {
      console.log("✅ Database seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Database seeding failed:", error);
      process.exit(1);
    });
}

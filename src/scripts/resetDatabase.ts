import { sequelize } from "../models";
import logger from "../utils/logger";

const resetDatabase = async (): Promise<void> => {
  try {
    logger.info("Starting database reset...");

    // Drop all tables and recreate them
    await sequelize.sync({ force: true });
    logger.info("Database tables dropped and recreated successfully");

    logger.info("Database reset completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Database reset failed:", error);
    process.exit(1);
  }
};

// Run the reset
resetDatabase();

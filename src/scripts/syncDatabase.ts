import { sequelize } from "../models";
import logger from "../utils/logger";

const syncDatabase = async (): Promise<void> => {
  try {
    logger.info("Starting database synchronization...");

    // Create tables if they don't exist (won't drop existing data)
    await sequelize.sync({ alter: false });
    logger.info("Database tables synchronized successfully");

    logger.info("Database synchronization completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Database synchronization failed:", error);
    process.exit(1);
  }
};

// Run the sync
syncDatabase();

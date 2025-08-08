import { Sequelize } from "sequelize";
import { config } from "./index";
import logger from "../utils/logger";

/**
 * Test file to verify database configuration
 * This file can be used to test the database connection with different configurations
 */

// Test function to verify configuration
export const testDatabaseConfig = async () => {
  try {
    // Test if DATABASE_URL is being parsed correctly
    if (process.env.DATABASE_URL) {
      logger.info("Testing DATABASE_URL configuration...");
      logger.info(
        `DATABASE_URL: ${process.env.DATABASE_URL.replace(
          /:[^:@]*@/,
          ":****@"
        )}`
      );
    } else {
      logger.info("Testing individual database variables...");
      logger.info(`Host: ${config.database.host}`);
      logger.info(`Port: ${config.database.port}`);
      logger.info(`Database: ${config.database.name}`);
      logger.info(`User: ${config.database.user}`);
    }

    // Test connection
    const sequelize = new Sequelize({
      dialect: "postgres",
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL ? undefined : config.database.host,
      port: process.env.DATABASE_URL ? undefined : config.database.port,
      database: process.env.DATABASE_URL ? undefined : config.database.name,
      username: process.env.DATABASE_URL ? undefined : config.database.user,
      password: process.env.DATABASE_URL ? undefined : config.database.password,
      logging: false,
      dialectOptions: {
        ssl:
          config.env === "production"
            ? {
                require: true,
                rejectUnauthorized: false,
              }
            : false,
        connectTimeout: 60000,
        keepAlive: true,
        keepAliveInitialDelay: 0,
      },
    });

    await sequelize.authenticate();
    logger.info("✅ Database connection test successful!");
    await sequelize.close();
    return true;
  } catch (error) {
    logger.error("❌ Database connection test failed:", error);
    return false;
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseConfig()
    .then((success) => {
      if (success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error("Test failed:", error);
      process.exit(1);
    });
}

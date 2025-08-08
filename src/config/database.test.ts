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

    // Test connection - use conditional configuration to avoid mixing url with individual params
    let sequelize: Sequelize;

    if (process.env.DATABASE_URL) {
      // Use DATABASE_URL configuration
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: "postgres",
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
    } else {
      // Use individual configuration parameters
      sequelize = new Sequelize({
        dialect: "postgres",
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        username: config.database.user,
        password: config.database.password,
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
    }

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

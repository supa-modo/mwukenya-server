import { Sequelize } from "sequelize";
import { config } from "./index";
import logger from "../utils/logger";

// Database configuration with support for DATABASE_URL and IPv6
const getSequelizeConfig = () => {
  const baseConfig = {
    dialect: "postgres" as const,
    logging: config.database.logging
      ? (msg: string) => logger.debug(msg)
      : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
    timezone: "+03:00", // Kenya timezone
  };

  // Common dialect options for both configurations
  const commonDialectOptions = {
    ssl:
      config.env === "production"
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    connectTimeout: 60000,
    // Additional options for better compatibility
    keepAlive: true,
    keepAliveInitialDelay: 0,
  };

  // If DATABASE_URL is provided, use it directly
  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      url: process.env.DATABASE_URL,
      dialectOptions: {
        ...commonDialectOptions,
        // IPv6 support - only add if not in production to avoid conflicts
        ...(config.env !== "production" && {
          family: 6, // Prefer IPv6
        }),
      },
    };
  }

  // Otherwise, use individual configuration
  return {
    ...baseConfig,
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    username: config.database.user,
    password: config.database.password,
    dialectOptions: {
      ...commonDialectOptions,
      // IPv6 support - only add if not in production to avoid conflicts
      ...(config.env !== "production" && {
        family: 6, // Prefer IPv6
      }),
    },
  };
};

// Create Sequelize instance
const sequelize = new Sequelize(getSequelizeConfig());

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established successfully");

    // Log connection details (without sensitive info)
    const connectionInfo = process.env.DATABASE_URL
      ? `Connected via DATABASE_URL to ${config.database.host}:${config.database.port}/${config.database.name}`
      : `Connected to ${config.database.host}:${config.database.port}/${config.database.name}`;

    logger.info(connectionInfo);
    return true;
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
    return false;
  }
};

// Sync database (use with caution in production)
export const syncDatabase = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter: !force });
    logger.info(`Database synchronized${force ? " (with force)" : ""}`);
  } catch (error) {
    logger.error("Database synchronization failed:", error);
    throw error;
  }
};

// Close database connection
export const closeConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database connection:", error);
    throw error;
  }
};

export default sequelize;

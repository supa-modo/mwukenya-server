import { Sequelize } from "sequelize";
import { config } from "./index";
import logger from "../utils/logger";

// Database configuration
const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  dialect: "postgres",
  logging: config.database.logging ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl:
      config.env === "production"
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    connectTimeout: 60000,
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
  timezone: "+03:00", // Kenya timezone
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established successfully");
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

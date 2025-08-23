"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeConnection = exports.syncDatabase = exports.testConnection = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
const logger_1 = __importDefault(require("../utils/logger"));
const getSequelizeConfig = () => {
    const baseConfig = {
        dialect: "postgres",
        logging: index_1.config.database.logging
            ? (msg) => logger_1.default.debug(msg)
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
        timezone: "+03:00",
    };
    const commonDialectOptions = {
        ssl: index_1.config.env === "production"
            ? {
                require: true,
                rejectUnauthorized: false,
            }
            : false,
        connectTimeout: 60000,
        keepAlive: true,
        keepAliveInitialDelay: 0,
    };
    if (process.env.DATABASE_URL) {
        return {
            ...baseConfig,
            dialectOptions: {
                ...commonDialectOptions,
                ...(index_1.config.env !== "production" && {
                    family: 6,
                }),
            },
        };
    }
    return {
        ...baseConfig,
        host: index_1.config.database.host,
        port: index_1.config.database.port,
        database: index_1.config.database.name,
        username: index_1.config.database.user,
        password: index_1.config.database.password,
        dialectOptions: {
            ...commonDialectOptions,
            ...(index_1.config.env !== "production" && {
                family: 6,
            }),
        },
    };
};
const sequelize = process.env.DATABASE_URL
    ? new sequelize_1.Sequelize(process.env.DATABASE_URL, getSequelizeConfig())
    : new sequelize_1.Sequelize(getSequelizeConfig());
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        logger_1.default.info("Database connection established successfully");
        const connectionInfo = process.env.DATABASE_URL
            ? `Connected via DATABASE_URL to ${index_1.config.database.host}:${index_1.config.database.port}/${index_1.config.database.name}`
            : `Connected to ${index_1.config.database.host}:${index_1.config.database.port}/${index_1.config.database.name}`;
        logger_1.default.info(connectionInfo);
        return true;
    }
    catch (error) {
        logger_1.default.error("Unable to connect to the database:", error);
        return false;
    }
};
exports.testConnection = testConnection;
const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force, alter: !force });
        logger_1.default.info(`Database synchronized${force ? " (with force)" : ""}`);
    }
    catch (error) {
        logger_1.default.error("Database synchronization failed:", error);
        throw error;
    }
};
exports.syncDatabase = syncDatabase;
const closeConnection = async () => {
    try {
        await sequelize.close();
        logger_1.default.info("Database connection closed");
    }
    catch (error) {
        logger_1.default.error("Error closing database connection:", error);
        throw error;
    }
};
exports.closeConnection = closeConnection;
exports.default = sequelize;
//# sourceMappingURL=database.js.map
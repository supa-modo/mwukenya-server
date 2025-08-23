"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseConfig = void 0;
const sequelize_1 = require("sequelize");
const index_1 = require("./index");
const logger_1 = __importDefault(require("../utils/logger"));
const testDatabaseConfig = async () => {
    try {
        if (process.env.DATABASE_URL) {
            logger_1.default.info("Testing DATABASE_URL configuration...");
            logger_1.default.info(`DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ":****@")}`);
        }
        else {
            logger_1.default.info("Testing individual database variables...");
            logger_1.default.info(`Host: ${index_1.config.database.host}`);
            logger_1.default.info(`Port: ${index_1.config.database.port}`);
            logger_1.default.info(`Database: ${index_1.config.database.name}`);
            logger_1.default.info(`User: ${index_1.config.database.user}`);
        }
        let sequelize;
        if (process.env.DATABASE_URL) {
            sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL, {
                dialect: "postgres",
                logging: false,
                dialectOptions: {
                    ssl: index_1.config.env === "production"
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
        else {
            sequelize = new sequelize_1.Sequelize({
                dialect: "postgres",
                host: index_1.config.database.host,
                port: index_1.config.database.port,
                database: index_1.config.database.name,
                username: index_1.config.database.user,
                password: index_1.config.database.password,
                logging: false,
                dialectOptions: {
                    ssl: index_1.config.env === "production"
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
        logger_1.default.info("✅ Database connection test successful!");
        await sequelize.close();
        return true;
    }
    catch (error) {
        logger_1.default.error("❌ Database connection test failed:", error);
        return false;
    }
};
exports.testDatabaseConfig = testDatabaseConfig;
if (require.main === module) {
    (0, exports.testDatabaseConfig)()
        .then((success) => {
        if (success) {
            process.exit(0);
        }
        else {
            process.exit(1);
        }
    })
        .catch((error) => {
        logger_1.default.error("Test failed:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=database.test.js.map
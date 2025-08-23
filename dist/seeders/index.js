"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeeders = runSeeders;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = __importDefault(require("../config/database"));
const userSeeder_1 = require("./userSeeder");
const medicalSchemeSeeder_1 = require("./medicalSchemeSeeder");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = require("../config");
async function runSeeders() {
    const transaction = await database_1.default.transaction();
    try {
        logger_1.default.info("Starting database seeding...");
        if (process.env.DATABASE_URL) {
            logger_1.default.info("Using DATABASE_URL for seeding");
            const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":****@");
            logger_1.default.info(`Database URL: ${maskedUrl}`);
        }
        else {
            logger_1.default.info("Using individual database configuration for seeding");
            logger_1.default.info(`Host: ${config_1.config.database.host}`);
            logger_1.default.info(`Port: ${config_1.config.database.port}`);
            logger_1.default.info(`Database: ${config_1.config.database.name}`);
            logger_1.default.info(`User: ${config_1.config.database.user}`);
        }
        await database_1.default.authenticate();
        logger_1.default.info("Database connection established for seeding");
        await (0, userSeeder_1.seedUsers)(transaction);
        await (0, medicalSchemeSeeder_1.seedMedicalSchemes)(transaction);
        await transaction.commit();
        logger_1.default.info("Database seeding completed successfully");
    }
    catch (error) {
        await transaction.rollback();
        logger_1.default.error(`Database seeding failed: ${error}`);
        if (error instanceof Error) {
            logger_1.default.error(`Error name: ${error.name}`);
            logger_1.default.error(`Error message: ${error.message}`);
            if (error.stack) {
                logger_1.default.error(`Error stack: ${error.stack}`);
            }
        }
        throw error;
    }
}
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
//# sourceMappingURL=index.js.map
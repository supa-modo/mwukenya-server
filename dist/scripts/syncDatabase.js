"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const logger_1 = __importDefault(require("../utils/logger"));
const syncDatabase = async () => {
    try {
        logger_1.default.info("Starting database synchronization...");
        await models_1.sequelize.sync({ alter: false });
        logger_1.default.info("Database tables synchronized successfully");
        logger_1.default.info("Database synchronization completed successfully");
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error("Database synchronization failed:", error);
        process.exit(1);
    }
};
syncDatabase();
//# sourceMappingURL=syncDatabase.js.map
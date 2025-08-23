"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const logger_1 = __importDefault(require("../utils/logger"));
const resetDatabase = async () => {
    try {
        logger_1.default.info("Starting database reset...");
        await models_1.sequelize.sync({ force: true });
        logger_1.default.info("Database tables dropped and recreated successfully");
        logger_1.default.info("Database reset completed successfully");
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error("Database reset failed:", error);
        process.exit(1);
    }
};
resetDatabase();
//# sourceMappingURL=resetDatabase.js.map
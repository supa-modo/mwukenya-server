"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.MemberSubscription = exports.Document = exports.MedicalScheme = exports.User = exports.sequelize = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.sequelize = database_1.default;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const MedicalScheme_1 = __importDefault(require("./MedicalScheme"));
exports.MedicalScheme = MedicalScheme_1.default;
const Document_1 = __importDefault(require("./Document"));
exports.Document = Document_1.default;
const MemberSubscription_1 = __importDefault(require("./MemberSubscription"));
exports.MemberSubscription = MemberSubscription_1.default;
const Dependant_1 = __importDefault(require("./Dependant"));
const setupAssociations = () => {
    User_1.default.belongsTo(User_1.default, {
        as: "delegate",
        foreignKey: "delegateId",
        constraints: false,
    });
    User_1.default.belongsTo(User_1.default, {
        as: "coordinator",
        foreignKey: "coordinatorId",
        constraints: false,
    });
    User_1.default.hasMany(User_1.default, {
        as: "delegateMembers",
        foreignKey: "delegateId",
        constraints: false,
    });
    User_1.default.hasMany(User_1.default, {
        as: "coordinatorDelegates",
        foreignKey: "coordinatorId",
        constraints: false,
    });
    User_1.default.hasMany(Document_1.default, {
        as: "documents",
        foreignKey: "userId",
        onDelete: "CASCADE",
    });
    Document_1.default.belongsTo(User_1.default, {
        as: "user",
        foreignKey: "userId",
    });
    Document_1.default.belongsTo(User_1.default, {
        as: "verifier",
        foreignKey: "verifiedBy",
        constraints: false,
    });
    User_1.default.hasMany(Dependant_1.default, {
        as: "dependants",
        foreignKey: "userId",
        onDelete: "CASCADE",
    });
    Dependant_1.default.belongsTo(User_1.default, {
        as: "user",
        foreignKey: "userId",
    });
    Dependant_1.default.belongsTo(User_1.default, {
        as: "verifier",
        foreignKey: "verifiedBy",
        constraints: false,
    });
    Dependant_1.default.hasMany(Document_1.default, {
        as: "documents",
        foreignKey: "entityId",
        scope: {
            entityType: "dependant",
        },
        onDelete: "CASCADE",
    });
    User_1.default.hasMany(MemberSubscription_1.default, {
        as: "subscriptions",
        foreignKey: "userId",
        onDelete: "CASCADE",
    });
    MemberSubscription_1.default.belongsTo(User_1.default, {
        as: "user",
        foreignKey: "userId",
    });
    MedicalScheme_1.default.hasMany(MemberSubscription_1.default, {
        as: "memberSubscriptions",
        foreignKey: "schemeId",
    });
    MemberSubscription_1.default.belongsTo(MedicalScheme_1.default, {
        as: "scheme",
        foreignKey: "schemeId",
    });
    MemberSubscription_1.default.belongsTo(User_1.default, {
        as: "registrationDelegate",
        foreignKey: "registrationDelegateId",
        constraints: false,
    });
    MemberSubscription_1.default.belongsTo(User_1.default, {
        as: "registrationCoordinator",
        foreignKey: "registrationCoordinatorId",
        constraints: false,
    });
};
setupAssociations();
const initializeDatabase = async () => {
    try {
        await database_1.default.authenticate();
        console.log("Database connection has been established successfully.");
        try {
            await database_1.default.query("SELECT 1 FROM users LIMIT 1");
            console.log("Database tables already exist, skipping sync.");
        }
        catch (error) {
            console.log("Database tables don't exist, creating them...");
            if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
                await database_1.default.sync({ alter: false });
                console.log("Database models synchronized.");
            }
            else {
                if (process.env.FORCE_SYNC === "true") {
                    await database_1.default.sync({ alter: true });
                    console.log("Database models synchronized (production).");
                }
                else {
                    throw new Error("Database tables don't exist and FORCE_SYNC is not enabled");
                }
            }
        }
    }
    catch (error) {
        console.error("Unable to connect to the database:", error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
exports.default = {
    sequelize: database_1.default,
    User: User_1.default,
    MedicalScheme: MedicalScheme_1.default,
    Document: Document_1.default,
    MemberSubscription: MemberSubscription_1.default,
    initializeDatabase: exports.initializeDatabase,
};
//# sourceMappingURL=index.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const types_1 = require("./types");
class Dependant extends sequelize_1.Model {
    get age() {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
    markAsVerified(verifiedBy) {
        this.isVerified = true;
        this.verifiedAt = new Date();
        this.verifiedBy = verifiedBy;
        this.status = types_1.DependantStatus.ACTIVE;
    }
    markAsSuspended(reason) {
        this.status = types_1.DependantStatus.SUSPENDED;
        this.notes = reason
            ? `${this.notes || ""}\nSuspended: ${reason}`.trim()
            : this.notes;
    }
    isActive() {
        return this.status === types_1.DependantStatus.ACTIVE;
    }
    isAdult() {
        return this.age >= 18;
    }
    toJSON() {
        const values = { ...this.get() };
        values.age = this.age;
        values.fullName = this.fullName;
        return values;
    }
    static async findByUserId(userId) {
        return this.findAll({
            where: { userId },
            order: [["createdAt", "DESC"]],
        });
    }
    static async findActiveByUserId(userId) {
        return this.findAll({
            where: { userId, status: types_1.DependantStatus.ACTIVE },
            order: [["createdAt", "DESC"]],
        });
    }
    static async findPendingVerification() {
        return this.findAll({
            where: { isVerified: false },
            order: [["createdAt", "ASC"]],
        });
    }
}
Dependant.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: "user_id",
        references: {
            model: "users",
            key: "id",
        },
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        field: "first_name",
        validate: {
            notEmpty: true,
            len: [1, 100],
        },
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        field: "last_name",
        validate: {
            notEmpty: true,
            len: [1, 100],
        },
    },
    otherNames: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        field: "other_names",
    },
    relationship: {
        type: sequelize_1.DataTypes.ENUM("spouse", "child", "parent", "sibling", "other"),
        allowNull: false,
        validate: {
            notEmpty: true,
            isIn: [["spouse", "child", "parent", "sibling", "other"]],
        },
    },
    dateOfBirth: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: "date_of_birth",
        validate: {
            notEmpty: true,
            isDate: true,
            isPast: true,
        },
    },
    gender: {
        type: sequelize_1.DataTypes.ENUM("Male", "Female"),
        allowNull: false,
        validate: {
            notEmpty: true,
            isIn: [["Male", "Female"]],
        },
    },
    idNumber: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "id_number",
        unique: true,
        validate: {
            len: [0, 20],
        },
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM("active", "inactive", "suspended"),
        defaultValue: types_1.DependantStatus.ACTIVE,
        validate: {
            isIn: [["active", "inactive", "suspended"]],
        },
    },
    isVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_verified",
    },
    verifiedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: "verified_by",
        references: {
            model: "users",
            key: "id",
        },
    },
    verifiedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "verified_at",
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: database_1.default,
    tableName: "dependants",
    timestamps: true,
    underscored: true,
});
exports.default = Dependant;
//# sourceMappingURL=Dependant.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const types_1 = require("../types");
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = require("../config");
class User extends sequelize_1.Model {
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
    get fullNameWithOthers() {
        return `${this.firstName} ${this.otherNames ? this.otherNames + " " : ""}${this.lastName}`;
    }
    async validatePassword(password) {
        return bcrypt_1.default.compare(password, this.passwordHash);
    }
    async updatePassword(newPassword) {
        this.passwordHash = await User.hashPassword(newPassword);
        await this.save();
    }
    toJSON() {
        const values = { ...this.get() };
        delete values.passwordHash;
        delete values.refreshToken;
        delete values.passwordResetToken;
        return values;
    }
    isMember() {
        return this.role === types_1.UserRole.MEMBER;
    }
    isDelegate() {
        return this.role === types_1.UserRole.DELEGATE;
    }
    isCoordinator() {
        return this.role === types_1.UserRole.COORDINATOR;
    }
    isAdmin() {
        return this.role === types_1.UserRole.ADMIN || this.role === types_1.UserRole.SUPERADMIN;
    }
    canManageUsers() {
        return [types_1.UserRole.ADMIN, types_1.UserRole.SUPERADMIN, types_1.UserRole.COORDINATOR].includes(this.role);
    }
    canRegisterDelegates() {
        return [types_1.UserRole.COORDINATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPERADMIN].includes(this.role);
    }
    canRegisterMembers() {
        return [
            types_1.UserRole.DELEGATE,
            types_1.UserRole.COORDINATOR,
            types_1.UserRole.ADMIN,
            types_1.UserRole.SUPERADMIN,
        ].includes(this.role);
    }
    static async hashPassword(password) {
        return bcrypt_1.default.hash(password, config_1.config.security.bcryptRounds);
    }
    static async findByPhone(phoneNumber) {
        return this.findOne({ where: { phoneNumber } });
    }
    static async findByEmail(email) {
        return this.findOne({ where: { email } });
    }
    static async findByIdNumber(idNumber) {
        return this.findOne({ where: { idNumber } });
    }
    static async findByMembershipNumber(membershipNumber) {
        return this.findOne({ where: { membershipNumber } });
    }
    static async findByDelegateCode(delegateCode) {
        return this.findOne({ where: { delegateCode, role: types_1.UserRole.DELEGATE } });
    }
    static async findByCoordinatorCode(coordinatorCode) {
        return this.findOne({
            where: { coordinatorCode, role: types_1.UserRole.COORDINATOR },
        });
    }
    static async generateUniqueMembershipNumber(maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
            const membershipNumber = this.generateMembershipNumber();
            const existingUser = await this.findByMembershipNumber(membershipNumber);
            if (!existingUser) {
                if (i > 0) {
                    console.log(`✅ Generated unique membership number after ${i + 1} attempts: ${membershipNumber}`);
                }
                return membershipNumber;
            }
            if (i === 0) {
                console.log(`⚠️  Collision detected for membership number: ${membershipNumber}, retrying...`);
            }
        }
        console.log(`🚨 Max retries (${maxRetries}) reached, using fallback generation method`);
        return this.generateFallbackMembershipNumber();
    }
    static generateMembershipNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
        const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
        const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
        return `MWU-${year}${letter1}${letter2}${randomNum}`;
    }
    static generateFallbackMembershipNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, "0");
        return `MWU-${year}${timestamp}${random}`;
    }
    static generateDelegateCode() {
        const prefix = "DEL";
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, "0");
        return `${prefix}${timestamp}${random}`;
    }
    static generateCoordinatorCode() {
        const prefix = "CRD";
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, "0");
        return `${prefix}${timestamp}${random}`;
    }
    static formatPhoneNumber(phoneNumber) {
        if (!phoneNumber)
            return "";
        const digits = phoneNumber.replace(/\D/g, "");
        if (digits.startsWith("254")) {
            return `+${digits}`;
        }
        if (digits.startsWith("07")) {
            return `+254${digits.slice(1)}`;
        }
        if (digits.startsWith("7")) {
            return `+254${digits}`;
        }
        if (digits.startsWith("0")) {
            return `+254${digits.slice(1)}`;
        }
        if (digits.startsWith("+")) {
            return `+254${digits.slice(1)}`;
        }
        return `+254${digits}`;
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100],
        },
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100],
        },
    },
    otherNames: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: false,
        },
    },
    phoneNumber: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            is: /^\+254\d{9}$/,
        },
    },
    idNumber: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [6, 20],
        },
    },
    passwordHash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
    },
    gender: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.Gender)),
        allowNull: true,
    },
    county: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    sacco: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    route: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    membershipStatus: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.MembershipStatus)),
        allowNull: false,
        defaultValue: types_1.MembershipStatus.PENDING,
        field: "membership_status",
    },
    membershipNumber: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        field: "membership_number",
    },
    membershipDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "membership_date",
    },
    role: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.UserRole)),
        allowNull: false,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
    },
    isEmailVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_email_verified",
    },
    isPhoneVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_phone_verified",
    },
    isIdNumberVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_id_number_verified",
    },
    delegateId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: "delegate_id",
        references: {
            model: "users",
            key: "id",
        },
    },
    coordinatorId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: "coordinator_id",
        references: {
            model: "users",
            key: "id",
        },
    },
    delegateCode: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "delegate_code",
    },
    coordinatorCode: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "coordinator_code",
    },
    lastLogin: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "last_login",
    },
    refreshToken: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: "refresh_token",
    },
    passwordResetToken: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        field: "password_reset_token",
    },
    passwordResetExpires: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "password_reset_expires",
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "created_at",
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "updated_at",
    },
}, {
    sequelize: database_1.default,
    tableName: "users",
    indexes: [
        {
            unique: true,
            fields: ["phoneNumber"],
        },
        {
            unique: true,
            fields: ["email"],
            where: {
                email: {
                    [sequelize_1.Op.ne]: null,
                },
            },
        },
        {
            unique: true,
            fields: ["idNumber"],
        },
        {
            unique: true,
            fields: ["membership_number"],
            where: {
                membership_number: {
                    [sequelize_1.Op.ne]: null,
                },
            },
        },
        {
            fields: ["role"],
        },
        {
            fields: ["membership_status"],
        },
        {
            fields: ["delegate_id"],
        },
        {
            fields: ["coordinator_id"],
        },
        {
            unique: true,
            fields: ["delegate_code"],
            where: {
                delegate_code: {
                    [sequelize_1.Op.ne]: null,
                },
            },
        },
        {
            unique: true,
            fields: ["coordinator_code"],
            where: {
                coordinator_code: {
                    [sequelize_1.Op.ne]: null,
                },
            },
        },
    ],
    hooks: {
        beforeCreate: async (user) => {
            if (user.phoneNumber) {
                user.phoneNumber = User.formatPhoneNumber(user.phoneNumber);
            }
            if (user.role === types_1.UserRole.MEMBER && !user.membershipNumber) {
                user.membershipNumber = await User.generateUniqueMembershipNumber();
                user.membershipDate = new Date();
            }
            if (user.role === types_1.UserRole.DELEGATE && !user.delegateCode) {
                user.delegateCode = User.generateDelegateCode();
            }
            if (user.role === types_1.UserRole.COORDINATOR && !user.coordinatorCode) {
                user.coordinatorCode = User.generateCoordinatorCode();
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed("phoneNumber") && user.phoneNumber) {
                user.phoneNumber = User.formatPhoneNumber(user.phoneNumber);
            }
            if (user.changed("role")) {
                if (user.membershipStatus === types_1.MembershipStatus.ACTIVE &&
                    !user.membershipDate) {
                    user.membershipDate = new Date();
                }
            }
        },
    },
});
exports.default = User;
//# sourceMappingURL=User.js.map
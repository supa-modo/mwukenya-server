"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const types_1 = require("../types");
class MemberSubscription extends sequelize_1.Model {
    async getDependentsCount() {
        return this.dependents ? this.dependents.length : 0;
    }
    async getPaymentHistory(options) {
        const { Payment } = database_1.default.models;
        return Payment.findAll({
            where: {
                subscriptionId: this.id,
                ...(options?.status && { paymentStatus: options.status }),
            },
            order: [["paymentDate", "DESC"]],
            limit: options?.limit,
            offset: options?.offset,
        });
    }
    async getPaymentSummary() {
        const { Payment } = database_1.default.models;
        const payments = await Payment.findAll({
            where: {
                subscriptionId: this.id,
                paymentStatus: "completed",
            },
            order: [["paymentDate", "DESC"]],
        });
        const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
        const totalDays = payments.reduce((sum, payment) => sum + payment.daysCovered, 0);
        const lastPaymentDate = payments.length > 0 ? new Date() : undefined;
        const daysSinceStart = Math.floor((new Date().getTime() - this.effectiveDate.getTime()) /
            (1000 * 60 * 60 * 24));
        const arrearsDays = Math.max(0, daysSinceStart - totalDays);
        const arrearsAmount = arrearsDays * (this.scheme?.dailyPremium || 0);
        const nextDueDate = new Date(this.effectiveDate);
        nextDueDate.setDate(nextDueDate.getDate() + totalDays);
        return {
            totalPaid,
            totalDays,
            lastPaymentDate,
            nextDueDate: arrearsDays > 0 ? new Date() : nextDueDate,
            arrearsDays,
            arrearsAmount,
        };
    }
    async isActive() {
        return this.status === types_1.SubscriptionStatus.ACTIVE;
    }
    async canMakePayment() {
        return this.status === types_1.SubscriptionStatus.ACTIVE;
    }
    async addDependent(dependent) {
        const currentDependents = this.dependents || [];
        const maxDependents = this.scheme?.maxDependents || 0;
        if (currentDependents.length >= maxDependents) {
            throw new Error(`Maximum ${maxDependents} dependents allowed for this scheme`);
        }
        const updatedDependents = [...currentDependents, dependent];
        await this.update({ dependents: updatedDependents });
    }
    async removeDependent(dependentIndex) {
        const currentDependents = this.dependents || [];
        if (dependentIndex < 0 || dependentIndex >= currentDependents.length) {
            throw new Error("Invalid dependent index");
        }
        const updatedDependents = currentDependents.filter((_, index) => index !== dependentIndex);
        await this.update({ dependents: updatedDependents });
    }
    static async findActiveSubscription(userId) {
        return this.findOne({
            where: {
                userId,
                status: types_1.SubscriptionStatus.ACTIVE,
            },
            include: [
                {
                    model: database_1.default.models.MedicalScheme,
                    as: "scheme",
                },
                {
                    model: database_1.default.models.User,
                    as: "user",
                },
            ],
        });
    }
    static async findByUserId(userId) {
        return this.findAll({
            where: { userId },
            include: [
                {
                    model: database_1.default.models.MedicalScheme,
                    as: "scheme",
                },
            ],
            order: [["subscriptionDate", "DESC"]],
        });
    }
    static async findWithPaymentSummary(options) {
        const whereClause = {};
        if (options?.userId)
            whereClause.userId = options.userId;
        if (options?.schemeId)
            whereClause.schemeId = options.schemeId;
        if (options?.status)
            whereClause.status = options.status;
        return this.findAll({
            where: whereClause,
            include: [
                {
                    model: database_1.default.models.MedicalScheme,
                    as: "scheme",
                },
                {
                    model: database_1.default.models.User,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "phoneNumber"],
                },
                {
                    model: database_1.default.models.Payment,
                    as: "payments",
                    where: { paymentStatus: "completed" },
                    required: false,
                },
            ],
            order: [["subscriptionDate", "DESC"]],
            limit: options?.limit,
            offset: options?.offset,
        });
    }
    static async getActiveSubscriptionsCount() {
        return this.count({
            where: { status: types_1.SubscriptionStatus.ACTIVE },
        });
    }
    static async getSubscriptionsByScheme() {
        return this.findAll({
            attributes: [
                "schemeId",
                [database_1.default.fn("COUNT", database_1.default.col("id")), "subscriptionCount"],
            ],
            include: [
                {
                    model: database_1.default.models.MedicalScheme,
                    as: "scheme",
                    attributes: ["name", "code", "coverageType"],
                },
            ],
            where: { status: types_1.SubscriptionStatus.ACTIVE },
            group: ["schemeId", "scheme.id"],
            order: [[database_1.default.literal("subscriptionCount"), "DESC"]],
        });
    }
}
MemberSubscription.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
    schemeId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: "scheme_id",
        references: {
            model: "medical_schemes",
            key: "id",
        },
    },
    subscriptionDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "subscription_date",
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.SubscriptionStatus)),
        allowNull: false,
        defaultValue: types_1.SubscriptionStatus.ACTIVE,
    },
    effectiveDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: "effective_date",
    },
    endDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
        field: "end_date",
    },
    registrationDelegateId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: "registration_delegate_id",
        references: {
            model: "users",
            key: "id",
        },
    },
    registrationCoordinatorId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: "registration_coordinator_id",
        references: {
            model: "users",
            key: "id",
        },
    },
    shaMemberNumber: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        field: "sha_member_number",
    },
    dependents: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
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
    tableName: "member_subscriptions",
    indexes: [
        {
            unique: true,
            fields: ["user_id", "scheme_id"],
        },
        {
            fields: ["user_id"],
        },
        {
            fields: ["scheme_id"],
        },
        {
            fields: ["status"],
        },
        {
            fields: ["effective_date"],
        },
        {
            fields: ["end_date"],
        },
        {
            fields: ["registration_delegate_id"],
        },
        {
            fields: ["registration_coordinator_id"],
        },
    ],
    validate: {
        effectiveDateValid() {
            if (this.effectiveDate && this.effectiveDate > new Date()) {
                throw new Error("Effective date cannot be in the future");
            }
        },
    },
});
exports.default = MemberSubscription;
//# sourceMappingURL=MemberSubscription.js.map
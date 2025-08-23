"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const types_1 = require("../types");
class MedicalScheme extends sequelize_1.Model {
    get mwuPortion() {
        return (this.dailyPremium -
            this.shaPortion -
            this.delegateCommission -
            this.coordinatorCommission);
    }
    get monthlyPremium() {
        return this.dailyPremium * 30;
    }
    get annualPremium() {
        return this.dailyPremium * 365;
    }
    get maxDependents() {
        const coverageMap = {
            M: 0,
            "M+1": 1,
            "M+2": 2,
            "M+3": 3,
            "M+4": 4,
            "M+5": 5,
        };
        return coverageMap[this.coverageType] || 0;
    }
    get coverageDescription() {
        const descriptions = {
            M: "Individual coverage for member only",
            "M+1": "Member plus one dependent (spouse)",
            "M+2": "Member plus spouse and one child",
            "M+3": "Member plus spouse and two children",
            "M+4": "Member plus spouse and three children",
            "M+5": "Member plus spouse and four children",
        };
        return descriptions[this.coverageType] || "Unknown coverage type";
    }
    calculateCommissions(memberPayment) {
        const paymentRatio = memberPayment / this.dailyPremium;
        return {
            delegateCommission: this.delegateCommission * paymentRatio,
            coordinatorCommission: this.coordinatorCommission * paymentRatio,
            shaPortion: this.shaPortion * paymentRatio,
            mwuPortion: this.mwuPortion * paymentRatio,
        };
    }
    isValidPaymentAmount(amount) {
        return amount > 0 && amount <= this.dailyPremium * 30;
    }
    getDaysCovered(amount) {
        return Math.floor(amount / this.dailyPremium);
    }
    getMinimumPayment() {
        return this.dailyPremium;
    }
    calculateCoveragePeriod(amount, startDate) {
        const daysCovered = this.getDaysCovered(amount);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + daysCovered - 1);
        return {
            startDate,
            endDate,
            daysCovered,
        };
    }
    isEligibleForDependents() {
        return this.maxDependents > 0;
    }
    static async findByCode(code) {
        return this.findOne({ where: { code, isActive: true } });
    }
    static async findActiveSchemes() {
        return this.findAll({
            where: { isActive: true },
            order: [
                ["coverageType", "ASC"],
                ["dailyPremium", "ASC"],
            ],
        });
    }
    static async findByCoverageType(coverageType) {
        return this.findAll({
            where: { coverageType, isActive: true },
            order: [["dailyPremium", "ASC"]],
        });
    }
    static async findWithSubscriberCount() {
        return this.findAll({
            where: { isActive: true },
            attributes: [
                "id",
                "name",
                "code",
                "description",
                "coverageType",
                "dailyPremium",
                "shaPortion",
                "delegateCommission",
                "coordinatorCommission",
                "benefits",
                "isActive",
                [
                    database_1.default.fn("COUNT", database_1.default.col("memberSubscriptions.id")),
                    "subscriberCount",
                ],
            ],
            include: [
                {
                    model: database_1.default.models.MemberSubscription,
                    as: "memberSubscriptions",
                    attributes: [],
                    where: { status: "active" },
                    required: false,
                },
            ],
            group: ["MedicalScheme.id"],
            order: [
                ["coverageType", "ASC"],
                ["dailyPremium", "ASC"],
            ],
        });
    }
    static getCoverageTypeOptions() {
        return [
            {
                value: types_1.CoverageType.M,
                label: "Individual (M)",
                description: "Member only coverage",
            },
            {
                value: types_1.CoverageType.M_PLUS_1,
                label: "M+1",
                description: "Member plus one dependent",
            },
            {
                value: types_1.CoverageType.M_PLUS_2,
                label: "M+2",
                description: "Member plus two dependents",
            },
            {
                value: types_1.CoverageType.M_PLUS_3,
                label: "M+3",
                description: "Member plus three dependents",
            },
            {
                value: types_1.CoverageType.M_PLUS_4,
                label: "M+4",
                description: "Member plus four dependents",
            },
            {
                value: types_1.CoverageType.M_PLUS_5,
                label: "M+5",
                description: "Member plus five dependents",
            },
        ];
    }
}
MedicalScheme.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [3, 100],
        },
    },
    code: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [3, 20],
            isUppercase: true,
        },
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    coverageType: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.CoverageType)),
        allowNull: false,
        field: "coverage_type",
    },
    dailyPremium: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "daily_premium",
        validate: {
            min: 1,
            max: 10000,
        },
    },
    shaPortion: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "sha_portion",
        validate: {
            min: 0,
        },
    },
    delegateCommission: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 2.0,
        field: "delegate_commission",
        validate: {
            min: 0,
        },
    },
    coordinatorCommission: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.0,
        field: "coordinator_commission",
        validate: {
            min: 0,
        },
    },
    benefits: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
    },
    limitations: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
    },
    shaSchemeId: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        field: "sha_scheme_id",
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
    tableName: "medical_schemes",
    indexes: [
        {
            unique: true,
            fields: ["code"],
        },
        {
            fields: ["coverage_type"],
        },
        {
            fields: ["is_active"],
        },
        {
            fields: ["daily_premium"],
        },
    ],
    validate: {
        premiumStructureValid() {
            const total = Number(this.shaPortion) +
                Number(this.delegateCommission) +
                Number(this.coordinatorCommission);
            if (total > Number(this.dailyPremium)) {
                throw new Error("Total of SHA portion and commissions cannot exceed daily premium");
            }
        },
    },
});
exports.default = MedicalScheme;
//# sourceMappingURL=MedicalScheme.js.map
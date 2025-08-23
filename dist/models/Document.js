"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const types_1 = require("../types");
class Document extends sequelize_1.Model {
    markAsVerified(verifiedBy) {
        this.status = types_1.DocumentStatus.VERIFIED;
        this.verifiedAt = new Date();
        this.verifiedBy = verifiedBy;
        this.rejectionReason = undefined;
    }
    markAsRejected(rejectionReason) {
        this.status = types_1.DocumentStatus.REJECTED;
        this.rejectionReason = rejectionReason;
        this.verifiedAt = undefined;
        this.verifiedBy = undefined;
    }
    isPending() {
        return this.status === types_1.DocumentStatus.PENDING;
    }
    isVerified() {
        return this.status === types_1.DocumentStatus.VERIFIED;
    }
    isRejected() {
        return this.status === types_1.DocumentStatus.REJECTED;
    }
    toJSON() {
        const values = { ...this.get() };
        delete values.s3Key;
        delete values.s3Bucket;
        return values;
    }
    static async findByUserId(userId) {
        return this.findAll({
            where: { userId },
            order: [["uploadedAt", "DESC"]],
        });
    }
    static async findByUserIdAndType(userId, type) {
        return this.findAll({
            where: { userId, type },
            order: [["uploadedAt", "DESC"]],
        });
    }
    static async findPendingDocuments() {
        return this.findAll({
            where: { status: types_1.DocumentStatus.PENDING },
            order: [["uploadedAt", "ASC"]],
        });
    }
}
Document.init({
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
        onDelete: "CASCADE",
    },
    entityType: {
        type: sequelize_1.DataTypes.ENUM("user", "dependant"),
        allowNull: false,
        field: "entity_type",
    },
    entityId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: "entity_id",
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255],
        },
    },
    type: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DocumentType)),
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    fileName: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        field: "file_name",
        validate: {
            notEmpty: true,
        },
    },
    fileSize: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "file_size",
        validate: {
            min: 1,
            max: 5 * 1024 * 1024,
        },
    },
    mimeType: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        field: "mime_type",
        validate: {
            notEmpty: true,
            isIn: [
                [
                    "image/jpeg",
                    "image/png",
                    "image/gif",
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
            ],
        },
    },
    s3Key: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false,
        field: "s3_key",
        validate: {
            notEmpty: true,
        },
    },
    s3Bucket: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        field: "s3_bucket",
        validate: {
            notEmpty: true,
        },
    },
    url: {
        type: sequelize_1.DataTypes.STRING(1000),
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DocumentStatus)),
        allowNull: false,
        defaultValue: types_1.DocumentStatus.PENDING,
    },
    uploadedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: "uploaded_at",
    },
    verifiedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "verified_at",
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
    rejectionReason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: "rejection_reason",
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
    tableName: "documents",
    indexes: [
        {
            fields: ["user_id"],
        },
        {
            fields: ["type"],
        },
        {
            fields: ["status"],
        },
        {
            fields: ["uploaded_at"],
        },
        {
            unique: true,
            fields: ["s3_key"],
        },
    ],
});
exports.default = Document;
//# sourceMappingURL=Document.js.map
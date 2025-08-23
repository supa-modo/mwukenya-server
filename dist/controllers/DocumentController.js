"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const models_1 = require("../models");
const s3_1 = require("../config/s3");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    if ((0, s3_1.isValidFileType)(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX`));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
class DocumentController {
    async uploadDocument(req, res) {
        try {
            const { name, type, description } = req.body;
            const file = req.file;
            const userId = req.user.id;
            if (!name || !type || !file) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "DOC_001",
                        message: "Missing required fields: name, type, and file are required",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (!Object.values(types_1.DocumentType).includes(type)) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "DOC_002",
                        message: "Invalid document type",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const fileExtension = (0, s3_1.getFileExtensionFromMimeType)(file.mimetype);
            const s3Key = s3_1.s3Service.generateS3Key(userId, fileExtension, "documents");
            const uploadResult = await s3_1.s3Service.uploadFile(file.buffer, s3Key, file.mimetype, file.originalname);
            const document = await models_1.Document.create({
                userId,
                entityType: "user",
                entityId: userId,
                name,
                type: type,
                description,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                s3Key,
                s3Bucket: uploadResult.Bucket,
                url: uploadResult.Location,
                status: types_1.DocumentStatus.PENDING,
            });
            logger_1.default.info(`Document uploaded successfully for user ${userId}: ${document.id}`);
            res.status(201).json({
                success: true,
                data: document.toJSON(),
                message: "Document uploaded successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error uploading document:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_003",
                    message: "Failed to upload document",
                    details: errorMessage,
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getUserDocuments(req, res) {
        try {
            const userId = req.user.id;
            const { type } = req.query;
            let documents;
            if (type && Object.values(types_1.DocumentType).includes(type)) {
                documents = await models_1.Document.findByUserIdAndType(userId, type);
            }
            else {
                documents = await models_1.Document.findByUserId(userId);
            }
            res.status(200).json({
                success: true,
                data: documents.map((doc) => doc.toJSON()),
                message: "Documents retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error retrieving user documents:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_004",
                    message: "Failed to retrieve documents",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getDocumentById(req, res) {
        try {
            const { documentId } = req.params;
            const userId = req.user.id;
            const document = await models_1.Document.findOne({
                where: {
                    id: documentId,
                    userId,
                },
            });
            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "DOC_005",
                        message: "Document not found",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: document.toJSON(),
                message: "Document retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error retrieving document:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_006",
                    message: "Failed to retrieve document",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getDocumentUrl(req, res) {
        try {
            const { documentId } = req.params;
            const userId = req.user.id;
            const document = await models_1.Document.findOne({
                where: {
                    id: documentId,
                    userId,
                },
            });
            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "DOC_005",
                        message: "Document not found",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const signedUrl = await s3_1.s3Service.getSignedUrl(document.s3Key, 3600);
            res.status(200).json({
                success: true,
                data: {
                    url: signedUrl,
                    expiresIn: 3600,
                },
                message: "Document URL generated successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error generating document URL:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_007",
                    message: "Failed to generate document URL",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async deleteDocument(req, res) {
        try {
            const { documentId } = req.params;
            const userId = req.user.id;
            const document = await models_1.Document.findOne({
                where: {
                    id: documentId,
                    userId,
                },
            });
            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "DOC_005",
                        message: "Document not found",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            try {
                await s3_1.s3Service.deleteFile(document.s3Key);
            }
            catch (s3Error) {
                logger_1.default.warn(`Failed to delete file from S3: ${document.s3Key}`, s3Error);
            }
            await document.destroy();
            logger_1.default.info(`Document deleted successfully: ${documentId}`);
            res.status(200).json({
                success: true,
                message: "Document deleted successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error deleting document:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_008",
                    message: "Failed to delete document",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async updateDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { name, description } = req.body;
            const userId = req.user.id;
            const document = await models_1.Document.findOne({
                where: {
                    id: documentId,
                    userId,
                },
            });
            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "DOC_005",
                        message: "Document not found",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (name)
                document.name = name;
            if (description !== undefined)
                document.description = description;
            await document.save();
            logger_1.default.info(`Document updated successfully: ${documentId}`);
            res.status(200).json({
                success: true,
                data: document.toJSON(),
                message: "Document updated successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error updating document:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_009",
                    message: "Failed to update document",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getPendingDocuments(req, res) {
        try {
            const documents = await models_1.Document.findPendingDocuments();
            res.status(200).json({
                success: true,
                data: documents.map((doc) => doc.toJSON()),
                message: "Pending documents retrieved successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error retrieving pending documents:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_010",
                    message: "Failed to retrieve pending documents",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
    async verifyDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { status, rejectionReason } = req.body;
            const verifierId = req.user.id;
            if (!Object.values(types_1.DocumentStatus).includes(status)) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "DOC_011",
                        message: "Invalid document status",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (status === types_1.DocumentStatus.REJECTED && !rejectionReason) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "DOC_012",
                        message: "Rejection reason is required when rejecting a document",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const document = await models_1.Document.findByPk(documentId);
            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "DOC_005",
                        message: "Document not found",
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (status === types_1.DocumentStatus.VERIFIED) {
                document.markAsVerified(verifierId);
            }
            else if (status === types_1.DocumentStatus.REJECTED) {
                document.markAsRejected(rejectionReason);
            }
            await document.save();
            logger_1.default.info(`Document ${status} successfully: ${documentId} by ${verifierId}`);
            res.status(200).json({
                success: true,
                data: document.toJSON(),
                message: `Document ${status} successfully`,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error("Error verifying document:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "DOC_013",
                    message: "Failed to verify document",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }
}
exports.default = new DocumentController();
//# sourceMappingURL=DocumentController.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileExtensionFromMimeType = exports.isValidFileType = exports.testS3Connection = exports.s3Service = exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const index_1 = require("./index");
const logger_1 = __importDefault(require("../utils/logger"));
const uuid_1 = require("uuid");
const s3Client = new client_s3_1.S3Client({
    region: index_1.config.aws.region,
    credentials: {
        accessKeyId: index_1.config.aws.accessKeyId,
        secretAccessKey: index_1.config.aws.secretAccessKey,
    },
});
class S3Service {
    constructor() {
        this.bucket = index_1.config.aws.s3Bucket;
    }
    generateS3Key(userId, fileExtension, prefix = "documents") {
        const timestamp = new Date().toISOString().split("T")[0];
        const uuid = (0, uuid_1.v4)();
        return `${prefix}/${userId}/${timestamp}/${uuid}${fileExtension}`;
    }
    async uploadFile(buffer, key, mimeType, fileName) {
        try {
            const upload = new lib_storage_1.Upload({
                client: s3Client,
                params: {
                    Bucket: this.bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: mimeType,
                    ContentDisposition: `attachment; filename="${fileName}"`,
                    Metadata: {
                        originalFileName: fileName,
                        uploadedAt: new Date().toISOString(),
                    },
                    ServerSideEncryption: "AES256",
                },
                queueSize: 4,
                partSize: 1024 * 1024 * 5,
            });
            logger_1.default.info(`Uploading file to S3: ${key}`);
            const result = await upload.done();
            logger_1.default.info(`File uploaded successfully: ${key}`);
            return {
                Bucket: this.bucket,
                Key: key,
                Location: `https://${this.bucket}.s3.${index_1.config.aws.region}.amazonaws.com/${key}`,
            };
        }
        catch (error) {
            logger_1.default.error(`Error uploading file to S3: ${key}`, error);
            throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getSignedUrl(key, expiresIn = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
            logger_1.default.debug(`Generated signed URL for: ${key}`);
            return url;
        }
        catch (error) {
            logger_1.default.error(`Error generating signed URL for: ${key}`, error);
            throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async deleteFile(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            logger_1.default.info(`Deleting file from S3: ${key}`);
            const result = await s3Client.send(command);
            logger_1.default.info(`File deleted successfully: ${key}`);
            return result;
        }
        catch (error) {
            logger_1.default.error(`Error deleting file from S3: ${key}`, error);
            throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async fileExists(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await s3Client.send(command);
            return true;
        }
        catch (error) {
            if (error.name === "NotFound" || error.name === "NoSuchKey") {
                return false;
            }
            logger_1.default.error(`Error checking file existence: ${key}`, error);
            throw new Error(`Failed to check file existence: ${error.message}`);
        }
    }
    async getFileMetadata(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const result = await s3Client.send(command);
            return result;
        }
        catch (error) {
            logger_1.default.error(`Error getting file metadata: ${key}`, error);
            throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getFile(key) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            logger_1.default.info(`Getting file from S3: ${key}`);
            const result = await s3Client.send(command);
            if (!result.Body) {
                logger_1.default.warn(`File body is empty: ${key}`);
                return null;
            }
            const chunks = [];
            const stream = result.Body;
            return new Promise((resolve, reject) => {
                stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                stream.on("error", (error) => {
                    logger_1.default.error(`Error reading file stream: ${key}`, error);
                    reject(error);
                });
                stream.on("end", () => {
                    const buffer = Buffer.concat(chunks);
                    logger_1.default.info(`File retrieved successfully: ${key} (${buffer.length} bytes)`);
                    resolve(buffer);
                });
            });
        }
        catch (error) {
            logger_1.default.error(`Error getting file from S3: ${key}`, error);
            return null;
        }
    }
    async copyFile(sourceKey, destinationKey) {
        try {
            const command = new client_s3_1.CopyObjectCommand({
                Bucket: this.bucket,
                CopySource: `${this.bucket}/${sourceKey}`,
                Key: destinationKey,
            });
            logger_1.default.info(`Copying file in S3: ${sourceKey} -> ${destinationKey}`);
            const result = await s3Client.send(command);
            logger_1.default.info(`File copied successfully: ${sourceKey} -> ${destinationKey}`);
            return result;
        }
        catch (error) {
            logger_1.default.error(`Error copying file in S3: ${sourceKey} -> ${destinationKey}`, error);
            throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async listFiles(prefix, maxKeys = 1000) {
        try {
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
                MaxKeys: maxKeys,
            });
            const result = await s3Client.send(command);
            return result.Contents || [];
        }
        catch (error) {
            logger_1.default.error(`Error listing files with prefix: ${prefix}`, error);
            throw new Error(`Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async uploadLargeFile(fileStream, s3Key, contentType, originalName) {
        try {
            const upload = new lib_storage_1.Upload({
                client: s3Client,
                params: {
                    Bucket: this.bucket,
                    Key: s3Key,
                    Body: fileStream,
                    ContentType: contentType,
                    ContentDisposition: `attachment; filename="${originalName}"`,
                },
                queueSize: 4,
                partSize: 1024 * 1024 * 5,
            });
            await upload.done();
            return {
                Bucket: this.bucket,
                Key: s3Key,
                Location: `https://${this.bucket}.s3.${index_1.config.aws.region}.amazonaws.com/${s3Key}`,
            };
        }
        catch (error) {
            logger_1.default.error("S3 large file upload error:", error);
            throw new Error(`Failed to upload large file to S3: ${error}`);
        }
    }
}
exports.S3Service = S3Service;
exports.s3Service = new S3Service();
const testS3Connection = async () => {
    try {
        const command = new client_s3_1.HeadObjectCommand({
            Bucket: index_1.config.aws.s3Bucket,
            Key: "test-connection",
        });
        try {
            await s3Client.send(command);
        }
        catch (error) {
            if (error.name === "NotFound" || error.name === "NoSuchKey") {
                logger_1.default.info("S3 connection successful - bucket accessible");
                return true;
            }
            throw error;
        }
        logger_1.default.info("S3 connection successful");
        return true;
    }
    catch (error) {
        logger_1.default.error("S3 connection failed:", error);
        return false;
    }
};
exports.testS3Connection = testS3Connection;
const isValidFileType = (mimeType) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    return allowedTypes.includes(mimeType);
};
exports.isValidFileType = isValidFileType;
const getFileExtensionFromMimeType = (mimeType) => {
    const mimeToExt = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    };
    return mimeToExt[mimeType] || "";
};
exports.getFileExtensionFromMimeType = getFileExtensionFromMimeType;
exports.default = exports.s3Service;
//# sourceMappingURL=s3.js.map
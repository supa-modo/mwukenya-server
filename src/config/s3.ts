import AWS from "aws-sdk";
import { config } from "./index";
import logger from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

// Configure AWS SDK
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

// Create S3 instance
const s3 = new AWS.S3({
  signatureVersion: "v4",
  params: {
    Bucket: config.aws.s3Bucket,
  },
});

// S3 Service class
export class S3Service {
  private bucket: string;

  constructor() {
    this.bucket = config.aws.s3Bucket;
  }

  /**
   * Generate a unique S3 key for a file
   * @param userId - User ID uploading the file
   * @param fileExtension - File extension (e.g., .pdf, .jpg)
   * @param prefix - Optional prefix for organization
   * @returns Unique S3 key
   */
  generateS3Key(
    userId: string,
    fileExtension: string,
    prefix = "documents"
  ): string {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const uuid = uuidv4();
    return `${prefix}/${userId}/${timestamp}/${uuid}${fileExtension}`;
  }

  /**
   * Upload a file to S3
   * @param buffer - File buffer
   * @param key - S3 key (path)
   * @param mimeType - MIME type of the file
   * @param fileName - Original filename for metadata
   * @returns Promise with upload result
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
    fileName: string
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    try {
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          originalFileName: fileName,
          uploadedAt: new Date().toISOString(),
        },
        ServerSideEncryption: "AES256",
      };

      logger.info(`Uploading file to S3: ${key}`);
      const result = await s3.upload(uploadParams).promise();
      logger.info(`File uploaded successfully: ${key}`);

      return result;
    } catch (error) {
      logger.error(`Error uploading file to S3: ${key}`, error);
      throw new Error(
        `Failed to upload file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate a pre-signed URL for downloading/viewing a file
   * @param key - S3 key (path)
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Pre-signed URL
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      };

      const url = await s3.getSignedUrlPromise("getObject", params);
      logger.debug(`Generated signed URL for: ${key}`);

      return url;
    } catch (error) {
      logger.error(`Error generating signed URL for: ${key}`, error);
      throw new Error(
        `Failed to generate signed URL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a file from S3
   * @param key - S3 key (path)
   * @returns Promise with deletion result
   */
  async deleteFile(key: string): Promise<AWS.S3.DeleteObjectOutput> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
      };

      logger.info(`Deleting file from S3: ${key}`);
      const result = await s3.deleteObject(params).promise();
      logger.info(`File deleted successfully: ${key}`);

      return result;
    } catch (error) {
      logger.error(`Error deleting file from S3: ${key}`, error);
      throw new Error(
        `Failed to delete file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if a file exists in S3
   * @param key - S3 key (path)
   * @returns Boolean indicating if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await s3
        .headObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      return true;
    } catch (error: any) {
      if (error.code === "NotFound" || error.code === "NoSuchKey") {
        return false;
      }

      logger.error(`Error checking file existence: ${key}`, error);
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  /**
   * Get file metadata from S3
   * @param key - S3 key (path)
   * @returns File metadata
   */
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const result = await s3
        .headObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();

      return result;
    } catch (error) {
      logger.error(`Error getting file metadata: ${key}`, error);
      throw new Error(
        `Failed to get file metadata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Copy a file within S3
   * @param sourceKey - Source S3 key
   * @param destinationKey - Destination S3 key
   * @returns Copy result
   */
  async copyFile(
    sourceKey: string,
    destinationKey: string
  ): Promise<AWS.S3.CopyObjectOutput> {
    try {
      const copyParams = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      };

      logger.info(`Copying file in S3: ${sourceKey} -> ${destinationKey}`);
      const result = await s3.copyObject(copyParams).promise();
      logger.info(
        `File copied successfully: ${sourceKey} -> ${destinationKey}`
      );

      return result;
    } catch (error) {
      logger.error(
        `Error copying file in S3: ${sourceKey} -> ${destinationKey}`,
        error
      );
      throw new Error(
        `Failed to copy file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * List files in a specific prefix (folder)
   * @param prefix - S3 prefix to list
   * @param maxKeys - Maximum number of keys to return
   * @returns List of S3 objects
   */
  async listFiles(prefix: string, maxKeys = 1000): Promise<AWS.S3.Object[]> {
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      };

      const result = await s3.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      logger.error(`Error listing files with prefix: ${prefix}`, error);
      throw new Error(
        `Failed to list files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

// Create and export a singleton instance
export const s3Service = new S3Service();

// Test S3 connection
export const testS3Connection = async (): Promise<boolean> => {
  try {
    await s3.headBucket({ Bucket: config.aws.s3Bucket }).promise();
    logger.info("S3 connection successful");
    return true;
  } catch (error) {
    logger.error("S3 connection failed:", error);
    return false;
  }
};

// Utility function to validate file types
export const isValidFileType = (mimeType: string): boolean => {
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

// Utility function to get file extension from MIME type
export const getFileExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
  };

  return mimeToExt[mimeType] || "";
};

export default s3Service;

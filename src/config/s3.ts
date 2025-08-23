import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { config } from "./index";
import logger from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

// Create S3 client with AWS SDK v3
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
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
  ): Promise<{ Bucket: string; Key: string; Location: string }> {
    try {
      const upload = new Upload({
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
        queueSize: 4, // Number of concurrent uploads
        partSize: 1024 * 1024 * 5, // 5MB chunks
      });

      logger.info(`Uploading file to S3: ${key}`);
      const result = await upload.done();
      logger.info(`File uploaded successfully: ${key}`);

      return {
        Bucket: this.bucket,
        Key: key,
        Location: `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`,
      };
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
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
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
  async deleteFile(key: string): Promise<any> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      logger.info(`Deleting file from S3: ${key}`);
      const result = await s3Client.send(command);
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
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.name === "NoSuchKey") {
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
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const result = await s3Client.send(command);
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
   * @param sourceKey - Source file key
   * @param destinationKey - Destination file key
   * @returns Promise with copy result
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<any> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      logger.info(`Copying file in S3: ${sourceKey} -> ${destinationKey}`);
      const result = await s3Client.send(command);
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
   * List files in S3 with a given prefix
   * @param prefix - Prefix to filter files
   * @param maxKeys - Maximum number of keys to return
   * @returns List of S3 objects
   */
  async listFiles(prefix: string, maxKeys = 1000): Promise<any[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const result = await s3Client.send(command);
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

  /**
   * Upload large files using streaming
   */
  async uploadLargeFile(
    fileStream: Readable,
    s3Key: string,
    contentType: string,
    originalName: string
  ): Promise<{ Bucket: string; Key: string; Location: string }> {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.bucket,
          Key: s3Key,
          Body: fileStream,
          ContentType: contentType,
          ContentDisposition: `attachment; filename="${originalName}"`,
        },
        queueSize: 4, // Number of concurrent uploads
        partSize: 1024 * 1024 * 5, // 5MB chunks
      });

      await upload.done();

      return {
        Bucket: this.bucket,
        Key: s3Key,
        Location: `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`,
      };
    } catch (error) {
      logger.error("S3 large file upload error:", error);
      throw new Error(`Failed to upload large file to S3: ${error}`);
    }
  }
}

// Create and export a singleton instance
export const s3Service = new S3Service();

// Test S3 connection
export const testS3Connection = async (): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: "test-connection",
    });

    try {
      await s3Client.send(command);
    } catch (error: any) {
      if (error.name === "NotFound" || error.name === "NoSuchKey") {
        // This is expected for a test key, means bucket is accessible
        logger.info("S3 connection successful - bucket accessible");
        return true;
      }
      throw error;
    }

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

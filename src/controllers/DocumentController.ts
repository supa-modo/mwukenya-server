import { Request, Response } from "express";
import multer from "multer";
import { Document } from "../models";
import {
  s3Service,
  isValidFileType,
  getFileExtensionFromMimeType,
} from "../config/s3";
import {
  AuthenticatedRequest,
  ApiResponse,
  DocumentStatus,
  DocumentType,
} from "../types";
import logger from "../utils/logger";

// Configure multer for memory storage (files will be handled in memory and uploaded to S3)
const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (isValidFileType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX`
      )
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

class DocumentController {
  /**
   * Upload a new document
   */
  public async uploadDocument(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { name, type, description } = req.body;
      const file = req.file;
      const userId = req.user!.id;

      // Validate required fields
      if (!name || !type || !file) {
        res.status(400).json({
          success: false,
          error: {
            code: "DOC_001",
            message:
              "Missing required fields: name, type, and file are required",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      // Validate document type
      if (!Object.values(DocumentType).includes(type as DocumentType)) {
        res.status(400).json({
          success: false,
          error: {
            code: "DOC_002",
            message: "Invalid document type",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      // Generate S3 key
      const fileExtension = getFileExtensionFromMimeType(file.mimetype);
      const s3Key = s3Service.generateS3Key(userId, fileExtension, "documents");

      // Upload file to S3
      const uploadResult = await s3Service.uploadFile(
        file.buffer,
        s3Key,
        file.mimetype,
        file.originalname
      );

      // Create document record in database
      const document = await Document.create({
        userId,
        entityType: "user", // Documents uploaded by users are for users
        entityId: userId, // The entity ID is the same as the user ID
        name,
        type: type as DocumentType,
        description,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        s3Key,
        s3Bucket: uploadResult.Bucket,
        url: uploadResult.Location,
        status: DocumentStatus.PENDING,
      });

      logger.info(
        `Document uploaded successfully for user ${userId}: ${document.id}`
      );

      res.status(201).json({
        success: true,
        data: document.toJSON(),
        message: "Document uploaded successfully",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error uploading document:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_003",
          message: "Failed to upload document",
          details: errorMessage,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get all documents for the authenticated user
   */
  public async getUserDocuments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { type } = req.query;

      let documents;
      if (type && Object.values(DocumentType).includes(type as DocumentType)) {
        documents = await Document.findByUserIdAndType(
          userId,
          type as DocumentType
        );
      } else {
        documents = await Document.findByUserId(userId);
      }

      res.status(200).json({
        success: true,
        data: documents.map((doc) => doc.toJSON()),
        message: "Documents retrieved successfully",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error retrieving user documents:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_004",
          message: "Failed to retrieve documents",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get a specific document by ID
   */
  public async getDocumentById(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const userId = req.user!.id;

      const document = await Document.findOne({
        where: {
          id: documentId,
          userId, // Ensure user can only access their own documents
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
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: document.toJSON(),
        message: "Document retrieved successfully",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error retrieving document:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_006",
          message: "Failed to retrieve document",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Generate a signed URL for viewing/downloading a document
   */
  public async getDocumentUrl(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const userId = req.user!.id;

      const document = await Document.findOne({
        where: {
          id: documentId,
          userId, // Ensure user can only access their own documents
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
        } as ApiResponse);
        return;
      }

      // Generate signed URL (valid for 1 hour)
      const signedUrl = await s3Service.getSignedUrl(document.s3Key, 3600);

      res.status(200).json({
        success: true,
        data: {
          url: signedUrl,
          expiresIn: 3600, // seconds
        },
        message: "Document URL generated successfully",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error generating document URL:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_007",
          message: "Failed to generate document URL",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Delete a document
   */
  public async deleteDocument(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const userId = req.user!.id;

      const document = await Document.findOne({
        where: {
          id: documentId,
          userId, // Ensure user can only delete their own documents
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
        } as ApiResponse);
        return;
      }

      // Delete file from S3
      try {
        await s3Service.deleteFile(document.s3Key);
      } catch (s3Error) {
        logger.warn(
          `Failed to delete file from S3: ${document.s3Key}`,
          s3Error
        );
        // Continue with database deletion even if S3 deletion fails
      }

      // Delete record from database
      await document.destroy();

      logger.info(`Document deleted successfully: ${documentId}`);

      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error deleting document:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_008",
          message: "Failed to delete document",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Update document metadata (name, description)
   */
  public async updateDocument(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { name, description } = req.body;
      const userId = req.user!.id;

      const document = await Document.findOne({
        where: {
          id: documentId,
          userId, // Ensure user can only update their own documents
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
        } as ApiResponse);
        return;
      }

      // Update document metadata
      if (name) document.name = name;
      if (description !== undefined) document.description = description;

      await document.save();

      logger.info(`Document updated successfully: ${documentId}`);

      res.status(200).json({
        success: true,
        data: document.toJSON(),
        message: "Document updated successfully",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error updating document:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_009",
          message: "Failed to update document",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Admin: Get all pending documents for verification
   */
  public async getPendingDocuments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const documents = await Document.findPendingDocuments();

      res.status(200).json({
        success: true,
        data: documents.map((doc) => doc.toJSON()),
        message: "Pending documents retrieved successfully",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error retrieving pending documents:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_010",
          message: "Failed to retrieve pending documents",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Admin: Verify or reject a document
   */
  public async verifyDocument(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { status, rejectionReason } = req.body;
      const verifierId = req.user!.id;

      if (!Object.values(DocumentStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: "DOC_011",
            message: "Invalid document status",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      if (status === DocumentStatus.REJECTED && !rejectionReason) {
        res.status(400).json({
          success: false,
          error: {
            code: "DOC_012",
            message: "Rejection reason is required when rejecting a document",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const document = await Document.findByPk(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: {
            code: "DOC_005",
            message: "Document not found",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      // Update document status
      if (status === DocumentStatus.VERIFIED) {
        document.markAsVerified(verifierId);
      } else if (status === DocumentStatus.REJECTED) {
        document.markAsRejected(rejectionReason);
      }

      await document.save();

      logger.info(
        `Document ${status} successfully: ${documentId} by ${verifierId}`
      );

      res.status(200).json({
        success: true,
        data: document.toJSON(),
        message: `Document ${status} successfully`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error("Error verifying document:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "DOC_013",
          message: "Failed to verify document",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
}

export default new DocumentController();

import { Router } from "express";
import DocumentController, { upload } from "../controllers/DocumentController";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../types";

const router = Router();

// Apply authentication to all document routes
router.use(authenticate);

/**
 * @route POST /api/documents/upload
 * @desc Upload a new document
 * @access Private
 */
router.post(
  "/upload",
  upload.single("file"),
  DocumentController.uploadDocument
);

/**
 * @route GET /api/documents
 * @desc Get all documents for the authenticated user
 * @access Private
 * @query type - Optional document type filter
 */
router.get("/", DocumentController.getUserDocuments);

/**
 * @route GET /api/documents/:documentId
 * @desc Get a specific document by ID
 * @access Private
 */
router.get("/:documentId", DocumentController.getDocumentById);

/**
 * @route GET /api/documents/:documentId/url
 * @desc Generate a signed URL for viewing/downloading a document
 * @access Private
 */
router.get("/:documentId/url", DocumentController.getDocumentUrl);

/**
 * @route PUT /api/documents/:documentId
 * @desc Update document metadata
 * @access Private
 */
router.put("/:documentId", DocumentController.updateDocument);

/**
 * @route DELETE /api/documents/:documentId
 * @desc Delete a document
 * @access Private
 */
router.delete("/:documentId", DocumentController.deleteDocument);

// Admin-only routes
/**
 * @route GET /api/documents/admin/pending
 * @desc Get all pending documents for verification
 * @access Admin only
 */
router.get(
  "/admin/pending",
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  DocumentController.getPendingDocuments
);

/**
 * @route PUT /api/documents/admin/:documentId/verify
 * @desc Verify or reject a document
 * @access Admin only
 */
router.put(
  "/admin/:documentId/verify",
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  DocumentController.verifyDocument
);

/**
 * @route GET /api/documents/admin/:documentId/url
 * @desc Generate a signed URL for viewing/downloading any document (admin access)
 * @access Admin only
 */
router.get(
  "/admin/:documentId/url",
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  DocumentController.getAdminDocumentUrl
);

/**
 * @route GET /api/documents/admin/:documentId/serve
 * @desc Serve document directly from server (bypasses CORS)
 * @access Admin only
 */
router.get(
  "/admin/:documentId/serve",
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]),
  DocumentController.serveDocument
);

export default router;

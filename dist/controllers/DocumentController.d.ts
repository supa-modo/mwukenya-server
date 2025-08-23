import { Response } from "express";
import multer from "multer";
import { AuthenticatedRequest } from "../types";
export declare const upload: multer.Multer;
declare class DocumentController {
    uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void>;
    getUserDocuments(req: AuthenticatedRequest, res: Response): Promise<void>;
    getDocumentById(req: AuthenticatedRequest, res: Response): Promise<void>;
    getDocumentUrl(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateDocument(req: AuthenticatedRequest, res: Response): Promise<void>;
    getPendingDocuments(req: AuthenticatedRequest, res: Response): Promise<void>;
    verifyDocument(req: AuthenticatedRequest, res: Response): Promise<void>;
}
declare const _default: DocumentController;
export default _default;
//# sourceMappingURL=DocumentController.d.ts.map
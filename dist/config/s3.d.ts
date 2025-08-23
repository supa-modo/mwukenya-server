import { Readable } from "stream";
export declare class S3Service {
    private bucket;
    constructor();
    generateS3Key(userId: string, fileExtension: string, prefix?: string): string;
    uploadFile(buffer: Buffer, key: string, mimeType: string, fileName: string): Promise<{
        Bucket: string;
        Key: string;
        Location: string;
    }>;
    getSignedUrl(key: string, expiresIn?: number): Promise<string>;
    deleteFile(key: string): Promise<any>;
    fileExists(key: string): Promise<boolean>;
    getFileMetadata(key: string): Promise<any>;
    copyFile(sourceKey: string, destinationKey: string): Promise<any>;
    listFiles(prefix: string, maxKeys?: number): Promise<any[]>;
    uploadLargeFile(fileStream: Readable, s3Key: string, contentType: string, originalName: string): Promise<{
        Bucket: string;
        Key: string;
        Location: string;
    }>;
}
export declare const s3Service: S3Service;
export declare const testS3Connection: () => Promise<boolean>;
export declare const isValidFileType: (mimeType: string) => boolean;
export declare const getFileExtensionFromMimeType: (mimeType: string) => string;
export default s3Service;
//# sourceMappingURL=s3.d.ts.map
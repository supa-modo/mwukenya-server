import winston from "winston";
declare const logger: winston.Logger;
export declare const auditLogger: (action: string, userId?: string, details?: any) => void;
export declare const securityLogger: (event: string, details: any, level?: "warn" | "error") => void;
export declare const performanceLogger: (operation: string, duration: number, details?: any) => void;
export declare const apiLogger: (method: string, url: string, statusCode: number, duration: number, userId?: string, error?: any) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map
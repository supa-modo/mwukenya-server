type EmailMode = "smtp" | "zoho";
declare class EmailService {
    private smtpTransporter;
    private zohoConfig;
    private currentMode;
    private isConfigured;
    private zohoAccessToken;
    private zohoTokenExpiry;
    constructor();
    private initializeService;
    private initializeSmtpService;
    private initializeZohoService;
    private getZohoAccessToken;
    private sendEmailViaZoho;
    private sendEmailViaSmtp;
    sendPasswordResetEmail(email: string, resetToken: string, firstName: string): Promise<boolean>;
    sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean>;
    private generatePasswordResetEmailTemplate;
    isEmailConfigured(): boolean;
    getCurrentMode(): EmailMode;
    getServiceStatus(): {
        configured: boolean;
        mode: EmailMode;
        smtpConfigured: boolean;
        zohoConfigured: boolean;
    };
}
export declare const emailService: EmailService;
export default emailService;
//# sourceMappingURL=emailService.d.ts.map
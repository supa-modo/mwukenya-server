type EmailMode = "smtp" | "zeptomail";
declare class EmailService {
    private smtpTransporter;
    private zeptoMailTransporter;
    private currentMode;
    private isConfigured;
    private zeptoMailConfig;
    constructor();
    private initializeService;
    private initializeSmtpService;
    private initializeZeptoMailService;
    private sendEmailViaZeptoMail;
    private sendEmailViaSmtp;
    sendPasswordResetEmail(email: string, resetToken: string, firstName: string): Promise<boolean>;
    sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean>;
    sendWelcomeEmail(email: string, firstName: string, lastName: string, membershipNumber: string): Promise<boolean>;
    private generatePasswordResetEmailTemplate;
    private generateWelcomeEmailTemplate;
    isEmailConfigured(): boolean;
    getCurrentMode(): EmailMode;
    getServiceStatus(): {
        configured: boolean;
        mode: EmailMode;
        smtpConfigured: boolean;
        zeptoMailConfigured: boolean;
    };
}
export declare const emailService: EmailService;
export default emailService;
//# sourceMappingURL=emailService.d.ts.map
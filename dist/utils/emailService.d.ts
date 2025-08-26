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
    sendWelcomeEmail(email: string, firstName: string, lastName: string, membershipNumber: string, delegateInfo?: {
        delegateName?: string;
        delegateContact?: string;
        delegateCode?: string;
    }): Promise<boolean>;
    sendContactFormEmail(formData: {
        name: string;
        email: string;
        phone?: string;
        subject: string;
        message: string;
        category: string;
    }): Promise<boolean>;
    private generatePasswordResetEmailTemplate;
    private generateWelcomeEmailTemplate;
    private generateContactFormEmailTemplate;
    isEmailConfigured(): boolean;
    getCurrentMode(): EmailMode;
    getServiceStatus(): {
        configured: boolean;
        mode: EmailMode;
        smtpConfigured: boolean;
        zeptoMailConfigured: boolean;
        environment: string;
        frontendUrl: string;
    };
    testEmailSending(): Promise<{
        success: boolean;
        mode: EmailMode;
        error?: string;
        details?: any;
    }>;
}
export declare const emailService: EmailService;
export default emailService;
//# sourceMappingURL=emailService.d.ts.map
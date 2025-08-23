declare class SMSService {
    private isConfigured;
    private apiKey;
    private username;
    constructor();
    sendPasswordResetSMS(phoneNumber: string, resetCode: string, firstName: string): Promise<boolean>;
    isSMSConfigured(): boolean;
    formatPhoneNumber(phoneNumber: string): string;
}
export declare const smsService: SMSService;
export default smsService;
//# sourceMappingURL=smsService.d.ts.map
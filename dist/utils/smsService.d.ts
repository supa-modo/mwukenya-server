import { UserRole } from "../types";
type SmsMode = "disabled" | "sandbox" | "production";
declare class SMSService {
    private isConfigured;
    private currentMode;
    private africasTalkingConfig;
    constructor();
    private initializeService;
    private initializeAfricasTalkingService;
    sendRegistrationSuccessSMS(phoneNumber: string, userData: {
        firstName: string;
        lastName: string;
        idNumber: string;
        membershipNumber: string;
        sacco: string;
        delegateName: string;
        delegateCode: string;
        role: UserRole;
    }): Promise<boolean>;
    sendPasswordResetSMS(phoneNumber: string, resetCode: string, firstName: string): Promise<boolean>;
    sendWelcomeSMS(phoneNumber: string, userData: {
        firstName: string;
        lastName: string;
        membershipNumber: string;
        sacco: string;
    }): Promise<boolean>;
    sendCustomSMS(phoneNumber: string, message: string, variables?: Record<string, string | number>): Promise<boolean>;
    private sendSMS;
    private sendViaAfricasTalking;
    private processTemplate;
    private logSMS;
    formatPhoneNumber(phoneNumber: string): string;
    isSMSConfigured(): boolean;
    getCurrentMode(): SmsMode;
    getServiceStatus(): {
        configured: boolean;
        mode: SmsMode;
        africasTalkingConfigured: boolean;
    };
    testConnectivity(): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
}
export declare const smsService: SMSService;
export default smsService;
//# sourceMappingURL=smsService.d.ts.map
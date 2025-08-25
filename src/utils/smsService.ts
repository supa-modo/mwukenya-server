import logger from "./logger";
import { UserRole } from "../types";

// SMS service modes
type SmsMode = "disabled" | "sandbox" | "production";

// Africa's Talking configuration interface
interface AfricasTalkingConfig {
  apiKey: string;
  username: string;
  senderId: string;
}

// SMS message template interface
interface SmsTemplate {
  type: "registration_success" | "password_reset" | "welcome" | "custom";
  message: string;
  variables?: Record<string, string | number>;
}

class SMSService {
  private isConfigured = false;
  private currentMode: SmsMode = "disabled";
  private africasTalkingConfig: AfricasTalkingConfig | null = null;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    const smsMode = (
      process.env.SMS_MODE || "disabled"
    ).toLowerCase() as SmsMode;

    this.currentMode = smsMode;

    if (smsMode === "production" || smsMode === "sandbox") {
      this.initializeAfricasTalkingService(smsMode);
    } else {
      logger.info(
        "SMS service is disabled - SMS content will be logged to console"
      );
    }
  }

  private initializeAfricasTalkingService(mode: SmsMode) {
    try {
      const apiKey =
        mode === "sandbox"
          ? process.env.AFRICAS_TALKING_SANDBOX_API_KEY
          : process.env.AFRICAS_TALKING_API_KEY;

      const username =
        mode === "sandbox" ? "sandbox" : process.env.AFRICAS_TALKING_USERNAME;

      const senderId =
        process.env.AFRICAS_TALKING_SENDER_ID || "MATATU_WORKERS_UNION";

      if (!apiKey || !username) {
        logger.warn(
          `Africa's Talking SMS service not configured - missing API key or username for ${mode} mode`
        );
        this.currentMode = "disabled";
        return;
      }

      this.africasTalkingConfig = {
        apiKey,
        username,
        senderId,
      };

      this.isConfigured = true;
      logger.info(
        `SMS service initialized in ${mode.toUpperCase()} mode with Africa's Talking`,
        {
          username,
          senderId,
        }
      );
    } catch (error) {
      logger.error("Failed to initialize SMS service:", error);
      this.currentMode = "disabled";
    }
  }

  /**
   * Send registration success SMS
   */
  public async sendRegistrationSuccessSMS(
    phoneNumber: string,
    userData: {
      firstName: string;
      lastName: string;
      idNumber: string;
      membershipNumber: string;
      sacco: string;
      delegateName: string;
      delegateCode: string;
      role: UserRole;
    }
  ): Promise<boolean> {
    const template: SmsTemplate = {
      type: "registration_success",
      message: `Hello ${userData.firstName} ${userData.lastName}! Welcome to MWU Kenya. Your registration is successful. ID: ${userData.idNumber}, Membership: ${userData.membershipNumber}, SACCO: ${userData.sacco}, Delegate: ${userData.delegateName} (${userData.delegateCode}). You will receive further instructions via SMS.`,
      variables: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        idNumber: userData.idNumber,
        membershipNumber: userData.membershipNumber,
        sacco: userData.sacco,
        delegateName: userData.delegateName,
        delegateCode: userData.delegateCode,
        role: userData.role,
      },
    };

    return this.sendSMS(phoneNumber, template);
  }

  /**
   * Send password reset SMS
   */
  public async sendPasswordResetSMS(
    phoneNumber: string,
    resetCode: string,
    firstName: string
  ): Promise<boolean> {
    const template: SmsTemplate = {
      type: "password_reset",
      message: `Hello ${firstName}, your MWU Kenya password reset code is: ${resetCode}. This code expires in 10 minutes. If you didn't request this, please ignore.`,
      variables: {
        firstName,
        resetCode,
      },
    };

    return this.sendSMS(phoneNumber, template);
  }

  /**
   * Send welcome SMS for new members
   */
  public async sendWelcomeSMS(
    phoneNumber: string,
    userData: {
      firstName: string;
      lastName: string;
      membershipNumber: string;
      sacco: string;
    }
  ): Promise<boolean> {
    const template: SmsTemplate = {
      type: "welcome",
      message: `Welcome ${userData.firstName} ${userData.lastName} to MWU Kenya! Your membership number is ${userData.membershipNumber}. You're registered under ${userData.sacco}. We'll keep you updated on health insurance benefits and union activities.`,
      variables: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        membershipNumber: userData.membershipNumber,
        sacco: userData.sacco,
      },
    };

    return this.sendSMS(phoneNumber, template);
  }

  /**
   * Send custom SMS message
   */
  public async sendCustomSMS(
    phoneNumber: string,
    message: string,
    variables?: Record<string, string | number>
  ): Promise<boolean> {
    const template: SmsTemplate = {
      type: "custom",
      message,
      variables,
    };

    return this.sendSMS(phoneNumber, template);
  }

  /**
   * Main SMS sending method
   */
  private async sendSMS(
    phoneNumber: string,
    template: SmsTemplate
  ): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const message = this.processTemplate(template);

    if (this.currentMode === "disabled") {
      return this.logSMS(formattedPhone, template);
    }

    if (
      (this.currentMode === "production" || this.currentMode === "sandbox") &&
      this.isConfigured
    ) {
      return this.sendViaAfricasTalking(formattedPhone, message);
    }

    // Fallback to logging
    return this.logSMS(formattedPhone, template);
  }

  /**
   * Send SMS via Africa's Talking API
   */
  private async sendViaAfricasTalking(
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    if (!this.africasTalkingConfig) {
      logger.error("Africa's Talking configuration not available");
      return false;
    }

    try {
      const apiUrl = "https://api.africastalking.com/version1/messaging";

      const requestBody: any = {
        username: this.africasTalkingConfig.username,
        to: phoneNumber,
        message: message,
      };

      // Only add sender ID if it's configured and not empty
      if (
        this.africasTalkingConfig.senderId &&
        this.africasTalkingConfig.senderId.trim() !== ""
      ) {
        requestBody.from = this.africasTalkingConfig.senderId;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: this.africasTalkingConfig.apiKey,
        },
        body: new URLSearchParams(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Africa's Talking API error: ${response.status} ${response.statusText} - ${errorText}`
        );
        return false;
      }

      const responseText = await response.text();
      let result: any;

      // Handle XML response from Africa's Talking
      if (responseText.includes("<AfricasTalkingResponse>")) {
        // Parse XML response
        const messageMatch = responseText.match(/<Message>(.*?)<\/Message>/);
        const message = messageMatch ? messageMatch[1] : "Unknown response";

        if (message.includes("Success") || message.includes("Sent to")) {
          logger.info(`SMS sent successfully to ${phoneNumber}`, {
            response: message,
            mode: this.currentMode,
          });
          return true;
        } else {
          logger.error(`SMS delivery failed: ${message}`);
          return false;
        }
      } else {
        // Try to parse as JSON
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          logger.error(`Failed to parse response: ${responseText}`);
          return false;
        }
      }

      // Check if SMS was accepted (for JSON responses)
      if (result && result.SMSMessageData && result.SMSMessageData.Recipients) {
        const recipient = result.SMSMessageData.Recipients[0];
        if (recipient.status === "Success") {
          logger.info(`SMS sent successfully to ${phoneNumber}`, {
            messageId: recipient.messageId,
            cost: recipient.cost,
            mode: this.currentMode,
          });
          return true;
        } else {
          logger.error(`SMS delivery failed: ${recipient.status}`);
          return false;
        }
      }

      return false;
    } catch (error) {
      logger.error(
        `Failed to send SMS via Africa's Talking to ${phoneNumber}:`,
        error
      );
      return false;
    }
  }

  /**
   * Process SMS template with variables
   */
  private processTemplate(template: SmsTemplate): string {
    let message = template.message;

    if (template.variables) {
      Object.entries(template.variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        message = message.replace(new RegExp(placeholder, "g"), String(value));
      });
    }

    return message;
  }

  /**
   * Log SMS content to console (disabled mode)
   */
  private logSMS(phoneNumber: string, template: SmsTemplate): boolean {
    const logMessage = [
      "=".repeat(80),
      "📱 SMS CONTENT (DISABLED MODE)",
      "=".repeat(80),
      `To: ${phoneNumber}`,
      `Template: ${template.type}`,
      `Message: ${template.message}`,
      `Variables: ${JSON.stringify(template.variables, null, 2)}`,
      `⚠️  This is a logged SMS - no actual message was sent`,
      "=".repeat(80),
    ].join("\n");

    // Log to both console and logger for visibility
    console.log(logMessage);
    logger.info(logMessage);

    return true;
  }

  /**
   * Format phone number to international format
   */
  public formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Handle Kenyan numbers
    if (cleaned.startsWith("0")) {
      // Convert 07xx or 01xx format to +254xxx
      return `+254${cleaned.substring(1)}`;
    } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
      // Handle numbers without country code or leading zero (7xx or 1xx)
      return `+254${cleaned}`;
    } else if (cleaned.startsWith("254")) {
      // Already in international format, add + prefix
      return `+${cleaned}`;
    }

    return phoneNumber; // Return original if none of the conditions match
  }

  /**
   * Check if SMS service is configured
   */
  public isSMSConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get current SMS service mode
   */
  public getCurrentMode(): SmsMode {
    return this.currentMode;
  }

  /**
   * Get service status information
   */
  public getServiceStatus(): {
    configured: boolean;
    mode: SmsMode;
    africasTalkingConfigured: boolean;
  } {
    return {
      configured: this.isConfigured,
      mode: this.currentMode,
      africasTalkingConfigured: this.africasTalkingConfig !== null,
    };
  }

  /**
   * Test SMS service connectivity
   */
  public async testConnectivity(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (this.currentMode === "disabled") {
      return {
        success: true,
        message:
          "SMS service is in disabled mode - SMS content will be logged to console",
        details: {
          mode: this.currentMode,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (!this.isConfigured) {
      return {
        success: false,
        message: "SMS service not configured",
      };
    }

    try {
      // Test with a mock phone number
      const testPhone = "+254700000000";
      const testMessage =
        "MWU Kenya SMS Service Test - " + new Date().toISOString();

      const success = await this.sendCustomSMS(testPhone, testMessage);

      return {
        success,
        message: success
          ? "SMS service test successful"
          : "SMS service test failed",
        details: {
          mode: this.currentMode,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "SMS service test failed",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          mode: this.currentMode,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

export const smsService = new SMSService();
export default smsService;

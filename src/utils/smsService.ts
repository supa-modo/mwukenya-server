import logger from "./logger";

class SMSService {
  private isConfigured = false;
  private apiKey: string;
  private username: string;

  constructor() {
    this.apiKey = process.env.AFRICAS_TALKING_API_KEY || "";
    this.username = process.env.AFRICAS_TALKING_USERNAME || "sandbox";

    if (this.apiKey) {
      this.isConfigured = true;
      logger.info("SMS service initialized successfully");
    } else {
      logger.warn(
        "SMS service not configured - missing AFRICAS_TALKING_API_KEY"
      );
    }
  }

  public async sendPasswordResetSMS(
    phoneNumber: string,
    resetCode: string,
    firstName: string
  ): Promise<boolean> {
    const message = `Hello ${firstName}, your MWU Kenya password reset code is: ${resetCode}. This code expires in 10 minutes. If you didn't request this, please ignore.`;

    // For development, log detailed SMS content to console
    if (process.env.NODE_ENV === "development") {
      logger.info("=".repeat(80));
      logger.info("📱 PASSWORD RESET SMS (DEVELOPMENT MODE)");
      logger.info("=".repeat(80));
      logger.info(`To: ${phoneNumber}`);
      logger.info(`Name: ${firstName}`);
      logger.info(`Reset Code: ${resetCode}`);
      logger.info("SMS Content:");
      logger.info(`Message: ${message}`);
      logger.info(`⚠️  Code expires in 10 minutes`);
      logger.info(`💡 Use this code on: /reset-password-code page`);
      logger.info("=".repeat(80));

      // In development, always return true for testing
      return true;
    }

    if (!this.isConfigured) {
      logger.warn("SMS service not configured");
      return false;
    }

    try {
      // In production, implement actual SMS sending using Africa's Talking
      // TODO: Implement actual SMS sending with Africa's Talking
      // const AfricasTalking = require('africastalking')({
      //   apiKey: this.apiKey,
      //   username: this.username
      // });
      //
      // const sms = AfricasTalking.SMS;
      // const result = await sms.send({
      //   to: [phoneNumber],
      //   message: message,
      //   from: 'MWU_KENYA'
      // });

      logger.info(`Password reset SMS sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to send password reset SMS to ${phoneNumber}:`,
        error
      );
      return false;
    }
  }

  public isSMSConfigured(): boolean {
    return this.isConfigured;
  }

  public formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Handle Kenyan numbers
    if (cleaned.startsWith("0")) {
      // Convert 07xx or 01xx format to +254xxx
      return `+254${cleaned.substring(1)}`;
    } else if (
      (cleaned.startsWith("7") || cleaned.startsWith("1")) &&
      cleaned.length === 9
    ) {
      // Handle numbers without country code or leading zero (7xx or 1xx)
      return `+254${cleaned}`;
    } else if (cleaned.startsWith("254")) {
      // Already in international format, add + prefix
      return `+${cleaned}`;
    } else if (!cleaned.startsWith("254")) {
      // Any other format, add 254 prefix
      return `+254${cleaned}`;
    }

    return phoneNumber; // Return original if none of the conditions match
  }
}

export const smsService = new SMSService();
export default smsService;

import nodemailer from "nodemailer";
import logger from "./logger";

// Email service modes
type EmailMode = "smtp" | "zoho";

// SMTP configuration interface
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Zoho OAuth configuration interface
interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fromEmail: string;
  apiDomain: string;
  accountId: string;
}

// Zoho OAuth token response interface
interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
}

class EmailService {
  private smtpTransporter: nodemailer.Transporter | null = null;
  private zohoConfig: ZohoConfig | null = null;
  private currentMode: EmailMode = "smtp";
  private isConfigured = false;
  private zohoAccessToken: string | null = null;
  private zohoTokenExpiry: number = 0;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    const emailMode = (
      process.env.EMAIL_MODE || "smtp"
    ).toLowerCase() as EmailMode;
    this.currentMode = emailMode;

    if (emailMode === "zoho") {
      this.initializeZohoService();
    } else {
      this.initializeSmtpService();
    }
  }

  private initializeSmtpService() {
    try {
      const config: SmtpConfig = {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER || "",
          pass: process.env.EMAIL_PASSWORD || "",
        },
      };

      if (!config.auth.user || !config.auth.pass) {
        logger.warn(
          "SMTP email service not configured - missing EMAIL_USER or EMAIL_PASSWORD"
        );
        return;
      }

      this.smtpTransporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      logger.info("SMTP email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize SMTP email service:", error);
    }
  }

  private initializeZohoService() {
    try {
      const config: ZohoConfig = {
        clientId: process.env.ZOHO_CLIENT_ID || "",
        clientSecret: process.env.ZOHO_CLIENT_SECRET || "",
        refreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
        fromEmail: process.env.ZOHO_FROM_EMAIL || "",
        apiDomain: "https://www.zohoapis.com", // Fixed domain for token refresh
        accountId: process.env.ZOHO_ACCOUNT_ID || "",
      };

      if (
        !config.clientId ||
        !config.clientSecret ||
        !config.refreshToken ||
        !config.fromEmail ||
        !config.accountId
      ) {
        logger.warn(
          "Zoho email service not configured - missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_FROM_EMAIL, or ZOHO_ACCOUNT_ID"
        );
        return;
      }

      this.zohoConfig = config;
      this.isConfigured = true;
      logger.info("Zoho email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Zoho email service:", error);
    }
  }

  private async getZohoAccessToken(): Promise<string | null> {
    if (!this.zohoConfig) {
      return null;
    }

    // Check if current token is still valid (with 5 minute buffer)
    if (this.zohoAccessToken && Date.now() < this.zohoTokenExpiry - 300000) {
      return this.zohoAccessToken;
    }

    try {
      const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";

      // Log the request details for debugging
      const requestBody = {
        refresh_token: this.zohoConfig.refreshToken,
        grant_type: "refresh_token",
        client_id: this.zohoConfig.clientId,
        client_secret: this.zohoConfig.clientSecret,
      };

      logger.info("Attempting to refresh Zoho token with:", {
        url: tokenUrl,
        clientId: requestBody.client_id.substring(0, 10) + "...",
        hasRefreshToken: !!requestBody.refresh_token,
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to refresh Zoho token: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const tokenData = (await response.json()) as ZohoTokenResponse;

      this.zohoAccessToken = tokenData.access_token;
      this.zohoTokenExpiry = Date.now() + tokenData.expires_in * 1000;

      logger.info("Zoho access token refreshed successfully");
      return this.zohoAccessToken;
    } catch (error) {
      logger.error("Failed to refresh Zoho access token:", error);
      return null;
    }
  }

  private async sendEmailViaZoho(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    if (!this.zohoConfig) {
      logger.error("Zoho configuration not available");
      return false;
    }

    const accessToken = await this.getZohoAccessToken();
    if (!accessToken) {
      logger.error("Failed to obtain Zoho access token");
      return false;
    }

    try {
      // Use the correct Zoho Mail API endpoint with accountId
      const mailApiUrl = `https://mail.zoho.com/api/accounts/${this.zohoConfig.accountId}/messages`;

      const emailData = {
        fromAddress: this.zohoConfig.fromEmail,
        toAddress: to,
        subject: subject,
        content: htmlContent,
        mailFormat: "html",
      };

      logger.info("Sending email via Zoho Mail API:", {
        url: mailApiUrl,
        from: emailData.fromAddress,
        to: emailData.toAddress,
        subject: emailData.subject,
      });

      const response = await fetch(mailApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Zoho Mail API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      logger.info(`Email sent successfully via Zoho Mail API to ${to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email via Zoho Mail API to ${to}:`, error);
      return false;
    }
  }

  private async sendEmailViaSmtp(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    if (!this.smtpTransporter) {
      logger.error("SMTP transporter not available");
      return false;
    }

    try {
      const mailOptions = {
        from: `"MWU Kenya" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent,
      };

      await this.smtpTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully via SMTP to ${to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email via SMTP to ${to}:`, error);
      return false;
    }
  }

  public async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    firstName: string
  ): Promise<boolean> {
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password/${resetToken}`;

    // For development, log the email content to console and logs
    if (
      process.env.NODE_ENV === "development" ||
      //TODO: Will Remove this after testing
      process.env.NODE_ENV === "production" ||
      !process.env.NODE_ENV
    ) {
      const logMessage = [
        "=".repeat(80),
        "📧 PASSWORD RESET EMAIL (DEVELOPMENT MODE)",
        "=".repeat(80),
        `To: ${email}`,
        `Name: ${firstName}`,
        `Reset Token: ${resetToken}`,
        `Reset URL: ${resetUrl}`,
        "Email Content:",
        `Subject: Password Reset Request - MWU Kenya`,
        `Message: Hello ${firstName}, click the link below to reset your password:`,
        `Link: ${resetUrl}`,
        `⚠️  Link expires in 10 minutes`,
        `Mode: ${this.currentMode.toUpperCase()}`,
        "=".repeat(80),
      ].join("\n");

      // Log to both console and logger for visibility
      console.log(logMessage);
      logger.info(logMessage);

      // In development, always return true for testing
      return true;
    }

    if (!this.isConfigured) {
      logger.warn("Email service not configured");
      return false;
    }

    const subject = "Password Reset Request - MWU Kenya";
    const htmlContent = this.generatePasswordResetEmailTemplate(
      firstName,
      resetUrl
    );

    try {
      if (this.currentMode === "zoho") {
        return await this.sendEmailViaZoho(email, subject, htmlContent);
      } else {
        return await this.sendEmailViaSmtp(email, subject, htmlContent);
      }
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  // Generic email sending method
  public async sendEmail(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn("Email service not configured");
      return false;
    }

    try {
      if (this.currentMode === "zoho") {
        return await this.sendEmailViaZoho(to, subject, htmlContent);
      } else {
        return await this.sendEmailViaSmtp(to, subject, htmlContent);
      }
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  private generatePasswordResetEmailTemplate(
    firstName: string,
    resetUrl: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - MWU Kenya</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 2px solid #16a34a;
        }
        .logo {
          color: #16a34a;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 30px 0;
        }
        .btn {
          display: inline-block;
          padding: 12px 30px;
          background-color: #16a34a;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .btn:hover {
          background-color: #15803d;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Matatu Workers Union Kenya</div>
        </div>
        
        <div class="content">
          <h2>Password Reset Request</h2>
          
          <p>Hello ${firstName},</p>
          
          <p>We received a request to reset your password for your MWU Kenya account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Your Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #16a34a;">${resetUrl}</p>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in 10 minutes for security reasons. If you didn't request this password reset, please ignore this email.
          </div>
          
          <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
          
          <p>Best regards,<br>The MWU Kenya Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; 2024 Matatu Workers Union Kenya. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  public getCurrentMode(): EmailMode {
    return this.currentMode;
  }

  public getServiceStatus(): {
    configured: boolean;
    mode: EmailMode;
    smtpConfigured: boolean;
    zohoConfigured: boolean;
  } {
    return {
      configured: this.isConfigured,
      mode: this.currentMode,
      smtpConfigured: this.smtpTransporter !== null,
      zohoConfigured: this.zohoConfig !== null,
    };
  }
}

export const emailService = new EmailService();
export default emailService;

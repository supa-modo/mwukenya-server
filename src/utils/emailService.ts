import nodemailer from "nodemailer";
import logger from "./logger";

// Email service modes
type EmailMode = "smtp" | "zeptomail";

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

// ZeptoMail configuration interface
interface ZeptoMailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromEmail: string;
}

class EmailService {
  private smtpTransporter: nodemailer.Transporter | null = null;
  private zeptoMailTransporter: nodemailer.Transporter | null = null;
  private currentMode: EmailMode = "smtp";
  private isConfigured = false;
  private zeptoMailConfig: ZeptoMailConfig | null = null;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    const emailMode = (
      process.env.EMAIL_MODE || "zeptomail"
    ).toLowerCase() as EmailMode;
    this.currentMode = emailMode;

    if (emailMode === "zeptomail") {
      this.initializeZeptoMailService();
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

  private initializeZeptoMailService() {
    try {
      const config: ZeptoMailConfig = {
        host: "smtp.zeptomail.com",
        port: 587,
        secure: false, // TLS
        auth: {
          user: "emailapikey",
          pass: process.env.ZEPTOMAIL_API_KEY || "",
        },
        fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || "noreply@mwukenya.co.ke",
      };

      if (!config.auth.pass) {
        logger.warn(
          "ZeptoMail service not configured - missing ZEPTOMAIL_API_KEY"
        );
        return;
      }

      this.zeptoMailTransporter = nodemailer.createTransport(config);
      this.zeptoMailConfig = config;
      this.isConfigured = true;
      logger.info("ZeptoMail email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize ZeptoMail email service:", error);
    }
  }

  private async sendEmailViaZeptoMail(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    if (!this.zeptoMailTransporter || !this.zeptoMailConfig) {
      logger.error("ZeptoMail configuration not available");
      return false;
    }

    try {
      const mailOptions = {
        from: `"MWU Kenya" <${this.zeptoMailConfig.fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlContent,
      };

      logger.info("Sending email via ZeptoMail:", {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      const info = await this.zeptoMailTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully via ZeptoMail to ${to}`, {
        messageId: info.messageId,
        response: info.response,
      });
      return true;
    } catch (error) {
      logger.error(`Failed to send email via ZeptoMail to ${to}:`, error);
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
    if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
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
      if (this.currentMode === "zeptomail") {
        return await this.sendEmailViaZeptoMail(email, subject, htmlContent);
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
      if (this.currentMode === "zeptomail") {
        return await this.sendEmailViaZeptoMail(to, subject, htmlContent);
      } else {
        return await this.sendEmailViaSmtp(to, subject, htmlContent);
      }
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  // New method for sending welcome emails to new users
  public async sendWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    membershipNumber: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn("Email service not configured");
      return false;
    }

    const subject = "Welcome to MWU Kenya - Registration Successful";
    const htmlContent = this.generateWelcomeEmailTemplate(
      firstName,
      lastName,
      membershipNumber
    );

    try {
      if (this.currentMode === "zeptomail") {
        return await this.sendEmailViaZeptoMail(email, subject, htmlContent);
      } else {
        return await this.sendEmailViaSmtp(email, subject, htmlContent);
      }
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
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
          <div class="logo">
            <img src="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/mwulogo.png" alt="MWU Kenya" style="max-width: 120px;">
          </div>
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
          <p>&copy; 2025 MWU Kenya. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateWelcomeEmailTemplate(
    firstName: string,
    lastName: string,
    membershipNumber: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to MWU Kenya</title>
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
        .membership-info {
          background-color: #f0f9ff;
          border: 1px solid #0ea5e9;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          text-align: center;
        }
        .membership-number {
          font-size: 24px;
          font-weight: bold;
          color: #0ea5e9;
          margin: 10px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/mwulogo.png" alt="MWU Kenya" style="max-width: 120px;">
          </div>
        </div>
        
        <div class="content">
          <h2>Welcome to MWU Kenya!</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Welcome to the Matatu Workers Union Kenya! We're excited to have you as a member of our community.</p>
          
          <div class="membership-info">
            <h3>Your Membership Details</h3>
            <div class="membership-number">${membershipNumber}</div>
            <p>Please keep this membership number safe. You'll need it for accessing union services and benefits.</p>
          </div>
          
          <p>As a member of MWU Kenya, you now have access to:</p>
          <ul>
            <li>Health insurance benefits and medical coverage</li>
            <li>Union representation and support</li>
            <li>Training and development opportunities</li>
            <li>Community and networking events</li>
            <li>Legal assistance and advocacy</li>
          </ul>
          
          <p>We'll keep you updated on union activities, benefits, and important announcements through email and SMS notifications.</p>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The MWU Kenya Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; 2025 Matatu Workers Union Kenya. All rights reserved.</p>
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
    zeptoMailConfigured: boolean;
  } {
    return {
      configured: this.isConfigured,
      mode: this.currentMode,
      smtpConfigured: this.smtpTransporter !== null,
      zeptoMailConfigured: this.zeptoMailTransporter !== null,
    };
  }
}

export const emailService = new EmailService();
export default emailService;

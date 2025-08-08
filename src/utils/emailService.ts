import nodemailer from "nodemailer";
import logger from "./logger";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const config: EmailConfig = {
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
          "Email service not configured - missing EMAIL_USER or EMAIL_PASSWORD"
        );
        return;
      }

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      logger.info("Email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email service:", error);
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

    // For development, log the email content to console
    if (process.env.NODE_ENV === "development") {
      logger.info("=".repeat(80));
      logger.info("📧 PASSWORD RESET EMAIL (DEVELOPMENT MODE)");
      logger.info("=".repeat(80));
      logger.info(`To: ${email}`);
      logger.info(`Name: ${firstName}`);
      logger.info(`Reset Token: ${resetToken}`);
      logger.info(`Reset URL: ${resetUrl}`);
      logger.info("Email Content:");
      logger.info(`Subject: Password Reset Request - MWU Kenya`);
      logger.info(
        `Message: Hello ${firstName}, click the link below to reset your password:`
      );
      logger.info(`Link: ${resetUrl}`);
      logger.info(`⚠️  Link expires in 10 minutes`);
      logger.info("=".repeat(80));

      // In development, always return true for testing
      return true;
    }

    if (!this.isConfigured || !this.transporter) {
      logger.warn("Email service not configured");
      return false;
    }

    try {
      const mailOptions = {
        from: `"MWU Kenya" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset Request - MWU Kenya",
        html: this.generatePasswordResetEmailTemplate(firstName, resetUrl),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent successfully to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
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
}

export const emailService = new EmailService();
export default emailService;

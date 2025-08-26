"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("./logger"));
class EmailService {
    constructor() {
        this.smtpTransporter = null;
        this.zeptoMailTransporter = null;
        this.currentMode = "smtp";
        this.isConfigured = false;
        this.zeptoMailConfig = null;
        this.initializeService();
    }
    initializeService() {
        const emailMode = (process.env.EMAIL_MODE || "zeptomail").toLowerCase();
        this.currentMode = emailMode;
        if (emailMode === "zeptomail") {
            this.initializeZeptoMailService();
        }
        else {
            this.initializeSmtpService();
        }
    }
    initializeSmtpService() {
        try {
            const config = {
                host: process.env.EMAIL_HOST || "smtp.gmail.com",
                port: parseInt(process.env.EMAIL_PORT || "587"),
                secure: process.env.EMAIL_SECURE === "true",
                auth: {
                    user: process.env.EMAIL_USER || "",
                    pass: process.env.EMAIL_PASSWORD || "",
                },
            };
            if (!config.auth.user || !config.auth.pass) {
                logger_1.default.warn("SMTP email service not configured - missing EMAIL_USER or EMAIL_PASSWORD");
                return;
            }
            this.smtpTransporter = nodemailer_1.default.createTransport(config);
            this.isConfigured = true;
            logger_1.default.info("SMTP email service initialized successfully");
        }
        catch (error) {
            logger_1.default.error("Failed to initialize SMTP email service:", error);
        }
    }
    initializeZeptoMailService() {
        try {
            const apiKey = process.env.ZEPTOMAIL_API_KEY;
            const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
            if (!apiKey) {
                logger_1.default.warn("ZeptoMail service not configured - missing ZEPTOMAIL_API_KEY");
                return;
            }
            if (!fromEmail) {
                logger_1.default.warn("ZeptoMail service not configured - missing ZEPTOMAIL_FROM_EMAIL");
                return;
            }
            const config = {
                host: "smtp.zeptomail.com",
                port: 587,
                secure: false,
                auth: {
                    user: "emailapikey",
                    pass: apiKey,
                },
                fromEmail: fromEmail,
            };
            this.zeptoMailTransporter = nodemailer_1.default.createTransport(config);
            this.zeptoMailConfig = config;
            this.isConfigured = true;
            this.zeptoMailTransporter.verify((error, success) => {
                if (error) {
                    logger_1.default.error("ZeptoMail connection test failed:", error);
                    this.isConfigured = false;
                }
                else {
                    logger_1.default.info("ZeptoMail email service initialized and verified successfully");
                }
            });
        }
        catch (error) {
            logger_1.default.error("Failed to initialize ZeptoMail email service:", error);
            this.isConfigured = false;
        }
    }
    async sendEmailViaZeptoMail(to, subject, htmlContent) {
        if (!this.zeptoMailTransporter || !this.zeptoMailConfig) {
            logger_1.default.error("ZeptoMail configuration not available");
            return false;
        }
        try {
            const mailOptions = {
                from: `"MWU Kenya" <${this.zeptoMailConfig.fromEmail}>`,
                to: to,
                subject: subject,
                html: htmlContent,
            };
            logger_1.default.info("Sending email via ZeptoMail:", {
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject,
            });
            const info = await this.zeptoMailTransporter.sendMail(mailOptions);
            logger_1.default.info(`Email sent successfully via ZeptoMail to ${to}`, {
                messageId: info.messageId,
                response: info.response,
            });
            return true;
        }
        catch (error) {
            logger_1.default.error(`Failed to send email via ZeptoMail to ${to}:`, error);
            return false;
        }
    }
    async sendEmailViaSmtp(to, subject, htmlContent) {
        if (!this.smtpTransporter) {
            logger_1.default.error("SMTP transporter not available");
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
            logger_1.default.info(`Email sent successfully via SMTP to ${to}`);
            return true;
        }
        catch (error) {
            logger_1.default.error(`Failed to send email via SMTP to ${to}:`, error);
            return false;
        }
    }
    async sendPasswordResetEmail(email, resetToken, firstName) {
        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;
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
                `Subject: Password Reset Request - Matatu Workers Union Kenya`,
                `Message: Hello ${firstName}, click the link below to reset your password:`,
                `Link: ${resetUrl}`,
                `⚠️  Link expires in 10 minutes`,
                `Mode: ${this.currentMode.toUpperCase()}`,
                `Service Configured: ${this.isConfigured}`,
                "=".repeat(80),
            ].join("\n");
            console.log(logMessage);
            logger_1.default.info(logMessage);
        }
        if (!this.isConfigured) {
            logger_1.default.error("Email service not configured - cannot send password reset email");
            return false;
        }
        const subject = "Password Reset Request - Matatu Workers Union Kenya";
        const htmlContent = this.generatePasswordResetEmailTemplate(firstName, resetUrl);
        try {
            logger_1.default.info(`Attempting to send password reset email to ${email} via ${this.currentMode}`);
            if (this.currentMode === "zeptomail") {
                const result = await this.sendEmailViaZeptoMail(email, subject, htmlContent);
                if (result) {
                    logger_1.default.info(`Password reset email sent successfully via ZeptoMail to ${email}`);
                }
                else {
                    logger_1.default.error(`Failed to send password reset email via ZeptoMail to ${email}`);
                }
                return result;
            }
            else {
                const result = await this.sendEmailViaSmtp(email, subject, htmlContent);
                if (result) {
                    logger_1.default.info(`Password reset email sent successfully via SMTP to ${email}`);
                }
                else {
                    logger_1.default.error(`Failed to send password reset email via SMTP to ${email}`);
                }
                return result;
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to send password reset email to ${email}:`, error);
            return false;
        }
    }
    async sendEmail(to, subject, htmlContent) {
        if (!this.isConfigured) {
            logger_1.default.warn("Email service not configured");
            return false;
        }
        try {
            if (this.currentMode === "zeptomail") {
                return await this.sendEmailViaZeptoMail(to, subject, htmlContent);
            }
            else {
                return await this.sendEmailViaSmtp(to, subject, htmlContent);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to send email to ${to}:`, error);
            return false;
        }
    }
    async sendWelcomeEmail(email, firstName, lastName, membershipNumber, delegateInfo) {
        if (!this.isConfigured) {
            logger_1.default.warn("Email service not configured");
            return false;
        }
        const subject = "Welcome to Matatu Workers Union Kenya - Registration Successful";
        const htmlContent = this.generateWelcomeEmailTemplate(firstName, lastName, membershipNumber, delegateInfo);
        try {
            if (this.currentMode === "zeptomail") {
                return await this.sendEmailViaZeptoMail(email, subject, htmlContent);
            }
            else {
                return await this.sendEmailViaSmtp(email, subject, htmlContent);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to send welcome email to ${email}:`, error);
            return false;
        }
    }
    async sendContactFormEmail(formData) {
        if (!this.isConfigured) {
            logger_1.default.warn("Email service not configured");
            return false;
        }
        const subject = `Support Request: ${formData.subject} - ${formData.category}`;
        const htmlContent = this.generateContactFormEmailTemplate(formData);
        try {
            const supportEmail = "support@mwukenya.co.ke";
            if (this.currentMode === "zeptomail") {
                return await this.sendEmailViaZeptoMail(supportEmail, subject, htmlContent);
            }
            else {
                return await this.sendEmailViaSmtp(supportEmail, subject, htmlContent);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to send contact form email:`, error);
            return false;
        }
    }
    generatePasswordResetEmailTemplate(firstName, resetUrl) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Matatu Workers Union Kenya</title>
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
        .header-text {
          text-align: center;
          padding: 20px 0;
          color: #16a34a;
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
            <img src="${process.env.FRONTEND_URL || "http://localhost:5173"}/mwulogo.png" alt="MWU Kenya" style="max-width: 120px;">
          </div>
          <div class="header-text">
            <h1>Matatu Workers Union Kenya</h1>
          </div>
        </div>
        
        <div class="content">
          <h2>Password Reset Request</h2>
          
          <p>Hello ${firstName},</p>
          
          <p>We received a request to reset your password for your Matatu Workers Union Kenya account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Your Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #16a34a;">${resetUrl}</p>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in 10 minutes for security reasons. If you didn't request this password reset, please ignore this email.
          </div>
          
          <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
          
          <p>Best regards,<br>The Matatu Workers Union Kenya Team</p>
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
    generateWelcomeEmailTemplate(firstName, lastName, membershipNumber, delegateInfo) {
        const delegateDetails = delegateInfo
            ? `
      <div class="delegate-info">
        <h3>Your Delegate Details</h3>
        <p><strong>Delegate Name:</strong> ${delegateInfo.delegateName || "N/A"}</p>
        <p><strong>Delegate Contact:</strong> ${delegateInfo.delegateContact || "N/A"}</p>
        <p><strong>Delegate Code:</strong> ${delegateInfo.delegateCode || "N/A"}</p>
      </div>
    `
            : "";
        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Matatu Workers Union Kenya</title>
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
        .header-text {
          text-align: center;
          padding: 20px 0;
          color: #16a34a;
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
        .delegate-info {
          background-color: #e0f2fe;
          border: 1px solid #3b82f6;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          text-align: left;
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
            <img src="${process.env.FRONTEND_URL || "http://localhost:5173"}/mwulogo.png" alt="MWU Kenya" style="max-width: 120px;">
          </div>
          <div class="header-text">
            <h1>Matatu Workers Union Kenya</h1>
          </div>
        </div>
        
        <div class="content">
          <h2>Welcome to Matatu Workers Union Kenya!</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Welcome to the Matatu Workers Union Kenya! We're excited to have you as a member of our community.</p>
          
          <div class="membership-info">
            <h3>Your Membership Details</h3>
            <div class="membership-number">${membershipNumber}</div>
            <p>Please keep this membership number safe. You'll need it for accessing union services and benefits.</p>
          </div>
          
          ${delegateDetails}

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
    generateContactFormEmailTemplate(formData) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Support Request - Matatu Workers Union Kenya</title>
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
        .header-text {
          text-align: center;
          padding: 20px 0;
          color: #16a34a;
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
        .form-details {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .form-field {
          margin-bottom: 15px;
        }
        .form-label {
          font-weight: bold;
          color: #374151;
          display: block;
          margin-bottom: 5px;
        }
        .form-value {
          color: #6b7280;
          padding: 8px 12px;
          background-color: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        .message-content {
          background-color: #ffffff;
          border: 1px solid #d1d5db;
          padding: 15px;
          border-radius: 4px;
          white-space: pre-wrap;
          min-height: 100px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          background-color: #16a34a;
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="${process.env.FRONTEND_URL || "http://localhost:5173"}/mwulogo.png" alt="MWU Kenya" style="max-width: 120px;">
          </div>
          <div class="header-text">
            <h1>Matatu Workers Union Kenya</h1>
          </div>
        </div>
        
        <div class="content">
          <h2>New Support Request</h2>
          
          <p>A new support request has been submitted through the website contact form.</p>
          
          <div class="form-details">
            <div class="form-field">
              <span class="form-label">Name:</span>
              <div class="form-value">${formData.name}</div>
            </div>
            
            <div class="form-field">
              <span class="form-label">Email:</span>
              <div class="form-value">${formData.email}</div>
            </div>
            
            ${formData.phone
            ? `
            <div class="form-field">
              <span class="form-label">Phone:</span>
              <div class="form-value">${formData.phone}</div>
            </div>
            `
            : ""}
            
            <div class="form-field">
              <span class="form-label">Category:</span>
              <div class="form-value">
                <span class="category-badge">${formData.category}</span>
              </div>
            </div>
            
            <div class="form-field">
              <span class="form-label">Subject:</span>
              <div class="form-value">${formData.subject}</div>
            </div>
            
            <div class="form-field">
              <span class="form-label">Message:</span>
              <div class="message-content">${formData.message}</div>
            </div>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Review the request details above</li>
            <li>Respond to the user at: <a href="mailto:${formData.email}">${formData.email}</a></li>
            <li>Update the support ticket status in your system</li>
          </ul>
          
          <p>This request was submitted on ${new Date().toLocaleString("en-KE", {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })}.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from the MWU Kenya support system.</p>
          <p>&copy; 2025 Matatu Workers Union Kenya. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
    }
    isEmailConfigured() {
        return this.isConfigured;
    }
    getCurrentMode() {
        return this.currentMode;
    }
    getServiceStatus() {
        return {
            configured: this.isConfigured,
            mode: this.currentMode,
            smtpConfigured: this.smtpTransporter !== null,
            zeptoMailConfigured: this.zeptoMailTransporter !== null,
            environment: process.env.NODE_ENV || "development",
            frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
        };
    }
    async testEmailSending() {
        if (!this.isConfigured) {
            return {
                success: false,
                mode: this.currentMode,
                error: "Email service not configured",
            };
        }
        const testEmail = "test@example.com";
        const testSubject = "Test Email - Matatu Workers Union Kenya";
        const testContent = "<h1>This is a test email</h1><p>If you receive this, the email service is working.</p>";
        try {
            let result = false;
            if (this.currentMode === "zeptomail") {
                result = await this.sendEmailViaZeptoMail(testEmail, testSubject, testContent);
            }
            else {
                result = await this.sendEmailViaSmtp(testEmail, testSubject, testContent);
            }
            return {
                success: result,
                mode: this.currentMode,
                details: {
                    configured: this.isConfigured,
                    transporter: this.currentMode === "zeptomail" ? "ZeptoMail" : "SMTP",
                },
            };
        }
        catch (error) {
            return {
                success: false,
                mode: this.currentMode,
                error: error instanceof Error ? error.message : "Unknown error",
                details: {
                    configured: this.isConfigured,
                    transporter: this.currentMode === "zeptomail" ? "ZeptoMail" : "SMTP",
                },
            };
        }
    }
}
exports.emailService = new EmailService();
exports.default = exports.emailService;
//# sourceMappingURL=emailService.js.map
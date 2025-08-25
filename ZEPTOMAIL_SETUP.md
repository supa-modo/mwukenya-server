# ZeptoMail Email Service Setup Guide

## Overview

This guide explains how to configure and use ZeptoMail for sending emails in the MWU Kenya system. ZeptoMail is Zoho's transactional email service that provides reliable email delivery through SMTP.

## Configuration

### 1. Environment Variables

Update your `.env` file with the following ZeptoMail configuration:

```bash
# Email Configuration
EMAIL_MODE=zeptomail

# ZeptoMail Configuration
ZEPTOMAIL_API_KEY=wSsVR61x/0bzCfp6yjerL7g/mgtRDlunFkooi1am73CpF6jGoMczxRbPAlOlTqRNE2RsHWYQ9ugpkEoFhGcMjY8vzlkFCSiF9mqRe1U4J3x17qnvhDzIXWhekReMK4MMxgpjkmhhGswi+g==
ZEPTOMAIL_FROM_EMAIL=noreply@mwukenya.co.ke
```

### 2. ZeptoMail SMTP Settings

- **Host**: `smtp.zeptomail.com`
- **Port**: `587` (TLS)
- **Username**: `emailapikey` (fixed)
- **Password**: Your ZeptoMail API key
- **Security**: TLS (not SSL)

## Features Implemented

### 1. Welcome Emails for New Users

When a new user registers with an email address, the system automatically sends a welcome email containing:

- Welcome message
- Membership number
- Union benefits information
- Contact details

### 2. Password Reset Emails

Users can request password reset via email, receiving:

- Secure reset link
- 10-minute expiration
- Professional email template
- Clear instructions

### 3. Email Templates

The system includes professionally designed HTML email templates:

- **Welcome Template**: Branded welcome message with membership details
- **Password Reset Template**: Secure password reset with expiration notice

## Testing

### 1. Test Email Service

Run the test script to verify ZeptoMail configuration:

```bash
cd mwuKenya/server
npm run test:email
# or
npx ts-node src/scripts/test-zoho-email.ts
```

### 2. Test Individual Functions

Test specific email functions:

```bash
# Test basic email sending
node test-zeptomail.js

# Test welcome email
# Test password reset email
```

## Usage Examples

### 1. Sending Welcome Email

```typescript
import { emailService } from "../utils/emailService";

const emailSent = await emailService.sendWelcomeEmail(
  "user@example.com",
  "John",
  "Doe",
  "MWU-24AB1234"
);
```

### 2. Sending Password Reset Email

```typescript
const resetEmailSent = await emailService.sendPasswordResetEmail(
  "user@example.com",
  "reset-token-123",
  "John"
);
```

### 3. Sending Custom Email

```typescript
const customEmailSent = await emailService.sendEmail(
  "user@example.com",
  "Custom Subject",
  "<h1>Custom HTML Content</h1>"
);
```

## Error Handling

The email service includes comprehensive error handling:

- Connection failures
- Authentication errors
- Template generation errors
- Rate limiting (handled by ZeptoMail)

## Monitoring

### 1. Logs

All email activities are logged with:

- Success/failure status
- Recipient information
- Error details
- Timestamps

### 2. Service Status

Check email service status:

```typescript
const status = emailService.getServiceStatus();
console.log(status);
// Output: { configured: true, mode: 'zeptomail', smtpConfigured: false, zeptoMailConfigured: true }
```

## Troubleshooting

### 1. Common Issues

#### Authentication Failed

- Verify `ZEPTOMAIL_API_KEY` is correct
- Ensure API key is active in ZeptoMail dashboard
- Check if account has sufficient credits

#### Email Not Delivered

- Check spam/junk folders
- Verify recipient email address
- Check ZeptoMail delivery logs

#### Service Not Configured

- Verify `EMAIL_MODE=zeptomail` in `.env`
- Check all required environment variables
- Restart application after configuration changes

### 2. Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

## Security Considerations

1. **API Key Protection**: Never commit API keys to version control
2. **Rate Limiting**: ZeptoMail handles rate limiting automatically
3. **Email Validation**: All email addresses are validated before sending
4. **Template Sanitization**: HTML templates are properly sanitized

## Performance

- **Connection Pooling**: Nodemailer handles connection management
- **Async Processing**: All email operations are asynchronous
- **Error Recovery**: Failed emails are logged but don't block operations

## Support

For ZeptoMail-specific issues:

- Check [ZeptoMail Documentation](https://www.zoho.com/zeptomail/help/smtp-home.html)
- Contact ZeptoMail support
- Review delivery logs in ZeptoMail dashboard

## Migration from Old System

The system automatically migrates from the old Zoho OAuth setup to ZeptoMail SMTP:

1. Update environment variables
2. Restart application
3. Test email functionality
4. Monitor delivery rates

## Next Steps

1. **Test Configuration**: Run test scripts to verify setup
2. **Monitor Delivery**: Check email delivery rates
3. **Customize Templates**: Modify email templates as needed
4. **Set Up Monitoring**: Implement email delivery monitoring
5. **Configure Bounce Handling**: Set up bounce email processing

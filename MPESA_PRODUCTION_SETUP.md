# M-Pesa Production Configuration Guide

## Required Environment Variables

Add these environment variables to your production `.env` file:

```bash
# M-Pesa Production Settings
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_ENVIRONMENT=production
MPESA_PAYBILL_NUMBER=your_production_paybill_number
MPESA_PASSKEY=your_production_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/v1/payments/mpesa/callback

# Production Security Settings
MPESA_INITIATOR_NAME=your_production_initiator_name
MPESA_INITIATOR_PASSWORD=your_production_initiator_password

# M-Pesa Public Key for RSA Encryption
MPESA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4F5Ow81jGMhUC2FVoO8g
... (your actual M-Pesa public key)
-----END PUBLIC KEY-----"
```

## How to Get M-Pesa Production Credentials

1. **Consumer Key & Secret**: Get from M-Pesa Developer Portal
2. **Paybill Number**: Your registered M-Pesa paybill number
3. **Passkey**: Generated from M-Pesa Developer Portal
4. **Initiator Name**: Your M-Pesa API initiator username
5. **Initiator Password**: Your M-Pesa API initiator password
6. **Public Key**: Download from M-Pesa Developer Portal

## Security Notes

- Never commit production credentials to version control
- Use environment variables or secure secret management
- The public key is used to encrypt your initiator password
- All API calls are authenticated using OAuth tokens

## Testing Configuration

Use the `/api/v1/payments/mpesa/test` endpoint to validate your configuration.

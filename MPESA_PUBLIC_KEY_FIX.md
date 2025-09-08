# M-Pesa Public Key Issue - Solution Guide

## 🚨 Problem Identified

You are currently using a **CERTIFICATE** instead of a **PUBLIC KEY** in your `.env` file. This is causing the "encoding too long" error.

### Current Issue:

```
-----BEGIN CERTIFICATE-----
MIIGgDCCBWigAwIBAgIKMv...
```

### What You Need:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
```

## 🔧 How to Fix

### Step 1: Download the Correct File

1. Go to [M-Pesa Daraja API Portal](https://developer.safaricom.co.ke/)
2. Log in to your account
3. Navigate to your app's credentials section
4. **Download the PUBLIC KEY (.pem) file** - NOT the certificate
5. The file should be named something like `sandbox_public_key.pem` or `production_public_key.pem`

### Step 2: Extract the Public Key Content

Open the downloaded `.pem` file in a text editor. It should look like this:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0m59l2u9iDnMbrXHfqkO
rn2dVQ3vfBJqcDuFUK03d+1PZGbVlNCqnkpIJFqQk/11fI93KktJbLS2F5twykcn
...
-----END PUBLIC KEY-----
```

### Step 3: Update Your .env File

Replace your current `MPESA_PUBLIC_KEY` value with the correct public key:

```env
# Remove the old certificate
# MPESA_PUBLIC_KEY="-----BEGIN CERTIFICATE-----..."

# Add the correct public key
MPESA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0m59l2u9iDnMbrXHfqkO\nrn2dVQ3vfBJqcDuFUK03d+1PZGbVlNCqnkpIJFqQk/11fI93KktJbLS2F5twykcn\n-----END PUBLIC KEY-----"
```

**Note:** Use `\n` for line breaks in the .env file, or put it all on one line.

### Step 4: Verify the Fix

Run the validation script to confirm it's working:

```bash
npx ts-node scripts/validate-mpesa-key.ts
```

You should see:

```
✅ SUCCESS! Key size: 2048 bits
```

## 🔍 Key Differences

| Type            | Header                        | Purpose                        | Size           |
| --------------- | ----------------------------- | ------------------------------ | -------------- |
| **Certificate** | `-----BEGIN CERTIFICATE-----` | Contains public key + metadata | ~2KB+          |
| **Public Key**  | `-----BEGIN PUBLIC KEY-----`  | Just the encryption key        | ~400-600 bytes |

## 🛠️ Alternative: Extract Public Key from Certificate

If you only have the certificate, you can extract the public key using OpenSSL:

```bash
# Extract public key from certificate
openssl x509 -in certificate.pem -pubkey -noout > public_key.pem
```

## ✅ Verification Checklist

- [ ] Downloaded PUBLIC KEY (.pem) file from M-Pesa Daraja API
- [ ] File starts with `-----BEGIN PUBLIC KEY-----`
- [ ] File ends with `-----END PUBLIC KEY-----`
- [ ] Updated `.env` file with correct `MPESA_PUBLIC_KEY`
- [ ] Validation script shows "SUCCESS"
- [ ] Server starts without encryption errors

## 🚀 Next Steps

Once you've updated your `.env` file with the correct public key:

1. Restart your server
2. Test M-Pesa integration
3. The encryption should work properly for production

## 📞 Support

If you're still having issues:

1. Double-check you downloaded the PUBLIC KEY, not the certificate
2. Ensure the key format is correct (PEM format)
3. Verify the key is from the correct environment (sandbox vs production)
4. Check that your `.env` file is being loaded correctly

The improved error handling will now give you clear messages about what's wrong and how to fix it!

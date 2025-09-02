# M-Pesa Test Mode Configuration

## 🧪 **Test Mode Setup**

To enable test mode (1 KES payments) in production, set the environment variable:

```bash
MPESA_TEST_MODE=true
```

## 🔧 **How It Works**

When `MPESA_TEST_MODE=true`:

- ✅ **All payments** are sent to M-Pesa as **1 KES** regardless of actual amount
- ✅ **Original amount** is still logged for reference
- ✅ **Validation** still works on the original amount
- ✅ **User sees** the actual amount in the UI
- ✅ **M-Pesa receives** only 1 KES for testing

## 🚀 **Switching to Live Mode**

To disable test mode and use actual amounts:

```bash
MPESA_TEST_MODE=false
# or simply remove the environment variable
```

## 📊 **Logging**

The system logs both amounts for transparency:

```json
{
  "originalAmount": 150,
  "actualAmount": 1,
  "testMode": true,
  "environment": "production"
}
```

## ⚠️ **Important Notes**

1. **Test Mode Only**: Use this for testing in production environment
2. **User Experience**: Users still see the actual amount in the UI
3. **Validation**: Server validates the original amount before sending
4. **Logging**: Both amounts are logged for audit purposes
5. **Easy Switch**: Just change one environment variable to go live

## 🎯 **Use Cases**

- **Production Testing**: Test M-Pesa integration without real money
- **Demo Environment**: Show functionality without actual payments
- **Development**: Test payment flows safely
- **QA Testing**: Verify payment processes in production-like environment

## 🔄 **Quick Commands**

```bash
# Enable test mode
export MPESA_TEST_MODE=true

# Disable test mode (live payments)
export MPESA_TEST_MODE=false

# Check current mode
echo $MPESA_TEST_MODE
```

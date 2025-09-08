# Settlement Payment Processing System

## Overview

This document describes the comprehensive settlement payment processing system that provides granular control over different types of payments within a settlement.

## Architecture

### Components

1. **ProcessSettlementModal.jsx** - Frontend modal with separate sections for each payment type
2. **BankTransferService.ts** - Backend service for handling SHA and MWU bank transfers
3. **SettlementController.ts** - API endpoints for payment processing
4. **Configuration** - Environment variables for bank details and security

### Payment Types

The system processes three distinct types of payments:

1. **Commission Payouts** - M-Pesa B2C payments to delegates and coordinators
2. **SHA Transfer** - Bank transfer to Social Health Authority
3. **MWU Transfer** - Bank transfer to Medical Workers Union

## Environment Variables

Add these to your `.env` file:

```bash
# Payment Confirmation Password (CRITICAL - Change in production)
PAYMENT_CONFIRMATION_PASSWORD=admin123

# SHA Bank Transfer Configuration
SHA_BANK_NAME="Kenya Commercial Bank"
SHA_ACCOUNT_NUMBER=1234567890
SHA_ACCOUNT_NAME="Social Health Authority"
SHA_BRANCH_CODE=001
SHA_SWIFT_CODE=KCBLKENX

# MWU Bank Transfer Configuration
MWU_BANK_NAME="Equity Bank"
MWU_ACCOUNT_NUMBER=0987654321
MWU_ACCOUNT_NAME="Medical Workers Union"
MWU_BRANCH_CODE=068
MWU_SWIFT_CODE=EQBLKENA
```

## API Endpoints

### New Settlement Payment Endpoints

```typescript
// Validate payment confirmation password
POST /api/v1/settlements/validate-password
Body: { password: string }

// Get bank details for SHA and MWU
GET /api/v1/settlements/bank-details

// Process commission payouts
POST /api/v1/settlements/:settlementId/process-commissions
Body: { password: string }

// Process SHA bank transfer
POST /api/v1/settlements/:settlementId/process-sha
Body: {
  password: string,
  amount: number,
  bankDetails?: BankTransferDetails
}

// Process MWU bank transfer
POST /api/v1/settlements/:settlementId/process-mwu
Body: {
  password: string,
  amount: number,
  bankDetails?: BankTransferDetails
}
```

### Bank Transfer Details Interface

```typescript
interface BankTransferDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  branchCode: string;
  swiftCode: string;
}
```

## Frontend Implementation

### ProcessSettlementModal Features

1. **Granular Payment Sections**

   - Each payment type has its own section
   - Visual status indicators (pending, processing, completed, failed)
   - Real-time progress updates

2. **Password Protection**

   - Modal overlay for password confirmation
   - Password validation before processing
   - Secure password input with show/hide toggle

3. **Bank Details Management**

   - Editable bank details for SHA and MWU transfers
   - Pre-populated from environment configuration
   - Validation before processing

4. **Status Tracking**
   - Visual indicators for each payment type
   - Progress messages and error handling
   - Completion status overview

### Usage Example

```jsx
<ProcessSettlementModal
  isOpen={showProcessModal}
  onClose={() => setShowProcessModal(false)}
  settlement={selectedSettlement}
  payoutStats={payoutStats}
  formatCurrency={formatCurrency}
  onRefreshData={handleRefreshData}
  loading={loading}
/>
```

## Backend Implementation

### BankTransferService

The `BankTransferService` handles:

- SHA and MWU bank transfer processing
- Bank details validation
- Transfer simulation (replace with actual banking API)
- Password validation
- Transaction reference generation

### Key Methods

```typescript
// Process SHA transfer
processShaTransfer(settlementId: string, amount: number, customBankDetails?: Partial<BankTransferDetails>): Promise<BankTransferResponse>

// Process MWU transfer
processMwuTransfer(settlementId: string, amount: number, customBankDetails?: Partial<BankTransferDetails>): Promise<BankTransferResponse>

// Validate payment password
validatePaymentPassword(password: string): boolean

// Get default bank details
getShaBank(): BankTransferDetails
getMwuBank(): BankTransferDetails
```

## Security Features

### Password Protection

- All payment operations require password confirmation
- Password is validated against environment configuration
- Secure password input with visibility toggle
- Password is not stored in component state after use

### Bank Transfer Security

- Bank details validation before processing
- Masked account numbers in logs
- Transaction reference generation
- Audit trail logging

### API Security

- Admin/Superadmin role required for all payment endpoints
- Request validation using Joi schemas
- Rate limiting and authentication middleware
- Secure error handling

## Payment Flow

### 1. Commission Payouts

1. User clicks "Process Commission Payouts"
2. Password confirmation modal appears
3. System validates password
4. M-Pesa B2C payments initiated to delegates and coordinators
5. Real-time status updates shown
6. Completion status displayed

### 2. Bank Transfers (SHA/MWU)

1. User views bank details (editable)
2. User clicks "Process [SHA/MWU] Transfer"
3. Password confirmation modal appears
4. System validates password and bank details
5. Bank transfer initiated (simulated, replace with actual banking API)
6. Transfer status tracked and displayed

### 3. Settlement Completion

- Settlement is only marked as fully processed when all payment types are completed
- Individual payment failures don't prevent other payments from processing
- Comprehensive status tracking for each payment type

## Error Handling

### Frontend

- User-friendly error messages
- Retry mechanisms for failed payments
- Visual indicators for different error states
- Graceful degradation for network issues

### Backend

- Comprehensive error logging
- Structured error responses
- Transaction rollback for critical failures
- Audit trail for all payment attempts

## Integration Points

### M-Pesa Integration

- Uses existing `MpesaService` for commission payouts
- B2C payment processing with callback handling
- Transaction status tracking
- Error handling and retry mechanisms

### Banking Integration

- Simulated bank transfers (replace with actual banking API)
- Support for multiple bank configurations
- Transaction reference tracking
- Transfer status monitoring

## Monitoring and Logging

### Audit Trail

- All payment attempts logged
- User actions tracked
- System events recorded
- Error conditions documented

### Performance Monitoring

- Payment processing times tracked
- Success/failure rates monitored
- System health checks
- Resource utilization tracking

## Deployment Considerations

### Environment Configuration

1. Set strong `PAYMENT_CONFIRMATION_PASSWORD`
2. Configure actual bank details for SHA and MWU
3. Set up proper M-Pesa production credentials
4. Configure secure database connections

### Security Checklist

- [ ] Change default payment confirmation password
- [ ] Verify bank account details
- [ ] Test M-Pesa integration in sandbox
- [ ] Configure HTTPS for all API endpoints
- [ ] Set up proper CORS policies
- [ ] Enable request logging and monitoring
- [ ] Set up backup and recovery procedures

### Banking API Integration

To integrate with actual banking APIs:

1. Replace `simulateBankTransfer` method in `BankTransferService`
2. Implement proper banking API client
3. Add bank-specific error handling
4. Configure webhook endpoints for transfer status updates
5. Implement proper transaction reconciliation

## Testing

### Unit Tests

- Test password validation logic
- Test bank details validation
- Test payment processing flows
- Test error handling scenarios

### Integration Tests

- Test complete payment flows
- Test API endpoint functionality
- Test database transaction handling
- Test M-Pesa integration

### End-to-End Tests

- Test complete settlement processing workflow
- Test UI interactions and state management
- Test error scenarios and recovery
- Test concurrent payment processing

## Future Enhancements

### Planned Features

1. **Batch Processing** - Process multiple settlements simultaneously
2. **Scheduled Payments** - Automatic payment processing at specified times
3. **Payment Templates** - Save and reuse bank details configurations
4. **Advanced Reporting** - Detailed payment processing reports
5. **Multi-currency Support** - Support for different currencies
6. **Enhanced Security** - Two-factor authentication for payments

### Technical Improvements

1. **Real Banking API Integration** - Replace simulation with actual banking APIs
2. **Payment Queue System** - Queue-based payment processing for better reliability
3. **Webhook Management** - Better handling of payment status callbacks
4. **Caching Layer** - Cache bank details and configuration data
5. **Performance Optimization** - Optimize database queries and API calls

## Support and Maintenance

### Regular Tasks

- Monitor payment processing logs
- Update bank details as needed
- Rotate payment confirmation passwords
- Review and update security configurations
- Monitor system performance and resource usage

### Troubleshooting

Common issues and solutions:

1. **Password Validation Failures** - Check environment configuration
2. **Bank Transfer Failures** - Verify bank details and API connectivity
3. **M-Pesa Errors** - Check M-Pesa credentials and callback URLs
4. **Database Connection Issues** - Verify database connectivity and credentials
5. **Permission Errors** - Check user roles and authentication

For technical support, refer to the system logs and contact the development team.

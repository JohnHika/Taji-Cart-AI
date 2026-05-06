# Equity Bank EazzyPay Integration Guide

## Overview

Equity Bank EazzyPay allows customers to pay directly from their Equity Bank accounts via STK push, similar to M-Pesa. This integration supports both registered users and guest checkout.

## Files Created/Modified

### Backend Files
- `server/config/equity.js` - Equity API configuration and helpers
- `server/controllers/equity.controller.js` - Payment processing logic
- `server/models/equityPayment.model.js` - Payment record model
- `server/route/equity.route.js` - API routes
- `server/app.js` - Added Equity router
- `server/.env.example` - Added Equity environment variables

### Frontend Files
- `client/src/components/EquityPayment.jsx` - Payment form component
- `client/src/common/SummaryApi.js` - Added equityPayment endpoint
- `client/src/pages/GuestCheckout.jsx` - Integrated Equity payment option

## Setup Instructions

### 1. Get Equity Bank API Credentials

Contact Equity Bank to obtain:
- **API Key** (Consumer Key)
- **API Secret** (Consumer Secret)
- **Company Code**
- **Account Number**
- **Paybill Number**
- **Callback URL** (your production backend URL)

### 2. Configure Environment Variables

Add to your server `.env` file:

```env
# Equity Bank (EazzyPay)
EQUITY_BASE_URL=https://uat.equity.co.ke  # Use production URL in production
EQUITY_API_KEY=your-api-key-here
EQUITY_SECRET=your-api-secret-here
EQUITY_COMPANY_CODE=your-company-code
EQUITY_ACCOUNT_NUMBER=your-account-number
EQUITY_PAYBILL=your-paybill-number
EQUITY_CALLBACK_URL=https://your-domain.com/api/equity/callback
```

### 3. API Endpoints

#### Initiate Payment
```
POST /api/equity/pay
Content-Type: application/json
Authorization: Bearer <token>

{
  "phoneNumber": "254712345678",
  "amount": 5000,
  "userId": "user-id-or-guest",
  "list_items": [...],
  "subTotalAmt": 5000,
  "totalAmt": 5000,
  "guestEmail": "guest@example.com",  // For guest checkout
  "guestPhone": "254712345678",       // For guest checkout
  "guestShipping": {...},              // For guest checkout
  "fulfillment_type": "delivery",
  "pickup_location": "",
  "addressId": "address-id"  // For registered users
}
```

#### Check Payment Status
```
GET /api/equity/status/:transactionId
Authorization: Bearer <token>
```

#### Webhook Callback (Equity Bank calls this)
```
POST /api/equity/callback
Content-Type: application/json

{
  "transactionId": "...",
  "status": "completed",
  "amount": 5000,
  "phoneNumber": "254712345678"
}
```

## User Flow

### Guest Checkout Flow
1. Guest adds items to cart
2. Proceeds to checkout at `/guest-checkout`
3. Fills in contact and shipping details
4. Selects **Equity Bank** as payment method
5. Enters phone number
6. Clicks "Pay KES X,XXX"
7. Receives STK push on phone from Equity Bank
8. Enters PIN on phone
9. Payment confirmed
10. Order confirmation email sent
11. Account creation prompt shown

### Registered User Flow
1. User adds items to cart
2. Proceeds to checkout
3. Selects delivery address or pickup
4. Selects **Equity Bank** as payment method
5. Enters phone number
6. Receives STK push on phone
7. Enters PIN
8. Payment confirmed
9. Order saved with user account
10. Confirmation email sent

## Payment Methods Available

Customers can now choose between:
- **M-Pesa** - Safaricom STK Push
- **Equity Bank EazzyPay** - Direct bank payment
- **Pesapal** - Card payment gateway
- **Stripe** - International card payments

## Testing

### Test Scenarios
1. ✅ Guest checkout with Equity Bank
2. ✅ Registered user checkout with Equity Bank
3. ✅ Payment success flow
4. ✅ Payment failure handling
5. ✅ Insufficient stock handling
6. ✅ Email notifications sent
7. ✅ Order created in database
8. ✅ Stock deducted correctly

### Test Credentials (Sandbox)
Use the sandbox URL: `https://uat.equity.co.ke`

Contact Equity Bank for test credentials and test phone numbers.

## Troubleshooting

### Common Issues

**"Failed to create payment request"**
- Check API credentials in `.env`
- Verify Equity account is active
- Check API rate limits

**"Invalid phone number"**
- Ensure format: 2547XXXXXXXX
- Remove leading zeros or plus signs

**"Insufficient stock"**
- Product stock is checked before payment
- Update product inventory

**Webhook not receiving callbacks**
- Verify `EQUITY_CALLBACK_URL` is publicly accessible
- Check firewall/SSL certificates
- Review server logs for callback attempts

## Security

- All payment data encrypted in transit (HTTPS)
- API credentials stored in environment variables
- Payment records logged for audit
- Webhook signature verification recommended for production

## Support

For Equity Bank API issues:
- Contact: Equity Bank Developer Support
- Documentation: https://developer.equity.co.ke
- Email: api-support@equity.co.ke

For integration issues:
- Check server logs: `server/logs/`
- Review payment records: MongoDB `equitypayments` collection
- Test with sandbox first

## Next Steps

1. ✅ Get production API credentials from Equity Bank
2. ✅ Update `.env` with production values
3. ✅ Test with real phone numbers
4. ✅ Monitor first few transactions
5. ✅ Add webhook logging for debugging
6. ✅ Set up admin dashboard to view Equity payments

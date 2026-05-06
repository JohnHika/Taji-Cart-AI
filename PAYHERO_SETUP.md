# PayHero Payment Gateway Integration Guide

## Overview

PayHero is a payment aggregator that simplifies payment processing for Kenyan businesses. Instead of integrating with multiple payment providers separately, PayHero provides a single API that handles:

- **M-Pesa** (STK Push, Paybill, Till Number)
- **Card Payments** (Visa, Mastercard)
- **Bank Transfers** (Direct bank payments)
- **Other Mobile Wallets** (Airtel Money, etc.)

## Why PayHero vs Direct Integration?

| Feature | PayHero | Direct Equity Bank | Direct M-Pesa |
|---------|---------|-------------------|---------------|
| **Setup Time** | 1-2 days | 2-4 weeks | 1-2 weeks |
| **Documentation** | Single API | Multiple docs | Daraja API |
| **Credentials** | 1 API Key | 5+ credentials | 3 credentials |
| **Maintenance** | One integration | Multiple integrations | Separate integration |
| **Payment Methods** | All in one | Bank only | M-Pesa only |
| **Settlement** | 1-2 business days | Same day | Instant |
| **Support** | Single point | Bank support | Safaricom support |

---

## Step 1: Registration & Account Setup

### 1.1 Create PayHero Account

1. **Visit**: https://app.payhero.co.ke/register
2. **Select Account Type**: Business Account
3. **Fill in Details**:
   - Business Name: **Nawiri Hair**
   - Business Email: Your business email
   - Phone Number: Your business phone (+254...)
   - Password: Create a strong password

### 1.2 Required Documents

Have these ready for verification:

1. **Business Registration Certificate** (CR12 or Certificate of Incorporation)
2. **Director's ID** (National ID or Passport)
3. **Director's KRA PIN Certificate**
4. **Business Bank Account Details** (for settlements)
5. **Tax Compliance Certificate** (optional but recommended)

### 1.3 Account Verification

1. **Upload Documents**: Scan and upload all required documents
2. **Wait for Approval**: 24-48 hours typically
3. **Activate Payment Channels**: Once approved, activate your payment channels

### 1.4 Create Payment Channel

After approval:

1. Login to PayHero Dashboard: https://app.payhero.co.ke
2. Go to **Payment Channels** → **Create New Channel**
3. **Channel Name**: `Nawiri Hair - Online Payments`
4. **Channel Type**: Select **M-Pesa Paybill** (recommended) or **Till Number**
5. **Configure**:
   - Link your M-Pesa Paybill/Till
   - Set callback URL (see below)
   - Enable STK Push
6. **Save** and note your **Channel ID** (e.g., `911`)

---

## Step 2: Configure Environment Variables

### 2.1 Get API Credentials

1. Login to PayHero Dashboard
2. Go to **Settings** → **API Credentials**
3. Click **Generate API Key**
4. Copy your **API Key** (format: `ph_live_xxxxxxxxxxxxx` or `ph_test_xxxxxxxxxxxxx`)

### 2.2 Update Server .env File

Add these to your `server/.env` file:

```env
# PayHero Payment Gateway
PAYHERO_BASE_URL=https://backend.payhero.co.ke
PAYHERO_API_KEY=ph_live_xxxxxxxxxxxxx  # Replace with your actual API key
PAYHERO_CHANNEL_ID=911  # Replace with your Channel ID from dashboard
PAYHERO_CALLBACK_URL=https://your-server-domain.com/api/payhero/callback
```

### 2.3 For Local Development (Testing)

```env
# Test mode (if PayHero provides sandbox)
PAYHERO_BASE_URL=https://backend.payhero.co.ke
PAYHERO_API_KEY=ph_test_xxxxxxxxxxxxx
PAYHERO_CHANNEL_ID=100  # Test channel ID
```

---

## Step 3: Configure Callback URL

PayHero will send payment confirmations to your callback URL.

### 3.1 Production Callback URL

Your callback URL should be publicly accessible:

```
https://your-domain.com/api/payhero/callback
```

### 3.2 Update in PayHero Dashboard

1. Go to **Payment Channels** → Select your channel
2. Click **Settings** or **Configuration**
3. Set **Callback URL**: `https://your-domain.com/api/payhero/callback`
4. Enable **Webhook Notifications**
5. Save changes

### 3.3 For Local Development

Use **ngrok** or similar to expose your localhost:

```bash
# Install ngrok
npm install -g ngrok

# Run ngrok
ngrok http 5000
```

This gives you a URL like: `https://abc123.ngrok.io`

Set callback URL to: `https://abc123.ngrok.io/api/payhero/callback`

---

## Step 4: Testing the Integration

### 4.1 Start Your Server

```bash
cd server
npm run dev
```

### 4.2 Start Your Client

```bash
cd client
npm run dev
```

### 4.3 Test Guest Checkout Flow

1. **Add items to cart** as a guest user
2. **Go to cart** and click "Checkout"
3. **Fill in contact details** (email, phone)
4. **Fill in shipping details** (address, city)
5. **Select Payment Method**: Choose **PayHero**
6. **Choose Payment Option**:
   - **Pay Online**: M-Pesa STK Push
   - **Cash on Delivery**: Pay when you receive
7. **Enter Phone Number**: Your M-Pesa registered number
8. **Click "Pay KES X,XXX via M-Pesa"**

### 4.4 Expected Flow

**Online Payment (M-Pesa STK Push)**:
1. ✅ Payment request sent
2. 📱 Receive M-Pesa prompt on phone
3. 🔢 Enter M-Pesa PIN
4. ✅ Payment confirmed
5. 📧 Order confirmation email sent
6. 📊 Order saved in database

**Cash on Delivery**:
1. ✅ Order placed successfully
2. 📞 Customer receives confirmation call/SMS
3. 📦 Order prepared for delivery
4. 💰 Customer pays on delivery
5. ✅ Order marked as completed

### 4.5 Check Payment Status

You can check payment status via API:

```bash
curl -X GET "http://localhost:5000/api/payhero/status/YOUR_CHECKOUT_REQUEST_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Step 5: Go Live Checklist

Before going live with real customers:

- [ ] PayHero account fully verified and approved
- [ ] Production API key obtained (not test key)
- [ ] Payment channel activated and configured
- [ ] Callback URL publicly accessible and tested
- [ ] Environment variables updated with production values
- [ ] Test transaction completed successfully (KSh 10-100)
- [ ] Order confirmation emails working
- [ ] Database orders saving correctly
- [ ] Stock deduction working
- [ ] Admin can view PayHero orders
- [ ] Refund/cancellation process tested

---

## Fee Structure & Business Impact

### PayHero Transaction Fees

PayHero charges competitive fees based on payment method:

| Payment Method | Fee Structure | Example (KSh 1,000) | Example (KSh 5,000) |
|---------------|---------------|---------------------|---------------------|
| **M-Pesa STK Push** | 1.5% - 2.5% | KSh 15 - 25 | KSh 75 - 125 |
| **Card Payments** | 2.5% - 3.5% | KSh 25 - 35 | KSh 125 - 175 |
| **Bank Transfer** | 0.5% - 1.5% | KSh 5 - 15 | KSh 25 - 75 |
| **Airtel Money** | 1.5% - 2.5% | KSh 15 - 25 | KSh 75 - 125 |
| **Cash on Delivery** | 0% (PayHero fee) | KSh 0 | KSh 0 |

**Note**: Fees may vary based on your negotiated rate with PayHero. Contact PayHero sales for volume discounts.

### Comparison with Other Payment Methods

| Provider | M-Pesa Fee | Card Fee | Settlement |
|----------|------------|----------|------------|
| **PayHero** | 1.5% - 2.5% | 2.5% - 3.5% | 1-2 days |
| **Direct M-Pesa** | ~1.0% | N/A | Instant |
| **Equity Bank EazzyPay** | ~1.5% | N/A | Same day |
| **Pesapal** | 2.0% - 3.0% | 3.0% - 4.0% | 2-3 days |
| **Flutterwave** | 1.8% - 2.8% | 2.8% - 3.8% | 1-2 days |

### Who Pays the Fees?

You have three options:

#### Option 1: Business Absorbs Fees (Recommended)
- **Pros**: Better customer experience, no surprise charges
- **Cons**: Reduces profit margin slightly
- **Implementation**: Include fees in product pricing

**Example**:
```
Product Price: KSh 1,000
PayHero Fee (2%): KSh 20
You Receive: KSh 980
```

#### Option 2: Pass Fees to Customer
- **Pros**: No impact on margins
- **Cons**: May reduce conversion, customers see extra charges
- **Implementation**: Add fee as line item at checkout

**Example**:
```
Product Price: KSh 1,000
Payment Fee (2%): KSh 20
Customer Pays: KSh 1,020
```

#### Option 3: Hybrid Model
- Absorb fees for orders above certain amount (e.g., KSh 3,000+)
- Pass fees to customer for smaller orders
- Encourages larger orders

### Impact on Nawiri Hair Business

#### Monthly Fee Projection

Assuming **50 orders/month** with average order value of **KSh 2,500**:

| Metric | Value |
|--------|-------|
| **Monthly Revenue** | KSh 125,000 |
| **PayHero Fees (2%)** | KSh 2,500 |
| **Net Revenue** | KSh 122,500 |
| **Fee as % of Revenue** | 2% |

#### Benefits vs Costs

**Costs**:
- Transaction fees: ~2% per order
- Time for reconciliation: Minimal (automated)

**Benefits**:
- ✅ **Increased Conversion**: 15-25% more completed checkouts
- ✅ **Reduced Cart Abandonment**: Multiple payment options
- ✅ **Professional Image**: Trust from branded payment flow
- ✅ **Automated Reconciliation**: Less manual work
- ✅ **Faster Settlement**: 1-2 days vs manual M-Pesa checking
- ✅ **Better Records**: All transactions in one dashboard
- ✅ **Customer Trust**: Recognized payment provider

#### ROI Calculation

**Before PayHero** (M-Pesa manual only):
- 100 cart visitors → 20 checkouts (20% conversion)
- Average order: KSh 2,500
- Monthly revenue: KSh 50,000 (assuming 20 orders)

**After PayHero** (Multiple payment options):
- 100 cart visitors → 30 checkouts (30% conversion)
- Average order: KSh 2,500
- Monthly revenue: KSh 75,000 (30 orders)
- PayHero fees: KSh 1,500 (2%)
- **Net gain**: KSh 23,500 additional revenue

**ROI**: **47,000% return** on KSh 2,500 fees (conservative estimate)

---

## Troubleshooting

### Common Issues

#### "Failed to initiate payment"
**Causes**:
- Invalid API key
- Payment channel not active
- Insufficient funds in PayHero wallet (if applicable)

**Solutions**:
1. Verify API key in `.env` file
2. Check payment channel status in dashboard
3. Contact PayHero support

#### "Invalid phone number"
**Causes**:
- Wrong format

**Solutions**:
- Use format: `07XX XXX XXX` or `2547XX XXX XXX`
- Ensure phone is M-Pesa registered

#### "Callback not received"
**Causes**:
- Callback URL not publicly accessible
- Firewall blocking PayHero
- SSL certificate issues

**Solutions**:
1. Use HTTPS URL
2. Ensure server is publicly accessible
3. Check firewall settings
4. Test with ngrok for local development

#### "Payment successful but order not updated"
**Causes**:
- Database connection issue
- Order not found in database

**Solutions**:
1. Check server logs
2. Verify MongoDB connection
3. Check order ID matching logic

---

## Support & Resources

### PayHero Contact

- **Website**: https://payherokenya.com
- **Dashboard**: https://app.payhero.co.ke
- **Developer Docs**: https://docs.payhero.co.ke
- **Email**: info@payherokenya.com
- **Phone**: +254 7XX XXX XXX (check website)
- **Support Hours**: Mon-Fri, 8AM-5PM EAT

### GitHub Samples

- **PHP Sample**: https://github.com/PAY-HERO-KENYA/ph_deposit_sample
- **Payment Button**: https://github.com/PAY-HERO-KENYA/payment_button

### Your Integration Files

**Backend**:
- `server/config/payhero.js` - API configuration
- `server/controllers/payhero.controller.js` - Payment logic
- `server/route/payhero.route.js` - API routes
- `server/app.js` - Router mounted

**Frontend**:
- `client/src/components/PayHeroPayment.jsx` - Payment form
- `client/src/pages/GuestCheckout.jsx` - Checkout page
- `client/src/common/SummaryApi.js` - API endpoints

---

## Next Steps

1. ✅ **Register PayHero Account** (if not done)
2. ✅ **Get API Credentials** from dashboard
3. ✅ **Update `.env`** with your credentials
4. ✅ **Test with small amount** (KSh 10-100)
5. ✅ **Verify callback** is working
6. ✅ **Complete first real order**
7. ✅ **Monitor dashboard** for transactions
8. ✅ **Go live** and inform customers

---

## Summary

PayHero provides Nawiri Hair with:
- **Simpler setup** than direct bank integrations
- **Multiple payment methods** in one integration
- **Professional payment experience** for customers
- **Automated reconciliation** and reporting
- **Competitive fees** (1.5-2.5% for M-Pesa)
- **Fast settlement** (1-2 business days)

The small transaction fee is outweighed by:
- Increased conversion rates
- Reduced cart abandonment
- Professional brand image
- Time saved on manual payment checking

**Recommended**: Start with PayHero for all online payments, keep M-Pesa direct as backup, and use Cash on Delivery for customers who prefer it.

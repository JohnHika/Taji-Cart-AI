# 🧪 Testing Guide - M-Pesa Direct + Free SMS

## ✅ What's Ready to Test

1. **M-Pesa Direct Payment** - 0.55% fee (cheapest option)
2. **Unique Order Codes** - Auto-generated for each order
3. **FREE SMS Confirmations** - Via email-to-SMS gateway
4. **Automatic Payment Verification** - No manual checking

---

## 🚀 Quick Test Steps

### Step 1: Start Your Server

```bash
cd C:\Projects\Taji-Cart-AI\server
npm run dev
```

✅ Look for: `Server running on port 3001`

### Step 2: Start Your Client

```bash
cd C:\Projects\Taji-Cart-AI\client
npm run dev
```

✅ Look for: `Local: http://localhost:5173`

### Step 3: Test M-Pesa Direct Payment

1. **Open browser**: http://localhost:5173
2. **Add a product to cart** (any item)
3. **Click cart icon** → "Checkout"
4. **Fill in guest details**:
   - Email: your-email@example.com
   - Phone: **Your M-Pesa number** (07XX XXX XXX)
5. **Fill shipping address**:
   - Name, Street, City (e.g., Nairobi)
6. **Select Payment Method**: Click **"M-Pesa Direct"** (green card with "BEST VALUE")
7. **Enter phone number** and click **"Pay via M-Pesa"**

---

## 📱 Expected Flow

### 1. STK Push Sent (5-10 seconds)
```
✅ Toast: "STK Push sent! Check your phone..."
```

### 2. M-Pesa Prompt on Phone
```
M-Pesa Menu
Pay KSh [Amount] to Nawiri Hair
Enter PIN to confirm
```

### 3. Enter PIN on Phone
- Customer enters M-Pesa PIN
- Payment processes

### 4. Payment Confirmation (Automatic)
```
✅ Screen shows:
   - Unique Order Code: NAW-LKX3D9-A7F2B1
   - Order ID: ORD-12345
   - "Payment Confirmed!"
```

### 5. FREE SMS Received (1-5 minutes)
```
NAWIRI HAIR: Payment confirmed! Order ORD-12345 - KSh 1,500.
Unique code: NAW-LKX3D9-A7F2B1. We'll contact you for delivery. Asante!
```

---

## 🔍 Verify Payment in Database

### Check MongoDB:

```bash
# Connect to MongoDB
mongosh "mongodb+srv://johnkimani576_db_user:Vwca0Cx9HHv6FaoS@cluster0.3zocvsx.mongodb.net/?appName=Cluster0"

# Find recent orders
use taji-cart
db.orders.find({ paymentMethod: 'mpesa' }).sort({ createdAt: -1 }).limit(5)
```

### Expected Result:
```javascript
{
  _id: ObjectId("..."),
  orderId: "ORD-1234567890-ABC123",
  orderReference: "NAW-LKX3D9-A7F2B1", // UNIQUE CODE
  checkoutRequestId: "ws_1234567890",
  payment_status: "paid",
  paymentMethod: "mpesa",
  totalAmt: 1500,
  guestPhone: "254712345678",
  status: "confirmed",
  statusHistory: [
    {
      status: "pending",
      note: "Order created. Unique code: NAW-LKX3D9-A7F2B1..."
    },
    {
      status: "confirmed",
      note: "Payment confirmed via M-Pesa. Receipt: QKH12345678"
    }
  ],
  paymentDetails: {
    receiptNumber: "QKH12345678",
    amount: 1500,
    transactionDate: "20260415120000",
    phoneNumber: "254712345678",
    provider: "mpesa",
    uniqueCode: "NAW-LKX3D9-A7F2B1"
  }
}
```

---

## 📧 Test FREE SMS

### Check Server Logs:

After payment confirmation, look for:
```
📱 FREE SMS sent via email gateway to: 254712345678
✅ FREE SMS sent via email gateway to: 254712345678
```

### If SMS Doesn't Arrive:

1. **Check spam/junk folder** (email-to-SMS sometimes flagged)
2. **Wait up to 5 minutes** (gateway can be slow)
3. **Verify phone number** is Safaricom or Airtel Kenya
4. **Check Resend/SMTP credentials** in `.env`

### Alternative: Use Email Instead

If SMS gateway doesn't work reliably in your area, customers receive email confirmation instead (already configured via Resend).

---

## 🎯 Test Checklist

### Basic Payment Flow:
- [ ] Can add items to cart
- [ ] Guest checkout form works
- [ ] M-Pesa Direct option visible (green "BEST VALUE" card)
- [ ] STK Push received on phone
- [ ] Can enter PIN and complete payment
- [ ] Unique code displayed on screen
- [ ] Order saved in database
- [ ] Payment status changes to "paid"

### FREE SMS:
- [ ] SMS received within 5 minutes
- [ ] SMS contains correct order details
- [ ] SMS contains unique order code
- [ ] SMS contains correct amount

### Security:
- [ ] Unique code is different for each order
- [ ] Code matches order amount
- [ ] Payment goes to your Paybill (174379)
- [ ] Callback updates order automatically

---

## 🐛 Troubleshooting

### "STK Push failed"
**Causes:**
- Insufficient M-Pesa balance
- Wrong phone number format
- M-Pesa service temporarily down

**Solution:**
1. Ensure phone has M-Pesa balance
2. Use format: `0712345678` or `254712345678`
3. Wait 1 minute, try again

### "Payment not confirmed"
**Causes:**
- Callback URL not accessible
- Network timeout
- M-Pesa sandbox mode

**Solution:**
1. Check server logs for callback
2. Verify `BACKEND_URL` in `.env`
3. Check MongoDB for order status

### "SMS not received"
**Causes:**
- Email-to-SMS gateway slow
- Carrier blocking gateway emails
- Wrong phone number format

**Solution:**
1. Wait up to 10 minutes
2. Check email spam folder
3. Verify phone is Safaricom/Airtel Kenya
4. Use email confirmation instead (already working via Resend)

---

## 💰 Test with Real Money

### Recommended Test Amount: KSh 10-100

This verifies:
- ✅ Real M-Pesa transaction works
- ✅ Callback receives real payment
- ✅ Unique code generated correctly
- ✅ Stock deducted properly
- ✅ FREE SMS sent successfully

### After Test:
- Check M-Pesa message for deduction
- Verify order in database
- Confirm unique code matches
- Check SMS received

---

## 📊 Fee Verification

After successful payment, check:

**M-Pesa charges you:**
- Transaction: KSh 100
- M-Pesa fee: 0.55% = KSh 0.55 (charged to business, not customer)

**You receive:**
- KSh 100 - KSh 0.55 = **KSh 99.45**

Compare to PayHero (2%):
- KSh 100 - KSh 2.00 = KSh 98.00

**You save: KSh 1.45 per KSh 100 transaction!**

---

## 🎉 Success Indicators

You'll know everything works when:

1. ✅ Customer receives M-Pesa prompt within 10 seconds
2. ✅ Payment confirmation appears after entering PIN
3. ✅ Unique order code displayed: `NAW-XXXXX-XXXXX`
4. ✅ Order saved in database with status "confirmed"
5. ✅ FREE SMS received with order details
6. ✅ M-Pesa deduction message received
7. ✅ Transaction appears in your M-Pesa statement

---

## 📞 Next Steps After Testing

### If Everything Works:
1. Update `BACKEND_URL` in `.env` to production domain
2. Test with production callback URL
3. Monitor first 10-20 real customer orders
4. Consider upgrading to Africa's Talking for faster SMS (optional)

### If Issues Occur:
1. Check server logs for errors
2. Verify M-Pesa credentials in `.env`
3. Test callback URL manually
4. Contact Safaricom Daraja support: api-support@safaricom.co.ke

---

## 🆚 Comparison: FREE SMS vs Paid

| Feature | FREE (Email-to-SMS) | Africa's Talking |
|---------|---------------------|------------------|
| **Cost** | KSh 0 | ~KSh 0.80/SMS |
| **Delivery Speed** | 1-5 minutes | Instant |
| **Reliability** | 70-80% | 99% |
| **Character Limit** | 160 | 160 (concatenate for longer) |
| **Best For** | Small businesses, startups | High-volume, professional |

**Recommendation:** Start with FREE SMS, upgrade to Africa's Talking when you process 50+ orders/day.

---

## 🚀 Ready to Go Live!

Once testing is successful:

1. ✅ Update `.env` with production `BACKEND_URL`
2. ✅ Test callback URL is publicly accessible
3. ✅ Monitor first few transactions closely
4. ✅ Keep unique codes for customer support
5. ✅ Train staff on order verification using codes

**You're now using the same system as major Kenyan e-commerce sites!** 🇰🇪

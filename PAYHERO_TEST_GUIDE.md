# PayHero Integration - Quick Start Test Guide

## ✅ Configuration Complete

Your PayHero credentials are now saved in `server/.env`:

```env
PAYHERO_API_KEY=aYCf2qtPE56jlM5l293H
PAYHERO_CHANNEL_ID=7798
PAYHERO_BASE_URL=https://backend.payhero.co.ke
```

---

## 🧪 Testing Steps

### Step 1: Restart Your Server

```bash
cd C:\Projects\Taji-Cart-AI\server
npm run dev
```

Look for this in the logs:
```
✅ Server running on port 3001
```

### Step 2: Start Your Client

```bash
cd C:\Projects\Taji-Cart-AI\client
npm run dev
```

### Step 3: Test Guest Checkout Flow

1. **Open browser**: http://localhost:5173
2. **Add a product to cart** (any hair product)
3. **Click cart icon** → "Checkout"
4. **Fill in guest details**:
   - Email: your-email@example.com
   - Phone: 07XX XXX XXX (your M-Pesa number)
5. **Fill shipping address**:
   - Name, Street, City (e.g., Nairobi)
6. **Select Payment Method**: Click **PayHero** (purple card with "RECOMMENDED")
7. **Choose Payment Option**:
   - **Pay Online** → M-Pesa STK Push
   - **Pay on Delivery** → Cash when you receive
8. **Enter phone number** and click payment button

### Step 4: Expected Results

#### For Online Payment (M-Pesa STK Push):
1. ✅ Toast: "Payment request sent! Check your phone..."
2. 📱 **M-Pesa prompt** on your phone within 5-10 seconds
3. 🔢 **Enter your M-Pesa PIN**
4. ✅ **Payment confirmation** toast
5. 📧 **Order confirmation email** sent
6. 📊 **Order saved** in database with status "pending" → "confirmed"

#### For Cash on Delivery:
1. ✅ Toast: "Order placed successfully! You will pay on delivery"
2. 📊 **Order saved** with payment status "pending"
3. 📞 **Customer contact** for delivery confirmation

---

## 🔍 Verify Payment in Database

### Check MongoDB

Connect to your MongoDB and run:

```javascript
// Check recent orders
db.orders.find({ paymentMethod: 'payhero' }).sort({ createdAt: -1 }).limit(5)

// Check order status
db.orders.findOne({ orderId: /ORD-/ }).statusHistory
```

### Check PayHero Dashboard

1. Login: https://app.payhero.co.ke
2. Go to **Transactions** or **Payments**
3. You should see your test transaction
4. Status should show: **Completed** (for successful M-Pesa payment)

---

## 🐛 Troubleshooting

### "Payment request failed"

**Check logs**:
```bash
# In server terminal, look for:
PayHero STK Push Error: ...
```

**Common fixes**:
1. Ensure `PAYHERO_API_KEY` is correct (no extra spaces)
2. Check `PAYHERO_CHANNEL_ID` is `7798`
3. Verify phone number format: `07XX XXX XXX` or `2547XX XXX XXX`
4. Ensure M-Pesa is registered on that number

### "Invalid phone number"

**Solution**: Use Kenyan format only:
- ✅ `0712345678`
- ✅ `254712345678`
- ❌ `+254712345678` (remove the +)
- ❌ `0112345678` (must be 07 or 01)

### No M-Pesa prompt received

**Possible causes**:
1. Phone not M-Pesa registered
2. M-Pesa service temporarily down
3. Insufficient funds in PayHero wallet (if required)
4. Network timeout

**Solution**:
- Wait 1-2 minutes, then try again
- Test with different phone number
- Check PayHero dashboard for transaction status

### Callback not working

**For production**, ensure:
1. Your server is publicly accessible (not localhost)
2. Callback URL is set in PayHero dashboard
3. SSL certificate is valid (HTTPS)

**For local testing**, use ngrok:
```bash
ngrok http 3001
# Copy the ngrok URL and set as callback in PayHero dashboard
```

---

## 📊 Monitor Your Transactions

### PayHero Dashboard
- URL: https://app.payhero.co.ke
- View: Transactions, Settlements, Reports

### Your Database
```javascript
// All PayHero orders
db.orders.find({ paymentMethod: 'payhero' })

// Pending payments
db.orders.find({ paymentMethod: 'payhero', payment_status: 'pending' })

// Completed payments
db.orders.find({ paymentMethod: 'payhero', payment_status: 'paid' })
```

---

## 💰 Test with Small Amount First

**Recommended**: Test with KSh 10-100 first to verify everything works before processing real customer orders.

**Create a test product**:
1. Go to admin panel
2. Create product: "Test Item"
3. Price: KSh 10
4. Stock: 100
5. Test checkout with this item

---

## ✅ Go-Live Checklist

Before accepting real customer payments:

- [ ] Test transaction completed successfully
- [ ] M-Pesa prompt received on phone
- [ ] Payment confirmation works
- [ ] Order saved in database
- [ ] Email notification sent
- [ ] Stock deducted correctly
- [ ] Cash on Delivery option works
- [ ] Admin can view PayHero orders
- [ ] Callback URL configured (for production)
- [ ] Production domain added to PayHero dashboard

---

## 📞 Support

### PayHero Support
- **Dashboard**: https://app.payhero.co.ke
- **Email**: info@payherokenya.com
- **Docs**: https://docs.payhero.co.ke

### Your Integration Files
- Backend: `server/controllers/payhero.controller.js`
- Frontend: `client/src/components/PayHeroPayment.jsx`
- Setup Guide: `PAYHERO_SETUP.md`

---

## 🎉 Success Indicators

You'll know it's working when:
1. ✅ Customer receives M-Pesa prompt within 10 seconds
2. ✅ Payment confirmation appears after entering PIN
3. ✅ Order appears in your database with status "confirmed"
4. ✅ Transaction appears in PayHero dashboard
5. ✅ Customer receives order confirmation email

**Next**: Test with a real customer order and monitor the first few transactions closely!

import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import { initiateSTKPush, querySTKStatus } from '../config/mpesa.js';
import axios from 'axios';

// Generate unique order reference code
const generateOrderReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NAW-${timestamp}-${random}`;
};

// Create M-Pesa payment with unique order code
export const createMpesaPayment = async (req, res) => {
  try {
    const {
      phoneNumber,
      amount,
      userId,
      addressId,
      list_items,
      subTotalAmt,
      totalAmt,
      guestEmail,
      guestPhone,
      guestShipping,
      fulfillment_type,
      pickup_location,
      pickup_instructions
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !amount || !list_items || list_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }

    // Format phone number (Kenyan format: 2547XXXXXXXX)
    let formattedPhone = phoneNumber.replace(/^[\+]?/, '').replace(/^0/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Validate phone number
    if (!formattedPhone.match(/^2547\d{8}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Use format: 07XX XXX XXX or 2547XX XXX XXX'
      });
    }

    // Check stock availability
    for (const item of list_items) {
      const product = await ProductModel.findById(item.productId?._id || item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId?.name || 'unknown'} not found`
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }
    }

    // Generate unique order reference
    const orderReference = generateOrderReference();
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const checkoutRequestId = new mongoose.Types.ObjectId().toString();

    // Determine if guest or registered user
    const isGuest = !userId || userId === 'guest';

    // Initiate M-Pesa STK Push
    const mpesaPayload = {
      phoneNumber: formattedPhone,
      amount: Math.round(amount),
      accountReference: orderReference, // UNIQUE ORDER CODE - matches with order
      description: `Payment for order ${orderId} - Nawiri Hair`
    };

    const mpesaResponse = await initiateSTKPush(mpesaPayload);

    if (!mpesaResponse || !mpesaResponse.CheckoutRequestID) {
      throw new Error('Failed to initiate M-Pesa payment');
    }

    // Create order in database
    const newOrder = await Order.create({
      userId: isGuest ? undefined : userId,
      orderId,
      checkoutRequestId: mpesaResponse.CheckoutRequestID,
      isGuest: isGuest,
      guestEmail: isGuest ? guestEmail : undefined,
      guestPhone: isGuest ? guestPhone : formattedPhone,
      guestShipping: isGuest ? guestShipping : undefined,
      delivery_address: isGuest ? undefined : addressId,
      items: list_items,
      subTotalAmt,
      totalAmt,
      payment_status: 'pending',
      paymentMethod: 'mpesa',
      orderReference, // UNIQUE CODE for matching
      fulfillment_type: fulfillment_type || 'delivery',
      pickup_location: pickup_location || '',
      pickup_instructions: pickup_instructions || '',
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: `Order created. Unique code: ${orderReference}. Awaiting M-Pesa payment.`
      }]
    });

    // Deduct stock temporarily (will restore if payment fails)
    for (const item of list_items) {
      const productId = item.productId?._id || item.productId;
      await ProductModel.findByIdAndUpdate(productId, {
        $inc: { stock: -item.quantity }
      });
    }

    res.json({
      success: true,
      message: '✅ Payment request sent! Check your phone and enter M-Pesa PIN to complete payment.',
      transactionId: mpesaResponse.CheckoutRequestID,
      orderId: orderId,
      orderReference: orderReference,
      data: {
        CheckoutRequestID: mpesaResponse.CheckoutRequestID,
        ResponseDescription: mpesaResponse.ResponseDescription,
        CustomerMessage: mpesaResponse.CustomerMessage,
        uniqueCode: orderReference
      }
    });

  } catch (error) {
    console.error('M-Pesa payment error:', error);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Payment initiation failed. Please try again.'
    });
  }
};

// M-Pesa callback (webhook from Safaricom)
export const mpesaCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log('📞 M-Pesa Callback received:', JSON.stringify(callbackData, null, 2));

    const { Body } = callbackData;
    const { stkCallback } = Body || {};
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback || {};

    // Find order by CheckoutRequestID
    const order = await Order.findOne({ checkoutRequestId: CheckoutRequestID });

    if (!order) {
      console.error('❌ Order not found for CheckoutRequestID:', CheckoutRequestID);
      return res.status(200).json({ success: true }); // Still return success to M-Pesa
    }

    // ResultCode 0 = Success
    if (ResultCode === 0) {
      // Extract payment details from callback
      const paymentDetails = {};
      if (CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach(item => {
          if (item.Name === 'MpesaReceiptNumber') paymentDetails.receiptNumber = item.Value;
          if (item.Name === 'Amount') paymentDetails.amount = item.Value;
          if (item.Name === 'TransactionDate') paymentDetails.transactionDate = item.Value;
          if (item.Name === 'PhoneNumber') paymentDetails.phoneNumber = item.Value;
        });
      }

      // Update order to PAID
      order.payment_status = 'paid';
      order.status = 'confirmed';
      order.paymentDetails = {
        receiptNumber: paymentDetails.receiptNumber,
        amount: paymentDetails.amount,
        transactionDate: paymentDetails.transactionDate,
        phoneNumber: paymentDetails.phoneNumber,
        provider: 'mpesa',
        uniqueCode: order.orderReference
      };
      order.statusHistory.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: `✅ Payment confirmed via M-Pesa. Receipt: ${paymentDetails.receiptNumber}. Unique code: ${order.orderReference}`
      });

      await order.save();

      console.log('✅ Order payment confirmed:', order.orderId, 'Receipt:', paymentDetails.receiptNumber);

      // 📧 Send confirmation SMS to customer
      // Option 1: Africa's Talking (paid, reliable)
      // Option 2: Email-to-SMS gateway (FREE but limited)
      try {
        const customerPhone = order.guestPhone || paymentDetails.phoneNumber;
        const smsMessage = `NAWIRI HAIR: Payment confirmed! Order ${order.orderId} - KSh ${order.totalAmt}. Unique code: ${order.orderReference}. We'll contact you for delivery. Asante!`;

        // FREE: Send via Email-to-SMS gateway (works for Safaricom & Airtel Kenya)
        // Safaricom: phone_number@safaricomsms.co.ke
        // Airtel: phone_number@airtel.co.ke
        const { sendEmailSMS } = await import('../utils/emailSMS.js');
        await sendEmailSMS(customerPhone, smsMessage);
        console.log('📱 FREE SMS sent to:', customerPhone);

        // Alternative: Africa's Talking (uncomment if you have credentials)
        /*
        if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
          await axios.post('https://api.africastalking.com/version1/messaging',
            {
              to: customerPhone,
              message: smsMessage,
              from: 'NawiriHair'
            },
            {
              headers: {
                'apikey': process.env.AT_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
          console.log('📱 Africa's Talking SMS sent to:', customerPhone);
        }
        */
      } catch (smsError) {
        console.error('SMS sending error:', smsError.message);
        // Don't fail the order if SMS fails
      }

    } else {
      // Payment failed or cancelled
      order.payment_status = 'failed';
      order.status = 'cancelled';
      order.statusHistory.push({
        status: 'payment_failed',
        timestamp: new Date(),
        note: `❌ Payment failed: ${ResultDesc}`
      });
      await order.save();

      // Restore stock for failed payment
      for (const item of order.items) {
        const productId = item.productId?._id || item.productId;
        await ProductModel.findByIdAndUpdate(productId, {
          $inc: { stock: item.quantity }
        });
      }

      console.log('❌ Order payment failed:', order.orderId, ResultDesc);
    }

    // Always return success to M-Pesa
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('M-Pesa callback error:', error);
    // Still return success to prevent M-Pesa retries
    res.status(200).json({ success: false, message: error.message });
  }
};

// Check payment status (for polling)
export const checkMpesaStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        message: 'Checkout request ID is required'
      });
    }

    // Query M-Pesa API for status
    const statusResponse = await querySTKStatus(checkoutRequestId);

    // Find order in database
    const order = await Order.findOne({ checkoutRequestId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      status: statusResponse.ResultCode === 0 ? 'paid' : 'pending',
      resultDescription: statusResponse.ResultDesc,
      orderReference: order.orderReference,
      orderId: order.orderId
    });

  } catch (error) {
    console.error('Check M-Pesa status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check payment status'
    });
  }
};

// Verify payment by unique order reference
export const verifyPaymentByReference = async (req, res) => {
  try {
    const { orderReference } = req.params;

    const order = await Order.findOne({ orderReference });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found with this reference code'
      });
    }

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        orderReference: order.orderReference,
        status: order.status,
        payment_status: order.payment_status,
        totalAmt: order.totalAmt,
        customerPhone: order.guestPhone,
        receiptNumber: order.paymentDetails?.receiptNumber
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Verification failed'
    });
  }
};

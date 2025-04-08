import axios from 'axios';
import mongoose from 'mongoose';
import { getAuthToken, MPESA_STK_URL } from '../config/mpesa.js';
import CartProductModel from "../models/cartproduct.model.js";
import OrderModel from '../models/order.model.js';
import UserModel from '../models/user.model.js';

// Generate timestamp in YYYYMMDDHHmmss format
const generateTimestamp = () => {
  const date = new Date();
  return date.getFullYear() +
    ('0' + (date.getMonth() + 1)).slice(-2) +
    ('0' + date.getDate()).slice(-2) +
    ('0' + date.getHours()).slice(-2) +
    ('0' + date.getMinutes()).slice(-2) +
    ('0' + date.getSeconds()).slice(-2);
};

export async function initiateSTKPush(request, response) {
  try {
    const { phoneNumber, amount, userId, addressId, list_items, subTotalAmt, totalAmt } = request.body;
    
    // Format phone number (remove + and country code if needed)
    const formattedPhone = phoneNumber.replace(/^(\+?254|0)/, '254');
    
    // Get M-Pesa auth token
    const token = await getAuthToken();
    
    // Generate timestamp
    const timestamp = generateTimestamp();
    
    // Generate password (shortcode + passkey + timestamp)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');
    
    // Create a checkout request ID to link this transaction
    const checkoutRequestId = new mongoose.Types.ObjectId().toString();
    
    // Prepare STK push request
    const requestData = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.BACKEND_URL}/api/mpesa/callback`,
      AccountReference: `Taji Cart - Order #${checkoutRequestId}`,
      TransactionDesc: 'Payment for online purchase'
    };
    
    // Store pending order in database instead of session
    await OrderModel.create({
      userId,
      orderId: `ORD-${checkoutRequestId}`,
      checkoutRequestId, // Store this to match with callback
      delivery_address: addressId,
      items: list_items,
      subTotalAmt,
      totalAmt,
      payment_status: 'pending',
      paymentMethod: 'mpesa',
      createdAt: new Date()
    });
    
    // Make request to M-Pesa API
    const mpesaResponse = await axios.post(MPESA_STK_URL, requestData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.status(200).json({
      message: 'STK push sent successfully',
      data: mpesaResponse.data,
      error: false,
      success: true
    });
    
  } catch (error) {
    console.error('M-Pesa STK Push Error:', error);
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    });
  }
}

export async function handleMpesaCallback(request, response) {
  try {
    // Get the callback data
    const callbackData = request.body;
    
    // Check if the payment was successful
    if (callbackData.Body.stkCallback.ResultCode === 0) {
      // Find the pending order
      const pendingOrder = await OrderModel.findOne({ 
        checkoutRequestId: callbackData.Body.stkCallback.CheckoutRequestID 
      });
      
      if (!pendingOrder) {
        console.error('No pending order found');
        return response.status(200).json({ success: true });
      }
      
      // Update order status
      pendingOrder.payment_status = 'paid';
      pendingOrder.paymentId = callbackData.Body.stkCallback.CheckoutRequestID;
      await pendingOrder.save();
      
      // Clear cart after successful order
      await UserModel.findByIdAndUpdate(pendingOrder.userId, {
        shopping_cart: []
      });
      await CartProductModel.deleteMany({ userId: pendingOrder.userId });
    } else {
      // Payment failed - you might want to update the order status as failed
      console.error('M-Pesa payment failed:', callbackData.Body.stkCallback.ResultDesc);
    }
    
    // Always respond with success to M-Pesa
    return response.status(200).json({ success: true });
    
  } catch (error) {
    console.error('M-Pesa Callback Error:', error);
    return response.status(200).json({ success: true }); // Always return success to M-Pesa
  }
}
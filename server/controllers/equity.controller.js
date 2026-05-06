import mongoose from 'mongoose';
import EquityOrder from '../models/equityPayment.model.js';
import { getEquityAuthToken, createPaymentRequest } from '../config/equity.js';
import Order from '../models/order.model.js';
import ProductModel from '../models/product.model.js';

// Create Equity Bank payment (EazzyPay)
export const equityPayment = async (req, res) => {
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

    // Format phone number (remove leading 0 or +, add 254)
    let formattedPhone = phoneNumber.replace(/^[\+]?/, '').replace(/^0/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
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

    // Get Equity auth token
    const accessToken = await getEquityAuthToken();

    // Generate order ID
    const checkoutRequestId = new mongoose.Types.ObjectId().toString();
    const orderId = `ORD-${checkoutRequestId}`;

    // Create payment request payload for Equity EazzyPay
    const paymentPayload = {
      accountNumber: process.env.EQUITY_ACCOUNT_NUMBER,
      accountType: 'EazzyPay',
      currency: 'KES',
      transactionReference: orderId,
      paymentInformation: [
        {
          paybill: process.env.EQUITY_PAYBILL,
          accountNumber: formattedPhone,
          amount: amount,
          narrative: `Payment for order ${orderId}`
        }
      ]
    };

    // Create payment request
    const equityResponse = await createPaymentRequest(accessToken, paymentPayload);

    if (!equityResponse || !equityResponse.status) {
      throw new Error('Failed to create payment request');
    }

    // Determine if guest or registered user
    const isGuest = !userId || userId === 'guest';

    // Create order in database (similar to M-Pesa)
    const newOrder = await Order.create({
      userId: isGuest ? undefined : userId,
      orderId,
      checkoutRequestId,
      isGuest: isGuest,
      guestEmail: isGuest ? guestEmail : undefined,
      guestPhone: isGuest ? guestPhone : undefined,
      guestShipping: isGuest ? guestShipping : undefined,
      delivery_address: isGuest ? undefined : addressId,
      items: list_items,
      subTotalAmt,
      totalAmt,
      payment_status: 'pending',
      paymentMethod: 'equity',
      fulfillment_type: fulfillment_type || 'delivery',
      pickup_location: pickup_location || '',
      pickup_instructions: pickup_instructions || '',
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created, awaiting Equity Bank payment'
      }]
    });

    // Deduct stock
    for (const item of list_items) {
      const productId = item.productId?._id || item.productId;
      await ProductModel.findByIdAndUpdate(productId, {
        $inc: { stock: -item.quantity }
      });
    }

    res.json({
      success: true,
      message: 'Payment request sent successfully. Please check your phone to complete payment.',
      transactionId: checkoutRequestId,
      orderId: orderId,
      data: equityResponse
    });

  } catch (error) {
    console.error('Equity payment error:', error);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Payment failed. Please try again.'
    });
  }
};

// Check payment status
export const checkEquityPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const payment = await EquityOrder.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Get auth token
    const accessToken = await getEquityAuthToken();

    // Check status with Equity API
    const statusResponse = await checkPaymentStatus(accessToken, transactionId);

    // Update payment status
    payment.status = statusResponse.status || payment.status;
    await payment.save();

    res.json({
      success: true,
      status: payment.status,
      data: statusResponse
    });

  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check payment status'
    });
  }
};

// Webhook callback from Equity Bank
export const equityPaymentCallback = async (req, res) => {
  try {
    const { transactionId, status, amount, phoneNumber } = req.body;

    console.log('Equity callback received:', req.body);

    // Find payment record
    const payment = await EquityOrder.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Update payment status
    payment.status = status;
    payment.callbackData = req.body;
    await payment.save();

    // If payment completed, create order
    if (status === 'completed' || status === 'success') {
      // Create order logic here (similar to M-Pesa)
      const orderData = {
        userId: payment.userId,
        items: payment.items,
        subTotalAmt: payment.subTotalAmt,
        totalAmt: payment.totalAmt,
        paymentMode: 'equity',
        paymentStatus: 'paid',
        transactionId: transactionId,
        shipping: payment.addressId ? undefined : {
          name: payment.guestName,
          phone: payment.phoneNumber,
          address: payment.pickup_location || 'Pickup'
        },
        fulfillment_type: payment.fulfillment_type,
        pickup_location: payment.pickup_location,
        pickup_instructions: payment.pickup_instructions,
        isGuest: payment.userId === 'guest'
      };

      const order = new Order(orderData);
      await order.save();

      payment.orderId = order._id;
      await payment.save();
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Equity callback error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

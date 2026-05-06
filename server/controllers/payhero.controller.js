import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import { initiateSTKPush, checkPaymentStatus, formatPhoneNumber } from '../config/payhero.js';

// Create PayHero payment (Online Payment - M-Pesa STK Push)
export const createPayHeroPayment = async (req, res) => {
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
      pickup_instructions,
      customerName
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !amount || !list_items || list_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Validate phone number format
    if (!formattedPhone.match(/^2547\d{8}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please use format: 07XX XXX XXX or 2547XX XXX XXX'
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

    // Generate order ID
    const checkoutRequestId = new mongoose.Types.ObjectId().toString();
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Determine if guest or registered user
    const isGuest = !userId || userId === 'guest';

    // Build callback URL
    const callbackUrl = `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/payhero/callback`;

    // Initiate PayHero STK Push
    const payHeroPayload = {
      amount: Math.round(amount), // PayHero expects integer
      phoneNumber: formattedPhone,
      externalReference: orderId,
      customerName: customerName || (isGuest ? 'Guest Customer' : 'Registered Customer'),
      callbackUrl: callbackUrl,
      email: isGuest ? guestEmail : undefined,
      description: `Payment for order ${orderId} - ${list_items.length} items`
    };

    const payHeroResponse = await initiateSTKPush(payHeroPayload);

    if (!payHeroResponse || !payHeroResponse.CheckoutRequestID) {
      throw new Error('Failed to initiate PayHero payment');
    }

    // Create order in database
    const newOrder = await Order.create({
      userId: isGuest ? undefined : userId,
      orderId,
      checkoutRequestId: payHeroResponse.CheckoutRequestID,
      isGuest: isGuest,
      guestEmail: isGuest ? guestEmail : undefined,
      guestPhone: isGuest ? guestPhone : formattedPhone,
      guestShipping: isGuest ? guestShipping : undefined,
      delivery_address: isGuest ? undefined : addressId,
      items: list_items,
      subTotalAmt,
      totalAmt,
      payment_status: 'pending',
      paymentMethod: 'payhero',
      fulfillment_type: fulfillment_type || 'delivery',
      pickup_location: pickup_location || '',
      pickup_instructions: pickup_instructions || '',
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created, awaiting PayHero M-Pesa payment'
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
      message: 'Payment request sent successfully. Please check your phone and enter your M-Pesa PIN to complete payment.',
      transactionId: payHeroResponse.CheckoutRequestID,
      orderId: orderId,
      data: {
        checkoutRequestId: payHeroResponse.CheckoutRequestID,
        customerMessage: payHeroResponse.CustomerMessage,
        responseDescription: payHeroResponse.ResponseDescription
      }
    });

  } catch (error) {
    console.error('PayHero payment error:', error);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Payment initiation failed. Please try again.'
    });
  }
};

// Create Cash on Delivery Order
export const createCashOnDeliveryOrder = async (req, res) => {
  try {
    const {
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
      pickup_instructions,
      customerName,
      phoneNumber
    } = req.body;

    // Validate required fields
    if (!list_items || list_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
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

    // Generate order ID
    const orderId = `COD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Determine if guest or registered user
    const isGuest = !userId || userId === 'guest';

    // Create order in database
    const newOrder = await Order.create({
      userId: isGuest ? undefined : userId,
      orderId,
      isGuest: isGuest,
      guestEmail: isGuest ? guestEmail : undefined,
      guestPhone: isGuest ? guestPhone : phoneNumber,
      guestShipping: isGuest ? guestShipping : undefined,
      delivery_address: isGuest ? undefined : addressId,
      items: list_items,
      subTotalAmt,
      totalAmt,
      payment_status: 'pending', // Will be marked paid on delivery
      paymentMethod: 'cod', // Cash on Delivery
      fulfillment_type: fulfillment_type || 'delivery',
      pickup_location: pickup_location || '',
      pickup_instructions: pickup_instructions || '',
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Cash on Delivery order created, awaiting fulfillment'
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
      message: 'Order placed successfully! You will pay on delivery. Our team will contact you to confirm delivery details.',
      orderId: orderId,
      data: {
        orderId,
        totalAmount: totalAmt,
        paymentMethod: 'Cash on Delivery'
      }
    });

  } catch (error) {
    console.error('Cash on Delivery order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to place order. Please try again.'
    });
  }
};

// Check PayHero payment status
export const checkPayHeroStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        message: 'Checkout request ID is required'
      });
    }

    // Check status with PayHero API
    const statusResponse = await checkPaymentStatus(checkoutRequestId);

    // Update order in database if status changed
    const order = await Order.findOne({ checkoutRequestId });
    if (order && statusResponse.status) {
      order.payment_status = statusResponse.status === 'completed' ? 'paid' : statusResponse.status;
      if (statusResponse.status === 'completed') {
        order.status = 'confirmed';
        order.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Payment confirmed via PayHero'
        });
      }
      await order.save();
    }

    res.json({
      success: true,
      status: statusResponse.status || 'pending',
      data: statusResponse
    });

  } catch (error) {
    console.error('Check PayHero status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check payment status'
    });
  }
};

// Webhook callback from PayHero
export const payHeroCallback = async (req, res) => {
  try {
    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      Amount,
      MpesaReceiptNumber,
      TransactionDate,
      PhoneNumber,
      ExternalReference
    } = req.body;

    console.log('PayHero callback received:', req.body);

    // Find order by checkout request ID or external reference
    const order = await Order.findOne({
      $or: [
        { checkoutRequestId: CheckoutRequestID },
        { orderId: ExternalReference }
      ]
    });

    if (!order) {
      console.error('Order not found for callback:', { CheckoutRequestID, ExternalReference });
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update order based on result code
    // ResultCode 0 = Success
    if (ResultCode === 0 || ResultCode === '0') {
      order.payment_status = 'paid';
      order.status = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: `Payment confirmed via PayHero. M-Pesa Receipt: ${MpesaReceiptNumber}`
      });

      // Store payment details
      order.paymentDetails = {
        receiptNumber: MpesaReceiptNumber,
        transactionDate: TransactionDate,
        phoneNumber: PhoneNumber,
        amount: Amount,
        provider: 'payhero'
      };

      await order.save();

      console.log('Order payment confirmed:', order.orderId);
    } else {
      // Payment failed
      order.payment_status = 'failed';
      order.statusHistory.push({
        status: 'payment_failed',
        timestamp: new Date(),
        note: `Payment failed: ${ResultDesc}`
      });
      await order.save();

      // Restore stock for failed payment
      for (const item of order.items) {
        const productId = item.productId?._id || item.productId;
        await ProductModel.findByIdAndUpdate(productId, {
          $inc: { stock: item.quantity }
        });
      }

      console.log('Order payment failed:', order.orderId, ResultDesc);
    }

    // Return success to PayHero
    res.json({ success: true });

  } catch (error) {
    console.error('PayHero callback error:', error);
    // Still return 200 to prevent PayHero from retrying
    res.status(200).json({ success: false, message: error.message });
  }
};

// Get payment link (for sharing with customer)
export const getPayHeroPaymentLink = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Generate payment link
    const { generatePaymentLink } = await import('../config/payhero.js');
    const linkResponse = await generatePaymentLink({
      amount: Math.round(order.totalAmt),
      externalReference: order.orderId,
      customerName: order.guestShipping?.name || 'Customer',
      callbackUrl: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/payhero/callback`,
      email: order.guestEmail,
      phoneNumber: order.guestPhone,
      description: `Payment for order ${order.orderId}`,
      redirectUrl: `${process.env.FRONTEND_URL}/payment-success?order=${order.orderId}`
    });

    res.json({
      success: true,
      paymentLink: linkResponse.payment_url,
      data: linkResponse
    });

  } catch (error) {
    console.error('Generate payment link error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate payment link'
    });
  }
};

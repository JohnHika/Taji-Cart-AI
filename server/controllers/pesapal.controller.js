import { submitOrder, getTransactionStatus } from '../config/pesapal.js';
import OrderModel from '../models/order.model.js';
import { emitOrderStatusUpdated } from '../socket/socket.js';

function buildBillingAddress(customer = {}) {
  return {
    email_address: customer.email || 'customer@example.com',
    first_name: customer.firstName || 'Customer',
    last_name: customer.lastName || 'User',
    phone_number: customer.phone || '',
    line_1: customer.line1 || '',
    city: customer.city || '',
    state: customer.state || '',
    postal_code: customer.postalCode || '',
    country_code: customer.countryCode || 'KE',
  };
}

export async function initiatePayment(req, res) {
  try {
    console.log('Initiating Pesapal payment...');
    console.log('Request body:', req.body);
    console.log('Environment variables:', {
      baseUrl: process.env.PESAPAL_BASE_URL,
      consumerKey: process.env.PESAPAL_CONSUMER_KEY ? '***' : 'NOT SET',
      consumerSecret: process.env.PESAPAL_CONSUMER_SECRET ? '***' : 'NOT SET',
      callbackUrl: process.env.PESAPAL_CALLBACK_URL,
      notificationId: process.env.PESAPAL_NOTIFICATION_ID,
    });
    const { amount, description = 'Order payment', orderId, customer } = req.body;
    if (!amount || !orderId) {
      return res.status(400).json({ success: false, message: 'amount and orderId are required' });
    }

    const callbackUrl = process.env.PESAPAL_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/pesapal/callback`;
    const rawNotifId = process.env.PESAPAL_NOTIFICATION_ID || '';
    // Pesapal IPN IDs are UUID-like; if not valid format, omit and warn
    const isLikelyUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawNotifId);
    const notificationId = isLikelyUuid ? rawNotifId : undefined;
    if (!rawNotifId) {
      console.warn('Pesapal: PESAPAL_NOTIFICATION_ID not set. Register an IPN in Pesapal and set PESAPAL_NOTIFICATION_ID.');
    } else if (!isLikelyUuid) {
      console.warn('Pesapal: PESAPAL_NOTIFICATION_ID format looks invalid. Omitting from payload. Please use the UUID from the Pesapal dashboard.');
    }

    const payload = {
      id: orderId,
      currency: 'KES',
      amount: Number(amount),
      description,
      callback_url: callbackUrl,
      notification_id: notificationId,
      billing_address: buildBillingAddress(customer),
    };
    console.log('Payment payload:', payload);

    let data;
    try {
      data = await submitOrder(payload);
    } catch (e) {
      const raw = e?.response?.data;
      const msg = (typeof raw === 'string' ? raw : (raw?.error?.message || raw?.message || e.message || '')) + '';
      const looksInvalidIpn = /invalid\s*ipn/i.test(msg) || /invalid\s*ipn\s*url\s*id/i.test(msg);
      if (notificationId && looksInvalidIpn) {
        console.warn('Pesapal: submit failed due to invalid IPN ID. Retrying without notification_id...');
        const retryPayload = { ...payload, notification_id: undefined };
        data = await submitOrder(retryPayload);
      } else {
        throw e;
      }
    }
    // Upsert order record with pending status and tracking id
    await OrderModel.findOneAndUpdate(
      { orderId },
      {
        orderId,
        userId: req.userId,
        payment_status: 'pending',
        paymentId: data.order_tracking_id, // store Pesapal tracking id here
        subTotalAmt: Number(amount),
        totalAmt: Number(amount),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const redirectUrl = data.redirect_url || (data.token ? `https://cybqa.pesapal.com/pesapalv3/payments?token=${encodeURIComponent(data.token)}` : undefined);
    if (!redirectUrl) {
      const details = data?.error?.message || data?.message || 'Unable to create Pesapal payment session';
      return res.status(400).json({ success: false, message: 'Pesapal order submission failed', details });
    }
    return res.status(200).json({ success: true, redirect_url: redirectUrl, order_tracking_id: data.order_tracking_id, token: data.token });
  } catch (err) {
    console.error('Payment initiation error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      stack: err.stack,
    });
    const details = err.response?.data;
    const pesapalMsg = typeof details === 'string' ? details : (details?.error?.message || details?.message);
    return res.status(500).json({ success: false, message: err.message, details: pesapalMsg || details });
  }
}

export async function handleCallback(req, res) {
  try {
    // Pesapal sends query params: OrderTrackingId, OrderNotificationType, OrderMerchantReference
    const { OrderTrackingId, OrderNotificationType, OrderMerchantReference } = req.query;
    if (!OrderTrackingId) {
      return res.status(400).send('Missing OrderTrackingId');
    }

    const statusData = await getTransactionStatus(OrderTrackingId);
    const normalizedStatus = (statusData.status || statusData.payment_status_description || '').toString().toUpperCase();

    // Try update by merchant reference (orderId), else by paymentId tracking id
    let order = null;
    if (OrderMerchantReference) {
      order = await OrderModel.findOne({ orderId: OrderMerchantReference });
    }
    if (!order) {
      order = await OrderModel.findOne({ paymentId: OrderTrackingId });
    }
    if (order) {
      order.paymentId = OrderTrackingId;
      if (normalizedStatus === 'COMPLETED') {
        order.payment_status = 'paid';
      } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'CANCELLED') {
        order.payment_status = 'failed';
      } else {
        order.payment_status = 'pending';
      }
      await order.save();
      try {
        emitOrderStatusUpdated(order);
      } catch (e) {
        console.error('Socket emit failed:', e.message);
      }
    }

  const frontend = process.env.PESAPAL_SUCCESS_URL || process.env.FRONTEND_URL;
  const failure = process.env.PESAPAL_FAILURE_URL || process.env.FRONTEND_URL;
    if (frontend && normalizedStatus === 'COMPLETED') {
      const ref = encodeURIComponent(OrderMerchantReference || (order?.orderId || ''));
      return res.redirect(`${frontend.replace(/\/$/, '')}/success?orderId=${ref}`);
    }
    if (failure && normalizedStatus !== 'COMPLETED') {
      const ref = encodeURIComponent(OrderMerchantReference || (order?.orderId || ''));
      return res.redirect(`${failure.replace(/\/$/, '')}/cancel?orderId=${ref}`);
    }
    // Fallback minimal HTML
    return res.status(200).send('<html><body><script>window.close && window.close();</script><p>Payment processed. You can close this window.</p></body></html>');
  } catch (err) {
    return res.status(500).send('Callback handling error');
  }
}

export async function getStatus(req, res) {
  try {
    const { trackingId } = req.params;
    if (!trackingId) return res.status(400).json({ success: false, message: 'trackingId required' });
    const data = await getTransactionStatus(trackingId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

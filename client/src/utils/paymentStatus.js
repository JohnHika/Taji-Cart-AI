// How an order is paid, for labels across the app. Online M-Pesa orders only
// exist once paid ('PAID'). Pay on Delivery / Pay at Pickup orders are stored
// as 'CASH ON DELIVERY' until the rider (or the counter) collects the M-Pesa
// payment, which turns them 'PAID'. SACCO drop-offs pay at the terminal.
export const describePayment = (order = {}) => {
  const status = String(order?.payment_status ?? order?.paymentStatus ?? '').toUpperCase();
  const isPickup = order?.fulfillment_type === 'pickup';

  if (status === 'PAID') return { method: 'M-Pesa', label: 'Paid', paid: true, hint: 'Your payment has been received.' };
  if (status === 'CASH ON DELIVERY') {
    return isPickup
      ? { method: 'Pay at Pickup', label: 'Not paid', paid: false, hint: 'Pay by M-Pesa when you collect your order.' }
      : { method: 'Pay on Delivery', label: 'Not paid', paid: false, hint: 'Pay by M-Pesa when your order arrives.' };
  }
  if (status === 'PAY AT SACCO TERMINAL') {
    return { method: 'Pay at SACCO terminal', label: 'Not paid', paid: false, hint: 'Pay at the SACCO terminal when you collect.' };
  }
  if (status === 'PENDING') return { method: 'M-Pesa', label: 'Awaiting payment', paid: false, hint: 'Waiting for your M-Pesa payment.' };
  return { method: '—', label: 'Not paid', paid: false, hint: 'Payment to be arranged with the shop.' };
};

// A Pay on Delivery (or Pay at Pickup) order still waiting for its payment.
export const isAwaitingCollection = (order = {}) =>
  String(order?.payment_status ?? order?.paymentStatus ?? '').toUpperCase() === 'CASH ON DELIVERY';

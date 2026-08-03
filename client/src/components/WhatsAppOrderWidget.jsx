import { useEffect, useMemo, useState } from 'react';
import { FaMinus, FaPlus, FaTrash, FaUser, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';
import { useGlobalContext } from '../provider/GlobalProvider';
import { useWhatsAppOrder } from '../provider/WhatsAppOrderProvider';
import { shouldRenderMobileCartSummary } from '../utils/mobileShell';
import {
  buildWhatsAppOrderMessage,
  createWhatsAppOrderUrl,
  formatWhatsAppOrderAmount,
} from '../utils/whatsappOrder';

const WhatsAppOrderWidget = () => {
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const { totalQty } = useGlobalContext();
  const {
    items,
    itemCount,
    isOpen,
    updateItemQuantity,
    removeItem,
    clearItems,
    setIsOpen,
  } = useWhatsAppOrder();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState('pickup');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [note, setNote] = useState('');
  const cartSummaryVisible = shouldRenderMobileCartSummary({
    isAuthenticated: Boolean(user?._id),
    totalQty,
    pathname: location.pathname,
  });

  const orderTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  useEffect(() => {
    if (isOpen && items.length === 0) {
      setIsOpen(false);
    }
  }, [isOpen, items.length, setIsOpen]);

  const openWhatsApp = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Enter your name and phone number.');
      return;
    }
    if (fulfillmentMethod === 'delivery' && !deliveryLocation.trim()) {
      toast.error('Enter your delivery location.');
      return;
    }

    try {
      const message = buildWhatsAppOrderMessage({
        items,
        customerName,
        customerPhone,
        fulfillmentMethod,
        deliveryLocation,
        note,
      });
      window.open(
        createWhatsAppOrderUrl(nawiriBrand.whatsappUrl, message),
        '_blank',
        'noopener,noreferrer'
      );
      toast.success('Your WhatsApp order is ready to review and send.');
    } catch (error) {
      toast.error(error.message || 'Unable to prepare the WhatsApp order.');
    }
  };

  if (itemCount === 0 && !isOpen) return null;

  return (
    <>
      {itemCount > 0 && !isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`press fixed right-4 z-30 inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-card transition-colors hover:bg-green-700 lg:bottom-6 lg:right-6 ${
            cartSummaryVisible
              ? 'bottom-[calc(9.75rem+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
          }`}
          aria-label={`Review WhatsApp order with ${itemCount} items`}
        >
          <FaWhatsapp size={19} />
          <span>WhatsApp order</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-green-700">
            {itemCount}
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/50">
          <button
            type="button"
            className="flex-1 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Close WhatsApp order"
          />
          <section
            className="flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-white dark:bg-dm-card"
            aria-label="Buy via WhatsApp order"
          >
            <div className="flex items-center justify-between border-b border-brown-100 p-4 dark:border-dm-border">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-charcoal dark:text-white">
                  <FaWhatsapp className="text-green-600" /> Buy via WhatsApp
                </h2>
                <p className="mt-0.5 text-xs text-brown-500 dark:text-white/50">
                  Confirm your details, then review the ready-to-send WhatsApp message.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-brown-100 dark:hover:bg-dm-border"
                aria-label="Close WhatsApp order"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3 rounded-xl bg-green-50/70 p-3 dark:bg-green-950/20"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-dm-border">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">🛍️</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-brown-500 dark:text-white/50">
                      {item.sku || 'Product code unavailable'}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-green-700 dark:text-green-300">
                      {formatWhatsAppOrderAmount(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item._id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-brown-200 bg-white dark:border-dm-border dark:bg-dm-card-2"
                      aria-label={`Reduce ${item.name} quantity`}
                    >
                      <FaMinus size={11} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item._id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700"
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      <FaPlus size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item._id)}
                      className="p-2 text-red-500"
                      aria-label={`Remove ${item.name} from WhatsApp order`}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-brown-100 bg-plum-50/40 p-3 dark:border-dm-border dark:bg-dm-card-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brown-600 dark:text-white/60">Order estimate ({itemCount} items)</span>
                  <span className="font-bold text-plum-700 dark:text-gold-300">
                    {formatWhatsAppOrderAmount(orderTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-brown-700 dark:text-white/70">
                  <FaUser /> Your order details
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your name *"
                  className="w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Your phone number *"
                  className="w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('pickup')}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      fulfillmentMethod === 'pickup'
                        ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                        : 'border-brown-200 dark:border-dm-border'
                    }`}
                  >
                    Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('delivery')}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      fulfillmentMethod === 'delivery'
                        ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                        : 'border-brown-200 dark:border-dm-border'
                    }`}
                  >
                    Delivery
                  </button>
                </div>
                {fulfillmentMethod === 'delivery' && (
                  <textarea
                    value={deliveryLocation}
                    onChange={(event) => setDeliveryLocation(event.target.value)}
                    placeholder="Delivery location *"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                  />
                )}
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Colour, length, or special instructions (optional)"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
                />
              </div>
            </div>

            <div className="border-t border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
              <button
                type="button"
                onClick={openWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white transition-colors hover:bg-green-700"
              >
                <FaWhatsapp size={18} /> Continue to WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  clearItems();
                  setIsOpen(false);
                }}
                className="mt-2 w-full py-2 text-sm font-semibold text-brown-500 hover:text-red-600 dark:text-white/50"
              >
                Clear WhatsApp order
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default WhatsAppOrderWidget;

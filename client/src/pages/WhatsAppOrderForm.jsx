import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaMinus, FaPlus, FaSearch, FaTrash, FaWhatsapp } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import DeliveryModeSelector from '../components/DeliveryModeSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import isStaff from '../utils/isStaff';

const FULFILLMENT_OPTIONS = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'pickup', label: 'Store Pickup' },
];

const WhatsAppOrderForm = () => {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryDetails, setDeliveryDetails] = useState({ mode: 'standard', zoneId: '', saccoOperatorId: '', saccoDestinationTown: '' });
  const [deliveryFeePreview, setDeliveryFeePreview] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    if (!isStaff(user)) {
      toast.error('This page is for staff use only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await Axios({ ...SummaryApi.getProduct });
        if (res.data.success) setProducts(res.data.data || []);
      } catch (err) {
        AxiosToastError(err);
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    // Split into words so "marley 14" matches "Marley Twist 14INCH - 1B"
    // instead of requiring the whole typed string as one exact substring
    // (which made a bare "14" match every length variant of every style).
    const searchWords = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (searchWords.length === 0) return [];
    return products
      .filter((p) => {
        if (!(p.price > 0)) return false;
        const haystack = [p.name, p.sku, p.barcode].filter(Boolean).join(' ').toLowerCase();
        return searchWords.every((word) => haystack.includes(word));
      })
      .slice(0, 20);
  }, [products, search]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) {
        return prev.map((i) => (i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id) => setCart((prev) => prev.filter((i) => i._id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = fulfillmentType === 'delivery' ? deliveryFeePreview : 0;
  const total = subtotal + deliveryCharge;

  const resetForm = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setFulfillmentType('delivery');
    setPickupLocation('');
    setDeliveryDetails({ mode: 'standard', zoneId: '', saccoOperatorId: '', saccoDestinationTown: '' });
    setDeliveryFeePreview(0);
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one product.');
      return;
    }
    if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim())) {
      toast.error('Enter the customer name and a phone number or email.');
      return;
    }
    if (fulfillmentType === 'pickup' && !pickupLocation.trim()) {
      toast.error('Enter a pickup location.');
      return;
    }
    if (fulfillmentType === 'delivery') {
      if (deliveryDetails.mode === 'bike' && !deliveryDetails.zoneId) {
        toast.error('Select a delivery zone.');
        return;
      }
      if (deliveryDetails.mode === 'sacco' && (!deliveryDetails.saccoOperatorId || !deliveryDetails.saccoDestinationTown.trim())) {
        toast.error('Select a SACCO/coach operator and destination town.');
        return;
      }
    }

    const resolvedFulfillmentType =
      fulfillmentType === 'delivery' && deliveryDetails.mode === 'sacco' ? 'sacco_pickup' : fulfillmentType;

    try {
      setSubmitting(true);
      const res = await Axios({
        ...SummaryApi.guestCheckout,
        data: {
          items: cart.map((i) => ({
            productId: i._id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          guestEmail: customerEmail.trim() || undefined,
          guestPhone: customerPhone.trim() || undefined,
          guestShipping: { firstName: customerName.trim() },
          fulfillment_type: resolvedFulfillmentType,
          pickup_location: fulfillmentType === 'pickup' ? pickupLocation.trim() : undefined,
          deliveryMode: fulfillmentType === 'delivery' ? deliveryDetails.mode : undefined,
          deliveryZoneId: fulfillmentType === 'delivery' && deliveryDetails.mode === 'bike' ? deliveryDetails.zoneId : undefined,
          saccoOperatorId: resolvedFulfillmentType === 'sacco_pickup' ? deliveryDetails.saccoOperatorId : undefined,
          saccoDestinationTown: resolvedFulfillmentType === 'sacco_pickup' ? deliveryDetails.saccoDestinationTown.trim() : undefined,
          source: 'whatsapp',
        },
      });

      if (res.data.success) {
        toast.success(`Order ${res.data.data?.orderId || ''} created`);
        resetForm();
      }
    } catch (err) {
      AxiosToastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory dark:bg-dm-surface">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory pb-24 dark:bg-dm-surface">
      <header className="sticky top-0 z-20 border-b border-brown-100 bg-white px-4 py-3 dark:border-dm-border dark:bg-dm-card">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/pos-dashboard')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brown-200 px-2.5 py-2 text-xs font-semibold text-brown-700 hover:border-plum-300 hover:bg-plum-50 dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-card-2"
          >
            <FaArrowLeft size={12} /> Back
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white">
            <FaWhatsapp size={16} />
          </div>
          <div>
            <h1 className="text-base font-bold text-charcoal dark:text-white">New WhatsApp Order</h1>
            <p className="text-[11px] text-brown-500 dark:text-white/50">Transcribe a customer&apos;s WhatsApp order</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="rounded-xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <h2 className="mb-3 text-sm font-bold text-charcoal dark:text-white">Customer</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="rounded-lg border border-brown-200 px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone number (from WhatsApp)"
              className="rounded-lg border border-brown-200 px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
            />
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email (optional)"
              className="rounded-lg border border-brown-200 px-3 py-2 text-sm sm:col-span-2 dark:border-dm-border dark:bg-dm-card-2"
            />
          </div>
        </div>

        <div className="rounded-xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <h2 className="mb-3 text-sm font-bold text-charcoal dark:text-white">Items</h2>
          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product by name…"
              className="w-full rounded-lg border border-brown-200 pl-9 pr-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
            />
          </div>
          {filteredProducts.length > 0 && (
            <div className="mb-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-brown-100 dark:border-dm-border">
              {filteredProducts.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-plum-50 dark:hover:bg-dm-card-2"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 font-semibold text-plum-700 dark:text-plum-300">{DisplayPriceInShillings(p.price)}</span>
                </button>
              ))}
            </div>
          )}

          {cart.length === 0 ? (
            <p className="rounded-lg border border-dashed border-brown-200 px-3 py-6 text-center text-sm text-brown-500 dark:border-dm-border dark:text-white/50">
              No items added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-2 rounded-lg border border-brown-100 p-2 text-sm dark:border-dm-border">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-brown-500 dark:text-white/50">{DisplayPriceInShillings(item.price)} each</p>
                  </div>
                  <div className="flex items-center rounded-lg border border-brown-200 dark:border-dm-border">
                    <button type="button" onClick={() => updateQty(item._id, -1)} className="flex h-8 w-8 items-center justify-center" aria-label={`Decrease ${item.name}`}>
                      <FaMinus size={10} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item._id, 1)} className="flex h-8 w-8 items-center justify-center" aria-label={`Increase ${item.name}`}>
                      <FaPlus size={10} />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeItem(item._id)} className="text-red-600" aria-label={`Remove ${item.name}`}>
                    <FaTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <h2 className="mb-3 text-sm font-bold text-charcoal dark:text-white">Fulfillment</h2>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {FULFILLMENT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFulfillmentType(f.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  fulfillmentType === f.id
                    ? 'bg-plum-700 text-white'
                    : 'bg-brown-100 text-brown-700 dark:bg-dm-border dark:text-white/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {fulfillmentType === 'pickup' && (
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="Pickup location"
              className="w-full rounded-lg border border-brown-200 px-3 py-2 text-sm dark:border-dm-border dark:bg-dm-card-2"
            />
          )}

          {fulfillmentType === 'delivery' && (
            <DeliveryModeSelector value={deliveryDetails} onChange={setDeliveryDetails} onFeeChange={setDeliveryFeePreview} />
          )}
        </div>

        <div className="rounded-xl border border-brown-100 bg-white p-4 dark:border-dm-border dark:bg-dm-card">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-brown-500 dark:text-white/60">Subtotal</span>
              <span>{DisplayPriceInShillings(subtotal)}</span>
            </div>
            {deliveryCharge > 0 && (
              <div className="flex justify-between">
                <span className="text-brown-500 dark:text-white/60">Delivery fee</span>
                <span>{DisplayPriceInShillings(deliveryCharge)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-brown-200 pt-1 text-base font-bold dark:border-dm-border">
              <span>Total</span>
              <span className="text-plum-700 dark:text-plum-300">{DisplayPriceInShillings(total)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={submitOrder}
            disabled={submitting || cart.length === 0}
            className="mt-3 w-full rounded-xl bg-green-600 py-3 font-bold text-white transition-colors hover:bg-green-700 disabled:bg-brown-300"
          >
            {submitting ? 'Creating order…' : `Create order · ${DisplayPriceInShillings(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOrderForm;

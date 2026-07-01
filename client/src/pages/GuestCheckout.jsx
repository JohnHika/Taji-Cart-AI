import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaStore, FaCheckCircle, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import SummaryApi from '../common/SummaryApi';
import { clearGuestCart } from '../utils/guestCart';
import { fetchCartItems } from '../store/cartProduct';
import { nawiriBrand } from '../config/brand';
import CheckoutRoyalCard from '../components/CheckoutRoyalCard'; // Premium Royal Card teaser
import GuestAccountPrompt from '../components/GuestAccountPrompt';
import { formatDistanceKm, getFootDeliveryEligibility, NAIROBI_CBD_RADIUS_KM } from '../utils/cbdDelivery';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

const PICKUP_LOCATIONS = [
  { name: 'Main Store', address: nawiriBrand.location },
];

function GuestCheckout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector(state => state.cartItem?.cart || []);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [formData, setFormData] = useState({
    guestEmail: '',
    guestPhone: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    fulfillment_type: 'delivery',
    delivery_mode: 'standard',
    pickup_location: '',
    customerLocation: null,
  });

  const footDeliveryEligibility = getFootDeliveryEligibility(formData.customerLocation);

  const total = useMemo(() => cart.reduce((sum, item) => {
    const price = item.productId?.price || item.price || 0;
    return sum + price * (item.quantity || 1);
  }, 0), [cart]);

  const totalQty = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 1), 0), [cart]);

  // Delivery needs address form; pickup does not
  const isDelivery = formData.fulfillment_type === 'delivery';
  const isReadyToOrder = useMemo(() => {
    if (!formData.guestEmail || !formData.guestPhone) return false;
    if (isDelivery) {
      if (!formData.firstName || !formData.lastName || !formData.address || !formData.city) return false;
      if (formData.delivery_mode === 'foot') {
        if (!formData.customerLocation || !footDeliveryEligibility.eligible) return false;
      }
    } else {
      if (!formData.pickup_location) return false;
    }
    return true;
  }, [formData, isDelivery, footDeliveryEligibility]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const captureCustomerLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device/browser.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: Number(position.coords.latitude), lng: Number(position.coords.longitude) };
        const elig = getFootDeliveryEligibility(loc);
        setFormData(prev => ({ ...prev, customerLocation: loc }));
        if (elig.eligible) {
          toast.success('Great! You are within Nairobi CBD for foot delivery.');
        } else {
          toast.error(`You are ${formatDistanceKm(elig.distanceKm)} from CBD center. Foot delivery is limited to ${elig.radiusKm}km.`);
        }
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        toast.error('Unable to access location. Please allow location permissions and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.guestEmail) { toast.error('Email is required'); return false; }
    if (!emailRegex.test(formData.guestEmail)) { toast.error('Please enter a valid email address'); return false; }
    if (!formData.guestPhone || formData.guestPhone.length < 10) { toast.error('Please enter a valid phone number (min 10 digits)'); return false; }
    if (isDelivery) {
      if (!formData.firstName || !formData.lastName) { toast.error('Please enter your full name'); return false; }
      if (!formData.address || !formData.city) { toast.error('Please fill in your delivery address'); return false; }
      if (formData.delivery_mode === 'foot') {
        if (!formData.customerLocation) { toast.error('Foot delivery requires your live location within Nairobi CBD'); return false; }
        if (!footDeliveryEligibility.eligible) { toast.error(`Foot delivery is only available within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius)`); return false; }
      }
    } else {
      if (!formData.pickup_location) { toast.error('Please select a pickup location'); return false; }
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (submitLockRef.current) return;
    if (!validate()) return;
    if (cart.length === 0) { toast.error('Your cart is empty'); return; }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const response = await Axios({
        ...SummaryApi.guestCheckout,
        data: {
          items: cart,
          guestEmail: formData.guestEmail.trim().toLowerCase(),
          guestPhone: formData.guestPhone.trim(),
          guestShipping: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            address: formData.address,
            city: formData.city,
            zipCode: formData.zipCode,
            phone: formData.guestPhone,
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            coordinates: formData.customerLocation,
          },
          fulfillment_type: formData.fulfillment_type,
          delivery_mode: formData.delivery_mode,
          customerLocation: formData.customerLocation,
          pickup_location: formData.pickup_location,
        },
      });

      if (response.data?.success) {
        clearGuestCart();
        dispatch(fetchCartItems());
        setOrderSuccess({
          orderId: response.data.data.orderId,
          total,
          email: formData.guestEmail,
        });
        toast.success(response.data.message || 'Order placed successfully!');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  // ─── Order Success screen ─────────────────────────────────────────────────
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-ivory dark:bg-dm-surface py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <FaCheckCircle className="text-4xl text-gold-500" />
          </div>
          <h1 className="text-3xl font-bold text-charcoal dark:text-white mb-2">Order Placed!</h1>
          <p className="text-brown-500 dark:text-white/60 mb-6">
            Thank you for your order. A confirmation has been sent to <strong>{orderSuccess.email}</strong>.
          </p>
          <div className="bg-white dark:bg-dm-card rounded-xl p-6 border border-brown-100 dark:border-dm-border shadow mb-6 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-brown-500 dark:text-white/60">Order ID</span>
              <span className="font-semibold text-charcoal dark:text-white font-mono">{orderSuccess.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brown-500 dark:text-white/60">Total</span>
              <span className="font-bold text-gold-600">{DisplayPriceInShillings(orderSuccess.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brown-500 dark:text-white/60">Payment</span>
              <span className="font-medium text-charcoal dark:text-white">Cash on {formData.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/track-order?orderId=${orderSuccess.orderId}&email=${encodeURIComponent(orderSuccess.email)}`}
              className="px-6 py-3 rounded-card bg-plum-700 text-white font-semibold hover:bg-plum-600 transition-colors"
            >
              Track My Order
            </Link>
            <Link
              to="/"
              className="px-6 py-3 rounded-card border-2 border-brown-200 dark:border-dm-border text-charcoal dark:text-white font-semibold hover:bg-brown-50 dark:hover:bg-dm-card transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
        <GuestAccountPrompt
          guestEmail={orderSuccess.email}
          orderId={orderSuccess.orderId}
          totalAmount={orderSuccess.total}
        />
      </div>
    );
  }

  // ─── Empty cart guard ──────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-ivory dark:bg-dm-surface flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-brown-500 dark:text-white/60 mb-4">Your cart is empty.</p>
          <Link to="/" className="px-6 py-3 rounded-card bg-plum-700 text-white font-semibold hover:bg-plum-600 transition-colors">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main checkout form ────────────────────────────────────────────────────
  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-card border border-brown-200 dark:border-dm-border bg-white dark:bg-dm-surface text-charcoal dark:text-white placeholder-brown-300 dark:placeholder-white/30 focus:outline-none focus:border-plum-500 dark:focus:border-plum-400 transition-colors';
  const labelCls = 'block text-xs font-semibold text-brown-500 dark:text-white/60 uppercase tracking-wide mb-1';

  return (
    <section className="bg-ivory dark:bg-dm-surface min-h-screen transition-colors duration-200">
      <div className="container mx-auto flex w-full flex-col gap-5 px-2 py-4 sm:px-4 lg:flex-row lg:px-6 lg:justify-between">

        {/* ── Left column: contact + fulfillment ───────────────────────────── */}
        <div className="w-full space-y-5">

          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-charcoal dark:text-white">Guest Checkout</h1>
            <p className="text-sm text-brown-400 dark:text-white/50 mt-0.5">
              No account needed — pay on {formData.fulfillment_type === 'delivery' ? 'delivery' : 'pickup'}.{' '}
              <Link to="/login" className="text-plum-600 dark:text-plum-300 hover:underline font-medium">Have an account? Sign in</Link>
            </p>
          </div>

          {/* Contact info */}
          <div className="bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border p-4 transition-colors duration-200">
            <h2 className="font-semibold text-charcoal dark:text-white mb-4">Contact Information</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  name="guestEmail"
                  value={formData.guestEmail}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input
                  type="tel"
                  name="guestPhone"
                  value={formData.guestPhone}
                  onChange={handleChange}
                  placeholder="+254 7XX XXX XXX"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Fulfillment toggle + address / pickup */}
          <div className="bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border p-4 transition-colors duration-200">

            {/* Toggle */}
            <div className="mb-4 grid grid-cols-2 rounded-card overflow-hidden border border-brown-100 dark:border-dm-border text-sm font-semibold">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, fulfillment_type: 'delivery', pickup_location: '' }))}
                className={`py-2.5 transition-colors ${isDelivery ? 'bg-plum-700 text-white' : 'bg-white dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/20'}`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, fulfillment_type: 'pickup', delivery_mode: 'standard' }))}
                className={`py-2.5 transition-colors ${!isDelivery ? 'bg-plum-700 text-white' : 'bg-white dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/20'}`}
              >
                Pickup
              </button>
            </div>

            {isDelivery ? (
              <>
                <h3 className="font-semibold text-charcoal dark:text-white mb-3">Delivery Address</h3>

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name *</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className={labelCls}>Street Address *</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Building name, floor, street…" className={inputCls} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>City *</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ZIP / Postal Code</label>
                    <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className={inputCls} />
                  </div>
                </div>

                {/* Delivery type */}
                <div className="mt-4 p-3 bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border">
                  <p className="text-sm font-semibold text-charcoal dark:text-white mb-3">Delivery Type</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { value: 'standard', label: 'Standard Delivery', desc: 'Regular rider delivery across Nairobi.' },
                      { value: 'foot', label: 'Delivery by Foot', desc: `Only within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius).` },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className={`cursor-pointer rounded-card border-2 p-3 transition-all ${
                          formData.delivery_mode === opt.value
                            ? 'border-plum-600 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                            : 'border-brown-100 dark:border-dm-border'
                        }`}
                      >
                        <input type="radio" name="delivery_mode" value={opt.value} checked={formData.delivery_mode === opt.value} onChange={handleChange} className="hidden" />
                        <p className="font-semibold text-charcoal dark:text-white text-sm">{opt.label}</p>
                        <p className="text-xs text-brown-500 dark:text-white/50 mt-1">{opt.desc}</p>
                      </label>
                    ))}
                  </div>

                  {formData.delivery_mode === 'foot' && (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={captureCustomerLocation}
                        disabled={locationLoading}
                        className="px-3 py-2 rounded-pill text-sm font-semibold bg-plum-700 text-white hover:bg-plum-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {locationLoading ? 'Checking location…' : 'Use My Current Location'}
                      </button>
                      <p className="text-xs text-brown-500 dark:text-white/50">
                        {formData.customerLocation
                          ? `Distance to CBD center: ${formatDistanceKm(footDeliveryEligibility.distanceKm)} (${footDeliveryEligibility.eligible ? 'eligible' : 'outside allowed zone'})`
                          : 'Location required to confirm CBD eligibility for foot delivery.'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-charcoal dark:text-white mb-3">Select Pickup Location</h3>
                {!formData.pickup_location && (
                  <div className="bg-gold-100 dark:bg-gold-600/10 border border-gold-300 dark:border-gold-600/30 text-gold-700 dark:text-gold-300 px-4 py-2 rounded-card mb-3 text-sm">
                    Please select a pickup location to proceed.
                  </div>
                )}
                <div className="grid gap-3">
                  {PICKUP_LOCATIONS.map(loc => (
                    <label key={loc.name} className="cursor-pointer">
                      <div className={`border-2 rounded-card p-4 flex gap-3 transition-all duration-200 ${
                        formData.pickup_location === loc.name
                          ? 'border-plum-700 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                          : 'border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card hover:border-plum-200 dark:hover:border-plum-700/40'
                      }`}>
                        <input
                          type="radio"
                          value={loc.name}
                          checked={formData.pickup_location === loc.name}
                          onChange={() => setFormData(prev => ({ ...prev, pickup_location: loc.name }))}
                          name="pickup_location"
                          className="accent-plum-700 mt-1 flex-shrink-0"
                        />
                        <div className="text-sm text-charcoal dark:text-white/80 leading-relaxed">
                          <p className="font-medium"><FaStore className="text-plum-500 inline mr-1 text-xs" />{loc.name}</p>
                          <p className="text-brown-400 dark:text-white/50 text-xs mt-0.5">{loc.address}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right column: order summary + place order ─────────────────────── */}
        <div className="w-full self-start rounded-card border border-brown-100 bg-white px-3 py-4 sm:px-4 shadow transition-colors duration-200 dark:border-dm-border dark:bg-dm-card lg:sticky lg:top-24 lg:max-w-sm xl:max-w-md">

          <h3 className="text-lg font-semibold text-charcoal dark:text-white px-1 mb-3">Order Summary</h3>

          {/* Royal Card Guest Teaser */}
          <div className="mb-4">
            <CheckoutRoyalCard showTeaser={true} />
          </div>

          {/* Cart items */}
          <div className="bg-white dark:bg-dm-card-2 rounded-card border border-brown-100 dark:border-dm-border p-4 mb-4 space-y-2 max-h-48 overflow-y-auto">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-brown-600 dark:text-white/70 truncate pr-2">
                  {item.productId?.name || item.name} × {item.quantity}
                </span>
                <span className="text-charcoal dark:text-white font-medium whitespace-nowrap">
                  {DisplayPriceInShillings((item.productId?.price || item.price || 0) * (item.quantity || 1))}
                </span>
              </div>
            ))}
          </div>

          {/* Bill details */}
          <div className="bg-white dark:bg-dm-card-2 p-4 rounded-card border border-brown-100 dark:border-dm-border transition-colors duration-200">
            <h3 className="font-semibold text-charcoal dark:text-white mb-3 text-sm uppercase tracking-wide">Bill Details</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-charcoal dark:text-white/85">
                <span>Quantity</span>
                <span>{totalQty} item{totalQty !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-charcoal dark:text-white/85">
                <span>Delivery Charge</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-brown-100 dark:border-dm-border">
                <span className="font-bold text-charcoal dark:text-white">Total</span>
                <span className="font-bold text-gold-600 dark:text-gold-300 font-price">{DisplayPriceInShillings(total)}</span>
              </div>
            </div>
          </div>

          {/* Place order */}
          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-brown-300 dark:text-white/30 mb-1">Payment Method</p>
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !isReadyToOrder}
              className={`flex items-center justify-between w-full py-3 px-4 rounded-card border-2 font-semibold text-sm transition-all duration-200 ${
                isReadyToOrder && !submitting
                  ? 'border-plum-600 text-plum-700 dark:border-plum-500 dark:text-plum-200 bg-plum-50 dark:bg-plum-900/20 hover:bg-plum-100 dark:hover:bg-plum-900/40'
                  : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaLock className="text-xs opacity-70" />
                {submitting ? 'Placing order…' : `Cash on ${formData.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}`}
              </span>
              {!isReadyToOrder && !submitting && (
                <span className="text-xs font-normal opacity-60">
                  {!formData.guestEmail || !formData.guestPhone ? 'Fill contact info' :
                   isDelivery && (!formData.firstName || !formData.address) ? 'Fill delivery address' :
                   !isDelivery && !formData.pickup_location ? 'Select pickup location' : ''}
                </span>
              )}
            </button>

            <p className="text-xs text-center text-brown-400 dark:text-white/40">
              By placing this order you agree to our{' '}
              <Link to="/terms" className="text-plum-600 dark:text-plum-300 hover:underline">Terms</Link>{' '}
              &amp;{' '}
              <Link to="/privacy" className="text-plum-600 dark:text-plum-300 hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

export default GuestCheckout;

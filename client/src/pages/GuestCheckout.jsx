import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaCheckCircle } from 'react-icons/fa';
import { FaMoneyBillWave, FaBuilding } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { clearGuestCart, getGuestCart } from '../utils/guestCart';
import { fetchCartItems } from '../store/cartProduct';
import { nawiriBrand } from '../config/brand';
import GuestAccountPrompt from '../components/GuestAccountPrompt';
import MpesaPayment from '../components/MpesaPayment';
import EquityPayment from '../components/EquityPayment';
import PayHeroPayment from '../components/PayHeroPayment';
import MpesaDirectPayment from '../components/MpesaDirectPayment';

function GuestCheckout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector(state => state.cartItem?.cart || []);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('payhero'); // 'mpesa', 'equity', 'payhero', or 'cod'

  const [formData, setFormData] = useState({
    // Contact Info
    guestEmail: '',
    guestPhone: '',

    // Shipping Info
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',

    // Order Options
    fulfillment_type: 'delivery',
    pickup_location: '',
  });

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const price = item.productId?.price || item.price || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.guestEmail || !formData.guestPhone) {
      toast.error('Please provide email and phone number');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.guestEmail)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (formData.guestPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!formData.firstName || !formData.lastName || !formData.address || !formData.city) {
      toast.error('Please fill in all shipping details');
      return false;
    }

    if (formData.fulfillment_type === 'pickup' && !formData.pickup_location) {
      toast.error('Please select a pickup location');
      return false;
    }

    return true;
  };

  const handlePaymentSuccess = (paymentData) => {
    toast.success('Payment completed successfully!');
    clearGuestCart();
    dispatch(fetchCartItems());
    setOrderSuccess({
      orderId: paymentData.transactionId,
      total: calculateTotal(),
      email: formData.guestEmail
    });
  };

  const handlePaymentError = (errorMessage) => {
    toast.error(errorMessage || 'Payment failed. Please try again.');
  };

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/30 mb-4">
            <FaUser className="text-2xl text-gold-600" />
          </div>
          <h1 className="text-3xl font-bold text-charcoal dark:text-white mb-2">
            Checkout as Guest
          </h1>
          <p className="text-brown-500">
            Complete your purchase without creating an account
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-gold-600' : 'text-brown-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-gold-500 text-charcoal' : 'bg-brown-200 dark:bg-brown-800'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Contact</span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-gold-500' : 'bg-brown-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-gold-600' : 'text-brown-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-gold-500 text-charcoal' : 'bg-brown-200 dark:bg-brown-800'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Shipping</span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-gold-500' : 'bg-brown-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-gold-600' : 'text-brown-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-gold-500 text-charcoal' : 'bg-brown-200 dark:bg-brown-800'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Review</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border">
              {/* Step 1: Contact Information */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-2">
                    <FaEnvelope className="text-gold-500" />
                    Contact Information
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="guestEmail"
                        value={formData.guestEmail}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="guestPhone"
                        value={formData.guestPhone}
                        onChange={handleInputChange}
                        placeholder="+254 7XX XXX XXX"
                        className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <FaCheckCircle className="text-blue-500 mt-1" />
                        <div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Why checkout as guest?</strong>
                          </p>
                          <ul className="text-sm text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                            <li>• No account required</li>
                            <li>• Faster checkout process</li>
                            <li>• Order confirmation via email</li>
                            <li>• Create account later if you wish</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => validateStep1() && setStep(2)}
                    className="w-full mt-6 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold py-3 rounded-lg transition-colors"
                  >
                    Continue to Shipping
                  </button>
                </div>
              )}

              {/* Step 2: Shipping Information */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-gold-500" />
                    Shipping Information
                  </h2>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Building name, floor, street..."
                        className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                          ZIP/Postal Code
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Delivery Method */}
                    <div className="border-t border-brown-200 dark:border-brown-700 pt-4 mt-4">
                      <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-3">
                        Delivery Method
                      </label>
                      <div className="grid md:grid-cols-2 gap-4">
                        <label className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                          formData.fulfillment_type === 'delivery'
                            ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                            : 'border-brown-200 dark:border-brown-700'
                        }`}>
                          <input
                            type="radio"
                            name="fulfillment_type"
                            value="delivery"
                            checked={formData.fulfillment_type === 'delivery'}
                            onChange={handleInputChange}
                            className="hidden"
                          />
                          <div className="text-center">
                            <FaMapMarkerAlt className="text-2xl mx-auto mb-2 text-gold-600" />
                            <p className="font-semibold text-charcoal dark:text-white">Home Delivery</p>
                            <p className="text-xs text-brown-500 mt-1">KSh 300 - Nairobi</p>
                          </div>
                        </label>

                        <label className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                          formData.fulfillment_type === 'pickup'
                            ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                            : 'border-brown-200 dark:border-brown-700'
                        }`}>
                          <input
                            type="radio"
                            name="fulfillment_type"
                            value="pickup"
                            checked={formData.fulfillment_type === 'pickup'}
                            onChange={handleInputChange}
                            className="hidden"
                          />
                          <div className="text-center">
                            <FaLock className="text-2xl mx-auto mb-2 text-gold-600" />
                            <p className="font-semibold text-charcoal dark:text-white">Store Pickup</p>
                            <p className="text-xs text-brown-500 mt-1">Free - Collect in store</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {formData.fulfillment_type === 'pickup' && (
                      <div>
                        <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                          Pickup Location *
                        </label>
                        <select
                          name="pickup_location"
                          value={formData.pickup_location}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        >
                          <option value="">Select a location</option>
                          <option value="nairobi-cbd">Nairobi CBD - Moi Avenue</option>
                          <option value="westlands">Westlands - Sarit Centre</option>
                          <option value="kilimani">Kilimani - Yaya Centre</option>
                          <option value="thika">Thika Road Mall</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-brown-100 dark:bg-brown-800 text-brown-600 dark:text-brown-300 font-semibold py-3 rounded-lg hover:bg-brown-200 dark:hover:bg-brown-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => validateStep2() && setStep(3)}
                      className="flex-1 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold py-3 rounded-lg transition-colors"
                    >
                      Review Order
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Place Order */}
              {step === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-2">
                    <FaCheckCircle className="text-gold-500" />
                    Payment & Review
                  </h2>

                  <div className="space-y-6">
                    {/* Order Summary */}
                    <div className="bg-brown-50 dark:bg-dm-surface rounded-lg p-4">
                      <h3 className="font-semibold text-charcoal dark:text-white mb-2">Order Summary</h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {cart.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-brown-600 dark:text-brown-300">
                              {item.productId?.name || item.name} × {item.quantity}
                            </span>
                            <span className="text-charcoal dark:text-white font-medium">
                              KSh {((item.productId?.price || item.price || 0) * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-brown-200 dark:border-brown-700 mt-3 pt-3 flex justify-between font-semibold">
                        <span className="text-charcoal dark:text-white">Total:</span>
                        <span className="text-gold-600">KSh {total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div>
                      <h3 className="font-semibold text-charcoal dark:text-white mb-3">Select Payment Method</h3>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {/* M-Pesa Direct - LOWEST FEE */}
                        <button
                          onClick={() => setPaymentMethod('mpesa-direct')}
                          className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all relative ${
                            paymentMethod === 'mpesa-direct'
                              ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                              : 'border-brown-200 dark:border-brown-700 hover:border-gold-300'
                          }`}
                        >
                          <div className="absolute -top-2 right-2 bg-gold-500 text-charcoal text-xs px-2 py-0.5 rounded-full font-semibold">
                            BEST VALUE
                          </div>
                          <FaMoneyBillWave className={`text-2xl ${
                            paymentMethod === 'mpesa-direct' ? 'text-gold-600' : 'text-brown-400'
                          }`} />
                          <span className={`text-sm font-semibold ${
                            paymentMethod === 'mpesa-direct' ? 'text-gold-700' : 'text-brown-500'
                          }`}>M-Pesa Direct</span>
                          <p className="text-xs text-brown-400 text-center">0.55% fee • Secure</p>
                        </button>

                        {/* PayHero */}
                        <button
                          onClick={() => setPaymentMethod('payhero')}
                          className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                            paymentMethod === 'payhero'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-brown-200 dark:border-brown-700 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FaMoneyBillWave className={`text-xl ${
                              paymentMethod === 'payhero' ? 'text-purple-600' : 'text-brown-400'
                            }`} />
                            <FaBuilding className={`text-xl ${
                              paymentMethod === 'payhero' ? 'text-purple-600' : 'text-brown-400'
                            }`} />
                          </div>
                          <span className={`text-sm font-semibold ${
                            paymentMethod === 'payhero' ? 'text-purple-700' : 'text-brown-500'
                          }`}>PayHero</span>
                          <p className="text-xs text-brown-400 text-center">Online or Cash</p>
                        </button>

                        {/* M-Pesa (Legacy) */}
                        <button
                          onClick={() => setPaymentMethod('mpesa')}
                          className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                            paymentMethod === 'mpesa'
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-brown-200 dark:border-brown-700 hover:border-green-300'
                          }`}
                        >
                          <FaMoneyBillWave className={`text-2xl ${
                            paymentMethod === 'mpesa' ? 'text-green-600' : 'text-brown-400'
                          }`} />
                          <span className={`text-sm font-semibold ${
                            paymentMethod === 'mpesa' ? 'text-green-700' : 'text-brown-500'
                          }`}>M-Pesa</span>
                          <p className="text-xs text-brown-400 text-center">STK Push</p>
                        </button>

                        {/* Equity Bank */}
                        <button
                          onClick={() => setPaymentMethod('equity')}
                          className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                            paymentMethod === 'equity'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-brown-200 dark:border-brown-700 hover:border-blue-300'
                          }`}
                        >
                          <FaBuilding className={`text-2xl ${
                            paymentMethod === 'equity' ? 'text-blue-600' : 'text-brown-400'
                          }`} />
                          <span className={`text-sm font-semibold ${
                            paymentMethod === 'equity' ? 'text-blue-700' : 'text-brown-500'
                          }`}>Equity Bank</span>
                          <p className="text-xs text-brown-400 text-center">EazzyPay direct payment</p>
                        </button>
                      </div>
                    </div>

                    {/* Payment Form */}
                    <div className="bg-white dark:bg-dm-card rounded-lg p-4 border border-brown-200 dark:border-brown-700">
                      {paymentMethod === 'mpesa-direct' && (
                        <MpesaDirectPayment
                          cartItems={cart}
                          totalAmount={total}
                          addressId={undefined}
                          guestEmail={formData.guestEmail}
                          guestPhone={formData.guestPhone}
                          guestShipping={{
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            address: formData.address,
                            city: formData.city,
                            zipCode: formData.zipCode,
                            phone: formData.guestPhone,
                            name: `${formData.firstName} ${formData.lastName}`
                          }}
                          fulfillment_type={formData.fulfillment_type}
                          pickup_location={formData.pickup_location}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                      )}
                      {paymentMethod === 'mpesa' && (
                        <MpesaPayment
                          cartItems={cart}
                          totalAmount={total}
                          guestEmail={formData.guestEmail}
                          guestPhone={formData.guestPhone}
                          guestShipping={{
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            address: formData.address,
                            city: formData.city,
                            zipCode: formData.zipCode,
                            phone: formData.guestPhone
                          }}
                          fulfillment_type={formData.fulfillment_type}
                          pickup_location={formData.pickup_location}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                      )}
                      {paymentMethod === 'equity' && (
                        <EquityPayment
                          cartItems={cart}
                          totalAmount={total}
                          guestEmail={formData.guestEmail}
                          guestPhone={formData.guestPhone}
                          guestShipping={{
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            address: formData.address,
                            city: formData.city,
                            zipCode: formData.zipCode,
                            phone: formData.guestPhone
                          }}
                          fulfillment_type={formData.fulfillment_type}
                          pickup_location={formData.pickup_location}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                      )}
                      {paymentMethod === 'payhero' && (
                        <PayHeroPayment
                          cartItems={cart}
                          totalAmount={total}
                          addressId={undefined}
                          guestEmail={formData.guestEmail}
                          guestPhone={formData.guestPhone}
                          guestShipping={{
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            address: formData.address,
                            city: formData.city,
                            zipCode: formData.zipCode,
                            phone: formData.guestPhone,
                            name: `${formData.firstName} ${formData.lastName}`
                          }}
                          fulfillment_type={formData.fulfillment_type}
                          pickup_location={formData.pickup_location}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                      )}
                    </div>

                    {/* Security Notice */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FaLock className="text-green-500 mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                            Secure Checkout
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Your payment information is encrypted and secure.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 bg-brown-100 dark:bg-brown-800 text-brown-600 dark:text-brown-300 font-semibold py-3 rounded-lg hover:bg-brown-200 dark:hover:bg-brown-700 transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  <p className="text-xs text-center text-brown-500 mt-4">
                    By placing this order, you agree to our{' '}
                    <Link to="/terms" className="text-gold-600 hover:underline">Terms & Conditions</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-gold-600 hover:underline">Privacy Policy</Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border sticky top-8">
              <h3 className="text-lg font-bold text-charcoal dark:text-white mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4">
                {cart.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-brown-600 dark:text-brown-300 truncate">
                      {item.productId?.name || item.name} × {item.quantity}
                    </span>
                    <span className="text-charcoal dark:text-white font-medium whitespace-nowrap ml-2">
                      KSh {((item.productId?.price || item.price || 0) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                {cart.length > 3 && (
                  <p className="text-sm text-brown-500">+ {cart.length - 3} more items</p>
                )}
              </div>

              <div className="border-t border-brown-200 dark:border-brown-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-brown-600 dark:text-brown-300">
                  <span>Subtotal</span>
                  <span>KSh {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-brown-600 dark:text-brown-300">
                  <span>Delivery</span>
                  <span>{formData.fulfillment_type === 'pickup' ? 'Free' : 'Calculated at payment'}</span>
                </div>
              </div>

              <div className="border-t border-brown-200 dark:border-brown-700 pt-4 mt-4">
                <div className="flex justify-between text-lg font-bold text-charcoal dark:text-white">
                  <span>Total</span>
                  <span className="text-gold-600">KSh {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-brown-600 dark:text-brown-300">
                  <FaCheckCircle className="text-green-500" />
                  <span>Secure SSL Encryption</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-brown-600 dark:text-brown-300">
                  <FaCheckCircle className="text-green-500" />
                  <span>Money-Back Guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-brown-600 dark:text-brown-300">
                  <FaCheckCircle className="text-green-500" />
                  <span>Fast Delivery Nationwide</span>
                </div>
              </div>

              {/* Login Prompt */}
              <div className="mt-6 bg-plum-50 dark:bg-plum-900/20 rounded-lg p-4 text-center">
                <p className="text-sm text-charcoal dark:text-white mb-2">
                  Already have an account?
                </p>
                <Link
                  to="/login"
                  className="text-gold-600 hover:underline text-sm font-semibold"
                >
                  Login for faster checkout
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Order Account Creation Prompt */}
      {orderSuccess && (
        <GuestAccountPrompt
          guestEmail={orderSuccess.email}
          orderId={orderSuccess.orderId}
          totalAmount={orderSuccess.total}
        />
      )}
    </div>
  );
}

export default GuestCheckout;

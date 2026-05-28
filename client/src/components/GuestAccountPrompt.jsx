import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCrown, FaCheckCircle, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

function GuestAccountPrompt({ guestEmail, orderId, totalAmount }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: guestEmail || '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  // Show modal after guest checkout success
  React.useEffect(() => {
    if (guestEmail && orderId) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1500); // Show 1.5 seconds after order success
      return () => clearTimeout(timer);
    }
  }, [guestEmail, orderId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.password) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Register new account
      const response = await Axios({
        ...SummaryApi.register,
        data: {
          name: formData.name,
          email: formData.email,
          password: formData.password
        }
      });

      if (response.data.success) {
        toast.success('Account created successfully!');

        // Store tokens in both storages so they survive mobile tab kills
        sessionStorage.setItem('accesstoken', response.data.data.accesstoken);
        sessionStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('accesstoken', response.data.data.accesstoken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);

        // Close modal
        setShowModal(false);

        // Navigate to order tracking with account benefits
        navigate('/dashboard/myorders', {
          state: {
            justCreated: true,
            orderId: orderId,
            message: 'Your guest order has been linked to your new account!'
          }
        });
      }
    } catch (error) {
      console.error('Account creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setShowModal(false);
    navigate('/order-success', {
      state: {
        orderId,
        total: totalAmount,
        isGuest: true,
        email: guestEmail
      }
    });
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-dm-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-gold-500 to-gold-400 p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur mb-3">
            <FaCrown className="text-3xl text-charcoal" />
          </div>
          <h2 className="text-2xl font-bold text-charcoal">
            Create Your Free Account
          </h2>
          <p className="text-charcoal/80 mt-2">
            Link your order and unlock exclusive benefits
          </p>
        </div>

        {/* Benefits List */}
        <div className="p-6 bg-gold-50 dark:bg-gold-900/10">
          <h3 className="font-semibold text-charcoal dark:text-white mb-3">
            As a Nawiri Hair member, you'll get:
          </h3>
          <div className="space-y-2">
            {[
              'Track all your orders in one place',
              'Earn loyalty points on every purchase',
              'Exclusive member-only discounts',
              'Faster checkout next time',
              'Early access to new products',
              'Birthday rewards and surprises'
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <FaCheckCircle className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-brown-600 dark:text-brown-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
              Password *
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <button
              onClick={handleCreateAccount}
              disabled={loading}
              className={`w-full py-3.5 rounded-lg font-bold text-white transition-all ${
                loading
                  ? 'bg-brown-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? 'Creating Account...' : 'Create My Free Account'}
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 rounded-lg font-semibold text-brown-600 dark:text-brown-300 hover:bg-brown-100 dark:hover:bg-brown-800 transition-colors"
            >
              No thanks, I'll skip this for now
            </button>
          </div>

          <p className="text-xs text-center text-brown-500 mt-4">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="text-gold-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-gold-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestAccountPrompt;

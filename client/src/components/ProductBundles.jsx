import React, { useState } from 'react';
import { FaShoppingCart, FaGift, FaCheck, FaStar } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import { fetchCartItems } from '../store/cartProduct';

// Pre-defined bundle configurations
const BUNDLE_CONFIGS = [
  {
    id: 'starter-bundle',
    name: 'Starter Bundle',
    description: 'Perfect for first-time users',
    discount: 10,
    icon: '🌟',
    products: [
      { id: 'bundle-short-1', name: 'Body Wave 14"', price: 5500, qty: 1 },
      { id: 'bundle-short-2', name: 'Body Wave 12"', price: 4500, qty: 1 },
      { id: 'bundle-care-1', name: 'Care Kit Basic', price: 2000, qty: 1 },
    ],
    badge: 'Best for Beginners',
    color: 'from-blue-500 to-blue-400',
  },
  {
    id: 'full-glam-bundle',
    name: 'Full Glam Bundle',
    description: 'Complete head coverage with volume',
    discount: 15,
    icon: '👑',
    products: [
      { id: 'bundle-long-1', name: 'Body Wave 20"', price: 8500, qty: 2 },
      { id: 'bundle-long-2', name: 'Body Wave 18"', price: 7500, qty: 1 },
      { id: 'bundle-care-2', name: 'Care Kit Premium', price: 3500, qty: 1 },
    ],
    badge: 'Most Popular',
    color: 'from-gold-500 to-gold-400',
  },
  {
    id: 'luxury-bundle',
    name: 'Luxury Bundle',
    description: 'Maximum length and volume',
    discount: 20,
    icon: '💎',
    products: [
      { id: 'bundle-xl-1', name: 'Silky Straight 24"', price: 15000, qty: 2 },
      { id: 'bundle-xl-2', name: 'Silky Straight 22"', price: 13000, qty: 1 },
      { id: 'bundle-care-3', name: 'Care Kit Deluxe', price: 5000, qty: 1 },
      { id: 'bundle-tool-1', name: 'Heat Tool Set', price: 4500, qty: 1 },
    ],
    badge: 'Best Value',
    color: 'from-purple-500 to-purple-400',
  },
  {
    id: 'thin-hair-fill',
    name: 'Thin Hair Fill-In Bundle',
    description: 'Designed for coverage and volume',
    discount: 12,
    icon: '💕',
    products: [
      { id: 'bundle-fill-1', name: 'Scalp Fill-In Topper', price: 6500, qty: 1 },
      { id: 'bundle-fill-2', name: 'Volume Booster 16"', price: 5500, qty: 2 },
      { id: 'bundle-fill-3', name: 'Edge Control Gel', price: 1200, qty: 1 },
    ],
    badge: 'Specialized',
    color: 'from-pink-500 to-pink-400',
  },
  {
    id: 'curly-collection',
    name: 'Curly Girl Bundle',
    description: 'Everything for curly hair lovers',
    discount: 15,
    icon: '🌀',
    products: [
      { id: 'bundle-curl-1', name: 'Deep Curly 20"', price: 9500, qty: 2 },
      { id: 'bundle-curl-2', name: 'Deep Curly 18"', price: 8500, qty: 1 },
      { id: 'bundle-curl-3', name: 'Curl Defining Cream', price: 2200, qty: 1 },
      { id: 'bundle-curl-4', name: 'Satin Bonnet', price: 800, qty: 1 },
    ],
    badge: 'Trending',
    color: 'from-orange-500 to-orange-400',
  },
];

function ProductBundles({ selectedProduct }) {
  const dispatch = useDispatch();
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);

  const calculateBundlePrice = (bundle) => {
    const total = bundle.products.reduce((sum, product) => {
      return sum + (product.price * product.qty);
    }, 0);
    const discount = total * (bundle.discount / 100);
    return {
      original: total,
      discount: discount,
      final: total - discount,
    };
  };

  const handleAddBundleToCart = async (bundle) => {
    setAddingToCart(true);
    try {
      // Add each product in the bundle to cart
      const promises = bundle.products.map(async (product) => {
        const response = await Axios({
          ...SummaryApi.addToCart,
          data: {
            productId: product.id,
            quantity: product.qty,
          },
        });
        return response;
      });

      await Promise.all(promises);
      dispatch(fetchCartItems());

      toast.success(
        `${bundle.name} added to cart! You saved KSh ${calculateBundlePrice(bundle).discount.toLocaleString()}`
      );
      setSelectedBundle(null);
    } catch (error) {
      console.error('Failed to add bundle to cart:', error);
      toast.error('Failed to add bundle to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="w-full">
      {/* Bundle Selector Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gold-100 dark:bg-gold-900/30 px-4 py-2 rounded-full mb-3">
          <FaGift className="text-gold-600" />
          <span className="text-sm font-semibold text-gold-700 dark:text-gold-300">
            Save up to 20% with bundles
          </span>
        </div>
        <h2 className="text-2xl font-bold text-charcoal dark:text-white">
          Complete Look Bundles
        </h2>
        <p className="text-brown-500 mt-2">
          Curated sets for maximum savings and style
        </p>
      </div>

      {/* Bundle Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BUNDLE_CONFIGS.map((bundle) => {
          const pricing = calculateBundlePrice(bundle);

          return (
            <div
              key={bundle.id}
              className={`relative bg-white dark:bg-dm-card rounded-2xl overflow-hidden border-2 transition-all hover:shadow-xl ${
                selectedBundle?.id === bundle.id
                  ? 'border-gold-500 shadow-lg'
                  : 'border-brown-100 dark:border-dm-border'
              }`}
            >
              {/* Badge */}
              <div className={`absolute top-0 right-0 bg-gradient-to-l ${bundle.color} text-white text-xs font-bold px-3 py-1 rounded-bl-lg`}>
                {bundle.badge}
              </div>

              {/* Header */}
              <div className={`bg-gradient-to-r ${bundle.color} p-4 text-white`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{bundle.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{bundle.name}</h3>
                    <p className="text-sm text-white/90">{bundle.description}</p>
                  </div>
                </div>
              </div>

              {/* Products List */}
              <div className="p-4">
                <div className="space-y-3 mb-4">
                  {bundle.products.map((product, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <FaCheck className="text-green-500 text-xs" />
                        <span className="text-charcoal dark:text-white">
                          {product.name} × {product.qty}
                        </span>
                      </div>
                      <span className="text-brown-500">
                        KSh {(product.price * product.qty).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="border-t border-brown-200 dark:border-brown-800 pt-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-brown-500 line-through text-sm">
                      Original: KSh {pricing.original.toLocaleString()}
                    </span>
                    <span className="text-red-500 font-semibold text-sm">
                      -{bundle.discount}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-charcoal dark:text-white">
                      You Pay
                    </span>
                    <span className="text-2xl font-bold text-gold-600">
                      KSh {pricing.final.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-green-600 font-semibold mt-1">
                    You save KSh {pricing.discount.toLocaleString()}!
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleAddBundleToCart(bundle)}
                  disabled={addingToCart}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                    addingToCart
                      ? 'bg-brown-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-charcoal'
                  }`}
                >
                  <FaShoppingCart />
                  {addingToCart ? 'Adding...' : 'Add Bundle to Cart'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bundle Benefits */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        {[
          {
            icon: FaStar,
            title: 'Best Value',
            description: 'Save 10-20% compared to buying items individually',
            color: 'text-gold-600',
          },
          {
            icon: FaGift,
            title: 'Free Care Guide',
            description: 'Every bundle includes our premium hair care guide',
            color: 'text-blue-600',
          },
          {
            icon: FaCheck,
            title: 'Perfect Match',
            description: 'Expertly curated combinations for flawless results',
            color: 'text-green-600',
          },
        ].map((benefit, index) => (
          <div
            key={index}
            className="flex items-start gap-4 bg-white dark:bg-dm-card p-6 rounded-xl border border-brown-100 dark:border-dm-border"
          >
            <benefit.icon className={`text-3xl ${benefit.color}`} />
            <div>
              <h4 className="font-semibold text-charcoal dark:text-white mb-1">
                {benefit.title}
              </h4>
              <p className="text-sm text-brown-500">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductBundles;

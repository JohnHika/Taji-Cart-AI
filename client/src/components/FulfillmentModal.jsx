import React, { useState } from 'react';
import { FaArrowRight, FaStore, FaTimes, FaTruck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const FulfillmentModal = ({ isOpen, onClose, pickupLocations = [] }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelect = () => {
    if (!selectedMethod) return;

    const fulfillmentData = {
      fulfillmentMethod: selectedMethod,
      pickupLocation: selectedMethod === 'pickup' ? selectedLocation : '',
      pickupInstructions: selectedMethod === 'pickup' ? pickupInstructions : '',
    };

    navigate('/checkout', { state: fulfillmentData });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-plum-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-dm-card p-6 rounded-card max-w-md w-full border border-brown-100 dark:border-dm-border shadow-hover transition-colors duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-charcoal dark:text-white">How should we fulfill this order?</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-brown-400 hover:text-charcoal dark:text-white/50 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setSelectedMethod('delivery')}
            className={`p-4 rounded-card border-2 flex flex-col items-center justify-center transition-colors ${
              selectedMethod === 'delivery'
                ? 'border-plum-600 bg-plum-50 dark:bg-plum-900/40 dark:border-plum-400'
                : 'border-brown-100 dark:border-dm-border hover:bg-plum-50/50 dark:hover:bg-plum-900/20'
            }`}
          >
            <FaTruck className={`text-2xl mb-2 ${selectedMethod === 'delivery' ? 'text-plum-700 dark:text-plum-300' : 'text-brown-400 dark:text-white/45'}`} />
            <span className={`text-sm font-medium ${selectedMethod === 'delivery' ? 'text-plum-800 dark:text-plum-200' : 'text-charcoal dark:text-white/75'}`}>
              Delivery
            </span>
            <p className="text-[11px] text-brown-400 dark:text-white/45 mt-1 text-center leading-snug">
              We deliver to your address
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('pickup')}
            className={`p-4 rounded-card border-2 flex flex-col items-center justify-center transition-colors ${
              selectedMethod === 'pickup'
                ? 'border-gold-500 bg-gold-50 dark:bg-gold-600/15 dark:border-gold-400'
                : 'border-brown-100 dark:border-dm-border hover:bg-gold-50/40 dark:hover:bg-gold-900/10'
            }`}
          >
            <FaStore className={`text-2xl mb-2 ${selectedMethod === 'pickup' ? 'text-gold-600 dark:text-gold-300' : 'text-brown-400 dark:text-white/45'}`} />
            <span className={`text-sm font-medium ${selectedMethod === 'pickup' ? 'text-charcoal dark:text-gold-200' : 'text-charcoal dark:text-white/75'}`}>
              Pickup
            </span>
            <p className="text-[11px] text-brown-400 dark:text-white/45 mt-1 text-center leading-snug">
              Collect from our store
            </p>
          </button>
        </div>

        {selectedMethod === 'pickup' && (
          <div className="mb-6 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">
              Pickup location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm"
              required
            >
              <option value="">Select a location</option>
              {pickupLocations.map((location, index) => (
                <option key={index} value={location.address}>
                  {location.name} — {location.address}
                </option>
              ))}
            </select>

            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45 mt-2">
              Instructions (optional)
            </label>
            <textarea
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              placeholder="Any special instructions…"
              className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm placeholder:text-brown-300 dark:placeholder:text-white/30"
              rows={3}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleSelect}
          disabled={!selectedMethod || (selectedMethod === 'pickup' && !selectedLocation)}
          className={`w-full py-3 px-4 rounded-pill font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            selectedMethod && !(selectedMethod === 'pickup' && !selectedLocation)
              ? 'bg-gold-500 hover:bg-gold-400 text-charcoal press shadow-sm hover:shadow-gold'
              : 'bg-brown-100 dark:bg-dm-border text-brown-400 dark:text-white/35 cursor-not-allowed'
          }`}
        >
          Continue to checkout <FaArrowRight className="text-sm" />
        </button>
      </div>
    </div>
  );
};

export default FulfillmentModal;

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
    if (!selectedMethod) {
      return;
    }
    
    const fulfillmentData = {
      fulfillmentMethod: selectedMethod,
      pickupLocation: selectedMethod === 'pickup' ? selectedLocation : '',
      pickupInstructions: selectedMethod === 'pickup' ? pickupInstructions : ''
    };
    
    // Navigate to checkout with the fulfillment data
    navigate('/checkout', { 
      state: fulfillmentData
    });
    
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full transition-colors duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Choose Fulfillment Method</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setSelectedMethod('delivery')}
            className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
              selectedMethod === 'delivery'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <FaTruck className={`text-3xl mb-2 ${selectedMethod === 'delivery' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className={`font-medium ${selectedMethod === 'delivery' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
              Delivery
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              We'll deliver to your address
            </p>
          </button>
          
          <button
            onClick={() => setSelectedMethod('pickup')}
            className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
              selectedMethod === 'pickup'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <FaStore className={`text-3xl mb-2 ${selectedMethod === 'pickup' ? 'text-purple-500' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className={`font-medium ${selectedMethod === 'pickup' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
              Pickup
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              Pick up from our store
            </p>
          </button>
        </div>
        
        {selectedMethod === 'pickup' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              Select Pickup Location
            </label>
            <select 
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
              required
            >
              <option value="">-- Select a location --</option>
              {pickupLocations.map((location, index) => (
                <option key={index} value={location.address}>
                  {location.name} - {location.address}
                </option>
              ))}
            </select>
            
            <label className="block text-sm font-medium mb-2 mt-4 dark:text-gray-200">
              Pickup Instructions (optional)
            </label>
            <textarea
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              placeholder="Any special instructions for pickup..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
              rows="3"
            />
          </div>
        )}
        
        <button
          onClick={handleSelect}
          disabled={!selectedMethod || (selectedMethod === 'pickup' && !selectedLocation)}
          className={`w-full py-2 px-4 rounded flex items-center justify-center transition-colors ${
            selectedMethod && !(selectedMethod === 'pickup' && !selectedLocation)
              ? selectedMethod === 'delivery' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Checkout <FaArrowRight className="ml-2" />
        </button>
      </div>
    </div>
  );
};

export default FulfillmentModal;

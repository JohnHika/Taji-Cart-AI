import React from 'react';
import { FaStore, FaTruck } from 'react-icons/fa';

const FulfillmentSelector = ({ fulfillmentType, setFulfillmentType }) => {
  return (
    <div className="mt-4 mb-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
        Choose Fulfillment Method
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`border rounded-lg p-4 flex flex-col items-center transition-all cursor-pointer hover:shadow-md ${
            fulfillmentType === 'delivery'
              ? 'border-primary-100 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          onClick={() => setFulfillmentType('delivery')}
        >
          <FaTruck className={`text-2xl mb-2 ${fulfillmentType === 'delivery' ? 'text-primary-100' : 'text-gray-400'}`} />
          <div className="font-medium text-center">Delivery</div>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-1">
            We'll deliver to your address
          </p>
        </div>
        
        <div
          className={`border rounded-lg p-4 flex flex-col items-center transition-all cursor-pointer hover:shadow-md ${
            fulfillmentType === 'pickup'
              ? 'border-primary-100 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          onClick={() => setFulfillmentType('pickup')}
        >
          <FaStore className={`text-2xl mb-2 ${fulfillmentType === 'pickup' ? 'text-primary-100' : 'text-gray-400'}`} />
          <div className="font-medium text-center">Pickup</div>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-1">
            Pick up your order at our store
          </p>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentSelector;

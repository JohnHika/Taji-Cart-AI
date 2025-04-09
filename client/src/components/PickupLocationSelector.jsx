import React from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';

const pickupLocations = [
  {
    id: 'main-store',
    name: 'Main Store',
    address: '123 Main Street, Nairobi',
    hours: '9:00 AM - 8:00 PM'
  },
  {
    id: 'westlands-branch',
    name: 'Westlands Branch',
    address: '456 Westlands Avenue, Nairobi',
    hours: '10:00 AM - 7:00 PM'
  },
  {
    id: 'mombasa-store',
    name: 'Mombasa Store',
    address: '789 Beach Road, Mombasa',
    hours: '9:00 AM - 6:00 PM'
  }
];

const PickupLocationSelector = ({ selectedLocation, setSelectedLocation, setPickupInstructions, pickupInstructions }) => {
  return (
    <div className="mt-4 mb-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
        Select Pickup Location
      </h2>
      <div className="space-y-3">
        {pickupLocations.map((location) => (
          <div
            key={location.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              selectedLocation === location.id
                ? 'border-primary-100 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => setSelectedLocation(location.id)}
          >
            <div className="flex items-start">
              <div className={`mt-0.5 mr-3 ${selectedLocation === location.id ? 'text-primary-100' : 'text-gray-400'}`}>
                <FaMapMarkerAlt />
              </div>
              <div className="flex-1">
                <div className="font-medium dark:text-white">{location.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{location.address}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hours: {location.hours}</div>
              </div>
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  name="pickup-location"
                  className="focus:ring-primary-100 h-4 w-4 text-primary-100 border-gray-300"
                  checked={selectedLocation === location.id}
                  onChange={() => setSelectedLocation(location.id)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4">
        <label htmlFor="pickup-instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Special Instructions (Optional)
        </label>
        <textarea
          id="pickup-instructions"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-100 focus:border-primary-100 sm:text-sm dark:bg-gray-800 dark:text-white"
          placeholder="Add any special instructions for pickup..."
          rows="3"
          value={pickupInstructions}
          onChange={(e) => setPickupInstructions(e.target.value)}
        ></textarea>
      </div>
    </div>
  );
};

export default PickupLocationSelector;

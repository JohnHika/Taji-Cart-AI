import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText, type = "danger" }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FaTimes size={20} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
          <FaExclamationTriangle className={`mr-2 ${
            type === "danger" ? "text-red-500" : 
            type === "warning" ? "text-yellow-500" : 
            "text-blue-500"
          }`} />
          {title || "Confirm Action"}
        </h2>
        
        <div className="mb-6 text-gray-600 dark:text-gray-300">
          <p>{message || "Are you sure you want to proceed with this action?"}</p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-white rounded-lg ${
              type === "danger" ? "bg-red-500 hover:bg-red-600" : 
              type === "warning" ? "bg-yellow-500 hover:bg-yellow-600" : 
              "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {confirmButtonText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
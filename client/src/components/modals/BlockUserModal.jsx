import React, { useState } from 'react';
import { FaBan, FaTimes } from 'react-icons/fa';

const BlockUserModal = ({ isOpen, onClose, user, onSave }) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      return; // Don't submit empty reason
    }
    onSave(user._id, {
      reason,
      duration,
      status: 'Suspended'
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dm-card rounded-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-brown-400 hover:text-charcoal dark:text-white/40 dark:hover:text-charcoal"
        >
          <FaTimes size={20} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
          <FaBan className="mr-2 text-red-500" /> Block User
        </h2>
        
        <div className="mb-4">
          <p className="text-brown-500 dark:text-white/55">
            User: <span className="font-medium">{user?.name || 'Unknown'}</span>
          </p>
          <p className="text-brown-500 dark:text-white/55">
            Email: <span className="font-medium">{user?.email || 'Unknown'}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-charcoal dark:text-white/55 mb-2">
              Block Duration:
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-dm-card-2 dark:border-dm-border dark:text-white"
            >
              <option value="7days">7 Days</option>
              <option value="30days">30 Days</option>
              <option value="90days">90 Days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-charcoal dark:text-white/55 mb-2">
              Reason for Blocking:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for blocking this user..."
              className="w-full p-2 border rounded-lg h-24 resize-none dark:bg-dm-card-2 dark:border-dm-border dark:text-white"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-brown-200 text-charcoal rounded-lg hover:bg-brown-50 dark:border-dm-border dark:text-white/55 dark:hover:bg-dm-card-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Block User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockUserModal;
import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaGift, FaPercent, FaTag, FaTruck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Axios from '../utils/Axios';

const ActiveRewards = ({ onSelectReward, selectedRewardId, displayMode = 'full', className = '' }) => {
  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    fetchActiveRewards();
  }, []);

  const fetchActiveRewards = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/campaigns/rewards/active',
        method: 'GET'
      });

      if (response.data.success) {
        setRewards(response.data.data);
      } else {
        console.error('Failed to fetch rewards:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching active rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatExpiry = (date) => {
    if (!date) return 'No expiry';
    const expiryDate = new Date(date);
    return expiryDate.toLocaleDateString();
  };

  const getRewardIcon = (type) => {
    switch (type) {
      case 'discount':
        return <FaPercent className="text-green-500" />;
      case 'shipping':
        return <FaTruck className="text-blue-500" />;
      case 'product':
        return <FaGift className="text-purple-500" />;
      default:
        return <FaTag className="text-primary-200" />;
    }
  };

  const getRewardText = (reward) => {
    switch (reward.type) {
      case 'discount':
        return `${reward.value}% Discount`;
      case 'shipping':
        return 'Free Shipping';
      case 'product':
        return 'Free Gift';
      case 'points':
        return `${reward.value} Points`;
      default:
        return 'Special Reward';
    }
  };

  // If no rewards, return null for compact mode
  if (rewards.length === 0 && displayMode === 'compact') {
    return null;
  }

  // If no rewards, show a message for full mode
  if (rewards.length === 0 && displayMode === 'full') {
    return (
      <div className={`p-4 text-center text-gray-500 dark:text-gray-400 ${className}`}>
        You don't have any active rewards
      </div>
    );
  }

  // Compact display for checkout
  if (displayMode === 'compact') {
    return (
      <div className={`${className}`}>
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Available Rewards</h3>
        </div>
        <div className="space-y-2">
          {rewards.map((reward) => (
            <div
              key={reward._id}
              onClick={() => onSelectReward && onSelectReward(reward)}
              className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                selectedRewardId === reward._id
                  ? 'bg-primary-100/20 border border-primary-200'
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
              }`}
            >
              <div className="mr-3">
                {getRewardIcon(reward.type)}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium dark:text-gray-200">{getRewardText(reward)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  From {reward.campaignTitle}
                </p>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <FaCalendarAlt className="mr-1" />
                {formatExpiry(reward.expiryDate)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full display for profile/rewards page
  return (
    <div className={`${className}`}>
      <h2 className="text-lg font-medium mb-4 dark:text-white">Active Rewards</h2>
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-200"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rewards.map((reward) => (
            <div
              key={reward._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className={`p-4 flex items-start gap-3 ${
                reward.type === 'discount' ? 'bg-green-50 dark:bg-green-900/20' :
                reward.type === 'shipping' ? 'bg-blue-50 dark:bg-blue-900/20' :
                'bg-purple-50 dark:bg-purple-900/20'
              }`}>
                <div className={`p-3 rounded-full ${
                  reward.type === 'discount' ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-300' : 
                  reward.type === 'shipping' ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300' :
                  'bg-purple-100 dark:bg-purple-800/30 text-purple-800 dark:text-purple-300'
                }`}>
                  {getRewardIcon(reward.type)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {getRewardText(reward)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    From community campaign: {reward.campaignTitle}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Expires on:</span>
                  <span className="text-gray-900 dark:text-gray-200 font-medium">
                    {formatExpiry(reward.expiryDate)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    toast.info(`Use this reward during checkout to apply your ${getRewardText(reward)}`);
                  }}
                  className="w-full mt-2 py-2 px-3 text-sm bg-primary-100 hover:bg-primary-200 text-white rounded transition"
                >
                  Use at Checkout
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveRewards;
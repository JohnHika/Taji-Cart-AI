import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaCrown, FaSpinner } from 'react-icons/fa';
import Axios from '../utils/Axios';
import toast from 'react-hot-toast';

const LoyaltyQRVerify = () => {
  const { cardNumber } = useParams();
  const navigate = useNavigate();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        setLoading(true);
        const response = await Axios({
          url: `/api/loyalty/validate/${cardNumber}`,
          method: 'GET'
        });

        if (response.data.success) {
          setCardData(response.data.data);
          toast.success('Card verification successful');
        } else {
          setError(response.data.message || 'Failed to verify loyalty card');
          toast.error(response.data.message || 'Failed to verify loyalty card');
        }
      } catch (error) {
        console.error('Error verifying loyalty card:', error);
        setError(error.response?.data?.message || 'Failed to verify loyalty card');
        toast.error(error.response?.data?.message || 'Failed to verify loyalty card');
      } finally {
        setLoading(false);
      }
    };

    if (cardNumber) {
      fetchCardData();
    } else {
      setError('Invalid card number');
      setLoading(false);
    }
  }, [cardNumber]);

  // Get background color based on tier
  const getTierBackground = (tier) => {
    switch(tier) {
      case 'Basic':
        return 'bg-gradient-to-r from-gray-600 to-gray-500';
      case 'Bronze':
        return 'bg-gradient-to-r from-amber-700 to-amber-500';
      case 'Silver':
        return 'bg-gradient-to-r from-gray-400 to-gray-300';
      case 'Gold':
        return 'bg-gradient-to-r from-yellow-600 to-amber-400';
      case 'Platinum':
        return 'bg-gradient-to-r from-blue-400 to-slate-300';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
        <FaSpinner className="animate-spin text-primary-200 text-4xl mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Verifying loyalty card...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Verification Failed</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => navigate(-1)} 
            className="px-4 py-2 bg-primary-200 hover:bg-primary-300 text-white rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Logo Section */}
        <div className="p-6 text-center">
          <img 
            src={cardData.storeInfo.logoUrl} 
            alt={cardData.storeInfo.brandName} 
            className="h-24 mx-auto mb-4"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/assets/Brand_logo.png";
            }}
          />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{cardData.storeInfo.brandName}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loyalty Card Verification</p>
        </div>

        {/* Card Info Section */}
        <div className={`${getTierBackground(cardData.tier)} p-6 text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FaCrown className="text-yellow-300 mr-2 text-xl" />
              <h2 className="text-lg font-semibold">
                {cardData.tier} Membership
              </h2>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {cardData.discountPercentage} Discount
            </span>
          </div>

          <div className="mb-4">
            <p className="text-sm opacity-80">Card Number</p>
            <p className="font-mono">{cardData.cardNumber}</p>
          </div>

          <div className="mb-4">
            <p className="text-sm opacity-80">Member Name</p>
            <p className="font-medium">{cardData.user.name}</p>
          </div>

          <div className="flex justify-between items-center mb-2">
            <p className="text-sm opacity-80">Points Balance</p>
            <p className="text-3xl font-bold">{cardData.points}</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-medium text-gray-800 dark:text-white mb-2">Membership Benefits</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-4">
              {cardData.tier === 'Basic' && (
                <li>Card membership and point collection</li>
              )}
              {(cardData.tier === 'Bronze' || cardData.tier === 'Silver' || cardData.tier === 'Gold' || cardData.tier === 'Platinum') && (
                <li>{cardData.discountPercentage} discount on all purchases</li>
              )}
              {(cardData.tier === 'Silver' || cardData.tier === 'Gold' || cardData.tier === 'Platinum') && (
                <li>Free delivery on orders over KES 5,000</li>
              )}
              {(cardData.tier === 'Gold' || cardData.tier === 'Platinum') && (
                <li>Early access to sales</li>
              )}
              {cardData.tier === 'Platinum' && (
                <li>Exclusive access to limited products</li>
              )}
            </ul>
          </div>

          <div className="text-center mt-6">
            <button 
              onClick={() => navigate(-1)} 
              className="px-4 py-2 bg-primary-200 hover:bg-primary-300 text-white rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyQRVerify;
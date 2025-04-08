import React from 'react';
import { useSelector } from 'react-redux';
import { saveAs } from 'file-saver';
import { FaApple, FaGoogle, FaWallet } from 'react-icons/fa';
import Axios from '../utils/Axios';

const RoyalCardMobilePass = ({ cardData }) => {
  const user = useSelector(state => state.user);
  
  const generateAppleWalletPass = async () => {
    try {
      const response = await Axios({
        url: '/api/loyalty/apple-wallet-pass',
        method: 'POST',
        data: {
          userId: user._id,
          cardNumber: cardData.cardNumber,
          userName: user.name,
          tier: cardData.tier,
          points: cardData.points
        },
        responseType: 'blob'
      });
      
      saveAs(new Blob([response.data]), 'TajiRoyalCard.pkpass');
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      alert('Failed to generate Apple Wallet pass. Please try again later.');
    }
  };
  
  const generateGooglePayPass = async () => {
    try {
      const response = await Axios({
        url: '/api/loyalty/google-pay-pass',
        method: 'POST',
        data: {
          userId: user._id,
          cardNumber: cardData.cardNumber,
          userName: user.name,
          tier: cardData.tier,
          points: cardData.points
        }
      });
      
      // Google Pay passes are distributed via URL
      window.open(response.data.saveUrl, '_blank');
    } catch (error) {
      console.error('Error generating Google Pay pass:', error);
      alert('Failed to generate Google Pay pass. Please try again later.');
    }
  };
  
  return (
    <div className="mt-4">
      <h3 className="text-gray-700 dark:text-gray-300 font-medium mb-3">Add to Mobile Wallet</h3>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={generateAppleWalletPass}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <FaApple size={18} />
          <span>Apple Wallet</span>
        </button>
        
        <button
          onClick={generateGooglePayPass}
          className="flex items-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <FaGoogle size={18} className="text-blue-500" />
          <span>Google Pay</span>
        </button>
        
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <FaWallet size={18} />
          <span>Save as PDF</span>
        </button>
      </div>
    </div>
  );
};

export default RoyalCardMobilePass;
import React, { useEffect, useState } from 'react';
import { FaArrowRight, FaBullhorn, FaSpinner, FaUsers } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Axios from '../utils/Axios';

const UserActiveCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!user._id;

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserCampaigns();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchUserCampaigns = async () => {
    try {
      setLoading(true);
      
      // Fetch active campaigns
      const response = await Axios({
        url: '/api/campaigns/active',
        method: 'GET'
      });
      
      if (response.data.success) {
        // Filter only campaigns where the user has participated
        const activeCampaigns = (response.data.data || [])
          .filter(campaign => campaign.userParticipation)
          .slice(0, 3); // Limit to 3 campaigns for display
        
        setCampaigns(activeCampaigns);
      }
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only render if user is logged in and has joined campaigns
  if (!isLoggedIn || (!loading && campaigns.length === 0)) {
    return null;
  }

  return (
    <div className="mt-4 mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-3 bg-primary-200/10 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-medium text-gray-800 dark:text-white flex items-center">
          <FaUsers className="mr-2 text-primary-200" /> 
          Your Active Campaigns
        </h3>
        <Link 
          to="/dashboard/active-campaigns" 
          className="text-sm text-primary-200 hover:text-primary-300 flex items-center"
        >
          View All <FaArrowRight className="ml-1" size={12} />
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center p-6">
          <FaSpinner className="animate-spin text-primary-300 text-xl" />
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {campaigns.map(campaign => {
            const progress = Math.min(100, Math.floor(((campaign.currentProgress || 0) / (campaign.goalTarget || 100)) * 100));
            
            return (
              <div key={campaign._id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 mr-3 flex-shrink-0">
                    <FaBullhorn className="text-green-600 dark:text-green-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-800 dark:text-white truncate">{campaign.title}</h4>
                      <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full flex-shrink-0">
                        {progress}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-primary-200 h-1.5 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {campaign.currentProgress} of {campaign.goalTarget} {campaign.goalType || 'purchases'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserActiveCampaigns;
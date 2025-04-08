import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaGift, FaSpinner, FaTrophy } from 'react-icons/fa';
import Axios from '../utils/Axios';

const CommunityPerks = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userParticipations, setUserParticipations] = useState([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      // Fetch active campaigns
      const response = await Axios({
        url: '/api/campaigns/active',
        method: 'GET'
      });
      
      if (response.data.success) {
        const activeCampaigns = response.data.data || [];
        setCampaigns(activeCampaigns);
        
        // Extract user participations if available
        const participations = activeCampaigns
          .filter(campaign => campaign.userParticipation)
          .map(campaign => ({
            campaignId: campaign._id,
            ...campaign.userParticipation
          }));
          
        setUserParticipations(participations);
      } else {
        toast.error(response.data.message || 'Failed to load community perks');
      }
    } catch (error) {
      console.error('Error fetching community perks:', error);
      toast.error('Failed to load community perks');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (campaignId) => {
    try {
      setLoading(true);
      
      const response = await Axios({
        url: `/api/campaigns/${campaignId}/redeem`,
        method: 'POST'
      });
      
      if (response.data.success) {
        toast.success('Reward redeemed successfully!');
        fetchCampaigns(); // Refresh data
      } else {
        toast.error(response.data.message || 'Failed to redeem reward');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast.error('Failed to redeem reward');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format reward message
  const getRewardMessage = (campaign) => {
    switch (campaign.rewardType) {
      case 'discount':
        return `${campaign.rewardValue}% discount on your next purchase`;
      case 'points':
        return `${campaign.rewardValue} loyalty points`;
      case 'shipping':
        return 'Free shipping on your next order';
      case 'product':
        return 'Free gift with your next purchase';
      default:
        return 'Special reward';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Community Perks</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <FaSpinner className="animate-spin text-primary-300 text-3xl" />
        </div>
      ) : (
        <>
          {campaigns.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <FaGift className="mx-auto text-gray-400 dark:text-gray-500 text-4xl mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No active community campaigns at the moment</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Check back later for new community rewards!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map(campaign => {
                const progress = Math.min(100, Math.floor(((campaign.currentProgress || 0) / (campaign.goalTarget || 100)) * 100));
                const isPerk = campaign.metadata?.isPerk === true;
                const userParticipation = campaign.userParticipation;
                const hasContributed = !!userParticipation;
                const hasRedeemed = userParticipation?.hasRedeemed;
                const canRedeem = campaign.isAchieved && hasContributed && !hasRedeemed;
                
                return (
                  <div 
                    key={campaign._id} 
                    className={`p-4 border rounded-lg shadow-sm ${
                      isPerk 
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/30' 
                        : 'bg-white dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`p-2 rounded-full ${
                        isPerk 
                          ? 'bg-yellow-100 dark:bg-yellow-900/50' 
                          : 'bg-blue-100 dark:bg-blue-900/30'
                        } mr-3`}
                      >
                        {isPerk 
                          ? <FaGift className="text-yellow-600 dark:text-yellow-400" /> 
                          : <FaTrophy className="text-blue-600 dark:text-blue-400" />
                        }
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium dark:text-white">{campaign.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{campaign.description}</p>
                        
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="dark:text-gray-300">Progress: {campaign.currentProgress || 0} of {campaign.goalTarget || 0}</span>
                            <span className="dark:text-gray-300">{progress}% Complete</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                              className={`${isPerk ? 'bg-yellow-500' : 'bg-blue-500'} h-2.5 rounded-full`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-sm font-medium dark:text-gray-200">
                            Reward: {getRewardMessage(campaign)}
                          </p>
                          
                          {hasContributed && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              You've contributed to this campaign!
                            </p>
                          )}
                          
                          {campaign.isAchieved && (
                            <div className="mt-2">
                              <div className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-sm inline-block">
                                Goal achieved! {hasRedeemed ? 'Reward redeemed' : 'Claim your reward'}
                              </div>
                            </div>
                          )}
                          
                          {canRedeem && (
                            <button
                              onClick={() => handleRedeemReward(campaign._id)}
                              className="mt-3 px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300 text-sm"
                            >
                              Redeem Reward
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-2 dark:text-white">How Community Perks Work</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>Community perks are goals that our customers achieve together.</li>
              <li>When you make purchases or participate in other ways, you contribute to the community goal.</li>
              <li>Once a goal is reached, all participating customers can redeem the reward.</li>
              <li>You must have contributed to a campaign to be eligible for its reward.</li>
              <li>Some rewards may have time limits, so be sure to redeem them before they expire!</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
};

export default CommunityPerks;
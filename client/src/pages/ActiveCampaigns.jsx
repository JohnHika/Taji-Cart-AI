import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaFilter, FaSpinner } from 'react-icons/fa';
import CommunityCampaignProgress from '../components/CommunityCampaignProgress';
import Axios from '../utils/Axios';

const ActiveCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, participating, achieved
  const [sortBy, setSortBy] = useState('endDate'); // endDate, progress, newest
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchActiveCampaigns();
  }, []);

  const fetchActiveCampaigns = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/campaigns/active',
        method: 'GET'
      });

      if (response.data.success) {
        setCampaigns(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (campaignId, amount = 1) => {
    try {
      const response = await Axios({
        url: '/api/campaigns/contribute',
        method: 'POST',
        data: {
          campaignId,
          contributionAmount: amount,
          contributionType: 'manual'
        }
      });

      if (response.data.success) {
        toast.success('Contribution added successfully!');
        fetchActiveCampaigns(); // Refresh campaigns
      } else {
        toast.error(response.data.message || 'Failed to add contribution');
      }
    } catch (error) {
      console.error('Error contributing to campaign:', error);
      toast.error('Failed to add contribution');
    }
  };

  const handleRewardClaimed = (reward) => {
    toast.success(`You claimed a ${reward.type} reward!`);
    fetchActiveCampaigns(); // Refresh campaigns after claiming reward
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    if (filter === 'participating') return campaign.userParticipation;
    if (filter === 'achieved') return campaign.isAchieved;
    return true;
  });

  // Sort campaigns
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (sortBy === 'endDate') {
      return new Date(a.endDate) - new Date(b.endDate);
    }
    if (sortBy === 'progress') {
      const progressA = (a.currentProgress / a.goalTarget) * 100;
      const progressB = (b.currentProgress / b.goalTarget) * 100;
      return progressB - progressA; // Highest progress first
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 dark:text-white">Community Campaigns</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Join our community campaigns to unlock exclusive rewards. Contribute by making purchases, 
          writing reviews, or referring friends.
        </p>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="mr-2 px-3 py-1 flex items-center text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <FaFilter className="mr-1" /> Filters
            </button>
            
            {showFilters && (
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors duration-200 ${
                    filter === 'all' 
                      ? 'bg-primary-200 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('participating')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors duration-200 ${
                    filter === 'participating' 
                      ? 'bg-primary-200 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Participating
                </button>
                <button 
                  onClick={() => setFilter('achieved')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors duration-200 ${
                    filter === 'achieved' 
                      ? 'bg-primary-200 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Goal Achieved
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-200"
            >
              <option value="endDate">Ending Soon</option>
              <option value="progress">Most Progress</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <FaSpinner className="text-4xl text-primary-200 animate-spin" />
        </div>
      ) : sortedCampaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <h3 className="text-xl font-medium mb-2 dark:text-white">No active campaigns</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There are no active community campaigns at the moment.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Check back later for new opportunities to participate and earn rewards!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedCampaigns.map(campaign => (
            <CommunityCampaignProgress 
              key={campaign._id} 
              campaign={campaign} 
              showInCard={true}
              showLeaderboard={true}
              onRewardClaimed={handleRewardClaimed}
            />
          ))}
        </div>
      )}

      {/* How It Works Section */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4 dark:text-white">How Community Campaigns Work</h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
                <span className="text-lg font-bold">1</span>
              </div>
              <h3 className="font-medium mb-2 dark:text-white">Join Campaigns</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Browse active campaigns and start participating automatically when you make purchases.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-3">
                <span className="text-lg font-bold">2</span>
              </div>
              <h3 className="font-medium mb-2 dark:text-white">Contribute</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Every purchase, review, or referral helps achieve the community goal.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-3">
                <span className="text-lg font-bold">3</span>
              </div>
              <h3 className="font-medium mb-2 dark:text-white">Earn Rewards</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Once the goal is reached, all contributors can claim their rewards.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-3">
                <span className="text-lg font-bold">4</span>
              </div>
              <h3 className="font-medium mb-2 dark:text-white">Use Benefits</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Apply your rewards during checkout for discounts, free shipping, or other benefits.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-400">Types of Rewards</h4>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 text-sm space-y-1">
              <li><strong>Discounts:</strong> Get percentage discounts on your purchases</li>
              <li><strong>Free Shipping:</strong> Enjoy free shipping on your orders</li>
              <li><strong>Points:</strong> Earn loyalty points to use on future purchases</li>
              <li><strong>Free Products:</strong> Receive free products with your orders</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveCampaigns;
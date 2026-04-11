import { formatDistance } from 'date-fns';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaClock, FaGift, FaTrophy, FaUsers } from 'react-icons/fa';
import Axios from '../utils/Axios';

const CommunityCampaignProgress = ({ 
  campaign, 
  showLeaderboard = false,
  showInCard = true,
  displayMode = 'normal', // Added displayMode prop with 'normal' as default
  onRewardClaimed = () => {},
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  
  // Format reward based on type
  const formatReward = (type, value) => {
    switch (type) {
      case 'discount':
        return `${value}% discount`;
      case 'points':
        return `${value} loyalty points`;
      case 'shipping':
        return 'Free shipping';
      case 'product':
        return `Free gift with purchase`;
      default:
        return `${value} ${type}`;
    }
  };
  
  // Fetch an active campaign if none is provided
  useEffect(() => {
    if (!campaign && displayMode === 'slim') {
      const fetchActiveCampaign = async () => {
        try {
          const response = await Axios({
            url: '/api/campaigns/active',
            method: 'GET'
          });
          
          if (response.data.success && response.data.data.length > 0) {
            setActiveCampaign(response.data.data[0]);
          }
        } catch (error) {
          console.error('Error fetching active campaign:', error);
        }
      };
      
      fetchActiveCampaign();
    }
  }, [campaign, displayMode]);
  
  // For slim mode with no campaign data, just show a placeholder
  if (displayMode === 'slim' && !campaign && !activeCampaign) {
    return (
      <div className="px-4 py-2 text-center text-brown-500 dark:text-white/40 text-sm">
        Check back later for community campaigns
      </div>
    );
  }
  
  // For normal mode with no campaign, return null as before
  if (!campaign && displayMode !== 'slim') {
    return null;
  }
  
  // Use activeCampaign as fallback if no campaign is provided
  const campaignData = campaign || activeCampaign;
  
  const { 
    _id,
    title, 
    description, 
    goalType, 
    goalTarget, 
    currentProgress = 0, 
    rewardType, 
    rewardValue,
    endDate,
    isActive,
    isAchieved,
    userParticipation,
    metadata = {}
  } = campaignData;
  
  // For slim mode, simplified display
  if (displayMode === 'slim') {
    const progressPercentage = Math.min(100, Math.round((currentProgress / goalTarget) * 100));
    
    return (
      <div className={`px-4 py-2 ${className}`}>
        <div className="text-sm mb-2 dark:text-white/70">
          <span className="font-medium">{title}</span>
          {endDate && (
            <span className="text-xs text-brown-400 dark:text-white/40 ml-2">
              Ends {formatDistance(new Date(endDate), new Date(), { addSuffix: true })}
            </span>
          )}
        </div>
        
        <div className="w-full bg-brown-100 dark:bg-dm-card-2 rounded-full h-1.5 mb-1">
          <div 
            className="bg-plum-600 h-1.5 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs">
          <span className="text-brown-500 dark:text-white/40">{progressPercentage}% Complete</span>
          <span className="text-plum-600 dark:text-plum-300">
            Reward: {formatReward(rewardType, rewardValue)}
          </span>
        </div>
      </div>
    );
  }
  
  // The rest of the original implementation for normal mode
  const progressPercentage = Math.min(100, Math.round((currentProgress / goalTarget) * 100));
  const isPerk = metadata.isPerk === true;
  const isExpired = new Date(endDate) < new Date();
  const canParticipate = isActive && !isExpired && !isAchieved;
  const canClaimReward = isAchieved && userParticipation && !userParticipation.hasRedeemed;
  
  const timeLeft = endDate ? formatDistance(new Date(endDate), new Date(), { addSuffix: true }) : '';
  
  // Format goal based on type
  const formatGoal = () => {
    switch (goalType) {
      case 'purchases':
        return `${currentProgress} / ${goalTarget} community purchases`;
      case 'points':
        return `${currentProgress} / ${goalTarget} community points`;
      case 'referrals':
        return `${currentProgress} / ${goalTarget} new referrals`;
      case 'reviews':
        return `${currentProgress} / ${goalTarget} product reviews`;
      default:
        return `${currentProgress} / ${goalTarget} ${goalType}`;
    }
  };
  
  const handleToggleLeaderboard = async () => {
    if (!showLeaderboard) return;
    
    setLeaderboardVisible(!leaderboardVisible);
    
    if (!leaderboardVisible && leaderboard.length === 0) {
      try {
        setLoading(true);
        const response = await Axios({
          url: `/api/campaigns/leaderboard/${_id}`,
          method: 'GET'
        });
        
        if (response.data.success) {
          setLeaderboard(response.data.data.leaderboard);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        toast.error('Could not load the leaderboard');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleClaimReward = async () => {
    if (!canClaimReward) return;
    
    try {
      setLoading(true);
      const response = await Axios({
        url: `/api/campaigns/${_id}/redeem`,
        method: 'POST'
      });
      
      if (response.data.success) {
        toast.success('Reward claimed successfully!');
        onRewardClaimed(response.data.data.reward);
      } else {
        toast.error(response.data.message || 'Error claiming reward');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim your reward');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadge = () => {
    if (isAchieved) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
          Goal Achieved!
        </span>
      );
    }
    
    if (isExpired) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-full">
          Expired
        </span>
      );
    }
    
    if (!isActive) {
      return (
        <span className="px-2 py-1 bg-brown-50 text-charcoal dark:bg-dm-card-2 dark:text-white/55 text-xs rounded-full">
          Inactive
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 bg-plum-100 text-plum-800 dark:bg-plum-900/30 dark:text-plum-200 text-xs rounded-full">
        Active
      </span>
    );
  };
  
  // Determine if user is participating
  const isParticipating = !!userParticipation;
  
  const content = (
    <div className={className}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-lg dark:text-white">{title}</h3>
          <p className="text-brown-500 dark:text-white/55 text-sm">{description}</p>
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium dark:text-white/70">{formatGoal()}</span>
          <span className="dark:text-white/70">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-brown-100 dark:bg-dm-card-2 rounded-full h-2.5">
          <div 
            className={`${isPerk ? 'bg-yellow-500' : 'bg-plum-600'} h-2.5 rounded-full`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 text-sm mb-3">
        {endDate && (
          <div className="flex items-center gap-1 text-brown-500 dark:text-white/40">
            <FaClock className="text-brown-400 dark:text-brown-400" />
            <span>{timeLeft}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1 text-brown-500 dark:text-white/40">
          <FaGift className="text-primary-200" />
          <span>Reward: {formatReward(rewardType, rewardValue)}</span>
        </div>
        
        {isParticipating && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <FaUsers />
            <span>You're participating</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        {showLeaderboard && (
          <button
            onClick={handleToggleLeaderboard}
            className="text-sm text-plum-600 dark:text-plum-300 hover:underline flex items-center gap-1"
          >
            <FaTrophy className="text-yellow-500" />
            {leaderboardVisible ? 'Hide Leaderboard' : 'View Leaderboard'}
          </button>
        )}
        
        {canClaimReward && (
          <button
            onClick={handleClaimReward}
            className="px-3 py-1 bg-primary-200 text-white rounded-lg hover:bg-primary-300 text-sm"
            disabled={loading}
          >
            {loading ? 'Claiming...' : 'Claim Reward'}
          </button>
        )}
      </div>
      
      {leaderboardVisible && (
        <div className="mt-4 border rounded-lg p-3 bg-ivory dark:bg-dm-card dark:border-dm-border">
          <h4 className="font-medium mb-2 flex items-center gap-1 dark:text-white">
            <FaTrophy className="text-yellow-500" />
            Top Contributors
          </h4>
          
          {loading ? (
            <p className="text-center text-sm py-2 dark:text-white/55">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-sm py-2 text-brown-400 dark:text-white/40">No participants yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((participant, index) => (
                <div key={participant._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium dark:text-white/70">{index + 1}.</span>
                    <span className="dark:text-white/55">{participant.userId?.name || 'Anonymous'}</span>
                  </div>
                  <span className="text-sm dark:text-white/40">{participant.contributionAmount} contributions</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  if (showInCard) {
    return (
      <div className={`border rounded-lg p-4 ${
        isPerk 
          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/30' 
          : 'bg-white dark:bg-dm-card dark:border-dm-border'
      }`}>
        {content}
      </div>
    );
  }
  
  return content;
};

export default CommunityCampaignProgress;
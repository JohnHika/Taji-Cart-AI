import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaGift, FaSpinner, FaTrophy } from 'react-icons/fa';
import Axios from '../utils/Axios';

const CommunityPerks = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);

      const response = await Axios({
        url: '/api/campaigns/active',
        method: 'GET'
      });

      if (response.data.success) {
        const activeCampaigns = response.data.data || [];
        setCampaigns(activeCampaigns);
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
        fetchCampaigns();
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
    <section className="bg-ivory dark:bg-dm-surface min-h-screen transition-colors duration-200">
      <div className="bg-gradient-to-br from-plum-900 via-plum-700 to-charcoal py-10 sm:py-12 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <p className="font-display italic text-gold-300 text-sm sm:text-base mb-1">Nawiri Hair</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl">Community perks</h1>
          <p className="text-white/65 text-sm sm:text-base mt-3">
            Track community goals and redeem rewards when milestones are reached.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <FaSpinner className="animate-spin text-plum-600 dark:text-plum-300 text-3xl" />
          </div>
        ) : (
          <>
            {campaigns.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border rounded-card shadow-hover max-w-lg mx-auto">
                <FaGift className="mx-auto text-brown-300 dark:text-white/30 text-4xl mb-3" />
                <p className="text-charcoal dark:text-white font-medium">No active community campaigns right now</p>
                <p className="text-sm text-brown-500 dark:text-white/50 mt-2">Check back later for new community rewards.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                      className={`p-4 sm:p-5 border rounded-card shadow-hover ${
                        isPerk
                          ? 'bg-gold-50/80 border-gold-200 dark:bg-gold-900/10 dark:border-gold-800/40'
                          : 'bg-white dark:bg-dm-card border-brown-100 dark:border-dm-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2.5 rounded-pill flex-shrink-0 ${
                            isPerk
                              ? 'bg-gold-200/60 dark:bg-gold-800/30'
                              : 'bg-plum-100 dark:bg-plum-900/40'
                          }`}
                        >
                          {isPerk ? (
                            <FaGift className="text-gold-700 dark:text-gold-400" />
                          ) : (
                            <FaTrophy className="text-plum-700 dark:text-plum-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-charcoal dark:text-white">{campaign.title}</h3>
                          <p className="text-brown-600 dark:text-white/60 text-sm mt-1">{campaign.description}</p>

                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1 text-charcoal dark:text-white/80">
                              <span>
                                Progress: {campaign.currentProgress || 0} of {campaign.goalTarget || 0}
                              </span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-brown-100 dark:bg-dm-border rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-2.5 rounded-full ${isPerk ? 'bg-gold-500' : 'bg-plum-600'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3">
                            <p className="text-sm font-medium text-charcoal dark:text-white/90">
                              Reward: {getRewardMessage(campaign)}
                            </p>

                            {hasContributed && (
                              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                You&apos;ve contributed to this campaign.
                              </p>
                            )}

                            {campaign.isAchieved && (
                              <div className="mt-2">
                                <span className="inline-block bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300 px-3 py-1 rounded-pill text-sm">
                                  Goal achieved! {hasRedeemed ? 'Reward redeemed' : 'Claim your reward'}
                                </span>
                              </div>
                            )}

                            {canRedeem && (
                              <button
                                type="button"
                                onClick={() => handleRedeemReward(campaign._id)}
                                className="mt-3 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill text-sm transition-colors"
                              >
                                Redeem reward
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

            <div className="mt-8 sm:mt-10 bg-plum-100 dark:bg-plum-900/30 p-5 sm:p-6 rounded-card border border-plum-200 dark:border-plum-800">
              <h2 className="text-lg font-semibold text-charcoal dark:text-white mb-3">How community perks work</h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-brown-700 dark:text-white/70">
                <li>Community perks are goals that our customers achieve together.</li>
                <li>When you make purchases or participate in other ways, you contribute to the community goal.</li>
                <li>Once a goal is reached, all participating customers can redeem the reward.</li>
                <li>You must have contributed to a campaign to be eligible for its reward.</li>
                <li>Some rewards may have time limits — redeem them before they expire.</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default CommunityPerks;

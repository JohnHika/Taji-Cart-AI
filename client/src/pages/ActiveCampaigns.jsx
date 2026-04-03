import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaFilter, FaSpinner } from 'react-icons/fa';
import CommunityCampaignProgress from '../components/CommunityCampaignProgress';
import Axios from '../utils/Axios';

const pillBase =
  'px-3 py-1.5 text-sm rounded-pill border transition-colors duration-200 font-medium';
const pillInactive =
  'border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30';
const pillActive = 'border-plum-600 bg-plum-700 text-white';

const ActiveCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('endDate');
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

  const handleRewardClaimed = (reward) => {
    toast.success(`You claimed a ${reward.type} reward!`);
    fetchActiveCampaigns();
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    if (filter === 'participating') return campaign.userParticipation;
    if (filter === 'achieved') return campaign.isAchieved;
    return true;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (sortBy === 'endDate') {
      return new Date(a.endDate) - new Date(b.endDate);
    }
    if (sortBy === 'progress') {
      const progressA = (a.currentProgress / a.goalTarget) * 100;
      const progressB = (b.currentProgress / b.goalTarget) * 100;
      return progressB - progressA;
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  return (
    <section className="bg-ivory dark:bg-dm-surface min-h-screen transition-colors duration-200">
      <div className="bg-gradient-to-br from-plum-900 via-plum-700 to-charcoal py-10 sm:py-14 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <p className="font-display italic text-gold-300 text-sm sm:text-base mb-1">
            Nawiri Hair
          </p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl">
            Community Campaigns
          </h1>
          <p className="text-white/65 text-sm sm:text-base mt-3 leading-relaxed">
            Join our community campaigns to unlock exclusive rewards. Contribute by making purchases,
            writing reviews, or referring friends.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`${pillBase} ${pillInactive} inline-flex items-center gap-1.5`}
            >
              <FaFilter className="text-plum-600 dark:text-plum-300" size={12} /> Filters
            </button>

            {showFilters && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`${pillBase} ${filter === 'all' ? pillActive : pillInactive}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('participating')}
                  className={`${pillBase} ${filter === 'participating' ? pillActive : pillInactive}`}
                >
                  Participating
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('achieved')}
                  className={`${pillBase} ${filter === 'achieved' ? pillActive : pillInactive}`}
                >
                  Goal achieved
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-brown-500 dark:text-white/50">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card text-charcoal dark:text-white text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-plum-500/30"
            >
              <option value="endDate">Ending soon</option>
              <option value="progress">Most progress</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <FaSpinner className="text-4xl text-plum-600 dark:text-plum-300 animate-spin" />
          </div>
        ) : sortedCampaigns.length === 0 ? (
          <div className="bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border rounded-card shadow-hover p-8 sm:p-10 text-center max-w-lg mx-auto">
            <h3 className="text-xl font-semibold text-charcoal dark:text-white mb-2">No active campaigns</h3>
            <p className="text-brown-500 dark:text-white/50 text-sm mb-3">
              There are no active community campaigns at the moment.
            </p>
            <p className="text-brown-400 dark:text-white/40 text-sm">
              Check back later for new opportunities to participate and earn rewards.
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

        <div className="mt-12 sm:mt-16">
          <h2 className="text-xl sm:text-2xl font-semibold text-charcoal dark:text-white mb-4">
            How community campaigns work
          </h2>

          <div className="bg-plum-100 dark:bg-plum-900/30 rounded-card p-5 sm:p-6 border border-plum-200 dark:border-plum-800 shadow-hover">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: '1',
                  title: 'Join campaigns',
                  body: 'Browse active campaigns and start participating automatically when you make purchases.'
                },
                {
                  n: '2',
                  title: 'Contribute',
                  body: 'Every purchase, review, or referral helps achieve the community goal.'
                },
                {
                  n: '3',
                  title: 'Earn rewards',
                  body: 'Once the goal is reached, all contributors can claim their rewards.'
                },
                {
                  n: '4',
                  title: 'Use benefits',
                  body: 'Apply your rewards during checkout for discounts, free shipping, or other benefits.'
                }
              ].map((step) => (
                <div
                  key={step.n}
                  className="p-4 rounded-card border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card"
                >
                  <div className="w-10 h-10 rounded-pill bg-plum-700 text-white flex items-center justify-center mb-3 text-sm font-bold">
                    {step.n}
                  </div>
                  <h3 className="font-semibold text-charcoal dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-brown-500 dark:text-white/50 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 sm:p-5 rounded-card border border-plum-200 dark:border-plum-800 bg-white/80 dark:bg-dm-card/80">
              <h4 className="font-semibold text-charcoal dark:text-white mb-2">Types of rewards</h4>
              <ul className="list-disc list-inside text-sm text-brown-600 dark:text-white/60 space-y-1">
                <li><strong className="text-charcoal dark:text-white/80">Discounts:</strong> percentage off your purchases</li>
                <li><strong className="text-charcoal dark:text-white/80">Free shipping:</strong> on qualifying orders</li>
                <li><strong className="text-charcoal dark:text-white/80">Points:</strong> loyalty points for future purchases</li>
                <li><strong className="text-charcoal dark:text-white/80">Free products:</strong> gifts with your orders</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActiveCampaigns;

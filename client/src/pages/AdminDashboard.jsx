import React, { useEffect, useState } from 'react';
import { FaBullhorn, FaSpinner } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import UserTable from '../components/UserTable';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const navigate = useNavigate();
  const userRole = useSelector(state => state.user.role); // Assuming user role is stored in Redux

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/'); // Redirect to home if not admin
    } else {
      fetchUsers();
      fetchActiveCampaigns();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    try {
      const response = await Axios(SummaryApi.getUsers);
      setUsers(response.data.data);
    } catch (error) {
      AxiosToastError(error);
    }
  };

  const fetchActiveCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const response = await Axios({
        url: '/api/campaigns/active',
        method: 'GET'
      });
      
      if (response.data.success) {
        setCampaigns(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      AxiosToastError(error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Helper to calculate progress percentage
  const calculateProgress = (campaign) => {
    return Math.min(100, Math.floor(((campaign.currentProgress || 0) / (campaign.goalTarget || 100)) * 100));
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="font-display text-3xl italic text-plum-900 dark:text-white mb-1">Admin Dashboard</h1>
      <p className="text-brown-400 dark:text-white/40 text-sm mb-6">Manage your store campaigns and users</p>

      {/* Active Campaigns Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-charcoal dark:text-white">Active Campaigns</h2>
          <div className="flex items-center gap-4">
            <Link to="/dashboard/active-campaigns" className="text-plum-600 hover:text-plum-800 dark:text-plum-300 dark:hover:text-plum-100 text-sm font-medium">
              View All
            </Link>
            <Link to="/dashboard/admin-community-perks" className="text-sm font-medium bg-plum-700 hover:bg-plum-800 text-white px-3 py-1.5 rounded-pill transition-colors">
              Manage Campaigns
            </Link>
          </div>
        </div>
        
        {loadingCampaigns ? (
          <div className="flex justify-center items-center h-32 bg-white dark:bg-dm-card rounded-card shadow-card">
            <FaSpinner className="animate-spin text-plum-500 text-2xl" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white dark:bg-dm-card rounded-card shadow-card p-8 text-center">
            <div className="w-14 h-14 bg-plum-50 dark:bg-plum-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <FaBullhorn className="text-plum-400 text-2xl" />
            </div>
            <p className="text-brown-400 dark:text-white/50 mb-3">No active campaigns at the moment</p>
            <Link to="/dashboard/admin-community-perks" className="inline-block bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-4 py-2 rounded-pill text-sm transition-colors">
              Create New Campaign
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(campaign => {
              const progress = calculateProgress(campaign);
              const isPerk = campaign.metadata?.isPerk === true;
              
              return (
                <div
                  key={campaign._id}
                  className={`p-4 rounded-card shadow-card border hover-lift transition-all ${
                    isPerk
                      ? 'bg-gold-50 dark:bg-gold-900/10 border-gold-200 dark:border-gold-800/30'
                      : 'bg-white dark:bg-dm-card border-brown-100 dark:border-dm-border'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${isPerk ? 'bg-gold-100 dark:bg-gold-900/30' : 'bg-plum-50 dark:bg-plum-900/30'}`}>
                      <FaBullhorn className={isPerk ? 'text-gold-600 dark:text-gold-400' : 'text-plum-600 dark:text-plum-400'} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-charcoal dark:text-white truncate">{campaign.title}</h3>
                      <p className="text-sm text-brown-400 dark:text-white/50 line-clamp-2 mt-0.5">{campaign.description}</p>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-brown-400 dark:text-white/40 mb-1.5">
                          <span>{campaign.currentProgress || 0} / {campaign.goalTarget} {campaign.goalType || 'purchases'}</span>
                          <span className="font-semibold text-charcoal dark:text-white">{progress}%</span>
                        </div>
                        <div className="w-full bg-brown-100 dark:bg-dm-border rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isPerk ? 'bg-gradient-to-r from-gold-400 to-gold-600' : 'bg-gradient-to-r from-plum-400 to-plum-700'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 text-right">
                        <Link
                          to={`/dashboard/admin-community-perks?edit=${campaign._id}`}
                          className={`text-xs font-semibold hover:underline ${isPerk ? 'text-gold-600 dark:text-gold-400' : 'text-plum-600 dark:text-plum-300'}`}
                        >
                          Manage →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Users Section */}
      <div>
        <h2 className="text-lg font-semibold text-charcoal dark:text-white mb-4">System Users</h2>
        <UserTable users={users} />
      </div>
    </div>
  );
};

export default AdminDashboard;

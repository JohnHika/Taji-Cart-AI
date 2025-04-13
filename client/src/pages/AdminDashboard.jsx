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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      {/* Active Campaigns Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Campaigns</h2>
          <div className="flex items-center gap-4">
            <Link to="/dashboard/active-campaigns" className="text-primary-200 hover:text-primary-300 text-sm">
              View Active Campaigns
            </Link>
            <Link to="/dashboard/admin-community-perks" className="text-primary-200 hover:text-primary-300 text-sm">
              Manage Campaigns
            </Link>
          </div>
        </div>
        
        {loadingCampaigns ? (
          <div className="flex justify-center items-center h-32 bg-white rounded-lg shadow p-4">
            <FaSpinner className="animate-spin text-primary-300 text-2xl" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <FaBullhorn className="mx-auto text-gray-400 text-4xl mb-2" />
            <p className="text-gray-600">No active campaigns at the moment</p>
            <Link to="/dashboard/admin-community-perks" className="mt-3 inline-block text-primary-200 hover:underline">
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
                  className={`p-4 rounded-lg shadow ${isPerk ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-200'}`}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full ${isPerk ? 'bg-yellow-100' : 'bg-blue-100'} mr-3`}>
                      <FaBullhorn className={isPerk ? 'text-yellow-600' : 'text-blue-600'} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{campaign.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{campaign.currentProgress || 0} of {campaign.goalTarget} {campaign.goalType || 'purchases'}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${isPerk ? 'bg-yellow-500' : 'bg-blue-500'} h-2 rounded-full`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 text-right">
                        <Link 
                          to={`/dashboard/admin-community-perks?edit=${campaign._id}`}
                          className="text-sm text-primary-200 hover:underline"
                        >
                          Manage
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
        <h2 className="text-xl font-semibold mb-4">System Users</h2>
        <UserTable users={users} />
      </div>
    </div>
  );
};

export default AdminDashboard;

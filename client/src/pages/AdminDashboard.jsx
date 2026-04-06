import React, { useEffect, useMemo, useState } from 'react';
import { FaBarcode, FaBullhorn, FaCashRegister, FaClipboardList, FaSpinner, FaStore, FaUsers } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import UserTable from '../components/UserTable';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import isadmin from '../utils/isAdmin';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const navigate = useNavigate();
  const currentUser = useSelector(state => state.user);
  const isAdmin = isadmin(currentUser);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/'); // Redirect to home if not admin
    } else {
      fetchUsers();
      fetchActiveCampaigns();
    }
  }, [isAdmin, navigate]);

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

  const roleSummary = useMemo(() => {
    const admins = users.filter((user) => user.isAdmin || user.role === 'admin').length;
    const staff = users.filter((user) => user.isStaff || user.role === 'staff').length;
    const delivery = users.filter((user) => user.isDelivery || user.role === 'delivery').length;
    const customers = Math.max(users.length - admins - staff - delivery, 0);

    return [
      { label: 'Total Users', value: users.length, icon: FaUsers, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200' },
      { label: 'Admins', value: admins, icon: FaUsers, tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      { label: 'Sellers', value: staff, icon: FaStore, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      { label: 'Drivers', value: delivery, icon: FaClipboardList, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      { label: 'Customers', value: customers, icon: FaUsers, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
    ];
  }, [users]);

  const quickLinks = [
    {
      label: 'Open Sales Counter',
      description: 'Test barcode scanning and branch selling from your admin account.',
      path: '/dashboard/sales-counter',
      icon: FaCashRegister
    },
    {
      label: 'Sales Hub',
      description: 'Check daily totals, transactions, and todayâ€™s top-selling items.',
      path: '/dashboard/sales-hub',
      icon: FaStore
    },
    {
      label: 'Manage Orders',
      description: 'Review order status, customer details, and fulfillment updates.',
      path: '/dashboard/allorders',
      icon: FaClipboardList
    },
    {
      label: 'Manage Users',
      description: 'Filter sellers, drivers, admins, and customers by role.',
      path: '/dashboard/users-admin',
      icon: FaUsers
    }
  ];

  const recentUsers = users.slice(0, 6);

  return (
    <div className="container mx-auto w-full max-w-full overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 pb-24 lg:pb-6">
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.2em] text-white/80">Admin overview</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Control center</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
              Keep the launch flow tight from one place: review orders, open the sales counter, and inspect seller accounts without switching users.
            </p>
          </div>
          <Link
            to="/dashboard/sales-counter"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <FaBarcode className="mr-2" />
            Scan Barcodes Now
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-5">
        {roleSummary.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`min-w-0 rounded-2xl p-4 shadow-sm ${item.tone}`}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 dark:bg-black/10">
                <Icon />
              </div>
              <div className="break-words text-xl sm:text-2xl font-bold">{item.value}</div>
              <div className="mt-1 text-sm font-medium">{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              to={link.path}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                <Icon />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{link.label}</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{link.description}</p>
            </Link>
          );
        })}
      </div>
      
      {/* Active Campaigns Section */}
      <div className="mb-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Active Campaigns</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/dashboard/active-campaigns" className="text-primary-200 hover:text-primary-300 text-sm">
              View Active Campaigns
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
                          Manage â†’
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
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1 dark:text-white">Recent System Users</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Quick visibility into the people using the store, selling, and delivering.
            </p>
          </div>
          <Link to="/dashboard/users-admin" className="text-sm font-medium text-primary-200 hover:text-primary-300">
            Open full user management
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <UserTable users={recentUsers} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

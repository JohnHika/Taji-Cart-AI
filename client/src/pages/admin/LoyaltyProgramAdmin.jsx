import React, { useEffect, useState } from 'react';
import { FaEdit, FaSearch, FaSpinner, FaUserTag } from 'react-icons/fa';
import Axios from '../../utils/Axios';

const LoyaltyProgramAdmin = () => {
  const [loyaltyCards, setLoyaltyCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingCard, setEditingCard] = useState(null);
  const [stats, setStats] = useState({
    totalMembers: 0,
    bronzeMembers: 0,
    silverMembers: 0,
    goldMembers: 0,
    platinumMembers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0
  });

  const [tierThresholds, setTierThresholds] = useState({
    // Standard tier thresholds (new)
    bronzeThreshold: 500,
    silverThreshold: 1500,
    goldThreshold: 3000,
    platinumThreshold: 5000,
    // Early access toggle (new)
    earlyAccessEnabled: true,
    // Early access thresholds (existing)
    earlyBronzeThreshold: 400,
    earlySilverThreshold: 1200,
    earlyGoldThreshold: 2500,
    earlyPlatinumThreshold: 3750
  });
  const [isThresholdLoading, setIsThresholdLoading] = useState(false);
  const [thresholdSuccess, setThresholdSuccess] = useState(false);

  const [selectedUserForPromotion, setSelectedUserForPromotion] = useState(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [searchUserResults, setSearchUserResults] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [specialPromotion, setSpecialPromotion] = useState({
    userId: '',
    tier: 'Silver',
    reason: '',
    expiryDate: ''
  });

  const [benefitRanges, setBenefitRanges] = useState({
    firstMilestone: 1000,
    firstMilestoneName: 'Welcome Reward',
    secondMilestone: 2500,
    secondMilestoneName: 'Loyalty Bonus',
    thirdMilestone: 5000,
    thirdMilestoneName: 'VIP Status'
  });
  const [isBenefitRangeLoading, setIsBenefitRangeLoading] = useState(false);
  const [benefitRangeSuccess, setBenefitRangeSuccess] = useState(false);

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('thresholds'); // 'thresholds', 'benefits', 'promotions'

  // Add state for refresh points modal
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshingUser, setRefreshingUser] = useState(null);
  const [refreshType, setRefreshType] = useState(''); // 'spending' or 'reset'
  const [refreshError, setRefreshError] = useState('');
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Add state for security code
  const [securityCode, setSecurityCode] = useState('');
  const [securityCodeSent, setSecurityCodeSent] = useState(false);
  const [securityCodeError, setSecurityCodeError] = useState('');
  const [showSecurityCodeInput, setShowSecurityCodeInput] = useState(false);

  useEffect(() => {
    // Initial data fetch
    fetchLoyaltyCards();
    fetchLoyaltyStats();
    fetchTierThresholds();
    fetchBenefitRanges();
    
    // Set up refresh interval for stats
    const refreshInterval = setInterval(() => {
      fetchLoyaltyStats();
    }, 30000); // Refresh stats every 30 seconds
    
    // Clean up
    return () => clearInterval(refreshInterval);
  }, [currentPage, searchTerm]);

  const fetchLoyaltyCards = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: `/api/admin/loyalty/cards?page=${currentPage}&search=${searchTerm}`,
        method: 'GET'
      });
      
      console.log("API response:", response.data);
      
      if (response.data.success) {
        // Check for different data structures and handle accordingly
        if (response.data.data && response.data.data.cards) {
          // New API structure with nested cards and pagination
          setLoyaltyCards(response.data.data.cards);
          setTotalPages(response.data.data.pagination.pages || 1);
        } else if (Array.isArray(response.data.data)) {
          // Direct array of cards
          setLoyaltyCards(response.data.data);
          // If pagination info is at the root level
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.totalPages || 1);
          } else {
            setTotalPages(1);
          }
        } else {
          // Fallback to empty array if unexpected structure
          console.error("Unexpected API response structure:", response.data);
          setLoyaltyCards([]);
          setTotalPages(1);
        }
      } else {
        setLoyaltyCards([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching loyalty cards:', error);
      setLoyaltyCards([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoyaltyStats = async () => {
    try {
      const response = await Axios({
        url: '/api/admin/loyalty/stats',
        method: 'GET'
      });
      
      console.log("Stats API response:", response.data);
      
      if (response.data.success) {
        // Initialize with default values for any missing properties
        const defaultStats = {
          totalMembers: 0,
          bronzeMembers: 0,
          silverMembers: 0,
          goldMembers: 0,
          platinumMembers: 0,
          totalPointsIssued: 0,
          totalPointsRedeemed: 0,
          tierDistribution: {
            Basic: 0,
            Bronze: 0,
            Silver: 0,
            Gold: 0,
            Platinum: 0
          }
        };
        
        // Merge response data with default values
        const responseData = response.data.data || {};
        
        // If tierDistribution exists in the response, use it directly
        const mergedStats = {...defaultStats, ...responseData};
        
        // If individual tier counts are present but tierDistribution is missing,
        // construct it manually
        if (!responseData.tierDistribution && responseData.bronzeMembers !== undefined) {
          mergedStats.tierDistribution = {
            Basic: responseData.basicMembers || 0,
            Bronze: responseData.bronzeMembers || 0,
            Silver: responseData.silverMembers || 0,
            Gold: responseData.goldMembers || 0,
            Platinum: responseData.platinumMembers || 0
          };
        }
        
        setStats(mergedStats);
      }
    } catch (error) {
      console.error('Error fetching loyalty stats:', error);
    }
  };

  const fetchTierThresholds = async () => {
    try {
      const response = await Axios({
        url: '/api/admin/loyalty/thresholds',
        method: 'GET'
      });
      
      if (response.data.success) {
        setTierThresholds(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching tier thresholds:', error);
    }
  };

  const fetchBenefitRanges = async () => {
    try {
      const response = await Axios({
        url: '/api/admin/loyalty/benefit-ranges',
        method: 'GET'
      });
      
      if (response.data.success) {
        setBenefitRanges(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching benefit ranges:', error);
      // Continue with default values if there's an error
    }
  };

  const saveTierThresholds = async () => {
    try {
      // Basic validation
      if (
        tierThresholds.bronzeThreshold >= tierThresholds.silverThreshold ||
        tierThresholds.silverThreshold >= tierThresholds.goldThreshold ||
        tierThresholds.goldThreshold >= tierThresholds.platinumThreshold
      ) {
        alert("Standard thresholds must be in ascending order (Bronze < Silver < Gold < Platinum)");
        return;
      }

      // Validate early access thresholds if early access is enabled
      if (tierThresholds.earlyAccessEnabled) {
        if (
          tierThresholds.earlyBronzeThreshold < 0 || 
          tierThresholds.earlyBronzeThreshold > tierThresholds.bronzeThreshold ||
          tierThresholds.earlySilverThreshold < tierThresholds.bronzeThreshold || 
          tierThresholds.earlySilverThreshold > tierThresholds.silverThreshold ||
          tierThresholds.earlyGoldThreshold < tierThresholds.silverThreshold || 
          tierThresholds.earlyGoldThreshold > tierThresholds.goldThreshold ||
          tierThresholds.earlyPlatinumThreshold < tierThresholds.goldThreshold || 
          tierThresholds.earlyPlatinumThreshold > tierThresholds.platinumThreshold
        ) {
          alert("Early access thresholds must be between the previous and current tier thresholds");
          return;
        }
      }

      setIsThresholdLoading(true);
      
      const response = await Axios({
        url: '/api/admin/loyalty/thresholds',
        method: 'PUT',
        data: tierThresholds
      });
      
      if (response.data.success) {
        // Update local state with validated values
        setTierThresholds(response.data.data);
        setThresholdSuccess(true);
        setTimeout(() => setThresholdSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving tier thresholds:', error);
      alert(`Failed to save thresholds: ${error.response?.data?.message || 'Unknown error'}`);
    } finally {
      setIsThresholdLoading(false);
    }
  };

  const saveBenefitRanges = async () => {
    try {
      // Validate milestone values - ensure they're in ascending order
      // and have all required fields before sending to server
      const validatedRanges = {
        firstMilestone: Math.max(100, benefitRanges.firstMilestone || 1000),
        firstMilestoneName: benefitRanges.firstMilestoneName || "Welcome Reward",
        secondMilestone: Math.max(benefitRanges.firstMilestone + 100, benefitRanges.secondMilestone || 2500),
        secondMilestoneName: benefitRanges.secondMilestoneName || "Loyalty Bonus",
        thirdMilestone: Math.max(benefitRanges.secondMilestone + 100, benefitRanges.thirdMilestone || 5000),
        thirdMilestoneName: benefitRanges.thirdMilestoneName || "VIP Status"
      };

      setIsBenefitRangeLoading(true);
      const response = await Axios({
        url: '/api/admin/loyalty/benefit-ranges',
        method: 'PUT',
        data: validatedRanges
      });
      
      if (response.data.success) {
        // Update local state with validated values
        setBenefitRanges(validatedRanges);
        setBenefitRangeSuccess(true);
        setTimeout(() => setBenefitRangeSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving benefit ranges:', error);
    } finally {
      setIsBenefitRangeLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await Axios({
        url: `/api/admin/loyalty/cards/${editingCard._id}`,
        method: 'PUT',
        data: editingCard
      });
      
      if (response.data.success) {
        // Update local state
        setLoyaltyCards(prevCards => 
          prevCards.map(card => 
            card._id === editingCard._id ? response.data.data : card
          )
        );
        setEditingCard(null);
      }
    } catch (error) {
      console.error('Error updating loyalty card:', error);
    }
  };

  const handleSpecialPromotion = async () => {
    try {
      if (!specialPromotion.userId || !specialPromotion.tier) {
        alert('Please select a user and tier');
        return;
      }

      // Find the existing card if any
      const cardResponse = await Axios({
        url: `/api/users/${specialPromotion.userId}/loyalty-card`,
        method: 'GET'
      });

      if (!cardResponse.data?.success) {
        alert('Failed to find user\'s loyalty card');
        return;
      }

      const cardData = cardResponse.data.data;
      
      // Update the card with the special tier
      const response = await Axios({
        url: `/api/admin/loyalty/cards/${cardData._id}`,
        method: 'PUT',
        data: {
          ...cardData,
          tier: specialPromotion.tier,
          specialPromotion: {
            grantedAt: new Date(),
            reason: specialPromotion.reason || 'Special promotion granted by admin',
            expiryDate: specialPromotion.expiryDate ? new Date(specialPromotion.expiryDate) : null
          }
        }
      });
      
      if (response.data?.success) {
        // Close modal and reset form
        setPromotionModalOpen(false);
        setSpecialPromotion({
          userId: '',
          tier: 'Silver',
          reason: '',
          expiryDate: ''
        });
        setSelectedUserForPromotion(null);
        
        // Refresh the loyalty cards list
        fetchLoyaltyCards();
        alert('Special tier promotion granted successfully!');
      }
    } catch (error) {
      console.error('Error applying special promotion:', error);
      alert('Failed to apply special promotion');
    }
  };

  const searchUsers = async () => {
    if (!userSearchTerm) return;
    
    try {
      const response = await Axios({
        url: `/api/admin/users/search?term=${userSearchTerm}`,
        method: 'GET'
      });
      
      if (response.data?.success) {
        setSearchUserResults(response.data.data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Function to request security code
  const requestSecurityCode = async (action) => {
    try {
      setLoading(true);
      setSecurityCodeError('');
      
      console.log('Requesting security code for action:', action);
      
      const response = await Axios({
        url: `/api/loyalty/request-security-code`,
        method: 'POST',
        data: { action }
      });
      
      if (response.data.success) {
        setSecurityCodeSent(true);
        setShowSecurityCodeInput(true);
        // Use alert instead of toast if react-toastify isn't available
        alert('Security code sent to your email');
      } else {
        setSecurityCodeError(response.data.message || "Failed to request security code");
      }
    } catch (error) {
      console.error('Error requesting security code:', error);
      setSecurityCodeError(error.response?.data?.message || 'Failed to request security code');
    } finally {
      setLoading(false);
    }
  };

  // Improved refresh points function with security code verification
  const refreshUserPoints = async (cardId, userId, resetToZero = false) => {
    try {
      setLoading(true);
      setRefreshError('');
      
      // Check if we have the security code
      if (!securityCode && !showSecurityCodeInput) {
        // Request a security code first
        await requestSecurityCode(resetToZero ? 'resetPoints' : 'refreshPoints');
        return; // Wait for user to enter code
      }
      
      if (!securityCode && showSecurityCodeInput) {
        setRefreshError('Please enter the security code sent to your email');
        setLoading(false);
        return;
      }
      
      console.log('Refresh request params:', {
        cardId,
        userId,
        resetToZero,
        securityCode
      });
      
      if (!cardId || !userId) {
        setRefreshError('Missing required parameters: Card ID or User ID');
        setLoading(false);
        return;
      }
      
      const response = await Axios({
        url: `/api/loyalty/refresh-points`,
        method: 'POST',
        data: {
          cardId,
          userId,
          resetToZero,
          securityCode
        }
      });
      
      if (response.data.success) {
        // Update the card in the local state
        setLoyaltyCards(prevCards => 
          prevCards.map(card => 
            card._id === cardId ? response.data.data : card
          )
        );
        
        // Show success message
        setRefreshSuccess(true);
        // Use alert instead of toast if react-toastify isn't available
        alert(resetToZero ? 'Points reset to zero successfully' : 'Points refreshed successfully');
        setTimeout(() => setRefreshSuccess(false), 3000);
        
        // Close the modal if open
        setRefreshModalOpen(false);
        setShowSecurityCodeInput(false);
        setSecurityCode('');
        setSecurityCodeSent(false);
        
        // Refresh stats after point update
        fetchLoyaltyStats();
      } else {
        setRefreshError(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error('Error refreshing points:', error);
      setRefreshError(error.response?.data?.message || 'Failed to refresh points. Please try again.');
      
      // If security code is invalid, allow user to try again
      if (error.response?.status === 403) {
        setSecurityCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh button click to open modal
  const handleRefreshClick = (card, type) => {
    console.log('Card data for refresh:', card);
    setRefreshingUser(card);
    setRefreshType(type || '');
    setRefreshError('');
    setRefreshModalOpen(true);
  };

  return (
    <div className="container mx-auto p-6 dark:bg-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Loyalty Program Management</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-gray-500 dark:text-gray-300 text-sm">Total Members</h3>
          <p className="text-2xl font-bold dark:text-white">{stats.totalMembers || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-gray-500 dark:text-gray-300 text-sm">Points Issued</h3>
          <p className="text-2xl font-bold dark:text-white">{(stats.totalPointsIssued || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-gray-500 dark:text-gray-300 text-sm">Points Redeemed</h3>
          <p className="text-2xl font-bold dark:text-white">{(stats.totalPointsRedeemed || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-gray-500 dark:text-gray-300 text-sm">Tier Distribution</h3>
          <div className="flex items-center mt-2">
            <div className="bg-gray-300 h-4" style={{width: `${(stats.tierDistribution?.Basic || 0) / (stats.totalMembers || 1) * 100}%`}}></div>
            <div className="bg-amber-700 h-4" style={{width: `${(stats.tierDistribution?.Bronze || stats.bronzeMembers || 0) / (stats.totalMembers || 1) * 100}%`}}></div>
            <div className="bg-gray-400 h-4" style={{width: `${(stats.tierDistribution?.Silver || stats.silverMembers || 0) / (stats.totalMembers || 1) * 100}%`}}></div>
            <div className="bg-amber-400 h-4" style={{width: `${(stats.tierDistribution?.Gold || stats.goldMembers || 0) / (stats.totalMembers || 1) * 100}%`}}></div>
            <div className="bg-blue-600 h-4" style={{width: `${(stats.tierDistribution?.Platinum || stats.platinumMembers || 0) / (stats.totalMembers || 1) * 100}%`}}></div>
          </div>
          <div className="flex text-xs justify-between mt-1 dark:text-gray-300">
            <span>Basic: {stats.tierDistribution?.Basic || 0}</span>
            <span>Bronze: {stats.tierDistribution?.Bronze || stats.bronzeMembers || 0}</span>
            <span>Silver: {stats.tierDistribution?.Silver || stats.silverMembers || 0}</span>
            <span>Gold: {stats.tierDistribution?.Gold || stats.goldMembers || 0}</span>
            <span>Platinum: {stats.tierDistribution?.Platinum || stats.platinumMembers || 0}</span>
          </div>
          <div className="mt-2 text-xs text-right text-primary-600 dark:text-primary-400">
            <button 
              onClick={fetchLoyaltyStats} 
              className="flex items-center justify-end w-full"
            >
              <FaSpinner className={`mr-1 ${loading ? 'animate-spin' : 'opacity-0'}`} />
              Refresh Stats
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabbed Navigation for Settings Panels */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('thresholds')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'thresholds'
                  ? 'border-primary-200 text-primary-200 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Tier Benefit Thresholds
            </button>
            <button
              onClick={() => setActiveTab('benefits')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'benefits'
                  ? 'border-primary-200 text-primary-200 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Special Benefit Ranges
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'promotions'
                  ? 'border-primary-200 text-primary-200 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Special Tier Promotions
            </button>
          </nav>
        </div>
        
        {/* Tier Benefit Settings Panel */}
        {activeTab === 'thresholds' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Tier Benefit Threshold Settings</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Configure the points required for each tier and control early access thresholds.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Standard Tier Thresholds - NEW SECTION */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium dark:text-white">Standard Tier Requirements</h3>
                  <div className="text-sm text-gray-600">
                    <span className="mr-2">Make changes to the standard tier point requirements</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bronze Tier (points)
                    </label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      placeholder="e.g., 500"
                      min="100"
                      value={tierThresholds.bronzeThreshold}
                      onChange={(e) => setTierThresholds({...tierThresholds, bronzeThreshold: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Silver Tier (points)
                    </label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      placeholder="e.g., 1500"
                      min={tierThresholds.bronzeThreshold + 1}
                      value={tierThresholds.silverThreshold}
                      onChange={(e) => setTierThresholds({...tierThresholds, silverThreshold: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gold Tier (points)
                    </label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      placeholder="e.g., 3000"
                      min={tierThresholds.silverThreshold + 1}
                      value={tierThresholds.goldThreshold}
                      onChange={(e) => setTierThresholds({...tierThresholds, goldThreshold: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Platinum Tier (points)
                    </label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      placeholder="e.g., 5000"
                      min={tierThresholds.goldThreshold + 1}
                      value={tierThresholds.platinumThreshold}
                      onChange={(e) => setTierThresholds({...tierThresholds, platinumThreshold: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                {/* Early Access Toggle - NEW COMPONENT */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium dark:text-white">Early Access Feature</h3>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={tierThresholds.earlyAccessEnabled}
                        onChange={(e) => setTierThresholds({...tierThresholds, earlyAccessEnabled: e.target.checked})}
                      />
                      <div className={`relative w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-300 
                        ${tierThresholds.earlyAccessEnabled ? 'bg-primary-200' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute inset-y-0 left-0 w-6 h-6 rounded-full bg-white transform transition-transform 
                          ${tierThresholds.earlyAccessEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {tierThresholds.earlyAccessEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    When enabled, users can get early access to tier benefits at lower point thresholds
                  </p>
                </div>
                
                {/* Early Access Thresholds - ONLY SHOW IF ENABLED */}
                {tierThresholds.earlyAccessEnabled && (
                  <div>
                    <h3 className="font-medium mb-3 dark:text-white">Early Access Thresholds</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Early Bronze Access (points)
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                          placeholder="e.g., 400"
                          min="0"
                          max={tierThresholds.bronzeThreshold}
                          value={tierThresholds.earlyBronzeThreshold}
                          onChange={(e) => setTierThresholds({...tierThresholds, earlyBronzeThreshold: parseInt(e.target.value)})}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard: {tierThresholds.bronzeThreshold} points</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Early Silver Access (points)
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                          placeholder="e.g., 1200"
                          min={tierThresholds.bronzeThreshold}
                          max={tierThresholds.silverThreshold}
                          value={tierThresholds.earlySilverThreshold}
                          onChange={(e) => setTierThresholds({...tierThresholds, earlySilverThreshold: parseInt(e.target.value)})}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard: {tierThresholds.silverThreshold} points</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Early Gold Access (points)
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                          placeholder="e.g., 2500"
                          min={tierThresholds.silverThreshold}
                          max={tierThresholds.goldThreshold}
                          value={tierThresholds.earlyGoldThreshold}
                          onChange={(e) => setTierThresholds({...tierThresholds, earlyGoldThreshold: parseInt(e.target.value)})}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard: {tierThresholds.goldThreshold} points</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Early Platinum Access (points)
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                          placeholder="e.g., 3500"
                          min={tierThresholds.goldThreshold}
                          max={tierThresholds.platinumThreshold}
                          value={tierThresholds.earlyPlatinumThreshold}
                          onChange={(e) => setTierThresholds({...tierThresholds, earlyPlatinumThreshold: parseInt(e.target.value)})}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard: {tierThresholds.platinumThreshold} points</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={saveTierThresholds}
                className="px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300"
                disabled={isThresholdLoading}
              >
                {isThresholdLoading ? <FaSpinner className="animate-spin inline mr-2" /> : 'Save Thresholds'}
              </button>
              {thresholdSuccess && <p className="text-green-500 text-sm ml-4">Thresholds saved successfully!</p>}
            </div>
          </div>
        )}

        {/* Special Benefits Range Panel */}
        {activeTab === 'benefits' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Special Benefits Range Settings</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Define custom point ranges where users will receive special benefits regardless of their tier. 
              These benefits can be awarded to users who have reached specific point milestones.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Benefit Range Settings */}
              <div>
                <h3 className="font-medium mb-3 dark:text-white">Special Benefits Description</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Special benefits are additional rewards given to users who have accumulated a certain number of points, 
                  regardless of their current tier. These can incentivize continuous engagement with the platform.
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 ml-2 space-y-1">
                  <li>Milestone rewards for point accumulation</li>
                  <li>Limited-time exclusive offers</li>
                  <li>Special event invitations</li>
                  <li>Early access to new products</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-3 dark:text-white">Benefit Range Configuration</h3>
                <div className="space-y-4">
                  {/* First Benefit Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Milestone (points)
                      </label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        placeholder="e.g., 1000"
                        min="100"
                        value={benefitRanges?.firstMilestone || 1000}
                        onChange={(e) => setBenefitRanges({...benefitRanges, firstMilestone: parseInt(e.target.value), firstMilestoneName: benefitRanges?.firstMilestoneName || "Welcome Reward"})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Benefit Name
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        placeholder="e.g., Welcome Reward"
                        value={benefitRanges?.firstMilestoneName || "Welcome Reward"}
                        onChange={(e) => setBenefitRanges({...benefitRanges, firstMilestoneName: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* Second Benefit Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Second Milestone (points)
                      </label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        placeholder="e.g., 2500"
                        min="1000"
                        value={benefitRanges?.secondMilestone || 2500}
                        onChange={(e) => setBenefitRanges({...benefitRanges, secondMilestone: parseInt(e.target.value), secondMilestoneName: benefitRanges?.secondMilestoneName || "Loyalty Bonus"})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Benefit Name
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        placeholder="e.g., Loyalty Bonus"
                        value={benefitRanges?.secondMilestoneName || "Loyalty Bonus"}
                        onChange={(e) => setBenefitRanges({...benefitRanges, secondMilestoneName: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* Third Benefit Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Third Milestone (points)
                      </label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        placeholder="e.g., 5000"
                        min="2500"
                        value={benefitRanges?.thirdMilestone || 5000}
                        onChange={(e) => setBenefitRanges({...benefitRanges, thirdMilestone: parseInt(e.target.value), thirdMilestoneName: benefitRanges?.thirdMilestoneName || "VIP Status"})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Benefit Name
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        placeholder="e.g., VIP Status"
                        value={benefitRanges?.thirdMilestoneName || "VIP Status"}
                        onChange={(e) => setBenefitRanges({...benefitRanges, thirdMilestoneName: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <button
                    onClick={saveBenefitRanges}
                    className="px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300"
                    disabled={isBenefitRangeLoading}
                  >
                    {isBenefitRangeLoading ? <FaSpinner className="animate-spin inline mr-2" /> : 'Save Benefit Ranges'}
                  </button>
                  {benefitRangeSuccess && <p className="text-green-500 text-sm ml-4">Benefit ranges saved successfully!</p>}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Special Tier Promotions Panel */}
        {activeTab === 'promotions' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold dark:text-white">Special Tier Promotions</h2>
              <button
                onClick={() => setPromotionModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Grant Special Tier
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Grant special tier status to specific users regardless of their point total. This allows you to 
              reward loyal customers, VIPs, or promotional winners with higher tier benefits.
            </p>
            
            {/* Recent Special Promotions */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Recent Special Promotions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-100 dark:bg-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Granted Tier</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Reason</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {loyaltyCards
                      .filter(card => card.specialPromotion)
                      .slice(0, 5)
                      .map(card => (
                        <tr key={`promotion-${card._id}`}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="ml-2">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{card.userId.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{card.userId.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${card.tier === 'Bronze' ? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100' : 
                               card.tier === 'Silver' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100' :
                               card.tier === 'Gold' ? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100' :
                               'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'}`}>
                              {card.tier}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {card.specialPromotion?.reason || 'Special promotion'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {card.specialPromotion?.grantedAt ? new Date(card.specialPromotion.grantedAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    {loyaltyCards.filter(card => card.specialPromotion).length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                          No special promotions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-grow max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or card number..."
            className="w-full p-2 pl-10 pr-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400 dark:text-gray-300" />
        </div>
        
        <button
          onClick={fetchLoyaltyCards}
          className="px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300"
        >
          Refresh
        </button>
      </div>
      
      {/* Loyalty Cards Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                Card Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center dark:text-white">
                  <FaSpinner className="animate-spin inline mr-2" />
                  Loading...
                </td>
              </tr>
            ) : loyaltyCards.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No loyalty cards found.
                </td>
              </tr>
            ) : (
              loyaltyCards.map(card => (
                <tr key={card._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <FaUserTag className="text-gray-500 dark:text-gray-300" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{card.userId.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{card.userId.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{card.cardNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCard && editingCard._id === card._id ? (
                      <select
                        value={editingCard.tier}
                        onChange={(e) => setEditingCard({...editingCard, tier: e.target.value})}
                        className="border rounded p-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="Bronze">Bronze</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${card.tier === 'Bronze' ? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100' : 
                         card.tier === 'Silver' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100' :
                         card.tier === 'Gold' ? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100' :
                         'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'}`}>
                        {card.tier}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCard && editingCard._id === card._id ? (
                      <input
                        type="number"
                        value={editingCard.points}
                        onChange={(e) => setEditingCard({...editingCard, points: parseInt(e.target.value)})}
                        className="border rounded p-1 w-20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    ) : (
                      <div className="text-sm text-gray-900 dark:text-white">{card.points}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(card.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingCard && editingCard._id === card._id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCard(null)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingCard({...card})}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          title="Edit card"
                        >
                          <FaEdit />
                        </button>
                        <div className="relative">
                          <button
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Refresh points"
                            onClick={() => handleRefreshClick(card, '')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 dark:text-gray-300">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing page {currentPage} of {totalPages}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            Next
          </button>
        </div>
      </div>
      
      {/* Special Promotion Modal */}
      {promotionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Grant Special Tier Status</h2>
            
            {/* User Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search for User
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search by name or email"
                  className="flex-grow p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  onClick={searchUsers}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 dark:text-white"
                >
                  Search
                </button>
              </div>
              
              {/* User Search Results */}
              {searchUserResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg dark:border-gray-600">
                  {searchUserResults.map(user => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUserForPromotion(user);
                        setSpecialPromotion({...specialPromotion, userId: user._id});
                        setSearchUserResults([]);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-600 dark:text-white"
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Selected User */}
              {selectedUserForPromotion && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium dark:text-white">Selected User:</div>
                  <div className="text-sm dark:text-gray-300">{selectedUserForPromotion.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{selectedUserForPromotion.email}</div>
                </div>
              )}
            </div>
            
            {/* Tier Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Tier to Grant
              </label>
              <select
                value={specialPromotion.tier}
                onChange={(e) => setSpecialPromotion({...specialPromotion, tier: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </div>
            
            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason for Special Promotion
              </label>
              <textarea
                value={specialPromotion.reason}
                onChange={(e) => setSpecialPromotion({...specialPromotion, reason: e.target.value})}
                placeholder="e.g., Contest winner, VIP customer, etc."
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="3"
              ></textarea>
            </div>
            
            {/* Expiry Date (Optional) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={specialPromotion.expiryDate}
                onChange={(e) => setSpecialPromotion({...specialPromotion, expiryDate: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank for permanent promotion
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setPromotionModalOpen(false);
                  setSelectedUserForPromotion(null);
                  setSpecialPromotion({
                    userId: '',
                    tier: 'Silver',
                    reason: '',
                    expiryDate: ''
                  });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSpecialPromotion}
                disabled={!specialPromotion.userId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Grant Special Tier
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Refresh Points Confirmation Modal */}
      {refreshModalOpen && refreshingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Refresh Points</h2>
            
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
              <p className="font-medium dark:text-white">Selected User:</p>
              <div className="text-sm dark:text-gray-300">{refreshingUser.user?.name || 'Unknown User'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{refreshingUser.user?.email || ''}</div>
              <div className="text-sm font-medium mt-2">
                Current Points: <span className="text-primary-600 dark:text-primary-400">{refreshingUser.points}</span> 
              </div>
              <div className="text-sm font-medium">
                Current Tier: <span className="text-primary-600 dark:text-primary-400">{refreshingUser.tier}</span>
              </div>
              <div className="text-xs mt-2 text-gray-500">
                Card ID: {refreshingUser._id}
              </div>
            </div>
            
            {!showSecurityCodeInput ? (
              <div className="mb-4">
                <p className="mb-2 text-gray-700 dark:text-gray-300">Please choose an option:</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setRefreshType('spending')}
                    className={`w-full text-left px-4 py-2 rounded ${refreshType === 'spending' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}
                  >
                    <span className="font-medium dark:text-white">Refresh based on spending</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Calculate points based on user's order history (1 point per KES 100)
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setRefreshType('reset')}
                    className={`w-full text-left px-4 py-2 rounded ${refreshType === 'reset' ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-700'}`}
                  >
                    <span className="font-medium dark:text-white">Reset points to zero</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This will reset points to 0 and tier to Basic
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                  A security code has been sent to your email. Please enter it below:
                </p>
                <div className="mt-3">
                  <input 
                    type="text" 
                    value={securityCode}
                    onChange={(e) => setSecurityCode(e.target.value)}
                    placeholder="Enter 6-digit security code"
                    className="w-full p-2 border rounded-md text-center tracking-wider text-lg"
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The code will expire in 15 minutes. Please check your email.
                  </p>
                </div>
              </div>
            )}
            
            {refreshError && (
              <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
                {refreshError}
              </div>
            )}
            
            {securityCodeError && (
              <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
                {securityCodeError}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setRefreshModalOpen(false);
                  setRefreshingUser(null);
                  setRefreshType('');
                  setRefreshError('');
                  setSecurityCode('');
                  setSecurityCodeSent(false);
                  setShowSecurityCodeInput(false);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (showSecurityCodeInput) {
                    // User has already selected an option and entered the security code
                    const userIdValue = refreshingUser.userId?._id || refreshingUser.userId;
                    refreshUserPoints(refreshingUser._id, userIdValue, refreshType === 'reset');
                  } else if (refreshType) {
                    // User has selected an option but hasn't entered the security code yet
                    const action = refreshType === 'reset' ? 'resetPoints' : 'refreshPoints';
                    requestSecurityCode(action);
                  }
                }}
                disabled={(!refreshType && !showSecurityCodeInput) || loading}
                className="px-4 py-2 bg-primary-200 text-white rounded-lg hover:bg-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <FaSpinner className="animate-spin inline mr-2" /> : ''} 
                {showSecurityCodeInput ? 'Verify & Continue' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyProgramAdmin;
import React, { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';
import { FaCrown, FaGift, FaInfoCircle, FaPercent, FaSpinner } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';

const RoyalCard = () => {
  const user = useSelector(state => state.user);
  const [cardData, setCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('barcode');
  const [previewCountdown, setPreviewCountdown] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [tierThresholds, setTierThresholds] = useState({
    bronzeThreshold: 500,
    silverThreshold: 1500,
    goldThreshold: 3000,
    platinumThreshold: 5000,
    earlyAccessEnabled: true,
    earlyBronzeThreshold: 400,
    earlySilverThreshold: 1200,
    earlyGoldThreshold: 2500,
    earlyPlatinumThreshold: 3750
  });
  const [thresholdsLoaded, setThresholdsLoaded] = useState(false);

  // Get the current hostname for QR code generation
  const hostname = window.location.origin;

  // Robust admin check
  const isAdmin = React.useMemo(() => {
    // Log entire user object for debugging
    console.log("User data in Royal Card:", user);
    
    // Check all possible admin indicators
    return Boolean(
      user?.isAdmin === true || 
      user?.role === 'admin' ||
      user?.userType === 'admin' ||
      user?.type === 'admin'
    );
  }, [user]);

  useEffect(() => {
    if (user?._id) {
      fetchUserCardData();
      fetchTierThresholds(); // Add this line
    }
  }, [user]);

  const fetchUserCardData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      
      // REMOVE hardcoded values for admins - Always get the real data from API
      // Instead, fetch data from API for all users including admins
      console.log("Fetching loyalty card for user:", user._id);
      
      const response = await Axios({
        url: `/api/users/${user._id}/loyalty-card`,
        method: 'GET'
      });

      console.log("Loyalty card API response:", response.data);
      
      if (response.data?.success) {
        setCardData(response.data.data);
        
        // Log the tier and points for debugging
        console.log(`Loyalty tier: ${response.data.data.tier}, Points: ${response.data.data.points}`);
      } else {
        console.log("API Success=false, creating fallback card data");
        // Create placeholder data when API fails
        setCardData({
          cardNumber: `NAWIRI${user._id ? user._id.substring(0, 8) : Date.now()}`,
          tier: isAdmin ? 'Platinum' : 'Basic',
          points: isAdmin ? 5000 : 0,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
      }
    } catch (error) {
      console.error('Error fetching loyalty card data:', error);
      setFetchError(error.message || "Failed to fetch loyalty card data");
      
      // Fallback data
      setCardData({
        cardNumber: `NAWIRI${user._id ? user._id.substring(0, 8) : Date.now()}`,
        tier: isAdmin ? 'Platinum' : 'Basic',
        points: isAdmin ? 5000 : 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTierThresholds = async () => {
    try {
      // First, check if the user is an admin - only admins can access this endpoint
      if (isAdmin) {
        const response = await Axios({
          url: '/api/loyalty/admin/thresholds',
          method: 'GET'
        });
        
        if (response.data?.success) {
          console.log("Threshold data:", response.data.data);
          setTierThresholds(response.data.data);
          
          // Log the early access status for debugging
          console.log("Early access enabled:", response.data.data.earlyAccessEnabled);
        }
      } else {
        // For regular users, we'll just use the default values
        console.log("Using default thresholds for non-admin user");
        // Default values are already set in the state initialization
      }
      setThresholdsLoaded(true);
    } catch (error) {
      console.error('Error fetching tier thresholds:', error);
      // Error is already handled by having default thresholds in state
      setThresholdsLoaded(true);
    }
  };

  // Get card background based on tier — new Nawiri palette
  const getCardBackground = (tier) => {
    switch(tier) {
      case 'Basic':
        return 'bg-gradient-to-br from-brown-400 to-charcoal';
      case 'Bronze':
        return 'bg-gradient-to-br from-[#8B4513] to-[#3D1C0D]';
      case 'Silver':
        return 'bg-gradient-to-br from-[#708090] to-[#2F3E46]';
      case 'Gold':
        return 'bg-gradient-to-br from-gold-500 to-[#7B4A1A]';
      case 'Platinum':
        return 'bg-gradient-to-br from-plum-700 to-plum-900';
      default:
        return 'bg-gradient-to-br from-brown-400 to-charcoal';
    }
  };

  // Get secondary background color for the bottom part of the card
  const getSecondaryBackground = (tier) => {
    switch(tier) {
      case 'Basic':
        return 'bg-charcoal/80';
      case 'Bronze':
        return 'bg-[#3D1C0D]/90';
      case 'Silver':
        return 'bg-[#2F3E46]/90';
      case 'Gold':
        return 'bg-[#7B4A1A]/90';
      case 'Platinum':
        return 'bg-plum-900/90';
      default:
        return 'bg-charcoal/80';
    }
  };

  // Get background color for the buttons in the footer
  const getButtonBackground = (tier) => {
    switch(tier) {
      case 'Basic':
        return 'bg-white/10 hover:bg-white/20';
      case 'Bronze':
        return 'bg-white/10 hover:bg-white/20';
      case 'Silver':
        return 'bg-white/10 hover:bg-white/20';
      case 'Gold':
        return 'bg-white/10 hover:bg-white/20';
      case 'Platinum':
        return 'bg-white/10 hover:bg-white/20';
      default:
        return 'bg-white/10 hover:bg-white/20';
    }
  };

  // Get discount percentage based on tier
  const getDiscountPercentage = (tier) => {
    switch(tier) {
      case 'Basic':
        return '0%';
      case 'Bronze':
        return '2%';
      case 'Silver':
        return '3%';
      case 'Gold':
        return '5%';
      case 'Platinum':
        return '7%';
      default:
        return '0%';
    }
  };

  // Helper function to safely format numbers with toLocaleString
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    try {
      return num.toLocaleString();
    } catch (error) {
      console.error('Error formatting number:', num, error);
      return String(num || 0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-40 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-plum-700 border-t-transparent animate-spin" />
        <p className="text-sm font-display italic text-plum-500 dark:text-plum-300">Loading your card...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6 text-center bg-blush-50 dark:bg-blush-500/10 border border-blush-200 dark:border-blush-500/30 rounded-card">
        <h3 className="font-semibold text-lg mb-2 text-charcoal dark:text-white">Error Loading Royal Card</h3>
        <p className="text-blush-500 mb-4 text-sm">{fetchError}</p>
        <button
          className="bg-plum-700 hover:bg-plum-600 text-white px-5 py-2 rounded-pill text-sm font-semibold transition-colors press"
          onClick={fetchUserCardData}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="p-6 text-center bg-plum-50 dark:bg-plum-900/20 border border-plum-100 dark:border-plum-800 rounded-card">
        <FaCrown className="text-gold-500 text-3xl mx-auto mb-3 animate-float" />
        <h3 className="font-semibold text-lg mb-2 text-charcoal dark:text-white">Activate Your Royal Card</h3>
        <p className="text-brown-400 dark:text-white/50 mb-5 text-sm">Enjoy exclusive discounts and rewards with our loyalty program.</p>
        <button
          className="bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-5 py-2 rounded-pill text-sm transition-colors press"
          onClick={fetchUserCardData}
        >
          Activate Now
        </button>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const tierBackground = getCardBackground(cardData.tier);
  const secondaryBackground = getSecondaryBackground(cardData.tier);
  const buttonBackground = getButtonBackground(cardData.tier);
  const discountPercentage = getDiscountPercentage(cardData.tier);

  // For debugging, let's add a console log to check admin status and early access
  console.log("User data:", {
    name: user?.name,
    isAdmin: isAdmin,
    cardTier: cardData?.tier,
    earlyAccessEnabled: tierThresholds?.earlyAccessEnabled
  });

  // Safely get threshold values with fallbacks
  const getBronzeThreshold = () => tierThresholds?.bronzeThreshold || 500;
  const getSilverThreshold = () => tierThresholds?.silverThreshold || 1500;
  const getGoldThreshold = () => tierThresholds?.goldThreshold || 3000;
  const getPlatinumThreshold = () => tierThresholds?.platinumThreshold || 5000;
  const getEarlyBronzeThreshold = () => tierThresholds?.earlyBronzeThreshold || 400;
  const getEarlySilverThreshold = () => tierThresholds?.earlySilverThreshold || 1200;
  const getEarlyGoldThreshold = () => tierThresholds?.earlyGoldThreshold || 2500;
  const getEarlyPlatinumThreshold = () => tierThresholds?.earlyPlatinumThreshold || 3750;
  
  // Updated to properly reflect the early access status from server
  const isEarlyAccessEnabled = () => tierThresholds?.earlyAccessEnabled === true;

  // Enhanced helper function to determine if early access info should be shown
  const shouldShowEarlyAccess = () => {
    // Only show early access information if it's enabled or if user is admin
    return isEarlyAccessEnabled() || isAdmin;
  };

  // Enhanced helper function to get next tier threshold
  const getNextTierThreshold = () => {
    switch(cardData.tier) {
      case 'Basic': return getBronzeThreshold();
      case 'Bronze': return getSilverThreshold();
      case 'Silver': return getGoldThreshold();
      case 'Gold': return getPlatinumThreshold();
      case 'Platinum': return getPlatinumThreshold() * 1.5; // Show progress beyond Platinum
      default: return getBronzeThreshold();
    }
  };
  
  // Enhanced progress calculation to always show progress to next tier
  const calculateProgress = () => {
    if (cardData.tier === 'Platinum') {
      // For Platinum users, show progress beyond their current threshold
      return Math.min(100, (cardData.points / getNextTierThreshold()) * 100);
    }
    
    // For all other tiers, show progress toward the next tier
    const currentThreshold = getCurrentTierThreshold();
    const nextThreshold = getNextTierThreshold();
    const pointsAboveCurrentTier = cardData.points - currentThreshold;
    const rangeToNextTier = nextThreshold - currentThreshold;
    
    // Calculate percentage within the range between current tier and next tier
    if (rangeToNextTier <= 0) return 100; // Avoid division by zero
    return Math.min(100, (pointsAboveCurrentTier / rangeToNextTier) * 100);
  };
  
  // Helper function to get current tier threshold
  const getCurrentTierThreshold = () => {
    switch(cardData.tier) {
      case 'Basic': return 0;
      case 'Bronze': return getBronzeThreshold();
      case 'Silver': return getSilverThreshold();
      case 'Gold': return getGoldThreshold();
      case 'Platinum': return getPlatinumThreshold();
      default: return 0;
    }
  };

  // Calculate points needed for next tier
  const getPointsNeededForNextTier = () => {
    const nextThreshold = getNextTierThreshold();
    return Math.max(0, nextThreshold - cardData.points);
  };

  // Helper function to get next tier threshold
  const getNextTierThresholdOld = () => {
    switch(cardData.tier) {
      case 'Basic': return getBronzeThreshold();
      case 'Bronze': return getSilverThreshold();
      case 'Silver': return getGoldThreshold();
      case 'Gold': return getPlatinumThreshold();
      default: return getPlatinumThreshold();
    }
  };

  // Helper function to get early access threshold for next tier - updated to respect the early access flag
  const getNextTierEarlyThreshold = () => {
    // Don't show early access thresholds if disabled for non-admins
    if (!isEarlyAccessEnabled() && !isAdmin) {
      return null;
    }
    
    switch(cardData.tier) {
      case 'Basic':
        return getEarlyBronzeThreshold();
      case 'Bronze':
        return getEarlySilverThreshold();
      case 'Silver':
        return getEarlyGoldThreshold();
      case 'Gold':
        return getEarlyPlatinumThreshold();
      default:
        return null;
    }
  };

  // Add function to check if user is in a tier through early access when the program is disabled
  const isInTierViaEarlyAccess = () => {
    if (isEarlyAccessEnabled() || cardData.tier === 'Basic') return false;
    
    switch(cardData.tier) {
      case 'Bronze':
        return cardData.points < getBronzeThreshold();
      case 'Silver':
        return cardData.points < getSilverThreshold();
      case 'Gold':
        return cardData.points < getGoldThreshold();
      case 'Platinum':
        return cardData.points < getPlatinumThreshold() && !isAdmin;
      default:
        return false;
    }
  };
  
  // Add function to get the early access threshold for the current tier
  const getCurrentTierEarlyThreshold = () => {
    switch(cardData.tier) {
      case 'Bronze':
        return getEarlyBronzeThreshold();
      case 'Silver':
        return getEarlySilverThreshold();
      case 'Gold':
        return getEarlyGoldThreshold();
      case 'Platinum':
        return getEarlyPlatinumThreshold();
      default:
        return 0;
    }
  };
  
  // Function to get readable early access status for current user
  const getEarlyAccessStatusText = () => {
    if (isEarlyAccessEnabled()) {
      return "Early Access Program Active";
    } else if (isInTierViaEarlyAccess()) {
      return "Early Access Status Protected";
    } else {
      return "Early Access Program Inactive";
    }
  };
  
  // Helper function to get next tier name
  const getNextTierName = () => {
    switch(cardData.tier) {
      case 'Basic': return 'Bronze';
      case 'Bronze': return 'Silver';
      case 'Silver': return 'Gold';
      case 'Gold': return 'Platinum';
      default: return 'Platinum';
    }
  };
  
  // Add early access badge/indicator component 
  const EarlyAccessIndicator = () => {
    if (!thresholdsLoaded) return null;
    
    // Only show for admin users when disabled, to let them know it's off
    if (!isEarlyAccessEnabled() && !isAdmin && !isInTierViaEarlyAccess()) return null;
    
    return (
      <div className={`absolute top-0 left-0 w-full z-20 flex justify-center`}>
        <div className={`px-3 py-1 rounded-b-lg text-xs font-semibold shadow-md ${
          isEarlyAccessEnabled() 
            ? 'bg-green-500 text-white' 
            : isInTierViaEarlyAccess()
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
        }`}>
          {getEarlyAccessStatusText()}
        </div>
      </div>
    );
  };
  
  // Render the loyalty card with updated early access indicator
  return (
    <div className="relative flex flex-col items-center w-full max-w-sm mx-auto px-2 sm:max-w-md sm:px-0">
      {/* Card container with the tier-specific background */}
      <div
        className={`w-full rounded-[1.5rem] overflow-hidden shadow-2xl relative ${tierBackground}`}
        style={{ minHeight: 'auto' }}
      >
        {/* Add early access status indicator */}
        <EarlyAccessIndicator />
        
        {/* Rest of your card component */}
        <div className="relative p-3 pt-6 sm:p-4 sm:pt-8"> {/* Reduced padding on mobile */}
          <div className="absolute top-2 right-2 flex space-x-1 z-10">
            <button 
              onClick={() => setViewMode('barcode')}
              className={`p-1 rounded-full ${viewMode === 'barcode' ? 'bg-white text-charcoal' : 'bg-black/20 text-white'}`}
              title="Show Barcode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={() => setViewMode('qrcode')}
              className={`p-1 rounded-full ${viewMode === 'qrcode' ? 'bg-white text-charcoal' : 'bg-black/20 text-white'}`}
              title="Show QR Code"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 2v1h2V6H4zm5-2a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V4a1 1 0 00-1-1h-4zm1 2v1h2V6h-2zm-7 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm1 2v1h2v-1H4zm5-2a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1h-4zm1 2v1h2v-1h-2z" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center mb-3 sm:mb-4">
            <FaCrown className="text-gold-300 mr-2 text-lg sm:text-xl" />
            <h2 className="font-display text-gold-300 text-lg sm:text-xl font-semibold italic">Nawiri Royal Card</h2>
          </div>

          <div className="text-white/60 text-xs sm:text-sm mb-0.5">Member</div>
          <div className="text-white font-display font-semibold italic mb-3 sm:mb-4 text-base sm:text-lg">{user.name || 'Valued Customer'}</div>
          
          <div className="text-white text-xs sm:text-sm mb-1">Membership Level:</div>
          <div className="flex items-center mb-3 sm:mb-4">
            <span className={`${
              cardData.tier === 'Basic' ? 'bg-brown-200 text-charcoal' :
              cardData.tier === 'Bronze' ? 'bg-amber-300 text-amber-900' :
              cardData.tier === 'Silver' ? 'bg-brown-200 text-charcoal' :
              cardData.tier === 'Gold' ? 'bg-yellow-300 text-amber-900' :
              'bg-plum-200 text-plum-900'
            } px-2 py-0.5 rounded-full font-medium text-xs sm:text-sm`}>
              {cardData.tier}
            </span>
            <span className="ml-2 text-white text-xs sm:text-sm">
              {formatNumber(cardData.points)} points
            </span>
          </div>
          
          <div className="text-white text-xs">
            Valid until: {formatDate(cardData.expiresAt)}
          </div>
        </div>
        
        <div className="bg-white p-2 sm:p-4 flex justify-center items-center">
          {viewMode === 'barcode' ? (
            <div className="overflow-hidden max-w-full">
              <Barcode 
                value={cardData.cardNumber} 
                width={1.2}
                height={40}
                format="CODE128"
                displayValue={true}
                background="#FFFFFF"
                lineColor={
                  cardData.tier === 'Basic' ? '#4B5563' :
                  cardData.tier === 'Bronze' ? '#92400E' :
                  cardData.tier === 'Silver' ? '#4B5563' :
                  cardData.tier === 'Gold' ? '#B45309' :
                  '#2563EB'
                }
                margin={0}
                fontSize={10}
              />
            </div>
          ) : (
            <QRCode 
              value={`${hostname}/verify/${cardData.cardNumber}`}
              size={100}
              level="H"
            />
          )}
        </div>
        
        <div className={`${secondaryBackground} p-2 sm:p-3`}>
          <div className="grid grid-cols-3 gap-1 sm:gap-2 text-center text-xs">
            <div className={`${buttonBackground} p-1.5 sm:p-2 rounded`}>
              <FaPercent className="mx-auto text-white mb-1 text-xs" />
              <span className="text-white text-xs">{discountPercentage} Off</span>
            </div>
            <div className={`${buttonBackground} p-1.5 sm:p-2 rounded`}>
              <FaGift className="mx-auto text-white mb-1 text-xs" />
              <span className="text-white text-xs">
                {cardData.tier === 'Basic' ? 'Join Now' : 'Free Gifts'}
              </span>
            </div>
            <div className={`${buttonBackground} p-1.5 sm:p-2 rounded`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mx-auto text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white text-xs">
                {cardData.tier === 'Basic' ? 'Earn Points' : 'Early Access'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Next tier information for non-Platinum users */}
      {cardData.tier !== 'Platinum' && (
        <div className="mt-4 p-4 bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-card text-sm w-full">
          <h3 className="font-semibold text-charcoal dark:text-white text-sm">Next Tier: <span className="text-gold-600 dark:text-gold-300">{getNextTierName()}</span></h3>
          
          {/* Enhanced progress visualization */}
          <div className="mt-3 mb-1 flex items-center justify-between">
            <span className="text-xs text-brown-400 dark:text-white/40">Current: {formatNumber(cardData.points)} pts</span>
            <span className="text-xs text-brown-400 dark:text-white/40">
              {formatNumber(getNextTierThreshold())} pts
            </span>
          </div>
          
          <div className="relative">
            {/* Progress background */}
            <div className="h-5 bg-brown-100 dark:bg-dm-card-2 rounded-pill overflow-hidden">
              {/* Progress filled area */}
              <div
                className="h-full flex items-center justify-end pr-2 text-xs font-semibold text-white"
                style={{
                  width: `${Math.min(100, (cardData.points / getNextTierThreshold()) * 100)}%`,
                  background: cardData.tier === 'Basic' ? 'linear-gradient(90deg, #8B4513, #B45309)' :
                             cardData.tier === 'Bronze' ? 'linear-gradient(90deg, #708090, #9CA3AF)' :
                             cardData.tier === 'Silver' ? 'linear-gradient(90deg, #C9943A, #E8C478)' :
                             'linear-gradient(90deg, #4B1E3E, #7B3D6E)'
                }}
              >
                {cardData.points > 0 && (
                  <span className="px-1 whitespace-nowrap">
                    {formatNumber(cardData.points)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Points needed overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-charcoal dark:text-white px-2 py-0.5 bg-white/70 dark:bg-dm-card/70 rounded">
                {formatNumber(Math.max(0, getNextTierThreshold() - cardData.points))} more to {getNextTierName()}
              </span>
            </div>
          </div>
          
          {/* Early access information - only show when enabled */}
          {thresholdsLoaded && isEarlyAccessEnabled() && (
            <div className="mt-2">
              {cardData.tier === 'Basic' && cardData.points >= getEarlyBronzeThreshold() && cardData.points < getBronzeThreshold() && (
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-md mt-2">
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center">
                    <FaInfoCircle className="mr-1" /> Early Bronze Access Available!
                  </p>
                  <p className="text-xs mt-1 text-brown-500 dark:text-white/55">
                    With {formatNumber(cardData.points)} points, you're enjoying early Bronze tier benefits! You'll be automatically upgraded to full Bronze status at {formatNumber(getBronzeThreshold())} points.
                  </p>
                </div>
              )}
              
              {cardData.tier === 'Bronze' && cardData.points >= getEarlySilverThreshold() && cardData.points < getSilverThreshold() && (
                <div className="p-2 bg-ivory dark:bg-dm-card-2/50 border border-brown-100 dark:border-dm-border rounded-md mt-2">
                  <p className="text-xs text-charcoal dark:text-white/55 font-medium flex items-center">
                    <FaInfoCircle className="mr-1" /> Early Silver Access Available!
                  </p>
                  <p className="text-xs mt-1 text-brown-500 dark:text-white/55">
                    With {formatNumber(cardData.points)} points, you're enjoying early Silver tier benefits! You'll be automatically upgraded to full Silver status at {formatNumber(getSilverThreshold())} points.
                  </p>
                </div>
              )}
              
              {cardData.tier === 'Silver' && cardData.points >= getEarlyGoldThreshold() && cardData.points < getGoldThreshold() && (
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-md mt-2">
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center">
                    <FaInfoCircle className="mr-1" /> Early Gold Access Available!
                  </p>
                  <p className="text-xs mt-1 text-brown-500 dark:text-white/55">
                    With {formatNumber(cardData.points)} points, you're enjoying early Gold tier benefits! You'll be automatically upgraded to full Gold status at {formatNumber(getGoldThreshold())} points.
                  </p>
                </div>
              )}
              
              {cardData.tier === 'Gold' && cardData.points >= getEarlyPlatinumThreshold() && cardData.points < getPlatinumThreshold() && (
                <div className="p-2 bg-plum-50 dark:bg-plum-900/25 border border-plum-200 dark:border-plum-800 rounded-md mt-2">
                  <p className="text-xs text-plum-800 dark:text-plum-200 font-medium flex items-center">
                    <FaInfoCircle className="mr-1" /> Early Platinum Access Available!
                  </p>
                  <p className="text-xs mt-1 text-brown-500 dark:text-white/55">
                    With {formatNumber(cardData.points)} points, you're enjoying early Platinum tier benefits! You'll be automatically upgraded to full Platinum status at {formatNumber(getPlatinumThreshold())} points.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <p className="mt-2 text-xs text-brown-500 dark:text-white/40 italic">
            {cardData.tier === 'Basic' ? 
              `Earn discounts of 2% with the Bronze tier${cardData.points >= getEarlyBronzeThreshold() && isEarlyAccessEnabled() ? ' (early access active)' : ''}` :
             cardData.tier === 'Bronze' ? 
              `Unlock free shipping with the Silver tier${cardData.points >= getEarlySilverThreshold() && isEarlyAccessEnabled() ? ' (early access active)' : ''}` :
             cardData.tier === 'Silver' ? 
              `Get priority customer service with the Gold tier${cardData.points >= getEarlyGoldThreshold() && isEarlyAccessEnabled() ? ' (early access active)' : ''}` :
              `Enjoy exclusive events with the Platinum tier${cardData.points >= getEarlyPlatinumThreshold() && isEarlyAccessEnabled() ? ' (early access active)' : ''}`
            }
          </p>
        </div>
      )}

      {/* Tier Rankings Table */}
      <div className="mt-4 bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-hover p-4 sm:p-5 text-sm w-full">
        <h3 className="font-display font-semibold text-charcoal dark:text-white mb-1 text-base">Royal Card ranks</h3>
        <p className="text-xs text-brown-500 dark:text-white/45 mb-3">Your tier, discount, and points needed — Nawiri Hair loyalty.</p>
        
        {thresholdsLoaded && isEarlyAccessEnabled() && (
          <div className="mb-4 p-3 rounded-card border border-plum-200 dark:border-plum-700 bg-plum-50/90 dark:bg-plum-900/35">
            <p className="text-xs flex items-center gap-1.5 text-plum-800 dark:text-plum-200 font-semibold">
              <FaInfoCircle className="text-gold-500 shrink-0" /> Early access program active
            </p>
            <p className="text-xs mt-1.5 text-brown-700 dark:text-white/60 leading-relaxed">
              You can unlock tier benefits before standard thresholds. Use the Early access column below.
            </p>
          </div>
        )}
        
        <div className="overflow-x-auto -mx-1 sm:mx-0 rounded-card border border-brown-100 dark:border-dm-border">
          <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
            <thead>
              <tr className="bg-plum-50/80 dark:bg-plum-900/40">
                <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-brown-600 dark:text-white/55">Rank</th>
                <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-brown-600 dark:text-white/55">Discount</th>
                <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-brown-600 dark:text-white/55">Required points</th>
                {thresholdsLoaded && (isEarlyAccessEnabled() || isAdmin) && (
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-gold-700 dark:text-gold-400">
                    {isEarlyAccessEnabled() ? 'Early access' : 'Previous early access'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
              <tr className={cardData.tier === 'Basic' ? 'bg-plum-50/50 dark:bg-plum-900/20' : ''}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-brown-300 dark:bg-white/30 mr-2 ring-2 ring-brown-100 dark:ring-white/10" />
                    <span className="font-medium text-charcoal dark:text-white text-xs sm:text-sm">Basic</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">0%</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">0</td>
                {thresholdsLoaded && (isEarlyAccessEnabled() || isAdmin) && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/55 text-xs sm:text-sm">—</td>
                )}
              </tr>
              <tr className={cardData.tier === 'Bronze' ? 'bg-plum-50/50 dark:bg-plum-900/20' : ''}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-amber-700 mr-2 ring-2 ring-amber-200/50 dark:ring-amber-900/40" />
                    <span className="font-medium text-charcoal dark:text-white text-xs sm:text-sm">Bronze</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">2%</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">
                  {formatNumber(getBronzeThreshold())}
                </td>
                {thresholdsLoaded && (isEarlyAccessEnabled() || isAdmin) && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">
                    {formatNumber(getEarlyBronzeThreshold())} pts
                    {isEarlyAccessEnabled() && 
                     cardData.points >= getEarlyBronzeThreshold() && 
                     cardData.points < getBronzeThreshold() && (
                      <span className="ml-1 sm:ml-2 text-[0.65rem] bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-pill font-medium">
                        Active
                      </span>
                    )}
                  </td>
                )}
              </tr>
              <tr className={cardData.tier === 'Silver' ? 'bg-plum-50/50 dark:bg-plum-900/20' : ''}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-slate-300 dark:bg-slate-500 mr-2 ring-2 ring-slate-100 dark:ring-slate-700" />
                    <span className="font-medium text-charcoal dark:text-white text-xs sm:text-sm">Silver</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">3%</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">
                  {formatNumber(getSilverThreshold())}
                </td>
                {thresholdsLoaded && (isEarlyAccessEnabled() || isAdmin) && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">
                    {formatNumber(getEarlySilverThreshold())} pts
                    {isEarlyAccessEnabled() && 
                     cardData.points >= getEarlySilverThreshold() && 
                     cardData.points < getSilverThreshold() && (
                      <span className="ml-1 sm:ml-2 text-[0.65rem] bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-pill font-medium">
                        Active
                      </span>
                    )}
                  </td>
                )}
              </tr>
              <tr className={cardData.tier === 'Gold' ? 'bg-plum-50/50 dark:bg-plum-900/20' : ''}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-gold-500 mr-2 ring-2 ring-gold-200/60 dark:ring-gold-700/40" />
                    <span className="font-medium text-charcoal dark:text-white text-xs sm:text-sm">Gold</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">5%</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">
                  {formatNumber(getGoldThreshold())}
                </td>
                {thresholdsLoaded && (isEarlyAccessEnabled() || isAdmin) && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">
                    {formatNumber(getEarlyGoldThreshold())} pts
                    {isEarlyAccessEnabled() && 
                     cardData.points >= getEarlyGoldThreshold() && 
                     cardData.points < getGoldThreshold() && (
                      <span className="ml-1 sm:ml-2 text-[0.65rem] bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-pill font-medium">
                        Active
                      </span>
                    )}
                  </td>
                )}
              </tr>
              <tr className={cardData.tier === 'Platinum' ? 'bg-plum-50/70 dark:bg-plum-900/25 font-semibold' : ''}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-plum-600 mr-2 ring-2 ring-plum-200 dark:ring-plum-800" />
                    <span className="text-charcoal dark:text-white text-xs sm:text-sm">Platinum</span>
                    {cardData.tier === 'Platinum' && 
                     cardData.points < getPlatinumThreshold() && 
                     !isAdmin && (
                      <span className="ml-1 sm:ml-2 text-xs px-1 sm:px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 rounded-full">Special</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75 text-xs sm:text-sm">7%</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/80">
                  <span className="text-plum-700 dark:text-plum-300 font-medium">
                    {formatNumber(getPlatinumThreshold())}
                  </span>
                  {cardData.tier === 'Platinum' && 
                    cardData.points < getPlatinumThreshold() && 
                    !isAdmin && (
                    <span className="block text-xs text-brown-500 dark:text-white/45 mt-0.5">
                      You: {formatNumber(cardData.points)} pts
                    </span>
                  )}
                </td>
                {thresholdsLoaded && (isEarlyAccessEnabled() || isAdmin) && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-charcoal dark:text-white/75">
                    {formatNumber(getEarlyPlatinumThreshold())} pts
                    {isEarlyAccessEnabled() && 
                     cardData.points >= getEarlyPlatinumThreshold() && 
                     cardData.points < getPlatinumThreshold() && 
                     !isAdmin && (
                      <span className="ml-2 text-[0.65rem] bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-pill font-medium">
                        Active
                      </span>
                    )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Early Access Warning for Non-Enabled State - only visible to users who had early access previously */}
        {thresholdsLoaded && !isEarlyAccessEnabled() && (
          <div className="mt-3 p-3 rounded-card border border-gold-200/80 dark:border-gold-800/40 bg-gold-50/80 dark:bg-gold-950/20">
            <p className="text-xs flex items-center gap-1.5 text-charcoal dark:text-gold-200 font-semibold">
              <FaInfoCircle className="text-gold-600 dark:text-gold-400 shrink-0" /> Early access program inactive
            </p>
            <p className="text-xs mt-1.5 text-brown-700 dark:text-white/55 leading-relaxed">
              {isInTierViaEarlyAccess() ? 
                `The early access program is currently unavailable. You'll maintain your ${cardData.tier} tier benefits as long as you stay above ${formatNumber(getCurrentTierEarlyThreshold())} points.` :
                "The early access program is currently unavailable. All tier upgrades now require the standard point thresholds shown above."
              }
            </p>
          </div>
        )}
        
        {/* Status notice for users who are in a tier through early access when the program is disabled */}
        {isInTierViaEarlyAccess() && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
            <p className="flex items-center text-yellow-800 dark:text-yellow-300 font-medium">
              <FaInfoCircle className="mr-1" /> 
              Early Access Status Protected
            </p>
            <p className="mt-1 text-charcoal dark:text-white/55">
              You're currently enjoying {cardData.tier} tier benefits through our previous early access program. To maintain this status, please keep your points above {formatNumber(getCurrentTierEarlyThreshold())} points.
            </p>
          </div>
        )}
        
        {/* Only show early access info for next tier if the feature is enabled */}
        {thresholdsLoaded && 
          isEarlyAccessEnabled() && 
          cardData.tier !== 'Platinum' &&
          cardData.tier !== 'Basic' && (
          <div className="mt-2 text-xs text-brown-400 dark:text-white/40 italic">
            <p className="flex items-center">
              <FaInfoCircle className="mr-1 text-plum-500" />
              Your next tier: <span className="ml-1 font-medium text-plum-700 dark:text-plum-300">
                {getNextTierName()}
              </span>
              <span className="mx-2">•</span>
              <span>
                Standard: {formatNumber(getNextTierThreshold())} pts
              </span>
              <span className="mx-2">•</span>
              <span className="text-plum-700 dark:text-plum-300">
                Early Access: {formatNumber(getNextTierEarlyThreshold())} pts
              </span>
            </p>
          </div>
        )}
        
        <p className="mt-4 text-xs text-brown-600 dark:text-white/50 leading-relaxed space-y-1">
          <span className="block">Earn 1 point for every KES 100 spent in our store.</span>
          {isAdmin && <span className="block mt-1 text-plum-700 dark:text-plum-300/90">Admin accounts automatically receive Platinum status.</span>}
          {thresholdsLoaded && (
            <span className="block mt-1">
              {isEarlyAccessEnabled()
                ? 'Early access thresholds are set by administrators to reward loyal customers.'
                : 'Early access is currently disabled — use the standard point thresholds above.'}
            </span>
          )}
        </p>
      </div>

      {/* Special Platinum Progress Bar for Early Access Users - Only show if in Platinum via early access */}
      {cardData.tier === 'Platinum' && cardData.points < getPlatinumThreshold() && !isAdmin && (
        <div className="mt-4 bg-white dark:bg-dm-card rounded-lg border border-brown-100 dark:border-dm-border shadow-md p-3 text-sm">
          <h3 className="font-medium text-charcoal dark:text-white mb-2 flex items-center">
            <FaCrown className="text-gold-500 mr-2" /> 
            Platinum Status Progress
          </h3>
          
          <div className="mt-3 mb-1 flex items-center justify-between">
            <span className="text-xs text-brown-400 dark:text-white/40">Current: {formatNumber(cardData.points)} pts</span>
            <span className="text-xs text-brown-400 dark:text-white/40">Required: {formatNumber(getPlatinumThreshold())} pts</span>
          </div>
          
          <div className="relative">
            {/* Progress background */}
            <div className="h-6 bg-brown-100 dark:bg-dm-card-2 rounded-full overflow-hidden">
              {/* Progress filled area */}
              <div 
                className="h-full flex items-center justify-end pr-2 text-xs font-semibold text-white"
                style={{
                  width: `${Math.min(100, (cardData.points / getPlatinumThreshold()) * 100)}%`,
                  background: 'linear-gradient(90deg, #4B1E3E, #9C5A8E)'
                }}
              >
                {cardData.points > 500 && (
                  <span className="px-1 whitespace-nowrap">
                    {Math.round((cardData.points / getPlatinumThreshold()) * 100)}%
                  </span>
                )}
              </div>
            </div>
            
            {/* Points milestone markers */}
            <div className="flex justify-between mt-1 px-1 text-xs text-brown-400 dark:text-white/40">
              <div className="relative">
                <div className="absolute top-0 h-1 w-px bg-brown-300"></div>
                <span>0</span>
              </div>
              <div className="relative">
                <div className="absolute top-0 h-1 w-px bg-brown-300"></div>
                <span>{formatNumber(Math.round(getPlatinumThreshold() / 4))}</span>
              </div>
              <div className="relative">
                <div className="absolute top-0 h-1 w-px bg-brown-300"></div>
                <span>{formatNumber(Math.round(getPlatinumThreshold() / 2))}</span>
              </div>
              <div className="relative">
                <div className="absolute top-0 h-1 w-px bg-brown-300"></div>
                <span>{formatNumber(Math.round(getPlatinumThreshold() * 3 / 4))}</span>
              </div>
              <div className="relative">
                <div className="absolute top-0 h-1 w-px bg-brown-300"></div>
                <span>{formatNumber(getPlatinumThreshold())}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-charcoal dark:text-white/55">
            <p>You need <span className="font-bold text-plum-700 dark:text-plum-300">{formatNumber(getPlatinumThreshold() - cardData.points)}</span> more points to fully secure your Platinum status.</p>
            <p className="mt-1">
              {isEarlyAccessEnabled() 
                ? "Your Platinum benefits are currently active through early access, but we encourage reaching the standard threshold for full status security."
                : "Your Platinum benefits are protected through our loyalty program. Please maintain at least your current points to keep your status."}
            </p>
          </div>
          
          <div className="mt-3 p-2 border border-plum-200 dark:border-plum-800 bg-plum-50 dark:bg-plum-900/20 rounded text-xs">
            <h4 className="font-medium text-plum-800 dark:text-plum-200 mb-1 flex items-center">
              <FaInfoCircle className="mr-1" /> 
              {isEarlyAccessEnabled() ? "Early Access Benefits" : "Platinum Benefits"}
            </h4>
            <ul className="list-disc pl-5 text-plum-700 dark:text-plum-200 space-y-1">
              <li>Full 7% discount on all purchases</li>
              <li>Free delivery on all orders</li>
              <li>Early access to sales and exclusive products</li>
              <li>Priority customer service</li>
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 w-full max-w-md mx-auto">
        <button
          type="button"
          onClick={() => window.alert('Feature coming soon!')}
          className="flex items-center justify-center gap-2 bg-charcoal dark:bg-black text-white px-4 py-2.5 rounded-pill text-xs font-semibold border border-brown-800 dark:border-white/10 shadow-sm hover:opacity-95 transition-opacity flex-1 min-w-0"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor">
            <path d="M17.6 13.2c0-2.1 1.7-3 1.8-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.7-3.1.7-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.2 2.6 2.1 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3"></path>
            <path d="M16.1 6.5c.6-.7 1-1.8.9-2.8-.8 0-1.8.6-2.4 1.3-.5.6-.9 1.7-.8 2.7.9.1 1.8-.5 2.3-1.2z"></path>
          </svg>
          <span className="hidden sm:inline">Add to</span> Wallet
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 bg-white dark:bg-dm-card text-charcoal dark:text-white border border-brown-200 dark:border-dm-border px-4 py-2.5 rounded-pill text-xs font-semibold shadow-sm hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors flex-1 min-w-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print <span className="hidden sm:inline">Card</span>
        </button>
      </div>

      {!isAdmin && (
        <div className="mt-4">
          <button
            onClick={() => {
              // Store the original card data
              const originalCardData = {...cardData};
              
              // Set countdown
              setPreviewCountdown(5);
              
              // Update to Platinum tier
              setCardData({
                ...cardData,
                tier: 'Platinum',
                points: getPlatinumThreshold(),
                _isPreview: true
              });
              
              // Show notification
              toast.success("Platinum preview active", { duration: 3000 });
              
              // Start countdown
              const interval = setInterval(() => {
                setPreviewCountdown(prev => {
                  if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
              
              // Set timeout to revert
              setTimeout(() => {
                clearInterval(interval);
                setPreviewCountdown(0);
                setCardData(originalCardData);
                toast.info("Reverted to your actual tier", { duration: 3000 });
              }, 5000);
            }}
            className="w-full max-w-md mx-auto bg-gradient-to-r from-plum-700 to-plum-600 hover:from-plum-600 hover:to-plum-500 text-white py-3 rounded-pill text-sm font-semibold border border-plum-500/50 shadow-md transition"
          >
            Preview Platinum card (5 seconds)
          </button>
        </div>
      )}
    </div>
  );
};

export default RoyalCard;
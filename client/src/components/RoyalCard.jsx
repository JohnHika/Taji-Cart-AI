import React, { useEffect, useMemo, useState } from 'react';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';
import { FaCrown, FaGift, FaInfoCircle, FaPercent, FaSpinner, FaTruck, FaUserPlus } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Axios from '../utils/Axios';

/**
 * Premium Royal Card component with credit-card inspired luxury design.
 * Displays as Guest Card for unauthenticated users, Member Card for logged-in users.
 */
const RoyalCard = () => {
  const user = useSelector(state => state.user);
  const [cardData, setCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('barcode');
  const [fetchError, setFetchError] = useState(null);
  const [tierThresholds, setTierThresholds] = useState({
    bronzeThreshold: 500,
    silverThreshold: 1500,
    goldThreshold: 3000,
    platinumThreshold: 5000,
  });

  // Hostname for QR code
  const hostname = window.location.origin;

  // Admin check
  const isAdmin = useMemo(() => {
    return Boolean(
      user?.isAdmin === true || 
      user?.role === 'admin' ||
      user?.userType === 'admin' ||
      user?.type === 'admin'
    );
  }, [user]);

  // Fetch card data on mount
  useEffect(() => {
    if (user?._id) {
      fetchUserCardData();
      fetchTierThresholds();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchUserCardData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);

      const response = await Axios({
        url: `/api/users/${user._id}/loyalty-card`,
        method: 'GET'
      });

      if (response.data?.success) {
        setCardData(response.data.data);
      } else {
        setCardData({
          cardNumber: `NAWIRI${user._id ? user._id.substring(0, 8) : Date.now()}`,
          tier: isAdmin ? 'Platinum' : 'Basic',
          points: isAdmin ? 5000 : 0,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
      }
    } catch (error) {
      console.error('Error fetching loyalty card:', error);
      setFetchError(error.message || "Failed to load card");
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
      if (isAdmin) {
        const response = await Axios({
          url: '/api/loyalty/admin/thresholds',
          method: 'GET'
        });
        if (response.data?.success) {
          setTierThresholds(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching thresholds:', error);
    }
  };

  // Tier helpers
  const getDiscountPercent = (tier) => {
    const discounts = { Basic: 0, Bronze: 2, Silver: 3, Gold: 5, Platinum: 7 };
    return discounts[tier] || 0;
  };

  const getTierThreshold = (tier) => {
    const thresholds = {
      Basic: 0,
      Bronze: tierThresholds.bronzeThreshold || 500,
      Silver: tierThresholds.silverThreshold || 1500,
      Gold: tierThresholds.goldThreshold || 3000,
      Platinum: tierThresholds.platinumThreshold || 5000
    };
    return thresholds[tier] || 0;
  };

  const getNextTier = (currentTier) => {
    const order = ['Basic', 'Bronze', 'Silver', 'Gold', 'Platinum'];
    const idx = order.indexOf(currentTier);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getPointsToNext = () => {
    const nextTier = getNextTier(cardData?.tier);
    if (!nextTier) return 0;
    return Math.max(0, getTierThreshold(nextTier) - (cardData?.points || 0));
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const formatCardNumber = (num) => {
    if (!num) return '•••• •••• •••• ••••';
    // Format as groups of 4
    const clean = num.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return clean.match(/.{1,4}/g)?.join(' ') || num;
  };

  // Tier color schemes
  const getTierColors = (tier) => {
    const colors = {
      Basic: {
        bg: 'from-zinc-800 via-zinc-900 to-black',
        accent: 'text-zinc-400',
        badge: 'bg-zinc-700 text-zinc-300',
        shimmer: false
      },
      Bronze: {
        bg: 'from-amber-900 via-orange-950 to-black',
        accent: 'text-amber-400',
        badge: 'bg-amber-800/80 text-amber-200',
        shimmer: false
      },
      Silver: {
        bg: 'from-slate-500 via-slate-700 to-black',
        accent: 'text-slate-300',
        badge: 'bg-slate-600 text-slate-200',
        shimmer: false
      },
      Gold: {
        bg: 'from-amber-600 via-yellow-700 to-black',
        accent: 'text-gold-300',
        badge: 'bg-gold-600 text-gold-100',
        shimmer: true
      },
      Platinum: {
        bg: 'from-plum-600 via-plum-800 to-black',
        accent: 'text-plum-200',
        badge: 'bg-plum-500 text-plum-100',
        shimmer: true
      }
    };
    return colors[tier] || colors.Basic;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-56 gap-3">
        <FaSpinner className="w-8 h-8 text-gold-500 animate-spin" />
        <p className="text-sm font-playfair italic text-plum-500 dark:text-plum-300">
          Loading your card...
        </p>
      </div>
    );
  }

  // Guest card (not logged in)
  if (!user?._id) {
    return (
      <div className="w-full max-w-md mx-auto">
        {/* Guest Card */}
        <div className="relative aspect-[1.586/1] rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 shadow-2xl">
          {/* Muted overlay pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }} />
          </div>

          {/* Card content */}
          <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-playfair text-lg sm:text-xl text-zinc-400 italic">
                  Nawiri Royal Card
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Guest</p>
              </div>
              <div className="w-10 h-7 rounded bg-zinc-600/50 flex items-center justify-center">
                <div className="w-6 h-4 rounded-sm bg-gradient-to-br from-zinc-500 to-zinc-600" />
              </div>
            </div>

            {/* Card number area */}
            <div className="space-y-1">
              <p className="font-mono text-sm sm:text-base tracking-[0.2em] text-zinc-500">
                •••• •••• •••• ••••
              </p>
              <p className="font-playfair text-zinc-500 text-sm italic">
                Guest Member
              </p>
            </div>

            {/* Stats strip */}
            <div className="flex items-center justify-between bg-zinc-800/60 rounded-lg p-3 -mx-1">
              <div className="text-center flex-1">
                <p className="font-mono text-base sm:text-lg text-zinc-500">---</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">Points</p>
              </div>
              <div className="w-px h-8 bg-zinc-700" />
              <div className="text-center flex-1">
                <p className="font-mono text-base sm:text-lg text-zinc-500">None</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">Discount</p>
              </div>
              <div className="w-px h-8 bg-zinc-700" />
              <div className="text-center flex-1">
                <p className="font-mono text-base sm:text-lg text-zinc-500">---</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">Next Tier</p>
              </div>
            </div>
          </div>

          {/* Muted tier badge */}
          <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
            Guest
          </div>
        </div>

        {/* Sign in CTA */}
        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-charcoal font-semibold px-6 py-3 rounded-full text-sm shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
          >
            <FaUserPlus className="w-4 h-4" />
            Sign In to Unlock Rewards
          </Link>
          <p className="text-xs text-brown-400 dark:text-white/40 mt-2">
            Earn points, unlock discounts, and enjoy exclusive perks
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError && !cardData) {
    return (
      <div className="p-6 text-center bg-blush-50 dark:bg-blush-500/10 border border-blush-200 dark:border-blush-500/30 rounded-2xl">
        <h3 className="font-semibold text-lg mb-2 text-charcoal dark:text-white">
          Error Loading Card
        </h3>
        <p className="text-blush-500 mb-4 text-sm">{fetchError}</p>
        <button
          className="bg-plum-700 hover:bg-plum-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
          onClick={fetchUserCardData}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Member card
  const tierColors = getTierColors(cardData?.tier);
  const discountPercent = getDiscountPercent(cardData?.tier);
  const nextTier = getNextTier(cardData?.tier);
  const pointsToNext = getPointsToNext();

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main Card */}
      <div className={`relative aspect-[1.586/1] rounded-2xl overflow-hidden bg-gradient-to-br ${tierColors.bg} shadow-2xl`}>
        {/* Gold shimmer effect for Gold/Platinum tiers */}
        {tierColors.shimmer && (
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none animate-gold-shimmer"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(201, 148, 58, 0.4) 45%, rgba(232, 196, 120, 0.5) 50%, rgba(201, 148, 58, 0.4) 55%, transparent 60%)',
              backgroundSize: '200% 100%'
            }}
          />
        )}

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Card content */}
        <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FaCrown className={`w-5 h-5 sm:w-6 sm:h-6 ${tierColors.accent} drop-shadow`} />
              <div>
                <h3 className="font-playfair text-lg sm:text-xl text-white/90 italic leading-tight">
                  Nawiri Royal Card
                </h3>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                  {cardData?.tier} Member
                </p>
              </div>
            </div>
            
            {/* Chip element */}
            <div className="w-10 h-7 rounded bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
              <div className="w-6 h-4 rounded-sm bg-gradient-to-br from-gold-300 to-gold-500 opacity-80" />
            </div>
          </div>

          {/* Card number & name */}
          <div className="space-y-1">
            <p className="font-mono text-sm sm:text-base tracking-[0.2em] text-white/80">
              {formatCardNumber(cardData?.cardNumber)}
            </p>
            <p className="font-playfair text-white text-base sm:text-lg italic">
              {user.name || 'Valued Member'}
            </p>
          </div>

          {/* Stats strip */}
          <div className="flex items-center justify-between bg-black/30 backdrop-blur-sm rounded-xl p-3 -mx-1">
            <div className="text-center flex-1">
              <p className={`font-mono text-lg sm:text-xl font-bold ${tierColors.accent}`}>
                {formatNumber(cardData?.points || 0)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Points</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center flex-1">
              <p className={`font-mono text-lg sm:text-xl font-bold ${tierColors.accent}`}>
                {discountPercent}%
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Discount</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center flex-1">
              {nextTier ? (
                <>
                  <p className={`font-mono text-lg sm:text-xl font-bold ${tierColors.accent}`}>
                    {formatNumber(pointsToNext)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">To {nextTier}</p>
                </>
              ) : (
                <>
                  <p className={`font-mono text-lg sm:text-xl font-bold ${tierColors.accent}`}>MAX</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Top Tier</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tier badge */}
        <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full ${tierColors.badge} text-[10px] font-bold uppercase tracking-wider shadow`}>
          {cardData?.tier}
        </div>

        {/* Discount badge (for tiers with discount) */}
        {discountPercent > 0 && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <FaPercent className={`w-2.5 h-2.5 ${tierColors.accent}`} />
            <span className={`text-xs font-bold ${tierColors.accent}`}>
              {discountPercent}% OFF
            </span>
          </div>
        )}
      </div>

      {/* View toggle & barcode/QR section */}
      <div className="mt-4 bg-white dark:bg-dm-card rounded-2xl border border-brown-100 dark:border-dm-border shadow-card overflow-hidden">
        {/* Toggle buttons */}
        <div className="flex border-b border-brown-100 dark:border-dm-border">
          <button
            onClick={() => setViewMode('barcode')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              viewMode === 'barcode'
                ? 'bg-plum-50 dark:bg-plum-900/30 text-plum-700 dark:text-plum-300'
                : 'text-brown-400 dark:text-white/40 hover:bg-brown-50 dark:hover:bg-white/5'
            }`}
          >
            Barcode
          </button>
          <button
            onClick={() => setViewMode('qrcode')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              viewMode === 'qrcode'
                ? 'bg-plum-50 dark:bg-plum-900/30 text-plum-700 dark:text-plum-300'
                : 'text-brown-400 dark:text-white/40 hover:bg-brown-50 dark:hover:bg-white/5'
            }`}
          >
            QR Code
          </button>
        </div>

        {/* Code display */}
        <div className="p-4 flex justify-center items-center bg-white">
          {viewMode === 'barcode' ? (
            <div className="overflow-hidden max-w-full">
              <Barcode
                value={cardData?.cardNumber || 'NAWIRI'}
                width={1.5}
                height={50}
                format="CODE128"
                displayValue={true}
                background="#FFFFFF"
                lineColor="#1A0F14"
                margin={0}
                fontSize={12}
              />
            </div>
          ) : (
            <QRCode
              value={`${hostname}/verify/${cardData?.cardNumber}`}
              size={120}
              level="H"
            />
          )}
        </div>
      </div>

      {/* Progress to next tier (if not max tier) */}
      {nextTier && (
        <div className="mt-4 p-4 bg-white dark:bg-dm-card rounded-2xl border border-brown-100 dark:border-dm-border shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal dark:text-white">
              Progress to {nextTier}
            </span>
            <span className="text-xs text-brown-400 dark:text-white/40">
              {formatNumber(pointsToNext)} pts needed
            </span>
          </div>
          <div className="h-2 bg-brown-100 dark:bg-dm-card-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cardData?.tier === 'Gold' || cardData?.tier === 'Silver'
                  ? 'bg-gradient-to-r from-gold-500 to-gold-400'
                  : 'bg-gradient-to-r from-plum-600 to-plum-400'
              }`}
              style={{
                width: `${Math.min(100, ((cardData?.points || 0) / getTierThreshold(nextTier)) * 100)}%`
              }}
            />
          </div>
          <p className="mt-2 text-xs text-brown-500 dark:text-white/50 italic">
            {cardData?.tier === 'Basic' && 'Unlock 2% discount with Bronze tier'}
            {cardData?.tier === 'Bronze' && 'Get free shipping with Silver tier'}
            {cardData?.tier === 'Silver' && 'Enjoy priority support with Gold tier'}
            {cardData?.tier === 'Gold' && 'Unlock exclusive events with Platinum tier'}
          </p>
        </div>
      )}

      {/* Benefits grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-dm-card rounded-xl p-3 text-center border border-brown-100 dark:border-dm-border">
          <FaPercent className="mx-auto text-gold-500 mb-1.5 w-4 h-4" />
          <span className="text-xs text-charcoal dark:text-white font-medium">
            {discountPercent}% Off
          </span>
        </div>
        <div className="bg-white dark:bg-dm-card rounded-xl p-3 text-center border border-brown-100 dark:border-dm-border">
          <FaGift className="mx-auto text-plum-500 mb-1.5 w-4 h-4" />
          <span className="text-xs text-charcoal dark:text-white font-medium">
            {cardData?.tier === 'Basic' ? 'Earn Points' : 'Free Gifts'}
          </span>
        </div>
        <div className="bg-white dark:bg-dm-card rounded-xl p-3 text-center border border-brown-100 dark:border-dm-border">
          <FaTruck className="mx-auto text-brown-500 mb-1.5 w-4 h-4" />
          <span className="text-xs text-charcoal dark:text-white font-medium">
            {['Silver', 'Gold', 'Platinum'].includes(cardData?.tier) ? 'Free Ship' : 'Shipping'}
          </span>
        </div>
      </div>

      {/* Tier table */}
      <div className="mt-4 bg-white dark:bg-dm-card rounded-2xl border border-brown-100 dark:border-dm-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-brown-100 dark:border-dm-border">
          <h3 className="font-playfair text-charcoal dark:text-white text-base font-semibold">
            Royal Card Tiers
          </h3>
          <p className="text-xs text-brown-400 dark:text-white/40 mt-0.5">
            Earn 1 point per KES 100 spent
          </p>
        </div>
        <div className="divide-y divide-brown-100 dark:divide-dm-border">
          {['Basic', 'Bronze', 'Silver', 'Gold', 'Platinum'].map((tier) => {
            const isCurrentTier = cardData?.tier === tier;
            const colors = getTierColors(tier);
            return (
              <div
                key={tier}
                className={`flex items-center justify-between px-4 py-3 ${
                  isCurrentTier ? 'bg-plum-50/50 dark:bg-plum-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    tier === 'Basic' ? 'bg-zinc-400' :
                    tier === 'Bronze' ? 'bg-amber-600' :
                    tier === 'Silver' ? 'bg-slate-400' :
                    tier === 'Gold' ? 'bg-gold-500' :
                    'bg-plum-500'
                  }`} />
                  <span className={`text-sm ${isCurrentTier ? 'font-bold text-plum-700 dark:text-plum-300' : 'text-charcoal dark:text-white'}`}>
                    {tier}
                  </span>
                  {isCurrentTier && (
                    <span className="text-[10px] bg-plum-100 dark:bg-plum-800 text-plum-600 dark:text-plum-200 px-1.5 py-0.5 rounded">
                      YOU
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-brown-400 dark:text-white/40 w-14 text-right">
                    {formatNumber(getTierThreshold(tier))} pts
                  </span>
                  <span className={`font-bold w-8 text-right ${isCurrentTier ? 'text-gold-600 dark:text-gold-400' : 'text-charcoal dark:text-white/70'}`}>
                    {getDiscountPercent(tier)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => toast('Coming soon!', { icon: '🎉' })}
          className="flex-1 flex items-center justify-center gap-2 bg-charcoal dark:bg-black text-white py-3 rounded-full text-xs font-semibold border border-brown-800 dark:border-white/10 hover:opacity-90 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M17.6 13.2c0-2.1 1.7-3 1.8-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.7-3.1.7-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.2 2.6 2.1 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3"></path>
            <path d="M16.1 6.5c.6-.7 1-1.8.9-2.8-.8 0-1.8.6-2.4 1.3-.5.6-.9 1.7-.8 2.7.9.1 1.8-.5 2.3-1.2z"></path>
          </svg>
          Add to Wallet
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-dm-card text-charcoal dark:text-white border border-brown-200 dark:border-dm-border py-3 rounded-full text-xs font-semibold hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Card
        </button>
      </div>
    </div>
  );
};

export default RoyalCard;
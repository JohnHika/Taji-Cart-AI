import React from 'react';
import { FaCrown, FaLock, FaGift, FaUserPlus, FaStar, FaShippingFast, FaCheck } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useGlobalContext } from '../provider/GlobalProvider';
import { useSelector } from 'react-redux';

/**
 * Premium Royal Card for Checkout Order Summary
 * ============================================
 * 
 * MEMBER CARD (logged-in users):
 * - Black & gold Amex-style credit card design
 * - Tier-based theming (Bronze/Silver/Gold/Platinum)
 * - Gold shimmer sweep animation (6s cycle)
 * - Stats strip: Points | Saved | Next Tier
 * - EMV chip + crown branding + NFC dot
 * - Playfair Display for brand/name
 * 
 * GUEST TEASER CARD:
 * - Locked dark card showing potential savings
 * - Blurred benefits preview
 * - Clear CTA to sign up
 */

// Premium tier color configurations - Amex black & gold style
const TIER_THEMES = {
  Basic: {
    // Subtle zinc card for non-members
    accentHex: '#71717a',
    borderHex: '#27272a',
    stripGradient: 'linear-gradient(90deg, #27272a, #71717a, #a1a1aa, #71717a, #27272a)',
    crown: '⭐',
    shimmer: false
  },
  Bronze: {
    // Copper/bronze metallic
    accentHex: '#cd7f32',
    borderHex: '#3a2010',
    stripGradient: 'linear-gradient(90deg, #5a2a10, #cd7f32, #e8a060, #cd7f32, #5a2a10)',
    crown: '🥉',
    shimmer: false
  },
  Silver: {
    // Grey-silver metallic
    accentHex: '#a8a8b8',
    borderHex: '#2a2a38',
    stripGradient: 'linear-gradient(90deg, #3a3a48, #a8a8b8, #d0d0e0, #a8a8b8, #3a3a48)',
    crown: '🥈',
    shimmer: false
  },
  Gold: {
    // Full black & gold Amex treatment
    accentHex: '#c9a84c',
    borderHex: '#3a2a08',
    stripGradient: 'linear-gradient(90deg, #6a4e10, #c9a84c, #e8c96a, #c9a84c, #6a4e10)',
    crown: '🥇',
    shimmer: true
  },
  Platinum: {
    // Premium black & gold (same as Gold, but with crown upgrade)
    accentHex: '#c9a84c',
    borderHex: '#3a2a10',
    stripGradient: 'linear-gradient(90deg, #6a4e10, #c9a84c, #e8c96a, #c9a84c, #6a4e10)',
    crown: '👑',
    shimmer: true
  }
};

// Discount percentages per tier
const TIER_DISCOUNTS = {
  Basic: 0,
  Bronze: 2,
  Silver: 3,
  Gold: 5,
  Platinum: 7
};

// Next tier mapping
const NEXT_TIER = {
  Basic: 'Bronze',
  Bronze: 'Silver',
  Silver: 'Gold',
  Gold: 'Platinum',
  Platinum: null
};

// Tier thresholds
const TIER_THRESHOLDS = {
  Bronze: 500,
  Silver: 1500,
  Gold: 3000,
  Platinum: 5000
};

// Format number with commas
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
};

// Format card number with spaces
const formatCardNumber = (cardNumber, userId) => {
  if (cardNumber) {
    const clean = cardNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return clean.match(/.{1,4}/g)?.join(' ') || cardNumber;
  }
  // Fallback: generate from user ID
  if (userId) {
    const prefix = 'NWRI';
    const idPart = userId.substring(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const combined = prefix + idPart;
    return combined.match(/.{1,4}/g)?.join(' ') || combined;
  }
  return 'NWRI •••• •••• ••••';
};

// Format saved amount
const formatSaved = (amount) => {
  if (!amount || amount <= 0) return '0';
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return Math.round(amount).toString();
};

// Format member since date
const formatMemberSince = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-KE', { 
      month: 'short', 
      year: 'numeric' 
    }).toUpperCase();
  } catch {
    return 'N/A';
  }
};

// Get cardholder display name
const getHolderName = (user) => {
  if (user?.firstName && user?.lastName) {
    return `${user.firstName} ${user.lastName[0]}.`.toUpperCase();
  }
  if (user?.name) {
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length-1][0]}.`.toUpperCase();
    }
    return parts[0].toUpperCase();
  }
  return 'VALUED MEMBER';
};

// Get last 4 digits of user ID for card display
const getCardSuffix = (userId) => {
  if (!userId) return '••••';
  return userId.slice(-4).toUpperCase();
};

/**
 * Member Card Component
 * Premium black & gold Amex-style credit card display
 */
const MemberCard = ({ user, royalCardData, royalDiscount, totalSaved = 0 }) => {
  const tier = royalCardData?.tier || 'Basic';
  const theme = TIER_THEMES[tier] || TIER_THEMES.Basic;
  const discount = TIER_DISCOUNTS[tier] || 0;
  const nextTier = NEXT_TIER[tier];
  const points = royalCardData?.points || 0;
  const pointsToNext = nextTier ? Math.max(0, TIER_THRESHOLDS[nextTier] - points) : 0;

  const holderName = getHolderName(user);
  const memberSince = formatMemberSince(user?.createdAt);
  const cardSuffix = getCardSuffix(user?._id);
  const orderCount = user?.orderCount || royalCardData?.ordersCount || 0;

  // Inline styles for premium card (using tier-aware colors)
  const cardStyle = {
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1208 50%, #0d0a04 100%)',
    border: `1px solid ${theme.borderHex}`,
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '12px',
    boxShadow: `0 0 0 1px rgba(201,168,76,0.1), 0 8px 32px rgba(0,0,0,0.55), 0 0 20px rgba(${tier === 'Silver' ? '168,168,184' : '201,168,76'},0.05)`,
  };

  const stripStyle = {
    height: '4px',
    width: '100%',
    background: theme.stripGradient,
  };

  const chipStyle = {
    width: '30px',
    height: '22px',
    background: 'linear-gradient(135deg, #c9a84c, #8a6820, #e8c96a, #c9a84c)',
    borderRadius: '4px',
    flexShrink: 0,
    boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const chipLinesStyle = {
    width: '20px',
    height: '14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
  };

  return (
    <div className="w-full">
      {/* Premium Black & Gold Card */}
      <div style={cardStyle}>
        
        {/* Gold top strip */}
        <div style={stripStyle} />
        
        {/* Shimmer sweep overlay */}
        {theme.shimmer && (
          <div 
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.06), transparent)',
              animation: 'shimmerSweep 6s ease-in-out infinite',
            }}
          >
            <div 
              className="absolute top-0 h-full w-[35%] animate-card-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)',
                transform: 'skewX(-15deg)',
              }}
            />
          </div>
        )}

        {/* Card Content */}
        <div className="relative z-10 p-4 pb-3">
          
          {/* Row 1: Brand name + Tier badge */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 
                className="font-semibold leading-tight"
                style={{ 
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: theme.accentHex,
                  letterSpacing: '0.1em',
                }}
              >
                NAWIRI HAIR
              </h3>
              <p 
                className="mt-0.5"
                style={{ 
                  fontSize: '8px',
                  color: '#6a5020',
                  letterSpacing: '0.2em',
                }}
              >
                ROYAL MEMBERSHIP
              </p>
            </div>
            
            <div 
              className="flex items-center gap-1"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: `1px solid ${theme.accentHex}30`,
                borderRadius: '12px',
                padding: '3px 8px',
              }}
            >
              <span style={{ fontSize: '12px' }}>{theme.crown}</span>
              <span 
                style={{ 
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: theme.accentHex,
                }}
              >
                {tier.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Row 2: Chip + Member since */}
          <div className="flex items-center gap-3 mb-3">
            <div style={chipStyle}>
              <div style={chipLinesStyle}>
                <div style={{ height: '2px', background: 'rgba(0,0,0,0.2)', borderRadius: '1px' }} />
                <div style={{ height: '2px', background: 'rgba(0,0,0,0.2)', borderRadius: '1px' }} />
                <div style={{ height: '2px', background: 'rgba(0,0,0,0.15)', borderRadius: '1px' }} />
              </div>
            </div>
            <span 
              style={{ 
                fontSize: '9px',
                color: '#6a5020',
                letterSpacing: '0.08em',
              }}
            >
              MEMBER SINCE {memberSince}
            </span>
          </div>

          {/* Row 3: Card number */}
          <p 
            className="mb-3"
            style={{ 
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              letterSpacing: '0.18em',
              color: '#6a5828',
            }}
          >
            •••• ••••  {cardSuffix}
          </p>

          {/* Row 4: Cardholder name + order count */}
          <div className="flex justify-between items-end mb-3">
            <div>
              <p 
                style={{ 
                  fontSize: '8px',
                  color: '#5a4020',
                  letterSpacing: '0.15em',
                  marginBottom: '2px',
                }}
              >
                CARD HOLDER
              </p>
              <p 
                style={{ 
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: theme.accentHex,
                }}
              >
                {holderName}
              </p>
            </div>
            
            <div className="text-right">
              <p 
                style={{ 
                  fontFamily: '"Courier New", monospace',
                  fontSize: '18px',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: theme.accentHex,
                }}
              >
                {orderCount}
              </p>
              <p 
                style={{ 
                  fontSize: '8px',
                  color: '#5a4020',
                  letterSpacing: '0.1em',
                }}
              >
                ORDERS
              </p>
            </div>
          </div>

          {/* Row 5: Stats strip */}
          <div 
            className="grid grid-cols-3 mb-3 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(201,168,76,0.1)',
              borderRadius: '8px',
            }}
          >
            {/* Points */}
            <div 
              className="flex flex-col items-center py-2 px-2"
              style={{ borderRight: '1px solid rgba(201,168,76,0.1)' }}
            >
              <span 
                style={{ 
                  fontFamily: '"Courier New", monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: theme.accentHex,
                  lineHeight: 1,
                }}
              >
                {formatNumber(points)}
              </span>
              <span style={{ fontSize: '7px', color: '#5a4020', letterSpacing: '0.1em', marginTop: '2px' }}>
                POINTS
              </span>
            </div>
            
            {/* Saved */}
            <div 
              className="flex flex-col items-center py-2 px-2"
              style={{ borderRight: '1px solid rgba(201,168,76,0.1)' }}
            >
              <span 
                style={{ 
                  fontFamily: '"Courier New", monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: theme.accentHex,
                  lineHeight: 1,
                }}
              >
                Ksh {formatSaved(totalSaved)}
              </span>
              <span style={{ fontSize: '7px', color: '#5a4020', letterSpacing: '0.1em', marginTop: '2px' }}>
                SAVED
              </span>
            </div>
            
            {/* Next Tier */}
            <div className="flex flex-col items-center py-2 px-2">
              <span 
                style={{ 
                  fontFamily: '"Courier New", monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: theme.accentHex,
                  lineHeight: 1,
                }}
              >
                {nextTier || 'MAX'}
              </span>
              <span style={{ fontSize: '7px', color: '#5a4020', letterSpacing: '0.1em', marginTop: '2px' }}>
                NEXT TIER
              </span>
            </div>
          </div>

          {/* Row 6: Discount badge */}
          {discount > 0 && (
            <div 
              className="flex items-center gap-2"
              style={{
                background: 'rgba(201,168,76,0.06)',
                border: `1px solid ${theme.accentHex}30`,
                borderRadius: '8px',
                padding: '8px 10px',
              }}
            >
              <span 
                style={{ 
                  fontFamily: '"Courier New", monospace',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: theme.accentHex,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                -{discount}%
              </span>
              
              <div className="flex-1 min-w-0">
                <span 
                  className="block"
                  style={{ 
                    fontSize: '11px',
                    fontWeight: 700,
                    color: theme.accentHex,
                    letterSpacing: '0.02em',
                  }}
                >
                  {tier} Discount
                </span>
                <span 
                  className="block"
                  style={{ 
                    fontSize: '9px',
                    color: '#6a5020',
                    marginTop: '1px',
                  }}
                >
                  Active on all products
                </span>
              </div>
              
              {/* NFC dot */}
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid rgba(201,168,76,0.25)',
                  background: 'rgba(201,168,76,0.1)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaCheck style={{ width: '8px', height: '8px', color: '#6a5020' }} />
              </div>
            </div>
          )}
        </div>

        {/* Gold bottom strip */}
        <div style={stripStyle} />
      </div>
    </div>
  );
};

/**
 * Guest Teaser Card Component
 * Shows potential savings to encourage sign-up
 */
const GuestTeaserCard = ({ estimatedSavings = 0 }) => {
  return (
    <div className="w-full">
      {/* Locked Card */}
      <div className="relative aspect-[1.7/1] rounded-xl overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-xl border border-zinc-700/50">
        
        {/* Lock overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-3 shadow-2xl">
            <FaLock className="w-5 h-5 text-zinc-400" />
          </div>
        </div>

        {/* Dimmed card preview content */}
        <div className="absolute inset-0 opacity-40">
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '16px 16px'
              }} 
            />
          </div>

          <div className="h-full flex flex-col justify-between p-3 sm:p-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <FaCrown className="w-4 h-4 text-zinc-500" />
                <div>
                  <h4 className="font-playfair text-sm text-zinc-400 italic">
                    Nawiri Royal
                  </h4>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
                    Member Card
                  </p>
                </div>
              </div>
              
              {/* Chip placeholder */}
              <div className="w-8 h-6 rounded-sm bg-zinc-700" />
            </div>

            {/* Number placeholder */}
            <div className="space-y-1">
              <p className="font-mono text-xs tracking-[0.15em] text-zinc-600">
                •••• •••• •••• ••••
              </p>
              <p className="font-playfair text-zinc-500 text-sm italic">
                Your Name Here
              </p>
            </div>

            {/* Stats strip placeholder */}
            <div className="flex items-center justify-between bg-black/30 rounded-lg p-2">
              <div className="text-center flex-1">
                <p className="font-mono text-sm font-bold text-zinc-500">---</p>
                <p className="text-[8px] uppercase text-zinc-600">Points</p>
              </div>
              <div className="w-px h-6 bg-zinc-700" />
              <div className="text-center flex-1">
                <p className="font-mono text-sm font-bold text-zinc-500">7%</p>
                <p className="text-[8px] uppercase text-zinc-600">Max Disc</p>
              </div>
              <div className="w-px h-6 bg-zinc-700" />
              <div className="text-center flex-1">
                <p className="font-mono text-sm font-bold text-zinc-500">---</p>
                <p className="text-[8px] uppercase text-zinc-600">Perks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guest badge */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-zinc-700/80 text-zinc-400 text-[8px] font-bold uppercase tracking-wider z-20">
          Guest
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-3 text-center">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-charcoal font-semibold px-5 py-2.5 rounded-full text-sm shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <FaUserPlus className="w-3.5 h-3.5" />
          Unlock Rewards
        </Link>
        
        <p className="text-[10px] text-brown-400 dark:text-white/40 mt-2 max-w-[200px] mx-auto leading-relaxed">
          Sign up to earn points, unlock up to 7% discount, and enjoy exclusive perks
        </p>
      </div>
    </div>
  );
};

/**
 * Main CheckoutRoyalCard Component
 * Renders either Member Card or Guest Teaser based on auth state
 */
const CheckoutRoyalCard = ({ compact = false, showTeaser = true }) => {
  const user = useSelector(state => state.user);
  const { royalCardData, royalDiscount, notDiscountTotalPrice, totalPrice } = useGlobalContext();
  
  const isLoggedIn = Boolean(user?._id);
  const totalSaved = notDiscountTotalPrice - totalPrice;

  // Don't render anything if guest and showTeaser is false
  if (!isLoggedIn && !showTeaser) {
    return null;
  }

  return (
    <div className={`w-full ${compact ? 'max-w-[280px]' : 'max-w-[320px]'} mx-auto`}>
      {isLoggedIn ? (
        <MemberCard 
          user={user}
          royalCardData={royalCardData}
          royalDiscount={royalDiscount}
          totalSaved={totalSaved}
        />
      ) : (
        <GuestTeaserCard estimatedSavings={totalSaved * 0.07} />
      )}
    </div>
  );
};

export default CheckoutRoyalCard;

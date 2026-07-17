import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCrown, FaStore, FaTrash } from 'react-icons/fa';
import { FaXmark } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { buildApiUrl } from '../common/apiBaseUrl';
import { nawiriBrand } from '../config/brand';
import ActiveRewards from '../components/ActiveRewards'; // Import the ActiveRewards component
import AddAddress from '../components/AddAddress';
import CheckoutRoyalCard from '../components/CheckoutRoyalCard'; // Premium Royal Card for Order Summary
import CommunityCampaignProgress from '../components/CommunityCampaignProgress'; // Import the CommunityCampaignProgress component
import DeliveryLocationModal from '../components/DeliveryLocationModal';
import FulfillmentModal from '../components/FulfillmentModal';
import JengaPayment from '../components/JengaPayment';
import { useTheme } from '../context/ThemeContext';
import useCriteriaGate from '../hooks/useCriteriaGate';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCartItems } from '../store/cartProduct';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { getStoredAccessToken } from '../utils/authStorage';
import { DEFAULT_DELIVERY_CHARGE, formatDistanceKm, getFootDeliveryEligibility, isWithinCbdRadius, NAIROBI_CBD_RADIUS_KM } from '../utils/cbdDelivery';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { Link } from 'react-router-dom';

const CheckoutPage = ({ isCutView = false, onClose = null, embedded = false }) => {
  const { notDiscountTotalPrice, totalPrice, totalQty, fetchCartItem, fetchOrder, fetchAddress, royalCardData, royalDiscount } = useGlobalContext();
  const { darkMode } = useTheme();
  const location = useLocation();
  const [openAddress, setOpenAddress] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  
  // Debug: Log location state
  useEffect(() => {
    console.log('CheckoutPage loaded, location.state:', location.state);
  }, [location.state]);
  
  // Get fulfillment method from location state if available
  const [fulfillmentMethod, setFulfillmentMethod] = useState(() => {
    const method = location.state?.fulfillmentMethod || location.state?.fulfillment_type || 'delivery';
    console.log('Fulfillment method:', method, 'from state:', location.state);
    return method;
  });
  const [pickupLocation, setPickupLocation] = useState(
    location.state?.pickupLocation || location.state?.pickup_location || ''
  );
  const [pickupInstructions, setPickupInstructions] = useState(
    location.state?.pickupInstructions || location.state?.pickup_instructions || ''
  );
  const [deliveryMode, setDeliveryMode] = useState(location.state?.delivery_mode || 'standard');
  const [customerLocation, setCustomerLocation] = useState(location.state?.customerLocation || null);
  const [deliveryInstructions, setDeliveryInstructions] = useState(location.state?.deliveryInstructions || '');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const addressList = useSelector(state => state.addresses.addressList);
  const [selectAddress, setSelectAddress] = useState(null); // Changed from 0 to null to ensure validation
  const [addressError, setAddressError] = useState(false); // State to track address selection error
  const cartItemsList = useSelector(state => state.cartItem.cart);
  const cartLoading = useSelector(state => state.cartItem.loading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);
  const { ensureCriteria, gateModal } = useCriteriaGate();

  const [usePoints, setUsePoints] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointsValue, setPointsValue] = useState(0);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // Community reward state
  const [selectedReward, setSelectedReward] = useState(null);
  const [communityDiscount, setCommunityDiscount] = useState(0);

  // Check if payments should be enabled
  // For delivery: need a selected address
  // For pickup: need a pickup location
  const isPaymentEnabled = 
    (fulfillmentMethod === 'delivery' 
      && selectAddress !== null 
      && addressList[selectAddress] 
      && addressList[selectAddress].status
      && customerLocation
      && footDeliveryEligibility.eligible) ||
    (fulfillmentMethod === 'pickup' && pickupLocation);

  // For foot delivery, only allow addresses whose saved coordinates are within Nairobi CBD.
  // Standard delivery can use any active address.
  const eligibleAddressIndexes = useMemo(() => {
    if (deliveryMode !== 'foot') {
      return addressList.map((_, i) => i).filter(i => addressList[i]?.status);
    }
    return addressList
      .map((_, i) => i)
      .filter(i => {
        const addr = addressList[i];
        return addr?.status && isWithinCbdRadius(addr.coordinates);
      });
  }, [addressList, deliveryMode]);

  // If the currently selected address is not eligible for the chosen delivery mode, clear it.
  useEffect(() => {
    if (selectAddress !== null && !eligibleAddressIndexes.includes(selectAddress)) {
      setSelectAddress(null);
      setAddressError(true);
    }
  }, [eligibleAddressIndexes, selectAddress]);
  const checkoutLockRef = useRef(false);
  const [checkoutAction, setCheckoutAction] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash'); // 'cash' | 'jenga'

  const deliveryCharge = fulfillmentMethod === 'delivery' ? DEFAULT_DELIVERY_CHARGE : 0;

  useEffect(() => {
    // Clear address error when address is selected
    if (selectAddress !== null) {
      setAddressError(false);
    }
  }, [selectAddress]);

  // Fetch loyalty points on component mount
  useEffect(() => {
    const fetchLoyaltyData = async () => {
      // Only attempt to fetch loyalty data if user is logged in
      if (!user || !user._id) {
        console.log("User not logged in, skipping loyalty card fetch");
        return;
      }

      try {
        setLoyaltyLoading(true);
        const token = getStoredAccessToken();
        
        if (!token) {
          console.log("No authentication token found, skipping loyalty card fetch");
          return;
        }

        const response = await Axios({
          url: `/api/users/${user._id}/loyalty-card`,
          method: 'GET'
        });
        
        if (response.data.success && response.data.data) {
          const points = response.data.data.points || 0;
          setAvailablePoints(points);
          // Each point is worth KES 1; cap at subtotal + delivery charge
          setPointsValue(Math.min(points, totalPrice + deliveryCharge));
          console.log("Successfully fetched loyalty data:", response.data.data);
        }
      } catch (error) {
        console.error("Error fetching loyalty data:", error.response?.data || error.message);
        // Don't show an error to the user - loyalty points are optional
      } finally {
        setLoyaltyLoading(false);
      }
    };
    
    fetchLoyaltyData();
  }, [user, user._id, totalPrice, deliveryCharge]);

  // Handle selecting community reward
  const handleSelectReward = (reward) => {
    if (selectedReward && selectedReward._id === reward._id) {
      // If clicking the same reward, deselect it
      setSelectedReward(null);
      setCommunityDiscount(0);
      toast(`Removed ${reward.type === 'discount' ? `${reward.value}% discount` : 'reward'}`);
    } else {
      // Select the reward and calculate discount if applicable
      setSelectedReward(reward);
      if (reward.type === 'discount') {
        setCommunityDiscount(reward.value);
        toast.success(`Applied ${reward.value}% discount from "${reward.campaignTitle}"`);
      } else if (reward.type === 'shipping') {
        toast.success(`Applied free shipping from "${reward.campaignTitle}"`);
      } else {
        toast.success(`Selected reward from "${reward.campaignTitle}"`);
      }
    }
  };

  // Calculate price after community discount
  const priceAfterCommunityDiscount = selectedReward && selectedReward.type === 'discount'
    ? totalPrice * (1 - communityDiscount / 100)
    : totalPrice;

  // Calculate final price after applying points, community discount and delivery charge
  const finalPrice = usePoints 
    ? Math.max(0, priceAfterCommunityDiscount + deliveryCharge - pointsValue) 
    : priceAfterCommunityDiscount + deliveryCharge;
  const isCheckoutBusy = checkoutAction !== '';
  const footDeliveryEligibility = useMemo(
    () => getFootDeliveryEligibility(customerLocation),
    [customerLocation]
  );
  const hasCheckoutAmount = useMemo(() => {
    const numericTotal = Number(totalPrice || 0);

    return cartItemsList.length > 0 && totalQty > 0 && numericTotal > 0;
  }, [cartItemsList.length, totalPrice, totalQty]);
  const cartFingerprint = cartItemsList
    .map((item) => `${item?._id || item?.productId?._id}:${item?.quantity || 0}`)
    .join('|');
  const checkoutScope = `${user?._id || 'guest'}:${fulfillmentMethod}:${selectAddress ?? 'pickup'}:${pickupLocation}:${cartFingerprint}:${finalPrice}`;
  const checkoutRedirectedRef = useRef(false);

  const runCheckoutAction = async (actionName, callback) => {
    if (checkoutLockRef.current) {
      return;
    }

    checkoutLockRef.current = true;
    setCheckoutAction(actionName);

    try {
      await callback();
    } finally {
      checkoutLockRef.current = false;
      setCheckoutAction('');
    }
  };

  // Pickup locations (in a real app, these would likely come from an API)
  const pickupLocations = [
    { name: 'Main Store', address: nawiriBrand.location }
  ];

  // Validate address is selected before payment
  const validateAddress = () => {
    if (fulfillmentMethod === 'delivery') {
      if (!isPaymentEnabled) {
        setAddressError(true);
        toast.error('Please select a delivery address and share your location before proceeding');
        return false;
      }

      if (!customerLocation) {
        toast.error('Delivery requires your live location within Nairobi CBD.');
        setShowLocationModal(true);
        return false;
      }

      if (!deliveryInstructions.trim()) {
        toast.error('Please enter exact delivery instructions so the rider can find you.');
        setShowLocationModal(true);
        return false;
      }

      if (!footDeliveryEligibility.eligible) {
        toast.error(
          `Delivery is only available within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius).`
        );
        setShowLocationModal(true);
        return false;
      }
    } else if (fulfillmentMethod === 'pickup' && !pickupLocation) {
      toast.error('Please select a pickup location');
      return false;
    }
    return true;
  };

  const captureCustomerLocation = () => {
    setShowLocationModal(true);
  };

  const handleCashOnDelivery = async() => {
    if (!(await ensureCriteria('checkout'))) return;
    if (!validateAddress()) return;

    await runCheckoutAction('cash', async () => {
      try {
        const response = await Axios({
          ...SummaryApi.CashOnDeliveryOrder,
          data : {
            list_items : cartItemsList,
            addressId : fulfillmentMethod === 'delivery' ? addressList[selectAddress]._id : null,
            subTotalAmt : totalPrice,
            deliveryCharge: deliveryCharge,
            totalAmt : finalPrice,
            usePoints: usePoints,
            pointsUsed: usePoints ? pointsValue : 0,
            communityRewardId: selectedReward ? selectedReward._id : null,
            communityDiscountAmount: selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0,
            fulfillment_type: fulfillmentMethod,
            delivery_mode: fulfillmentMethod === 'delivery' ? deliveryMode : 'standard',
            customerLocation,
            deliveryInstructions,
            pickup_location: pickupLocation,
            pickup_instructions: pickupInstructions
          },
          requestLockKey: `checkout:cash:${checkoutScope}`
        });

        const { data: responseData } = response;

        if(responseData.success){
            dispatch(clearCartItems());
            toast.success(responseData.message);

            if(fetchCartItem){
              fetchCartItem();
            }

            if(fetchOrder){
              fetchOrder();
            }

            if (isCutView && onClose) {
              onClose();
            }

            navigate('/success', {
              state: {
                text: "Order",
                receipt: responseData.data.map(order => order.invoice_receipt)
              }
            });
        }
      } catch (error) {
        AxiosToastError(error);
      }
    });
  }

  const handleJengaPaymentSuccess = () => {
    dispatch(clearCartItems());

    if (fetchCartItem) {
      fetchCartItem();
    }

    if (fetchOrder) {
      fetchOrder();
    }

    if (isCutView && onClose) {
      onClose();
    }

    navigate('/success', { state: { text: 'Order' } });
  };

  const handleJengaPaymentError = (message) => {
    toast.error(message || 'Payment failed. Please try again.');
  };

  // Handle fulfillment method selection
  const handleFulfillmentSelect = (data) => {
    setFulfillmentMethod(data.fulfillment_type);
    setPickupLocation(data.pickup_location);
    setPickupInstructions(data.pickup_instructions);
  };

  useEffect(() => {
    if (cartLoading) {
      checkoutRedirectedRef.current = false;
      return;
    }

    if (hasCheckoutAmount || checkoutRedirectedRef.current) {
      return;
    }

    checkoutRedirectedRef.current = true;
    toast.error('You cannot open checkout with a zero amount. Add items to your cart first.');
    navigate('/dashboard/cart', {
      replace: true,
      state: { fromCheckoutGuard: true }
    });
  }, [cartLoading, hasCheckoutAmount, navigate]);

  // Pre-checkout handler to show fulfillment modal first
  const handlePreCheckout = (paymentMethod) => {
    setShowFulfillmentModal(true);
  };

  // Check if there are active addresses available
  const hasActiveAddresses = useMemo(() => {
    if (fulfillmentMethod === 'pickup') {
      return addressList.some(address => address.status);
    }
    return eligibleAddressIndexes.length > 0;
  }, [addressList, eligibleAddressIndexes, fulfillmentMethod]);

  const handleDeleteAddress = async (addressId) => {
    if (!addressId || !window.confirm('Delete this address permanently?')) return;
    try {
      const response = await Axios({
        ...SummaryApi.disableAddress,
        data: { _id: addressId },
      });
      if (response.data.success) {
        toast.success('Address deleted');
        if (fetchAddress) {
          await fetchAddress();
        }
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  // Render cut view or full page based on prop
  if (isCutView) {
    return (
      <>
        <div className="fixed inset-0 bg-plum-900/50 z-50 flex justify-end backdrop-blur-[2px]">
          <div className="bg-ivory dark:bg-dm-surface w-full max-w-md h-full overflow-y-auto transition-colors duration-200 border-l border-brown-100 dark:border-dm-border">
          {/* Cut View Header */}
          <div className="sticky top-0 z-20 bg-white dark:bg-dm-card p-4 flex justify-between items-center border-b border-brown-100 dark:border-dm-border shadow-sm transition-colors duration-200">
            <h2 className="font-semibold text-lg dark:text-white">Checkout</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors duration-200"
            >
              <FaXmark className="text-brown-500 dark:text-white/55" />
            </button>
          </div>

          {/* Cut View Content - scrollable */}
          <div className="p-4 overflow-y-auto">
            {/* Address Section */}
            <div className="mb-6">
              <h3 className='text-lg font-semibold dark:text-white mb-2'>Choose your address</h3>
              {!hasActiveAddresses && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 dark:bg-yellow-800/30 dark:border-yellow-700 dark:text-yellow-200 px-4 py-2 rounded mb-4">
                  Please add a delivery address to proceed with payment.
                </div>
              )}
              {addressError && (
                <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200 px-4 py-2 rounded mb-4">
                  Please select a delivery address before proceeding with payment.
                </div>
              )}
              {!isPaymentEnabled && hasActiveAddresses && !addressError && (
                <div className="bg-plum-50 dark:bg-plum-900/30 border border-plum-200 dark:border-plum-700 text-plum-800 dark:text-plum-200 px-4 py-2 rounded-card mb-4 text-sm">
                  {deliveryMode === 'foot'
                    ? `Foot delivery is only available for addresses within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius).`
                    : 'Select an address to enable payment options.'}
                </div>
              )}
              <div className='bg-white dark:bg-dm-card p-2 grid gap-4 rounded shadow transition-colors duration-200'>
                {hasActiveAddresses ? (
                  addressList.map((address, index) => {
                    // Only render addresses with status = true and eligible for the selected mode
                    if (!eligibleAddressIndexes.includes(index)) return null;
                    
                    return (
                      <label 
                        key={`address-${address._id || index}`}
                        htmlFor={`address-cut-${index}`}
                        className="cursor-pointer"
                      >
                        <div className={`border rounded-card p-3 flex gap-3 transition-colors duration-200 
                          ${selectAddress === index 
                            ? 'bg-plum-50 border-plum-600 border-2 dark:bg-plum-900/40 dark:border-plum-400' 
                            : 'border-brown-100 dark:border-dm-border hover:bg-plum-50/50 dark:hover:bg-plum-900/20'}`}>
                          <div>
                            <input 
                              id={`address-cut-${index}`} 
                              type='radio' 
                              value={index} 
                              checked={selectAddress === index}
                              onChange={(e) => setSelectAddress(parseInt(e.target.value))} 
                              name='address-cut' 
                              className="accent-plum-600 dark:accent-plum-400"
                            />
                          </div>
                          <div className="dark:text-white/85">
                            <p>{address.address_line}</p>
                            <p>{address.city}</p>
                            <p>{address.state}</p>
                            <p>{address.country} - {address.pincode}</p>
                            <p>{address.mobile}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteAddress(address._id);
                            }}
                            className="ml-auto self-start text-red-600 hover:text-red-700 dark:text-red-400 p-1"
                            title="Delete address"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </label>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-brown-400 dark:text-white/45">
                    {deliveryMode === 'foot'
                      ? `No addresses within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius). Add a CBD address or switch to Standard Delivery.`
                      : 'No delivery addresses found. Please add an address to continue.'}
                  </div>
                )}
                <div 
                  onClick={() => setOpenAddress(true)} 
                  className="h-16 bg-plum-50/50 dark:bg-plum-900/20 border-2 border-dashed border-plum-200 dark:border-plum-700 flex justify-center items-center cursor-pointer hover:bg-plum-100/80 dark:hover:bg-plum-900/35 transition-colors duration-200 text-plum-800 dark:text-white/85 text-sm font-medium"
                >
                  Add address
                </div>
              </div>

              <div className="mt-4 p-3 bg-white dark:bg-dm-card rounded shadow border border-brown-100 dark:border-dm-border">
              <p className="text-sm font-semibold dark:text-white mb-2">Delivery Type</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setDeliveryMode('standard'); }}
                  className={`px-2 py-2 rounded ${deliveryMode === 'standard' ? 'bg-plum-700 text-white' : 'bg-plum-100 dark:bg-plum-900/30 dark:text-white/80'}`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => { setDeliveryMode('foot'); }}
                  className={`px-2 py-2 rounded ${deliveryMode === 'foot' ? 'bg-plum-700 text-white' : 'bg-plum-100 dark:bg-plum-900/30 dark:text-white/80'}`}
                >
                  Foot (CBD)
                </button>
              </div>

              {fulfillmentMethod === 'delivery' && (
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={captureCustomerLocation}
                    disabled={locationLoading}
                    className="w-full text-xs px-2 py-2 rounded bg-gold-500 text-charcoal font-semibold disabled:opacity-60"
                  >
                    {locationLoading ? 'Checking location...' : 'Use My Current Location'}
                  </button>
                  <p className="text-[11px] text-brown-500 dark:text-white/55">
                    {customerLocation
                      ? (deliveryMode === 'foot'
                          ? `Distance: ${formatDistanceKm(footDeliveryEligibility.distanceKm)} (${footDeliveryEligibility.eligible ? 'eligible' : 'outside zone'})`
                          : `Location captured (${formatDistanceKm(footDeliveryEligibility.distanceKm)} from CBD)`)
                      : 'Location required for delivery. Tap to share your current location.'}
                  </p>
                </div>
              )}
              </div>
            </div>

            {/* Summary Section */}
            <div className='bg-white dark:bg-dm-card p-4 rounded shadow mb-4 transition-colors duration-200'>
              <h3 className='font-semibold mb-4 dark:text-white'>Order Summary</h3>
              
              {/* Premium Royal Membership Card */}
              <div className="mb-4">
                <CheckoutRoyalCard compact={false} showTeaser={true} />
              </div>
              
              {/* Community Rewards */}
              <div className="mb-4">
                <ActiveRewards 
                  displayMode="compact" 
                  onSelectReward={handleSelectReward}
                  selectedRewardId={selectedReward?._id}
                />
              </div>
              
              {/* Community Perks */}
              <div className="mb-4">
                <CommunityCampaignProgress displayMode="slim" />
              </div>
              
              <div className='space-y-2'>
                <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
                  <p>Original price total</p>
                  <p className='flex items-center gap-2'>
                    <span className='line-through text-brown-300 dark:text-white/35'>{DisplayPriceInShillings(notDiscountTotalPrice)}</span>
                  </p>
                </div>
                
                {/* Product discounts line */}
                <div className='flex gap-4 justify-between ml-1 text-gold-600 dark:text-gold-400'>
                  <p>Product discounts</p>
                  <p>Applied</p>
                </div>
                
                {/* Royal card discount line */}
                {royalDiscount > 0 && (
                  <div className='flex gap-4 justify-between ml-1 text-amber-800 dark:text-amber-300'>
                    <p className='flex items-center'>
                      <FaCrown className="mr-1" /> Royal Card discount
                    </p>
                    <p>-{royalDiscount}%</p>
                  </div>
                )}
                
                {/* Community reward discount line */}
                {selectedReward && selectedReward.type === 'discount' && (
                  <div className='flex gap-4 justify-between ml-1 text-gold-600 dark:text-gold-400'>
                    <p className='flex items-center'>
                      Community reward discount
                    </p>
                    <p>-{communityDiscount}%</p>
                  </div>
                )}
                
                {/* Community reward free shipping line */}
                {selectedReward && selectedReward.type === 'shipping' && (
                  <div className='flex gap-4 justify-between ml-1 text-plum-700 dark:text-plum-300'>
                    <p className='flex items-center'>
                      Community free shipping
                    </p>
                    <p>Applied</p>
                  </div>
                )}
                
                <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
                  <p>Subtotal</p>
                  <p className='font-medium'>{DisplayPriceInShillings(priceAfterCommunityDiscount)}</p>
                </div>
                
                <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
                  <p>Quantity total</p>
                  <p className='flex items-center gap-2'>{totalQty} item{totalQty !== 1 ? 's' : ''}</p>
                </div>
                
                <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
                  <p>Delivery Charge</p>
                  <p className='flex items-center gap-2'>{DisplayPriceInShillings(deliveryCharge)}</p>
                </div>
              </div>
            </div>

            {/* Loyalty Points Section */}
            {availablePoints > 0 && (
              <div className="mb-4 p-4 bg-white dark:bg-dm-card rounded-lg shadow transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium dark:text-white">Royal Loyalty Points</h3>
                    <p className="text-sm text-brown-500 dark:text-white/55">You have {availablePoints} points (worth up to KES {availablePoints})</p>
                  </div>
                  <div className="flex items-center dark:text-white/85">
                    <input
                      type="checkbox"
                      id="usePoints-cut"
                      checked={usePoints}
                      onChange={() => setUsePoints(!usePoints)}
                      className="mr-2 accent-plum-600 dark:accent-plum-400"
                    />
                    <label htmlFor="usePoints-cut">Use my points</label>
                  </div>
                </div>
                
                {usePoints && (
                  <div className="mt-2 text-green-600 dark:text-green-400 font-medium">
                    Points discount: KES {pointsValue.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Final Price Display */}
            <div className="mb-6 p-4 bg-white dark:bg-dm-card rounded-lg shadow transition-colors duration-200">
              <div className="flex justify-between items-center dark:text-white/85">
                <span className="font-medium">Subtotal:</span>
                <span>KES {priceAfterCommunityDiscount.toLocaleString()}</span>
              </div>
              
              {usePoints && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <span>Points Discount:</span>
                  <span>- KES {pointsValue.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-dm-border font-bold dark:text-white">
                <span>Total:</span>
                <span>KES {finalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className='space-y-4'>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-semibold border-2 transition-colors ${
                    selectedPaymentMethod === 'cash'
                      ? 'border-plum-600 text-plum-700 bg-plum-50 dark:border-plum-500 dark:text-plum-200 dark:bg-plum-900/20'
                      : 'border-brown-200 text-brown-400 dark:border-dm-border dark:text-white/40'
                  }`}
                >
                  Cash on Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('jenga')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-semibold border-2 transition-colors ${
                    selectedPaymentMethod === 'jenga'
                      ? 'border-plum-600 text-plum-700 bg-plum-50 dark:border-plum-500 dark:text-plum-200 dark:bg-plum-900/20'
                      : 'border-brown-200 text-brown-400 dark:border-dm-border dark:text-white/40'
                  }`}
                >
                  M-Pesa
                </button>
              </div>

              {selectedPaymentMethod === 'cash' && (
                <button
                  className={`w-full py-2 px-4 border-2 font-semibold transition-colors duration-200 rounded ${
                    isPaymentEnabled && !isCheckoutBusy
                      ? 'border-plum-600 text-plum-700 hover:bg-plum-50 hover:text-plum-900 dark:border-plum-500 dark:text-plum-200 dark:hover:bg-plum-900/40 dark:hover:text-white'
                      : 'border-brown-200 text-brown-300 dark:border-dm-border dark:text-white/30 cursor-not-allowed'
                  }`}
                  onClick={handleCashOnDelivery}
                  disabled={!isPaymentEnabled || isCheckoutBusy}
                >
                  {checkoutAction === 'cash' ? 'Placing order...' : `Cash on Delivery ${!isPaymentEnabled ? '(Select Address First)' : ''}`}
                </button>
              )}

              {selectedPaymentMethod === 'jenga' && isPaymentEnabled && (
                <JengaPayment
                  cartItems={cartItemsList}
                  totalAmount={finalPrice}
                  addressId={fulfillmentMethod === 'delivery' ? addressList[selectAddress]?._id : null}
                  communityRewardId={selectedReward ? selectedReward._id : null}
                  communityDiscountAmount={selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0}
                  fulfillment_type={fulfillmentMethod}
                  pickup_location={pickupLocation}
                  pickup_instructions={pickupInstructions}
                  deliveryCharge={deliveryCharge}
                  deliveryInstructions={deliveryInstructions}
                  onSuccess={handleJengaPaymentSuccess}
                  onError={handleJengaPaymentError}
                />
              )}
            </div>
          </div>
          </div>
        </div>
        {gateModal}
      </>
    );
  }

  // Update UI based on fulfillment method
  const renderAddressOrPickupSection = () => {
    if (fulfillmentMethod === 'delivery') {
      return (
        <>
          {/* Fulfillment method toggle */}
          <div className="mb-4 grid grid-cols-2 rounded-card overflow-hidden border border-brown-100 dark:border-dm-border text-sm font-semibold">
            <button type="button" onClick={() => setFulfillmentMethod('delivery')} className="py-2.5 bg-plum-700 text-white">🚚 Delivery</button>
            <button type="button" onClick={() => { setFulfillmentMethod('pickup'); setPickupLocation(''); }} className="py-2.5 bg-white dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/20 transition-colors">🏪 Pickup</button>
          </div>
          <h3 className='text-lg font-semibold text-charcoal dark:text-white mb-3'>Delivery Address</h3>
          {!hasActiveAddresses && (
            <div className="bg-gold-100 dark:bg-gold-600/10 border border-gold-300 dark:border-gold-600/30 text-gold-700 dark:text-gold-300 px-4 py-2 rounded-card mb-4 text-sm">
              Please add a delivery address to proceed with payment.
            </div>
          )}
          {addressError && (
            <div className="bg-blush-100 dark:bg-blush-500/10 border border-blush-300 dark:border-blush-500/30 text-blush-600 dark:text-blush-300 px-4 py-2 rounded-card mb-4 text-sm">
              Please select a delivery address before proceeding with payment.
            </div>
          )}
          {!isPaymentEnabled && hasActiveAddresses && !addressError && (
            <div className="bg-plum-50 dark:bg-plum-900/20 border border-plum-200 dark:border-plum-700/40 text-plum-700 dark:text-plum-300 px-4 py-2 rounded-card mb-4 text-sm">
              {deliveryMode === 'foot'
                ? `Foot delivery is only available for addresses within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius).`
                : 'Select an address to enable payment options.'}
            </div>
          )}
          <div className='grid gap-3 mb-4'>
            {hasActiveAddresses ? (
              addressList.map((address, index) => {
                if (!eligibleAddressIndexes.includes(index)) return null;
                return (
                  <label
                    key={`address-${address._id || index}`}
                    htmlFor={`address${index}`}
                    className="cursor-pointer"
                  >
                    <div className={`border-2 rounded-card p-4 flex gap-3 transition-all duration-200 ${
                      selectAddress === index
                        ? 'border-plum-700 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                        : 'border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card hover:border-plum-200 dark:hover:border-plum-700/40'
                    }`}>
                      <input
                        id={`address${index}`}
                        type='radio'
                        value={index}
                        checked={selectAddress === index}
                        onChange={(e) => setSelectAddress(parseInt(e.target.value))}
                        name='address'
                        className="accent-plum-700 mt-1 flex-shrink-0"
                      />
                      <div className="text-sm text-charcoal dark:text-white/80 leading-relaxed">
                        <p className="font-medium">{address.address_line}</p>
                        <p className="text-brown-400 dark:text-white/50">{address.city}, {address.state}</p>
                        <p className="text-brown-400 dark:text-white/50">{address.country} - {address.pincode}</p>
                        <p className="text-brown-400 dark:text-white/50 text-xs mt-0.5">{address.mobile}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteAddress(address._id);
                        }}
                        className="ml-auto self-start text-red-600 hover:text-red-700 dark:text-red-400 p-1"
                        title="Delete address"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </label>
                )
              })
            ) : (
              <div className="p-6 text-center text-brown-400 dark:text-white/40 text-sm bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border">
                {deliveryMode === 'foot'
                  ? `No addresses within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius). Add a CBD address or switch to Standard Delivery.`
                  : 'No delivery addresses found. Please add an address to continue.'}
              </div>
            )}
            <div
              onClick={() => setOpenAddress(true)}
              className='h-14 bg-blush-50 dark:bg-dm-card border-2 border-dashed border-blush-200 dark:border-dm-border rounded-card flex justify-center items-center cursor-pointer hover:bg-blush-100 dark:hover:bg-dm-card-2 hover:border-plum-300 dark:hover:border-plum-600 transition-all duration-200 text-sm font-medium text-plum-700 dark:text-plum-200 gap-2'
            >
              + Add new address
            </div>
          </div>

          <div className='bg-white dark:bg-dm-card p-4 rounded-card border border-brown-100 dark:border-dm-border mb-4 transition-colors duration-200'>
          <p className='text-sm font-semibold text-charcoal dark:text-white mb-3'>Delivery Type</p>

          <div className='grid sm:grid-cols-2 gap-3'>
            <label className={`cursor-pointer rounded-card border-2 p-3 transition-all ${
              deliveryMode === 'standard'
                ? 'border-plum-600 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                : 'border-brown-100 dark:border-dm-border'
            }`}>
              <input
                type='radio'
                name='delivery_mode'
                value='standard'
                checked={deliveryMode === 'standard'}
                onChange={() => setDeliveryMode('standard')}
                className='hidden'
              />
              <p className='font-semibold text-charcoal dark:text-white'>Standard Delivery</p>
              <p className='text-xs text-brown-500 dark:text-white/50 mt-1'>Available within Nairobi CBD ({NAIROBI_CBD_RADIUS_KM}km radius).</p>
            </label>

            <label className={`cursor-pointer rounded-card border-2 p-3 transition-all ${
              deliveryMode === 'foot'
                ? 'border-plum-600 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                : 'border-brown-100 dark:border-dm-border'
            }`}>
              <input
                type='radio'
                name='delivery_mode'
                value='foot'
                checked={deliveryMode === 'foot'}
                onChange={() => setDeliveryMode('foot')}
                className='hidden'
              />
              <p className='font-semibold text-charcoal dark:text-white'>Delivery by Foot</p>
              <p className='text-xs text-brown-500 dark:text-white/50 mt-1'>Only within Nairobi CBD ({NAIROBI_CBD_RADIUS_KM}km radius).</p>
            </label>
          </div>

          {/* Location capture required for every delivery order */}
          {fulfillmentMethod === 'delivery' && (
            <div className='mt-3 space-y-2'>
              <button
                type='button'
                onClick={captureCustomerLocation}
                className='px-3 py-2 rounded-pill text-sm font-semibold bg-plum-700 text-white hover:bg-plum-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
                disabled={locationLoading}
              >
                {locationLoading ? 'Checking location...' : 'Use My Current Location'}
              </button>

              <p className='text-xs text-brown-500 dark:text-white/50'>
                {customerLocation
                  ? (deliveryMode === 'foot'
                      ? `Distance to CBD center: ${formatDistanceKm(footDeliveryEligibility.distanceKm)} (${footDeliveryEligibility.eligible ? 'eligible' : 'outside allowed zone'})`
                      : `Location captured (${formatDistanceKm(footDeliveryEligibility.distanceKm)} from CBD).`)
                  : 'Location required for delivery. Tap to share your current location.'}
              </p>
            </div>
          )}
          </div>
        </>
      );
    } else {
      return (
        <>
          {/* Fulfillment method toggle */}
          <div className="mb-4 grid grid-cols-2 rounded-card overflow-hidden border border-brown-100 dark:border-dm-border text-sm font-semibold">
            <button type="button" onClick={() => setFulfillmentMethod('delivery')} className="py-2.5 bg-white dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/20 transition-colors">🚚 Delivery</button>
            <button type="button" onClick={() => setFulfillmentMethod('pickup')} className="py-2.5 bg-plum-700 text-white">🏪 Pickup</button>
          </div>
          <h3 className='text-lg font-semibold text-charcoal dark:text-white mb-3'>Select Pickup Location</h3>
          {!pickupLocation && (
            <div className="bg-gold-100 dark:bg-gold-600/10 border border-gold-300 dark:border-gold-600/30 text-gold-700 dark:text-gold-300 px-4 py-2 rounded-card mb-4 text-sm">
              Please select a pickup location to proceed with payment.
            </div>
          )}
          <div className='grid gap-3 mb-4'>
            {pickupLocations.map((loc) => (
              <label key={loc.name} className="cursor-pointer">
                <div className={`border-2 rounded-card p-4 flex gap-3 transition-all duration-200 ${
                  pickupLocation === loc.name
                    ? 'border-plum-700 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                    : 'border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card hover:border-plum-200 dark:hover:border-plum-700/40'
                }`}>
                  <input
                    type='radio'
                    value={loc.name}
                    checked={pickupLocation === loc.name}
                    onChange={() => setPickupLocation(loc.name)}
                    name='pickup_location'
                    className="accent-plum-700 mt-1 flex-shrink-0"
                  />
                  <div className="text-sm text-charcoal dark:text-white/80 leading-relaxed">
                    <p className="font-medium"><FaStore className="text-plum-500 inline mr-1 text-xs" />{loc.name}</p>
                    <p className="text-brown-400 dark:text-white/50 text-xs mt-0.5">{loc.address}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className='bg-white dark:bg-dm-card p-4 rounded-card border border-brown-100 dark:border-dm-border mb-4 transition-colors duration-200'>
            <label className="block text-sm font-semibold text-charcoal dark:text-white mb-2">Pickup Instructions (optional)</label>
            <textarea
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              placeholder="Any special instructions for pickup..."
              rows={2}
              className="w-full text-sm border border-brown-200 dark:border-dm-border rounded-card px-3 py-2 bg-ivory dark:bg-dm-surface text-charcoal dark:text-white/80 placeholder-brown-300 dark:placeholder-white/30 focus:outline-none focus:border-plum-500 dark:focus:border-plum-400 resize-none"
            />
          </div>
        </>
      );
    }
  };

  const sectionShell = embedded
    ? 'w-full max-w-full bg-transparent'
    : 'bg-ivory dark:bg-dm-surface transition-colors duration-200';
  const containerShell = embedded
    ? 'flex w-full max-w-full flex-col gap-5 px-2 py-3 sm:px-3 lg:flex-row lg:justify-between'
    : 'container mx-auto flex w-full flex-col gap-5 px-2 py-4 sm:px-4 lg:flex-row lg:px-6 lg:justify-between';
  const summarySticky = embedded ? 'lg:sticky lg:top-4' : 'lg:sticky lg:top-24';

  if (cartLoading) {
    return (
      <section className={sectionShell}>
        <div className="flex min-h-[40vh] items-center justify-center px-4 py-10 text-sm text-brown-400 dark:text-white/55">
          Loading checkout...
        </div>
      </section>
    );
  }

  if (!hasCheckoutAmount) {
    return null;
  }

  // Full page render (original implementation)
  return (
    <>
      <section className={sectionShell}>
        <div className={containerShell}>
        <div className='w-full'>
          {/* Address or Pickup Section */}
          {renderAddressOrPickupSection()}
        </div>

        <div className={`w-full self-start rounded-card border border-brown-100 bg-white px-3 py-4 sm:px-4 shadow transition-colors duration-200 dark:border-dm-border dark:bg-dm-card lg:max-w-sm xl:max-w-md ${summarySticky}`}>
          {/**summary**/}
          <h3 className='text-lg font-semibold text-charcoal dark:text-white px-1 mb-3'>Order Summary</h3>
          
          {/* Premium Royal Membership Card */}
          <div className="mb-4">
            <CheckoutRoyalCard compact={false} showTeaser={true} />
          </div>
          
          {/* Community Rewards */}
          <div className="mx-4 mb-4">
            <ActiveRewards 
              displayMode="compact" 
              onSelectReward={handleSelectReward}
              selectedRewardId={selectedReward?._id}
            />
          </div>
          
          {/* Community Perks */}
          <div className="mt-2">
            <CommunityCampaignProgress displayMode="slim" />
          </div>
          
          <div className='bg-white dark:bg-dm-card-2 p-4 rounded-card border border-brown-100 dark:border-dm-border mt-3 transition-colors duration-200'>
            <h3 className='font-semibold text-charcoal dark:text-white mb-3 text-sm uppercase tracking-wide'>Bill Details</h3>
            <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
              <p>Original price total</p>
              <p className='flex items-center gap-2'>
                <span className='line-through text-brown-300 dark:text-white/35'>{DisplayPriceInShillings(notDiscountTotalPrice)}</span>
              </p>
            </div>
            
            {/* Product discounts line */}
            <div className='flex gap-4 justify-between ml-1 text-green-600 dark:text-green-400'>
              <p>Product discounts</p>
              <p>Applied</p>
            </div>
            
            {/* Royal card discount line */}
            {royalDiscount > 0 && (
              <div className='flex gap-4 justify-between ml-1 text-amber-800 dark:text-amber-300'>
                <p className='flex items-center'>
                  <FaCrown className="mr-1" /> Royal Card discount
                </p>
                <p>-{royalDiscount}%</p>
              </div>
            )}
            
            {/* Community reward discount line */}
            {selectedReward && selectedReward.type === 'discount' && (
              <div className='flex gap-4 justify-between ml-1 text-green-600 dark:text-green-400'>
                <p className='flex items-center'>
                  Community reward discount
                </p>
                <p>-{communityDiscount}%</p>
              </div>
            )}
            
            {/* Community reward free shipping line */}
            {selectedReward && selectedReward.type === 'shipping' && (
              <div className='flex gap-4 justify-between ml-1 text-plum-700 dark:text-plum-300'>
                <p className='flex items-center'>
                  Community free shipping
                </p>
                <p>Applied</p>
              </div>
            )}
            
            <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
              <p>Subtotal</p>
              <p className='font-medium'>{DisplayPriceInShillings(priceAfterCommunityDiscount)}</p>
            </div>
            
            <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
              <p>Quantity total</p>
              <p className='flex items-center gap-2'>{totalQty} item{totalQty !== 1 ? 's' : ''}</p>
            </div>
            
            <div className='flex gap-4 justify-between ml-1 dark:text-white/85'>
              <p>Delivery Charge</p>
              <p className='flex items-center gap-2'>{DisplayPriceInShillings(deliveryCharge)}</p>
            </div>

            {usePoints && (
              <div className='flex gap-4 justify-between ml-1 text-green-600 dark:text-green-400'>
                <p>Points Discount</p>
                <p>- KES {pointsValue.toLocaleString()}</p>
              </div>
            )}

            <div className='flex gap-4 justify-between ml-1 mt-2 pt-2 border-t border-brown-100 dark:border-dm-border'>
              <p className='font-bold text-charcoal dark:text-white'>Total</p>
              <p className='font-bold text-gold-600 dark:text-gold-300 font-price'>{DisplayPriceInShillings(finalPrice)}</p>
            </div>
          </div>

          {/* Loyalty Points Section */}
          {availablePoints > 0 && (
            <div className="mt-4 p-4 bg-white dark:bg-dm-card rounded-lg shadow transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium dark:text-white">Royal Loyalty Points</h3>
                  <p className="text-sm text-brown-500 dark:text-white/55">You have {availablePoints} points (worth up to KES {availablePoints})</p>
                </div>
                <div className="flex items-center dark:text-white/85">
                  <input
                    type="checkbox"
                    id="usePoints"
                    checked={usePoints}
                    onChange={() => setUsePoints(!usePoints)}
                    className="mr-2 accent-plum-600 dark:accent-plum-400"
                  />
                  <label htmlFor="usePoints">Use my points</label>
                </div>
              </div>
              
              {usePoints && (
                <div className="mt-2 text-green-600 dark:text-green-400 font-medium">
                  Points discount: KES {pointsValue.toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className='w-full flex flex-col gap-3 mt-5'>
            <p className="text-xs font-semibold uppercase tracking-widest text-brown-300 dark:text-white/30 mb-1">Payment Method</p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('cash')}
                className={`flex-1 py-2 px-3 rounded-card text-sm font-semibold border-2 transition-colors ${
                  selectedPaymentMethod === 'cash'
                    ? 'border-plum-600 text-plum-700 bg-plum-50 dark:border-plum-500 dark:text-plum-200 dark:bg-plum-900/20'
                    : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/40'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('jenga')}
                className={`flex-1 py-2 px-3 rounded-card text-sm font-semibold border-2 transition-colors ${
                  selectedPaymentMethod === 'jenga'
                    ? 'border-plum-600 text-plum-700 bg-plum-50 dark:border-plum-500 dark:text-plum-200 dark:bg-plum-900/20'
                    : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/40'
                }`}
              >
                M-Pesa
              </button>
            </div>

            {selectedPaymentMethod === 'cash' && (
              <button
                className={`flex items-center justify-between w-full py-3 px-4 rounded-card border-2 font-semibold text-sm transition-all duration-200 press ${
                  isPaymentEnabled && !isCheckoutBusy
                    ? 'border-plum-600 text-plum-700 dark:border-plum-500 dark:text-plum-200 bg-plum-50 dark:bg-plum-900/20 hover:bg-plum-100 dark:hover:bg-plum-900/40'
                    : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 cursor-not-allowed'
                }`}
                onClick={handleCashOnDelivery}
                disabled={!isPaymentEnabled || isCheckoutBusy}
              >
                <span>{checkoutAction === 'cash' ? 'Placing order...' : `Cash on ${fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'}`}</span>
                {!isPaymentEnabled && <span className="text-xs font-normal opacity-60">{fulfillmentMethod === 'delivery' ? 'Select address first' : 'Select pickup location'}</span>}
              </button>
            )}

            {selectedPaymentMethod === 'jenga' && isPaymentEnabled && (
              <JengaPayment
                cartItems={cartItemsList}
                totalAmount={finalPrice}
                addressId={fulfillmentMethod === 'delivery' ? addressList[selectAddress]?._id : null}
                communityRewardId={selectedReward ? selectedReward._id : null}
                communityDiscountAmount={selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0}
                fulfillment_type={fulfillmentMethod}
                pickup_location={pickupLocation}
                pickup_instructions={pickupInstructions}
                deliveryCharge={deliveryCharge}
                deliveryInstructions={deliveryInstructions}
                onSuccess={handleJengaPaymentSuccess}
                onError={handleJengaPaymentError}
              />
            )}

            {/* Guest Checkout CTA — only show for unauthenticated users */}
            {!user?._id && (
            <div className="mt-6 pt-6 border-t border-brown-200 dark:border-brown-700">
              <p className="text-center text-sm text-brown-500 dark:text-brown-400 mb-3">
                Don't want to create an account?
              </p>
              <Link
                to="/guest-checkout"
                className="block w-full py-3 px-4 rounded-pill font-semibold text-center bg-gradient-to-r from-brown-100 to-brown-50 dark:from-brown-800 dark:to-brown-700 text-charcoal dark:text-white hover:from-brown-200 hover:to-brown-100 dark:hover:from-brown-700 dark:hover:to-brown-600 transition-all shadow-sm hover:shadow"
              >
                Checkout as Guest →
              </Link>
            </div>
            )}
          </div>
        </div>
        </div>

        {/* Fulfillment Method Modal */}
        <FulfillmentModal 
          isOpen={showFulfillmentModal}
          onClose={() => setShowFulfillmentModal(false)}
          onSelect={handleFulfillmentSelect}
          pickupLocations={pickupLocations}
        />

        {/* Delivery location capture modal */}
        <DeliveryLocationModal
          isOpen={showLocationModal}
          initialLocation={customerLocation}
          initialInstructions={deliveryInstructions}
          onClose={() => setShowLocationModal(false)}
          onSave={(loc) => {
            setCustomerLocation({ lat: loc.lat, lng: loc.lng });
            setDeliveryInstructions(loc.deliveryInstructions || '');
          }}
        />

        {/* Address Modal */}
        {
          openAddress && (
            <AddAddress close={() => setOpenAddress(false)} />
          )
        }
      </section>
      {gateModal}
    </>
  )
}

// Create a CheckoutCutView component that wraps CheckoutPage in cut view mode
export const CheckoutCutView = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return <CheckoutPage isCutView={true} onClose={onClose} />;
};

export default CheckoutPage;

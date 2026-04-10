import { loadStripe } from '@stripe/stripe-js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCrown, FaStore } from 'react-icons/fa';
import { FaXmark } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { nawiriBrand } from '../config/brand';
import ActiveRewards from '../components/ActiveRewards'; // Import the ActiveRewards component
import AddAddress from '../components/AddAddress';
import CommunityCampaignProgress from '../components/CommunityCampaignProgress'; // Import the CommunityCampaignProgress component
import FulfillmentModal from '../components/FulfillmentModal';
import MpesaPayment from '../components/MpesaPayment'; // Import the MpesaPayment component
import { useTheme } from '../context/ThemeContext';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCartItems } from '../redux/slice/cartSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

const CheckoutPage = ({ isCutView = false, onClose = null, embedded = false }) => {
  const { notDiscountTotalPrice, totalPrice, totalQty, fetchCartItem, fetchOrder, royalCardData, royalDiscount } = useGlobalContext();
  const { darkMode } = useTheme();
  const location = useLocation();
  const [openAddress, setOpenAddress] = useState(false);
  const [showMpesaForm, setShowMpesaForm] = useState(false); // State to control M-Pesa form visibility
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  
  // Get fulfillment method from location state if available
  const [fulfillmentMethod, setFulfillmentMethod] = useState(
    location.state?.fulfillmentMethod || location.state?.fulfillment_type || 'delivery'
  );
  const [pickupLocation, setPickupLocation] = useState(
    location.state?.pickupLocation || location.state?.pickup_location || ''
  );
  const [pickupInstructions, setPickupInstructions] = useState(
    location.state?.pickupInstructions || location.state?.pickup_instructions || ''
  );
  
  const addressList = useSelector(state => state.addresses.addressList);
  const [selectAddress, setSelectAddress] = useState(null); // Changed from 0 to null to ensure validation
  const [addressError, setAddressError] = useState(false); // State to track address selection error
  const cartItemsList = useSelector(state => state.cartItem.cart);
  const cartLoading = useSelector(state => state.cartItem.loading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);

  const [usePoints, setUsePoints] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointsValue, setPointsValue] = useState(0);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // Community reward state
  const [selectedReward, setSelectedReward] = useState(null);
  const [communityDiscount, setCommunityDiscount] = useState(0);

  // Check if payments should be enabled
  const isPaymentEnabled = selectAddress !== null && addressList[selectAddress] && addressList[selectAddress].status;
  const checkoutLockRef = useRef(false);
  const [checkoutAction, setCheckoutAction] = useState('');

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
        // Get token from localStorage
        const token = localStorage.getItem('accesstoken');
        
        if (!token) {
          console.log("No authentication token found, skipping loyalty card fetch");
          return;
        }

        const response = await Axios({
          url: `/api/users/${user._id}/loyalty-card`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success && response.data.data) {
          const points = response.data.data.points || 0;
          setAvailablePoints(points);
          // Each point is worth KES 1
          setPointsValue(Math.min(points, totalPrice));
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
  }, [user, user._id, totalPrice]);

  // Handle selecting community reward
  const handleSelectReward = (reward) => {
    if (selectedReward && selectedReward._id === reward._id) {
      // If clicking the same reward, deselect it
      setSelectedReward(null);
      setCommunityDiscount(0);
      toast.info(`Removed ${reward.type === 'discount' ? `${reward.value}% discount` : 'reward'}`);
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

  // Calculate final price after applying points and community discount
  const finalPrice = usePoints 
    ? Math.max(0, priceAfterCommunityDiscount - pointsValue) 
    : priceAfterCommunityDiscount;
  const isCheckoutBusy = checkoutAction !== '';
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
    { name: 'Main Store', address: nawiriBrand.location },
    { name: 'Westlands Branch', address: '456 Westlands Road, Westlands, Nairobi' },
    { name: 'Mombasa Road Store', address: '789 Mombasa Road, Nairobi' }
  ];

  // Validate address is selected before payment
  const validateAddress = () => {
    if (fulfillmentMethod === 'delivery') {
      if (!isPaymentEnabled) {
        setAddressError(true);
        toast.error('Please select a delivery address before proceeding');
        return false;
      }
    } else if (fulfillmentMethod === 'pickup' && !pickupLocation) {
      toast.error('Please select a pickup location');
      return false;
    }
    return true;
  };

  const handleCashOnDelivery = async() => {
    if (!validateAddress()) return;

    await runCheckoutAction('cash', async () => {
      try {
        const response = await Axios({
          ...SummaryApi.CashOnDeliveryOrder,
          data : {
            list_items : cartItemsList,
            addressId : fulfillmentMethod === 'delivery' ? addressList[selectAddress]._id : null,
            subTotalAmt : totalPrice,
            totalAmt : finalPrice,
            usePoints: usePoints,
            pointsUsed: usePoints ? pointsValue : 0,
            communityRewardId: selectedReward ? selectedReward._id : null,
            communityDiscountAmount: selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0,
            fulfillment_type: fulfillmentMethod,
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

  const handleOnlinePayment = async() => {
    if (!validateAddress()) return;

    await runCheckoutAction('card', async () => {
      const loadingToastId = toast.loading("Loading...");

      try {
          const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
          const stripe = await loadStripe(stripePublicKey);

          if (!stripe) {
            throw new Error('Stripe failed to initialize.');
          }

          try {
            dispatch(clearCartItems());

            await Axios({
              ...SummaryApi.clearCart,
              requestLockKey: `checkout:clear:${checkoutScope}`
            });
          } catch (clearError) {
            console.error("Failed to clear cart before payment:", clearError);
          }

          const response = await Axios({
              ...SummaryApi.payment_url,
              data: {
                list_items: cartItemsList,
                addressId: fulfillmentMethod === 'delivery' ? addressList[selectAddress]._id : null,
                subTotalAmt: totalPrice,
                totalAmt: finalPrice,
                royalDiscount: royalDiscount,
                communityRewardId: selectedReward ? selectedReward._id : null,
                communityDiscountAmount: selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0,
                fulfillment_type: fulfillmentMethod,
                pickup_location: pickupLocation,
                pickup_instructions: pickupInstructions
              },
              requestLockKey: `checkout:stripe:${checkoutScope}`
          });

          const { data: responseData } = response;
          localStorage.setItem('cartClearedAt', new Date().toISOString());

          if(fetchCartItem){
            fetchCartItem();
          }

          if (isCutView && onClose) {
            onClose();
          }

          toast.dismiss(loadingToastId);
          const stripeRedirectResult = await stripe.redirectToCheckout({ sessionId: responseData.id });

          if (stripeRedirectResult?.error) {
            throw stripeRedirectResult.error;
          }
      } catch (error) {
          toast.dismiss(loadingToastId);
          AxiosToastError(error);
      }
    });
  }

  const handleShowMpesaForm = () => {
    if (isCheckoutBusy) return;
    if (!validateAddress()) return;
    setShowMpesaForm(true);
  };

  const handleMpesaSuccess = () => {
    // Clear cart state immediately after successful order
    dispatch(clearCartItems());
    
    toast.success("M-Pesa payment initiated. Enter your PIN on your phone.");
    setShowMpesaForm(false);
    
    // Close cut view if applicable before navigating
    if (isCutView && onClose) {
      onClose();
    }
    
    // Navigate to payment status page
    navigate('/mpesa-payment-status');
    
    // Clear cart after initiating payment
    if(fetchCartItem) {
      fetchCartItem();
    }
  }

  const handleMpesaError = (errorMessage) => {
    toast.error(errorMessage || "M-Pesa payment failed");
    setShowMpesaForm(false);
  }

  const handlePesapalPayment = async () => {
    if (!validateAddress()) return;

    await runCheckoutAction('pesapal', async () => {
      try {
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        const token = localStorage.getItem('accesstoken') || localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_URL || '';

        const res = await Axios({
          url: `${baseUrl}/api/pesapal/initiate`,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          data: {
            orderId,
            amount: finalPrice,
            currency: 'KES',
            description: `Nawiri Hair checkout ${orderId}`,
            customer: {
              email: user?.email,
              firstName: user?.name?.split(' ')[0] || 'Customer',
              lastName: user?.name?.split(' ').slice(1).join(' ') || 'User',
              phone: user?.mobile,
              countryCode: 'KE'
            }
          },
          requestLockKey: `checkout:pesapal:${checkoutScope}`
        });

        const { data } = res;

        if (data?.success && data.redirect_url) {
          const width = 480;
          const height = 720;
          const left = window.screenX + (window.innerWidth - width) / 2;
          const top = window.screenY + (window.innerHeight - height) / 2;
          const popup = window.open(data.redirect_url, 'pesapalPopup', `width=${width},height=${height},left=${left},top=${top}`);

          if (!popup) {
            throw new Error('Popup blocked. Please allow popups and try again.');
          }

          await new Promise((resolve) => {
            const poll = setInterval(() => {
              try {
                if (popup.closed) {
                  clearInterval(poll);
                  navigate('/success', { state: { orderId, paymentMethod: 'PesaPal', amount: finalPrice } });
                  resolve();
                }
              } catch (_) {
                // Ignore cross-origin popup access while the gateway is open.
              }
            }, 800);
          });
        } else {
          throw new Error('Failed to start Pesapal payment');
        }
      } catch (err) {
        console.error('Pesapal init error:', err.response?.data || err.message);
        const raw = err.response?.data;
        const detail = raw?.details || raw?.message || err.message || 'Failed to initiate PesaPal';
        const guidance = /invalid\s*ipn/i.test(detail) ? ' - Please register your IPN in the Pesapal dashboard and set PESAPAL_NOTIFICATION_ID.' : '';
        toast.error(`PesaPal Payment Error: ${detail}${guidance}`);
      }
    });
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
  const hasActiveAddresses = addressList.some(address => address.status);

  // Render cut view or full page based on prop
  if (isCutView) {
    return (
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
                  Select an address to enable payment options.
                </div>
              )}
              <div className='bg-white dark:bg-dm-card p-2 grid gap-4 rounded shadow transition-colors duration-200'>
                {hasActiveAddresses ? (
                  addressList.map((address, index) => {
                    // Only render addresses with status = true
                    if (!address.status) return null;
                    
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
                        </div>
                      </label>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-brown-400 dark:text-white/45">
                    No delivery addresses found. Please add an address to continue.
                  </div>
                )}
                <div 
                  onClick={() => setOpenAddress(true)} 
                  className="h-16 bg-plum-50/50 dark:bg-plum-900/20 border-2 border-dashed border-plum-200 dark:border-plum-700 flex justify-center items-center cursor-pointer hover:bg-plum-100/80 dark:hover:bg-plum-900/35 transition-colors duration-200 text-plum-800 dark:text-white/85 text-sm font-medium"
                >
                  Add address
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className='bg-white dark:bg-dm-card p-4 rounded shadow mb-4 transition-colors duration-200'>
              <h3 className='font-semibold mb-4 dark:text-white'>Order Summary</h3>
              
              {/* Royal Card Badge */}
              {royalDiscount > 0 && (
                <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-800 dark:text-amber-200 flex items-center">
                  <FaCrown className="mr-2 text-xl" />
                  <div>
                    <p className="font-medium">Royal {royalCardData?.tier} Card</p>
                    <p className="text-sm">You're getting an additional {royalDiscount}% discount on all products!</p>
                  </div>
                </div>
              )}
              
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
                  <p className='flex items-center gap-2'>Free</p>
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
              <button 
                className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors duration-200 ${
                  isPaymentEnabled && !isCheckoutBusy
                    ? 'bg-gold-500 hover:bg-gold-400 text-charcoal dark:text-charcoal' 
                    : 'bg-brown-200 dark:bg-dm-border text-brown-400 dark:text-white/35 cursor-not-allowed'
                }`}
                onClick={handleOnlinePayment}
                disabled={!isPaymentEnabled || isCheckoutBusy}
              >
                {checkoutAction === 'card' ? 'Processing card payment...' : `Pay with Card ${!isPaymentEnabled ? '(Select Address First)' : ''}`}
              </button>
              <button 
                className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors duration-200 ${
                  isPaymentEnabled && !isCheckoutBusy
                    ? 'bg-plum-700 hover:bg-plum-600 dark:bg-plum-600 dark:hover:bg-plum-500' 
                    : 'bg-brown-200 dark:bg-dm-border text-brown-400 dark:text-white/35 cursor-not-allowed'
                }`}
                onClick={handleShowMpesaForm}
                disabled={!isPaymentEnabled || isCheckoutBusy}
              >
                Pay with M-Pesa {!isPaymentEnabled && '(Select Address First)'}
              </button>
              <button 
                className={`w-full py-2 px-4 border-2 font-semibold transition-colors duration-200 ${
                  isPaymentEnabled && !isCheckoutBusy
                    ? 'border-plum-600 text-plum-700 hover:bg-plum-50 hover:text-plum-900 dark:border-plum-500 dark:text-plum-200 dark:hover:bg-plum-900/40 dark:hover:text-white' 
                    : 'border-brown-200 text-brown-300 dark:border-dm-border dark:text-white/30 cursor-not-allowed'
                }`}
                onClick={handleCashOnDelivery}
                disabled={!isPaymentEnabled || isCheckoutBusy}
              >
                {checkoutAction === 'cash' ? 'Placing order...' : `Cash on Delivery ${!isPaymentEnabled ? '(Select Address First)' : ''}`}
              </button>
              <button 
                className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors duration-200 ${
                  isPaymentEnabled && !isCheckoutBusy
                    ? 'bg-charcoal hover:bg-plum-900 text-white dark:bg-plum-800 dark:hover:bg-plum-700' 
                    : 'bg-brown-200 dark:bg-dm-border text-brown-400 dark:text-white/35 cursor-not-allowed'
                }`}
                onClick={handlePesapalPayment}
                disabled={!isPaymentEnabled || isCheckoutBusy}
              >
                {checkoutAction === 'pesapal' ? 'Processing...' : `Pay with PesaPal ${!isPaymentEnabled ? '(Select Address First)' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Update UI based on fulfillment method
  const renderAddressOrPickupSection = () => {
    if (fulfillmentMethod === 'delivery') {
      return (
        <>
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
              Select an address to enable payment options.
            </div>
          )}
          <div className='grid gap-3 mb-4'>
            {hasActiveAddresses ? (
              addressList.map((address, index) => {
                if (!address.status) return null;
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
                    </div>
                  </label>
                )
              })
            ) : (
              <div className="p-6 text-center text-brown-400 dark:text-white/40 text-sm bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border">
                No delivery addresses found. Please add an address to continue.
              </div>
            )}
            <div
              onClick={() => setOpenAddress(true)}
              className='h-14 bg-blush-50 dark:bg-dm-card border-2 border-dashed border-blush-200 dark:border-dm-border rounded-card flex justify-center items-center cursor-pointer hover:bg-blush-100 dark:hover:bg-dm-card-2 hover:border-plum-300 dark:hover:border-plum-600 transition-all duration-200 text-sm font-medium text-plum-700 dark:text-plum-200 gap-2'
            >
              + Add new address
            </div>
          </div>
        </>
      );
    } else {
      return (
        <>
          <h3 className='text-lg font-semibold dark:text-white mb-2'>Pickup Information</h3>
          <div className='bg-white dark:bg-dm-card p-4 rounded shadow transition-colors duration-200'>
            <div className="flex items-center gap-2 mb-3">
              <FaStore className="text-purple-500" />
              <span className="font-medium dark:text-white">Pickup Location:</span>
            </div>
            <p className="mb-3 dark:text-white/85">{pickupLocation}</p>
            
            {pickupInstructions && (
              <>
                <div className="flex items-center gap-2 mb-2 mt-4">
                  <span className="font-medium dark:text-white">Your Instructions:</span>
                </div>
                <p className="text-brown-500 dark:text-white/55 italic">{pickupInstructions}</p>
              </>
            )}
            
            <button 
              onClick={() => navigate(-1)} // Go back to previous page
              className="mt-4 px-4 py-2 bg-plum-100 text-plum-800 dark:bg-plum-900/40 dark:text-plum-200 rounded hover:bg-plum-200 dark:hover:bg-plum-800/50"
            >
              Change Pickup Location
            </button>
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
    <section className={sectionShell}>
      <div className={containerShell}>
        <div className='w-full'>
          {/* Address or Pickup Section */}
          {renderAddressOrPickupSection()}
        </div>

        <div className={`w-full self-start rounded border border-brown-100 bg-white px-2 py-4 shadow transition-colors duration-200 dark:border-dm-border dark:bg-dm-card lg:max-w-md xl:max-w-lg ${summarySticky}`}>
          {/**summary**/}
          <h3 className='text-lg font-semibold text-charcoal dark:text-white px-1 mb-3'>Order Summary</h3>
          
          {/* Royal Card Badge */}
          {royalDiscount > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-gold-500/20 to-gold-100 dark:from-gold-600/20 dark:to-gold-900/10 border border-gold-300 dark:border-gold-600/40 rounded-card text-charcoal dark:text-white flex items-center gap-3">
              <FaCrown className="text-gold-500 text-xl flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Royal {royalCardData?.tier} Card</p>
                <p className="text-xs text-brown-400 dark:text-white/50">+{royalDiscount}% discount applied on all products!</p>
              </div>
            </div>
          )}
          
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
              <p className='flex items-center gap-2'>Free</p>
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

          {/* Updated Price Display */}
          <div className="mt-4 p-4 bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border transition-colors duration-200">
            <div className="flex justify-between items-center text-sm text-charcoal dark:text-white/80">
              <span>Subtotal</span>
              <span className="font-price font-semibold">KES {priceAfterCommunityDiscount.toLocaleString()}</span>
            </div>

            {usePoints && (
              <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400 mt-1">
                <span>Points Discount</span>
                <span className="font-price font-semibold">- KES {pointsValue.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-brown-100 dark:border-dm-border">
              <span className="font-bold text-charcoal dark:text-white">Total</span>
              <span className="font-price font-bold text-lg text-gold-600 dark:text-gold-300">KES {finalPrice?.toLocaleString()}</span>
            </div>
          </div>

          <div className='w-full flex flex-col gap-3 mt-5'>
            <p className="text-xs font-semibold uppercase tracking-widest text-brown-300 dark:text-white/30 mb-1">Choose Payment Method</p>
            <button
              className={`flex items-center justify-between w-full py-3 px-4 rounded-card border-2 font-semibold text-sm transition-all duration-200 press ${
                (((fulfillmentMethod === 'delivery' && isPaymentEnabled) || (fulfillmentMethod === 'pickup')) && !isCheckoutBusy)
                  ? 'border-plum-700 text-plum-700 dark:border-plum-400 dark:text-plum-200 bg-plum-50 dark:bg-plum-900/20 hover:bg-plum-100 dark:hover:bg-plum-900/40'
                  : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 cursor-not-allowed'
              }`}
              onClick={handleOnlinePayment}
              disabled={(fulfillmentMethod === 'delivery' && !isPaymentEnabled) || isCheckoutBusy}
            >
              <span>{checkoutAction === 'card' ? 'Processing card payment...' : 'Pay with Card (Stripe)'}</span>
              {fulfillmentMethod === 'delivery' && !isPaymentEnabled && <span className="text-xs font-normal opacity-60">Select address first</span>}
            </button>

            <button
              className={`flex items-center justify-between w-full py-3 px-4 rounded-card border-2 font-semibold text-sm transition-all duration-200 press ${
                (((fulfillmentMethod === 'delivery' && isPaymentEnabled) || (fulfillmentMethod === 'pickup')) && !isCheckoutBusy)
                  ? 'border-plum-600 text-plum-800 dark:border-plum-400 dark:text-plum-200 bg-plum-50 dark:bg-plum-900/25 hover:bg-plum-100 dark:hover:bg-plum-900/40'
                  : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 cursor-not-allowed'
              }`}
              onClick={handleShowMpesaForm}
              disabled={(fulfillmentMethod === 'delivery' && !isPaymentEnabled) || isCheckoutBusy}
            >
              <span>Pay with M-Pesa</span>
              {fulfillmentMethod === 'delivery' && !isPaymentEnabled && <span className="text-xs font-normal opacity-60">Select address first</span>}
            </button>

            <button
              className={`flex items-center justify-between w-full py-3 px-4 rounded-card border-2 font-semibold text-sm transition-all duration-200 press ${
                (((fulfillmentMethod === 'delivery' && isPaymentEnabled) || (fulfillmentMethod === 'pickup')) && !isCheckoutBusy)
                  ? 'border-brown-400 text-brown-500 dark:border-brown-500 dark:text-brown-300 bg-brown-50 dark:bg-brown-900/10 hover:bg-brown-100 dark:hover:bg-brown-900/20'
                  : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 cursor-not-allowed'
              }`}
              onClick={handleCashOnDelivery}
              disabled={(fulfillmentMethod === 'delivery' && !isPaymentEnabled) || isCheckoutBusy}
            >
              <span>{checkoutAction === 'cash' ? 'Placing order...' : `Cash on ${fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'}`}</span>
              {fulfillmentMethod === 'delivery' && !isPaymentEnabled && <span className="text-xs font-normal opacity-60">Select address first</span>}
            </button>

            <button
              className={`flex items-center justify-between w-full py-3 px-4 rounded-card border-2 font-semibold text-sm transition-all duration-200 press ${
                isPaymentEnabled && !isCheckoutBusy
                  ? 'border-plum-500 text-plum-700 dark:border-plum-400 dark:text-plum-200 bg-plum-50 dark:bg-plum-900/20 hover:bg-plum-100 dark:hover:bg-plum-900/40'
                  : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 cursor-not-allowed'
              }`}
              onClick={handlePesapalPayment}
              disabled={!isPaymentEnabled || isCheckoutBusy}
            >
              <span>{checkoutAction === 'pesapal' ? 'Processing...' : 'Pay with PesaPal'}</span>
              {!isPaymentEnabled && <span className="text-xs font-normal opacity-60">Select address first</span>}
            </button>

            <button
              className={`w-full py-3.5 rounded-pill font-bold text-sm mt-1 transition-all duration-200 press shadow-sm ${
                (((fulfillmentMethod === 'delivery' && isPaymentEnabled) || (fulfillmentMethod === 'pickup')) && !isCheckoutBusy)
                  ? 'bg-gold-500 hover:bg-gold-400 text-charcoal hover:shadow-gold'
                  : 'bg-brown-100 dark:bg-dm-card-2 text-brown-300 dark:text-white/20 cursor-not-allowed'
              }`}
              onClick={handleOnlinePayment}
              disabled={(fulfillmentMethod === 'delivery' && !isPaymentEnabled) || isCheckoutBusy}
            >
              {checkoutAction === 'card' ? 'Processing card payment...' : `Confirm & Pay - KES ${finalPrice?.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>

      {/* M-Pesa Payment Modal */}
      {showMpesaForm && (
        <div className="fixed inset-0 bg-plum-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dm-card p-6 rounded-card shadow-hover max-w-md w-full transition-colors duration-200 animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">M-Pesa Payment</h3>
              <button 
                onClick={() => setShowMpesaForm(false)}
                className="text-brown-400 hover:text-charcoal dark:text-white/50 dark:hover:text-white"
              ><FaXmark /></button>
            </div>
            <MpesaPayment
              cartItems={cartItemsList}
              totalAmount={totalPrice}
              addressId={fulfillmentMethod === 'delivery' ? addressList[selectAddress]?._id : null}
              onSuccess={handleMpesaSuccess}
              onError={handleMpesaError}
              communityRewardId={selectedReward?._id}
              communityDiscountAmount={selectedReward?.type === 'discount' ? communityDiscount : 0}
              fulfillment_type={fulfillmentMethod}
              pickup_location={pickupLocation}
              pickup_instructions={pickupInstructions}
            />
          </div>
        </div>
      )}

      {/* Fulfillment Method Modal */}
      <FulfillmentModal 
        isOpen={showFulfillmentModal}
        onClose={() => setShowFulfillmentModal(false)}
        onSelect={handleFulfillmentSelect}
        pickupLocations={pickupLocations}
      />

      {/* Address Modal */}
      {
        openAddress && (
          <AddAddress close={() => setOpenAddress(false)} />
        )
      }
    </section>
  )
}

// Create a CheckoutCutView component that wraps CheckoutPage in cut view mode
export const CheckoutCutView = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return <CheckoutPage isCutView={true} onClose={onClose} />;
};

export default CheckoutPage;

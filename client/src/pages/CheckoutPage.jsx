import { loadStripe } from '@stripe/stripe-js';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCrown } from 'react-icons/fa';
import { FaXmark } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import ActiveRewards from '../components/ActiveRewards'; // Import the ActiveRewards component
import AddAddress from '../components/AddAddress';
import CommunityCampaignProgress from '../components/CommunityCampaignProgress'; // Import the CommunityCampaignProgress component
import MpesaPayment from '../components/MpesaPayment'; // Import the MpesaPayment component
import { useTheme } from '../context/ThemeContext';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCartItems } from '../redux/slice/cartSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

const CheckoutPage = ({ isCutView = false, onClose = null }) => {
  const { notDiscountTotalPrice, totalPrice, totalQty, fetchCartItem, fetchOrder, royalCardData, royalDiscount } = useGlobalContext();
  const { darkMode } = useTheme();
  const [openAddress, setOpenAddress] = useState(false);
  const [showMpesaForm, setShowMpesaForm] = useState(false); // State to control M-Pesa form visibility
  const addressList = useSelector(state => state.addresses.addressList);
  const [selectAddress, setSelectAddress] = useState(null); // Changed from 0 to null to ensure validation
  const [addressError, setAddressError] = useState(false); // State to track address selection error
  const cartItemsList = useSelector(state => state.cartItem.cart);
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

  // Validate address is selected before payment
  const validateAddress = () => {
    if (!isPaymentEnabled) {
      setAddressError(true);
      toast.error('Please select a delivery address before proceeding');
      return false;
    }
    return true;
  };

  const handleCashOnDelivery = async() => {
    if (!validateAddress()) return;
    
    try {
      const response = await Axios({
        ...SummaryApi.CashOnDeliveryOrder,
        data : {
          list_items : cartItemsList,
          addressId : addressList[selectAddress]._id,
          subTotalAmt : totalPrice,
          totalAmt : finalPrice,
          usePoints: usePoints,
          pointsUsed: usePoints ? pointsValue : 0,
          communityRewardId: selectedReward ? selectedReward._id : null,
          communityDiscountAmount: selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0
        }
      });

      const { data: responseData } = response;

      if(responseData.success){
          // Clear cart state immediately after successful order
          dispatch(clearCartItems());
          
          toast.success(responseData.message);
          if(fetchCartItem){
            fetchCartItem();
          }
          if(fetchOrder){
            fetchOrder();
          }
          
          // Handle navigation based on view mode
          if (isCutView && onClose) {
            onClose();
          }
          navigate('/success', {
            state: {
              text: "Order",
              receipt: responseData.data.map(order => order.invoice_receipt) // Pass the receipt details
            }
          });
      }

    } catch (error) {
      AxiosToastError(error);
    }
  }

  const handleOnlinePayment = async() => {
    if (!validateAddress()) return;
    
    try {
        toast.loading("Loading...");
        const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        const stripePromise = await loadStripe(stripePublicKey);
       
        // First, attempt to clear the cart before redirecting to Stripe
        try {
          console.log("Clearing cart before Stripe payment");
          
          // Clear the Redux state immediately
          dispatch(clearCartItems());
          
          // Also clear on the server
          const clearResponse = await Axios({
            ...SummaryApi.clearCart
          });
          console.log("Pre-emptive cart clear response:", clearResponse.data);
        } catch (clearError) {
          console.error("Failed to clear cart before payment:", clearError);
          // Continue anyway - don't block the payment flow
        }
        
        const response = await Axios({
            ...SummaryApi.payment_url,
            data: {
              list_items: cartItemsList,
              addressId: addressList[selectAddress]._id,
              subTotalAmt: totalPrice,
              totalAmt: finalPrice,
              royalDiscount: royalDiscount,
              communityRewardId: selectedReward ? selectedReward._id : null,
              communityDiscountAmount: selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0
            }
        });

        const { data: responseData } = response;
        
        // Store cart clear time in localStorage
        localStorage.setItem('cartClearedAt', new Date().toISOString());
        
        // Refresh cart data
        if(fetchCartItem){
          fetchCartItem();
        }
        
        // Close cut view if applicable
        if (isCutView && onClose) {
          onClose();
        }
        
        // Redirect to Stripe Checkout
        stripePromise.redirectToCheckout({ sessionId: responseData.id });
    } catch (error) {
        toast.dismiss(); // Dismiss the loading toast
        AxiosToastError(error);
    }
  }

  const handleShowMpesaForm = () => {
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

  // Check if there are active addresses available
  const hasActiveAddresses = addressList.some(address => address.status);

  // Render cut view or full page based on prop
  if (isCutView) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
        <div className="bg-blue-50 dark:bg-gray-800 w-full max-w-md h-full overflow-y-auto transition-colors duration-200">
          {/* Cut View Header */}
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-700 p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-600 shadow-sm transition-colors duration-200">
            <h2 className="font-semibold text-lg dark:text-white">Checkout</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <FaXmark className="text-gray-600 dark:text-gray-300" />
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
                <div className="bg-blue-100 border border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200 px-4 py-2 rounded mb-4">
                  Select an address to enable payment options.
                </div>
              )}
              <div className='bg-white dark:bg-gray-700 p-2 grid gap-4 rounded shadow transition-colors duration-200'>
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
                        <div className={`border rounded p-3 flex gap-3 transition-colors duration-200 
                          ${selectAddress === index 
                            ? 'bg-blue-50 border-blue-500 border-2 dark:bg-blue-900/30 dark:border-blue-400' 
                            : 'dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                          <div>
                            <input 
                              id={`address-cut-${index}`} 
                              type='radio' 
                              value={index} 
                              checked={selectAddress === index}
                              onChange={(e) => setSelectAddress(parseInt(e.target.value))} 
                              name='address-cut' 
                              className="accent-blue-500 dark:accent-blue-400"
                            />
                          </div>
                          <div className="dark:text-gray-200">
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
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No delivery addresses found. Please add an address to continue.
                  </div>
                )}
                <div 
                  onClick={() => setOpenAddress(true)} 
                  className='h-16 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed dark:border-blue-700 flex justify-center items-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 dark:text-gray-200'
                >
                  Add address
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className='bg-white dark:bg-gray-700 p-4 rounded shadow mb-4 transition-colors duration-200'>
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
                <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
                  <p>Original price total</p>
                  <p className='flex items-center gap-2'>
                    <span className='line-through text-neutral-400 dark:text-gray-400'>{DisplayPriceInShillings(notDiscountTotalPrice)}</span>
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
                  <div className='flex gap-4 justify-between ml-1 text-blue-600 dark:text-blue-400'>
                    <p className='flex items-center'>
                      Community free shipping
                    </p>
                    <p>Applied</p>
                  </div>
                )}
                
                <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
                  <p>Subtotal</p>
                  <p className='font-medium'>{DisplayPriceInShillings(priceAfterCommunityDiscount)}</p>
                </div>
                
                <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
                  <p>Quantity total</p>
                  <p className='flex items-center gap-2'>{totalQty} item{totalQty !== 1 ? 's' : ''}</p>
                </div>
                
                <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
                  <p>Delivery Charge</p>
                  <p className='flex items-center gap-2'>Free</p>
                </div>
              </div>
            </div>

            {/* Loyalty Points Section */}
            {availablePoints > 0 && (
              <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium dark:text-white">Royal Loyalty Points</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">You have {availablePoints} points (worth up to KES {availablePoints})</p>
                  </div>
                  <div className="flex items-center dark:text-gray-200">
                    <input
                      type="checkbox"
                      id="usePoints-cut"
                      checked={usePoints}
                      onChange={() => setUsePoints(!usePoints)}
                      className="mr-2 accent-blue-500 dark:accent-blue-400"
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
            <div className="mb-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow transition-colors duration-200">
              <div className="flex justify-between items-center dark:text-gray-200">
                <span className="font-medium">Subtotal:</span>
                <span>KES {priceAfterCommunityDiscount.toLocaleString()}</span>
              </div>
              
              {usePoints && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <span>Points Discount:</span>
                  <span>- KES {pointsValue.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-gray-600 font-bold dark:text-white">
                <span>Total:</span>
                <span>KES {finalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className='space-y-4'>
              <button 
                className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors duration-200 ${
                  isPaymentEnabled 
                    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600' 
                    : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                }`} 
                onClick={handleOnlinePayment}
                disabled={!isPaymentEnabled}
              >
                Pay with Card {!isPaymentEnabled && '(Select Address First)'}
              </button>
              <button 
                className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors duration-200 ${
                  isPaymentEnabled 
                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600' 
                    : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                }`}
                onClick={handleShowMpesaForm}
                disabled={!isPaymentEnabled}
              >
                Pay with M-Pesa {!isPaymentEnabled && '(Select Address First)'}
              </button>
              <button 
                className={`w-full py-2 px-4 border-2 font-semibold transition-colors duration-200 ${
                  isPaymentEnabled 
                    ? 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white dark:border-green-500 dark:text-green-400 dark:hover:bg-green-700' 
                    : 'border-gray-400 text-gray-400 dark:border-gray-600 dark:text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleCashOnDelivery}
                disabled={!isPaymentEnabled}
              >
                Cash on Delivery {!isPaymentEnabled && '(Select Address First)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full page render (original implementation)
  return (
    <section className='bg-blue-50 dark:bg-gray-800 transition-colors duration-200'>
      <div className='container mx-auto p-4 flex flex-col lg:flex-row w-full gap-5 justify-between'>
        <div className='w-full'>
          {/***address***/}
          <h3 className='text-lg font-semibold dark:text-white'>Choose your address</h3>
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
            <div className="bg-blue-100 border border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200 px-4 py-2 rounded mb-4">
              Select an address to enable payment options.
            </div>
          )}
          <div className='bg-white dark:bg-gray-700 p-2 grid gap-4 rounded shadow transition-colors duration-200'>
            {hasActiveAddresses ? (
              addressList.map((address, index) => {
                // Only render addresses with status = true
                if (!address.status) return null;
                
                return (
                  <label 
                    key={`address-${address._id || index}`}
                    htmlFor={`address${index}`}
                    className="cursor-pointer"
                  >
                    <div className={`border rounded p-3 flex gap-3 transition-colors duration-200 
                      ${selectAddress === index 
                        ? 'bg-blue-50 border-blue-500 border-2 dark:bg-blue-900/30 dark:border-blue-400' 
                        : 'dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                      <div>
                        <input 
                          id={`address${index}`} 
                          type='radio' 
                          value={index} 
                          checked={selectAddress === index}
                          onChange={(e) => setSelectAddress(parseInt(e.target.value))} 
                          name='address' 
                          className="accent-blue-500 dark:accent-blue-400"
                        />
                      </div>
                      <div className="dark:text-gray-200">
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
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No delivery addresses found. Please add an address to continue.
              </div>
            )}
            <div 
              onClick={() => setOpenAddress(true)} 
              className='h-16 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed dark:border-blue-700 flex justify-center items-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 dark:text-gray-200'
            >
              Add address
            </div>
          </div>
        </div>

        <div className='w-full max-w-md bg-white dark:bg-gray-700 py-4 px-2 rounded shadow transition-colors duration-200'>
          {/**summary**/}
          <h3 className='text-lg font-semibold dark:text-white px-4'>Summary</h3>
          
          {/* Royal Card Badge */}
          {royalDiscount > 0 && (
            <div className="mb-4 mx-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-800 dark:text-amber-200 flex items-center">
              <FaCrown className="mr-2 text-xl" />
              <div>
                <p className="font-medium">Royal {royalCardData?.tier} Card</p>
                <p className="text-sm">You're getting an additional {royalDiscount}% discount on all products!</p>
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
          
          <div className='bg-white dark:bg-gray-700 p-4 transition-colors duration-200'>
            <h3 className='font-semibold dark:text-white'>Bill details</h3>
            <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
              <p>Original price total</p>
              <p className='flex items-center gap-2'>
                <span className='line-through text-neutral-400 dark:text-gray-400'>{DisplayPriceInShillings(notDiscountTotalPrice)}</span>
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
              <div className='flex gap-4 justify-between ml-1 text-blue-600 dark:text-blue-400'>
                <p className='flex items-center'>
                  Community free shipping
                </p>
                <p>Applied</p>
              </div>
            )}
            
            <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
              <p>Subtotal</p>
              <p className='font-medium'>{DisplayPriceInShillings(priceAfterCommunityDiscount)}</p>
            </div>
            
            <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
              <p>Quantity total</p>
              <p className='flex items-center gap-2'>{totalQty} item{totalQty !== 1 ? 's' : ''}</p>
            </div>
            
            <div className='flex gap-4 justify-between ml-1 dark:text-gray-200'>
              <p>Delivery Charge</p>
              <p className='flex items-center gap-2'>Free</p>
            </div>
          </div>

          {/* Loyalty Points Section */}
          {availablePoints > 0 && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium dark:text-white">Royal Loyalty Points</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">You have {availablePoints} points (worth up to KES {availablePoints})</p>
                </div>
                <div className="flex items-center dark:text-gray-200">
                  <input
                    type="checkbox"
                    id="usePoints"
                    checked={usePoints}
                    onChange={() => setUsePoints(!usePoints)}
                    className="mr-2 accent-blue-500 dark:accent-blue-400"
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
          <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow transition-colors duration-200">
            <div className="flex justify-between items-center dark:text-gray-200">
              <span className="font-medium">Subtotal:</span>
              <span>KES {priceAfterCommunityDiscount.toLocaleString()}</span>
            </div>
            
            {usePoints && (
              <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                <span>Points Discount:</span>
                <span>- KES {pointsValue.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-gray-600 font-bold dark:text-white">
              <span>Total:</span>
              <span>KES {finalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className='w-full flex flex-col gap-4 mt-4 px-4'>
            <button 
              className={`py-2 px-4 rounded text-white font-semibold transition-colors duration-200 ${
                isPaymentEnabled 
                  ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600' 
                  : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              }`} 
              onClick={handleOnlinePayment}
              disabled={!isPaymentEnabled}
            >
              Pay with Card {!isPaymentEnabled && '(Select Address First)'}
            </button>
            <button 
              className={`py-2 px-4 rounded text-white font-semibold transition-colors duration-200 ${
                isPaymentEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600' 
                  : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              }`}
              onClick={handleShowMpesaForm}
              disabled={!isPaymentEnabled}
            >
              Pay with M-Pesa {!isPaymentEnabled && '(Select Address First)'}
            </button>
            <button 
              className={`py-2 px-4 border-2 font-semibold transition-colors duration-200 ${
                isPaymentEnabled 
                  ? 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white dark:border-green-500 dark:text-green-400 dark:hover:bg-green-700' 
                  : 'border-gray-400 text-gray-400 dark:border-gray-600 dark:text-gray-500 cursor-not-allowed'
              }`}
              onClick={handleCashOnDelivery}
              disabled={!isPaymentEnabled}
            >
              Cash on Delivery {!isPaymentEnabled && '(Select Address First)'}
            </button>
          </div>
        </div>
      </div>

      {/* M-Pesa Payment Modal */}
      {showMpesaForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full transition-colors duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">M-Pesa Payment</h3>
              <button 
                onClick={() => setShowMpesaForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                ✕
              </button>
            </div>
            <MpesaPayment
              cartItems={cartItemsList}
              totalAmount={totalPrice}
              addressId={addressList[selectAddress]?._id}
              onSuccess={handleMpesaSuccess}
              onError={handleMpesaError}
              communityRewardId={selectedReward?._id}
              communityDiscountAmount={selectedReward?.type === 'discount' ? communityDiscount : 0}
            />
          </div>
        </div>
      )}

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

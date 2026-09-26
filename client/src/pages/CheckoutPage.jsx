import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCrown, FaMapMarkerAlt, FaStore, FaTrash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { nawiriBrand } from '../config/brand';
import ActiveRewards from '../components/ActiveRewards'; // Import the ActiveRewards component
import AddAddress from '../components/AddAddress';
import CheckoutRoyalCard from '../components/CheckoutRoyalCard'; // Premium Royal Card for Order Summary
import CommunityCampaignProgress from '../components/CommunityCampaignProgress'; // Import the CommunityCampaignProgress component
import DeliveryLocationModal from '../components/DeliveryLocationModal';
import JengaCardPayment from '../components/JengaCardPayment';
import useCriteriaGate from '../hooks/useCriteriaGate';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCartItems } from '../store/cartProduct';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { getStoredAccessToken } from '../utils/authStorage';
import { DEFAULT_DELIVERY_CHARGE, formatDistanceKm, getFootDeliveryEligibility, isWithinCbdRadius, NAIROBI_CBD_RADIUS_KM, SACCO_TERMINAL_DROPOFF_CHARGE } from '../utils/cbdDelivery';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { getPayOnDeliveryEligibility } from '../utils/nairobiCounty';

// Pickup locations (in a real app, these would likely come from an API)
const pickupLocations = [
  { name: 'Main Store', address: nawiriBrand.location }
];

// Every address is saved with the map pin the customer dropped in the Add
// Address form — that pin is the delivery location. Older addresses may have
// been saved without one (lat/lng null).
const getAddressPin = (address) => {
  const { lat, lng } = address?.coordinates || {};
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  const pin = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(pin.lat) && Number.isFinite(pin.lng) ? pin : null;
};

const CheckoutPage = ({ embedded = false }) => {
  const { notDiscountTotalPrice, totalPrice, totalQty, fetchCartItem, fetchOrder, fetchAddress, royalDiscount } = useGlobalContext();
  const location = useLocation();
  const [openAddress, setOpenAddress] = useState(false);

  // Fulfillment method, pickup and SACCO details can be pre-set by whoever
  // navigates here (location.state); otherwise the customer picks them below.
  const [fulfillmentMethod, setFulfillmentMethod] = useState(
    location.state?.fulfillmentMethod || location.state?.fulfillment_type || 'delivery'
  );
  const [pickupLocation, setPickupLocation] = useState(
    location.state?.pickupLocation || location.state?.pickup_location || ''
  );
  const [pickupInstructions, setPickupInstructions] = useState(
    location.state?.pickupInstructions || location.state?.pickup_instructions || ''
  );
  const [saccoOperatorId, setSaccoOperatorId] = useState(
    location.state?.saccoOperatorId || location.state?.sacco_operator_id || ''
  );
  const [saccoDestinationTown, setSaccoDestinationTown] = useState(
    location.state?.saccoDestinationTown || location.state?.sacco_destination_town || ''
  );
  const [deliveryMode, setDeliveryMode] = useState(location.state?.delivery_mode || 'standard');
  const [deliveryInstructions, setDeliveryInstructions] = useState(location.state?.deliveryInstructions || '');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [deliveryZonesLoading, setDeliveryZonesLoading] = useState(false);
  const [deliveryZoneId, setDeliveryZoneId] = useState(location.state?.deliveryZoneId || '');

  const addressList = useSelector(state => state.addresses.addressList);
  // Selected by _id, not list position — the list is re-fetched (and
  // re-ordered) whenever an address is added or deleted.
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  // Set only when the customer moves the pin for this order; otherwise the
  // selected address's own saved pin is used.
  const [pinOverride, setPinOverride] = useState(null);
  const cartItemsList = useSelector(state => state.cartItem.cart);
  const cartLoading = useSelector(state => state.cartItem.loading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);
  const { ensureCriteria, gateModal } = useCriteriaGate();

  const [usePoints, setUsePoints] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);

  // Community reward state
  const [selectedReward, setSelectedReward] = useState(null);
  const [communityDiscount, setCommunityDiscount] = useState(0);

  const selectedAddress = useMemo(
    () => addressList.find((address) => address?._id === selectedAddressId && address.status) || null,
    [addressList, selectedAddressId]
  );
  const addressPin = useMemo(() => getAddressPin(selectedAddress), [selectedAddress]);
  const customerLocation = pinOverride || addressPin;

  const footDeliveryEligibility = useMemo(
    () => getFootDeliveryEligibility(customerLocation),
    [customerLocation]
  );

  // Foot delivery only accepts addresses pinned inside Nairobi CBD. Bike
  // (zone-fare) and standard delivery can use any active address — the bike
  // rider covers named zones rather than a GPS radius.
  const eligibleAddresses = useMemo(
    () => addressList.filter((address) => (
      address?.status && (deliveryMode !== 'foot' || isWithinCbdRadius(getAddressPin(address)))
    )),
    [addressList, deliveryMode]
  );

  // Rider directions start from the ones saved with the address. They're
  // only replaced on an address change if the customer hasn't edited them.
  const prefilledInstructionsRef = useRef(deliveryInstructions);
  const chooseAddress = useCallback((addressId) => {
    setSelectedAddressId(addressId);
    setPinOverride(null);
    const next = addressList.find((address) => address?._id === addressId)?.deliveryInstructions || '';
    // Captured before the ref moves on — the updater below runs later.
    const previousPrefill = prefilledInstructionsRef.current;
    prefilledInstructionsRef.current = next;
    setDeliveryInstructions((current) => (
      current.trim() === previousPrefill.trim() ? next : current
    ));
  }, [addressList]);

  // If the selected address stops being valid (switched to foot delivery
  // outside the CBD, or deleted), clear it.
  useEffect(() => {
    if (selectedAddressId && !eligibleAddresses.some((address) => address._id === selectedAddressId)) {
      setSelectedAddressId(null);
      setPinOverride(null);
    }
  }, [eligibleAddresses, selectedAddressId]);

  // Choose the address for the customer when there's nothing to decide: the
  // one they just added from this page, or their only eligible address.
  const addressIdsBeforeAddRef = useRef(null);
  useEffect(() => {
    if (fulfillmentMethod !== 'delivery') return;

    if (addressIdsBeforeAddRef.current) {
      const added = eligibleAddresses.find((address) => !addressIdsBeforeAddRef.current.has(address._id));
      if (added) {
        addressIdsBeforeAddRef.current = null;
        chooseAddress(added._id);
        return;
      }
    }

    if (!selectedAddressId && eligibleAddresses.length === 1) {
      chooseAddress(eligibleAddresses[0]._id);
    }
  }, [chooseAddress, eligibleAddresses, fulfillmentMethod, selectedAddressId]);

  const openAddAddress = () => {
    addressIdsBeforeAddRef.current = new Set(addressList.map((address) => address?._id));
    setOpenAddress(true);
  };

  // Check if payments should be enabled
  // For delivery: need a selected address with a location (or a zone for bike)
  // For pickup: need a pickup location
  const isPaymentEnabled = Boolean(
    (fulfillmentMethod === 'delivery'
      && selectedAddress
      && (deliveryMode === 'bike' ? deliveryZoneId : customerLocation)
      && (deliveryMode !== 'foot' || footDeliveryEligibility.eligible)) ||
    (fulfillmentMethod === 'pickup' && pickupLocation) ||
    (fulfillmentMethod === 'sacco_pickup' && saccoOperatorId && saccoDestinationTown)
  );

  // The specific reason payment is blocked — shown next to the disabled Cash
  // and M-Pesa options.
  const paymentBlockedReason = (() => {
    if (isPaymentEnabled) return '';
    if (fulfillmentMethod === 'pickup') return 'Select pickup location';
    if (fulfillmentMethod === 'sacco_pickup') return 'Select operator and destination';
    if (!selectedAddress) return 'Select delivery address';
    if (deliveryMode === 'bike') return 'Select delivery zone';
    if (!customerLocation) return 'Set delivery location';
    if (deliveryMode === 'foot') return 'Outside CBD foot-delivery area';
    return 'Complete delivery details';
  })();

  // One hint above the address list saying what's still missing.
  const deliveryHint = (() => {
    if (fulfillmentMethod !== 'delivery' || isPaymentEnabled || eligibleAddresses.length === 0) return '';
    if (!selectedAddress) return 'Choose the address we should deliver to.';
    if (deliveryMode === 'bike') return 'Pick your delivery zone above to see the fare and continue.';
    if (!customerLocation) return 'This address was saved without a map pin. Set the delivery location below so the rider can find you.';
    if (deliveryMode === 'foot') {
      return `This location is outside the Nairobi CBD foot-delivery area (${NAIROBI_CBD_RADIUS_KM}km). Choose another address or switch to Standard or Bike delivery.`;
    }
    return '';
  })();

  // Fetch delivery zones once bike mode is selected (cached across re-selection).
  useEffect(() => {
    if (deliveryMode !== 'bike' || deliveryZones.length > 0) {
      return;
    }

    const fetchZones = async () => {
      try {
        setDeliveryZonesLoading(true);
        const response = await Axios({ ...SummaryApi.getDeliveryZones });
        if (response.data.success) {
          setDeliveryZones(response.data.data || []);
        }
      } catch (error) {
        AxiosToastError(error);
      } finally {
        setDeliveryZonesLoading(false);
      }
    };

    fetchZones();
  }, [deliveryMode, deliveryZones.length]);

  const selectedDeliveryZone = useMemo(
    () => deliveryZones.find((zone) => zone._id === deliveryZoneId) || null,
    [deliveryZones, deliveryZoneId]
  );

  // Group zones by corridor, matching the fare chart's section layout.
  const zonesByCorridor = useMemo(() => {
    const groups = new Map();
    deliveryZones.forEach((zone) => {
      if (!groups.has(zone.corridor)) {
        groups.set(zone.corridor, []);
      }
      groups.get(zone.corridor).push(zone);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [deliveryZones]);

  // Fetch SACCO/coach operators once that fulfillment method is selected (cached across re-selection).
  const [saccoOperators, setSaccoOperators] = useState([]);
  const [saccoOperatorsLoading, setSaccoOperatorsLoading] = useState(false);

  useEffect(() => {
    if (fulfillmentMethod !== 'sacco_pickup' || saccoOperators.length > 0) {
      return;
    }

    const fetchSaccoOperators = async () => {
      try {
        setSaccoOperatorsLoading(true);
        const response = await Axios({ ...SummaryApi.getSaccoOperators });
        if (response.data.success) {
          setSaccoOperators(response.data.data || []);
        }
      } catch (error) {
        AxiosToastError(error);
      } finally {
        setSaccoOperatorsLoading(false);
      }
    };

    fetchSaccoOperators();
  }, [fulfillmentMethod, saccoOperators.length]);

  const selectedSaccoOperator = useMemo(
    () => saccoOperators.find((op) => op._id === saccoOperatorId) || null,
    [saccoOperators, saccoOperatorId]
  );

  const checkoutLockRef = useRef(false);
  const [checkoutAction, setCheckoutAction] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('jenga-checkout'); // 'cash' | 'jenga-checkout' (hosted M-Pesa)

  // SACCO/coach terminal drop-off (outside Nairobi) has no Cash option —
  // its trust/risk profile is different from a rider we control delivering
  // within Nairobi, so it must be paid upfront. If the customer had Cash
  // selected and switches fulfillment to sacco_pickup, bump them to M-Pesa
  // rather than leaving the payment area showing nothing.
  useEffect(() => {
    if (fulfillmentMethod === 'sacco_pickup' && selectedPaymentMethod === 'cash') {
      setSelectedPaymentMethod('jenga-checkout');
    }
  }, [fulfillmentMethod, selectedPaymentMethod]);

  // Pay on Delivery is only offered inside Nairobi County, where our own
  // rider collects the M-Pesa payment at the door. Judged once the delivery
  // details are complete (until then the usual "select address" hints apply);
  // the server checks the same rule.
  const payOnDeliveryEligibility = getPayOnDeliveryEligibility({
    fulfillmentType: fulfillmentMethod,
    customerLocation,
    deliveryZone: fulfillmentMethod === 'delivery' && deliveryMode === 'bike' ? selectedDeliveryZone : null,
  });
  const payOnDeliveryBlocked = fulfillmentMethod === 'delivery' && isPaymentEnabled && !payOnDeliveryEligibility.allowed;
  const payLaterLabel = fulfillmentMethod === 'pickup' ? 'Pay at Pickup' : 'Pay on Delivery';

  useEffect(() => {
    if (payOnDeliveryBlocked && selectedPaymentMethod === 'cash') {
      setSelectedPaymentMethod('jenga-checkout');
    }
  }, [payOnDeliveryBlocked, selectedPaymentMethod]);

  // Display only — the server always recomputes this from the authoritative
  // zone fare or the flat default, never trusting a client-supplied amount.
  const deliveryCharge = fulfillmentMethod === 'delivery'
    ? (deliveryMode === 'bike' && selectedDeliveryZone ? selectedDeliveryZone.fare : DEFAULT_DELIVERY_CHARGE)
    : fulfillmentMethod === 'sacco_pickup'
      ? SACCO_TERMINAL_DROPOFF_CHARGE
      : 0;

  // Fetch loyalty points once per signed-in user. The KES value is derived
  // from the current totals below, so changing delivery options doesn't
  // re-fetch the loyalty card.
  useEffect(() => {
    if (!user?._id || !getStoredAccessToken()) {
      return;
    }

    const fetchLoyaltyData = async () => {
      try {
        const response = await Axios({
          url: `/api/users/${user._id}/loyalty-card`,
          method: 'GET'
        });

        if (response.data.success && response.data.data) {
          setAvailablePoints(response.data.data.points || 0);
        }
      } catch (error) {
        console.error("Error fetching loyalty data:", error.response?.data || error.message);
        // Don't show an error to the user - loyalty points are optional
      }
    };

    fetchLoyaltyData();
  }, [user?._id]);

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

  // Calculate price after community discount (rounded like the server's
  // buildValidatedOrderPricing, so the total shown is the total charged)
  const priceAfterCommunityDiscount = selectedReward && selectedReward.type === 'discount'
    ? Number((totalPrice * (1 - communityDiscount / 100)).toFixed(2))
    : totalPrice;

  // Each point is worth KES 1. Like the server, points can cover the items
  // but not the delivery charge.
  const pointsValue = Math.min(availablePoints, priceAfterCommunityDiscount);

  // Calculate final price after applying points, community discount and delivery charge
  const finalPrice = usePoints
    ? Math.max(0, priceAfterCommunityDiscount + deliveryCharge - pointsValue)
    : priceAfterCommunityDiscount + deliveryCharge;
  const isCheckoutBusy = checkoutAction !== '';
  const hasCheckoutAmount = useMemo(() => {
    const numericTotal = Number(totalPrice || 0);

    return cartItemsList.length > 0 && totalQty > 0 && numericTotal > 0;
  }, [cartItemsList.length, totalPrice, totalQty]);
  const cartFingerprint = cartItemsList
    .map((item) => `${item?._id || item?.productId?._id}:${item?.quantity || 0}`)
    .join('|');
  const checkoutScope = `${user?._id || 'guest'}:${fulfillmentMethod}:${selectedAddressId ?? 'pickup'}:${pickupLocation}:${cartFingerprint}:${finalPrice}`;
  const checkoutRedirectedRef = useRef(false);

  // One id per checkout attempt, sent with a cash order so a retried request
  // (e.g. after a timeout) gets back the order already placed instead of a
  // duplicate. Any change to the cart or delivery details starts a new one.
  const checkoutAttemptRef = useRef({ scope: '', id: '' });
  const getCheckoutAttemptId = () => {
    if (checkoutAttemptRef.current.scope !== checkoutScope) {
      checkoutAttemptRef.current = {
        scope: checkoutScope,
        id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }
    return checkoutAttemptRef.current.id;
  };

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

  // Validate fulfillment details before placing a cash order
  const validateAddress = () => {
    if (fulfillmentMethod === 'delivery') {
      if (!isPaymentEnabled) {
        toast.error(deliveryHint || `${paymentBlockedReason} to continue.`);
        if (selectedAddress && deliveryMode !== 'bike' && !customerLocation) {
          setShowLocationModal(true);
        }
        return false;
      }
    } else if (fulfillmentMethod === 'pickup' && !pickupLocation) {
      toast.error('Please select a pickup location');
      return false;
    } else if (fulfillmentMethod === 'sacco_pickup' && (!saccoOperatorId || !saccoDestinationTown)) {
      toast.error('Please select a SACCO/bus operator and destination town');
      return false;
    }
    return true;
  };

  const handleCashOnDelivery = async() => {
    if (fulfillmentMethod === 'sacco_pickup') {
      toast.error('Orders outside Nairobi require payment upfront via M-Pesa or Card.');
      return;
    }
    if (!(await ensureCriteria('checkout'))) return;
    if (!validateAddress()) return;

    await runCheckoutAction('cash', async () => {
      try {
        const response = await Axios({
          ...SummaryApi.CashOnDeliveryOrder,
          data : {
            list_items : cartItemsList,
            addressId : fulfillmentMethod === 'delivery' ? selectedAddress._id : null,
            subTotalAmt : totalPrice,
            deliveryCharge: deliveryCharge,
            totalAmt : finalPrice,
            usePoints: usePoints,
            pointsUsed: usePoints ? pointsValue : 0,
            communityRewardId: selectedReward ? selectedReward._id : null,
            communityDiscountAmount: selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0,
            fulfillment_type: fulfillmentMethod,
            delivery_mode: fulfillmentMethod === 'delivery' ? deliveryMode : 'standard',
            deliveryZoneId: fulfillmentMethod === 'delivery' && deliveryMode === 'bike' ? deliveryZoneId : undefined,
            customerLocation,
            deliveryInstructions,
            pickup_location: pickupLocation,
            pickup_instructions: pickupInstructions,
            saccoOperatorId: fulfillmentMethod === 'sacco_pickup' ? saccoOperatorId : undefined,
            saccoDestinationTown: fulfillmentMethod === 'sacco_pickup' ? saccoDestinationTown : undefined,
            checkoutAttemptId: getCheckoutAttemptId()
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

  const handleJengaPaymentError = (message) => {
    toast.error(message || 'Payment failed. Please try again.');
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

  // Update UI based on fulfillment method
  const fulfillmentToggle = (
    <div className="mb-4 grid grid-cols-3 rounded-card overflow-hidden border border-brown-100 dark:border-dm-border text-xs sm:text-sm font-semibold">
      <button
        type="button"
        onClick={() => setFulfillmentMethod('delivery')}
        className={`py-2.5 transition-colors ${fulfillmentMethod === 'delivery' ? 'bg-plum-700 text-white' : 'bg-white dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/20'}`}
      >
        🚚 Delivery
      </button>
      <button
        type="button"
        onClick={() => {
          setFulfillmentMethod('pickup');
          // With a single store there's nothing to choose — select it.
          setPickupLocation(pickupLocations.length === 1 ? pickupLocations[0].name : '');
        }}
        className={`py-2.5 transition-colors ${fulfillmentMethod === 'pickup' ? 'bg-plum-700 text-white' : 'bg-white dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/20'}`}
      >
        🏪 Pickup
      </button>
      <button
        type="button"
        onClick={() => setFulfillmentMethod('sacco_pickup')}
        className={`py-2.5 transition-colors ${fulfillmentMethod === 'sacco_pickup' ? 'bg-plum-700 text-white' : 'bg-white dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-plum-50 dark:hover:bg-plum-900/20'}`}
      >
        🚌 SACCO/Bus
      </button>
    </div>
  );

  const deliveryModeOptions = [
    { value: 'standard', title: 'Standard Delivery', description: 'Our rider brings it to your address.' },
    { value: 'foot', title: 'Delivery by Foot', description: `Only within Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius).` },
    { value: 'bike', title: 'Bike Delivery', description: 'Flat fare by zone, wider Nairobi coverage.' },
  ];

  const locationSummary = (() => {
    if (!customerLocation) return 'No map pin saved for this address yet.';
    const source = pinOverride ? 'Using the pin you set' : 'Using the map pin saved with this address';
    const distance = `${formatDistanceKm(footDeliveryEligibility.distanceKm)} from CBD centre`;
    if (deliveryMode === 'foot') {
      return `${source} · ${distance} (${footDeliveryEligibility.eligible ? 'eligible for foot delivery' : 'outside the foot-delivery area'})`;
    }
    return `${source} · ${distance}`;
  })();

  const renderAddressOrPickupSection = () => {
    if (fulfillmentMethod === 'delivery') {
      return (
        <>
          {/* Fulfillment method toggle */}
          {fulfillmentToggle}

          {/* Delivery type first — foot delivery narrows which addresses qualify */}
          <div className='bg-white dark:bg-dm-card p-4 rounded-card border border-brown-100 dark:border-dm-border mb-4 transition-colors duration-200'>
            <p className='text-sm font-semibold text-charcoal dark:text-white mb-3'>Delivery Type</p>

            <div className='grid sm:grid-cols-3 gap-3'>
              {deliveryModeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-card border-2 p-3 transition-all ${
                    deliveryMode === option.value
                      ? 'border-plum-600 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                      : 'border-brown-100 dark:border-dm-border'
                  }`}
                >
                  <input
                    type='radio'
                    name='delivery_mode'
                    value={option.value}
                    checked={deliveryMode === option.value}
                    onChange={() => setDeliveryMode(option.value)}
                    className='hidden'
                  />
                  <p className='font-semibold text-charcoal dark:text-white'>{option.title}</p>
                  <p className='text-xs text-brown-500 dark:text-white/50 mt-1'>{option.description}</p>
                </label>
              ))}
            </div>

            {/* Bike delivery: zone picker instead of GPS/CBD-radius eligibility */}
            {deliveryMode === 'bike' && (
              <div className='mt-3 space-y-2'>
                <label className='block text-sm font-semibold text-charcoal dark:text-white'>Select your zone</label>
                <select
                  value={deliveryZoneId}
                  onChange={(e) => setDeliveryZoneId(e.target.value)}
                  disabled={deliveryZonesLoading}
                  className='w-full text-sm border border-brown-200 dark:border-dm-border rounded-card px-3 py-2 bg-ivory dark:bg-dm-surface text-charcoal dark:text-white/80 focus:outline-none focus:border-plum-500 dark:focus:border-plum-400'
                >
                  <option value=''>{deliveryZonesLoading ? 'Loading zones...' : 'Select your zone'}</option>
                  {zonesByCorridor.map(([corridor, zones]) => (
                    <optgroup key={corridor} label={corridor}>
                      {zones.map((zone) => (
                        <option key={zone._id} value={zone._id}>
                          {zone.name} — KES {zone.fare.toLocaleString()}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className='text-xs text-brown-500 dark:text-white/50'>
                  {selectedDeliveryZone
                    ? `Fare for ${selectedDeliveryZone.name}: KES ${selectedDeliveryZone.fare.toLocaleString()}`
                    : 'Pick the zone closest to your delivery address — the rider bills a flat fare per zone.'}
                </p>
              </div>
            )}
          </div>

          <h3 className='text-lg font-semibold text-charcoal dark:text-white mb-3'>Delivery Address</h3>
          {deliveryHint && (
            <div className="bg-plum-50 dark:bg-plum-900/20 border border-plum-200 dark:border-plum-700/40 text-plum-700 dark:text-plum-300 px-4 py-2 rounded-card mb-4 text-sm">
              {deliveryHint}
            </div>
          )}
          <div className='grid gap-3 mb-4'>
            {eligibleAddresses.length > 0 ? (
              eligibleAddresses.map((address) => {
                const isSelected = address._id === selectedAddressId;
                const hasPin = Boolean(getAddressPin(address));
                return (
                  <label
                    key={address._id}
                    htmlFor={`address-${address._id}`}
                    className="cursor-pointer"
                  >
                    <div className={`border-2 rounded-card p-4 flex gap-3 transition-all duration-200 ${
                      isSelected
                        ? 'border-plum-700 bg-plum-50 dark:border-plum-400 dark:bg-plum-900/20'
                        : 'border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card hover:border-plum-200 dark:hover:border-plum-700/40'
                    }`}>
                      <input
                        id={`address-${address._id}`}
                        type='radio'
                        value={address._id}
                        checked={isSelected}
                        onChange={() => chooseAddress(address._id)}
                        name='address'
                        className="accent-plum-700 mt-1 flex-shrink-0"
                      />
                      <div className="text-sm text-charcoal dark:text-white/80 leading-relaxed min-w-0">
                        <p className="font-medium">{address.address_line}</p>
                        <p className="text-brown-400 dark:text-white/50">{address.city}, {address.state}</p>
                        <p className="text-brown-400 dark:text-white/50">{address.country} - {address.pincode}</p>
                        <p className="text-brown-400 dark:text-white/50 text-xs mt-0.5">{address.mobile}</p>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${hasPin ? 'text-plum-600 dark:text-plum-300' : 'text-brown-400 dark:text-white/40'}`}>
                          <FaMapMarkerAlt size={10} />
                          {hasPin ? 'Map pin saved' : 'No map pin'}
                        </p>
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
                {deliveryMode === 'foot' && addressList.some((address) => address?.status)
                  ? `None of your addresses is inside Nairobi CBD (${NAIROBI_CBD_RADIUS_KM}km radius). Add a CBD address or switch to Standard or Bike delivery.`
                  : 'No delivery addresses yet. Add one to continue.'}
              </div>
            )}
            <div
              onClick={openAddAddress}
              className='h-14 bg-blush-50 dark:bg-dm-card border-2 border-dashed border-blush-200 dark:border-dm-border rounded-card flex justify-center items-center cursor-pointer hover:bg-blush-100 dark:hover:bg-dm-card-2 hover:border-plum-300 dark:hover:border-plum-600 transition-all duration-200 text-sm font-medium text-plum-700 dark:text-plum-200 gap-2'
            >
              + Add new address
            </div>
          </div>

          {selectedAddress && (
            <div className='bg-white dark:bg-dm-card p-4 rounded-card border border-brown-100 dark:border-dm-border mb-4 transition-colors duration-200 space-y-3'>
              {/* The address's saved pin is the delivery location; the modal
                  only adjusts it, or supplies one for pin-less addresses. */}
              {deliveryMode !== 'bike' && (
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className={`text-xs min-w-0 flex-1 ${
                    customerLocation && (deliveryMode !== 'foot' || footDeliveryEligibility.eligible)
                      ? 'text-brown-500 dark:text-white/55'
                      : 'text-blush-600 dark:text-blush-300'
                  }`}>
                    {locationSummary}
                  </p>
                  <button
                    type='button'
                    onClick={() => setShowLocationModal(true)}
                    className={`px-3 py-2 rounded-pill text-xs font-semibold transition-colors ${
                      customerLocation
                        ? 'border border-plum-300 text-plum-700 hover:bg-plum-50 dark:border-plum-600 dark:text-plum-200 dark:hover:bg-plum-900/30'
                        : 'bg-plum-700 text-white hover:bg-plum-600'
                    }`}
                  >
                    {customerLocation ? 'Adjust pin' : 'Set delivery location'}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-charcoal dark:text-white mb-2">
                  Directions for the rider <span className="font-normal text-brown-400 dark:text-white/40">(optional)</span>
                </label>
                <textarea
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Gate, floor, door number, nearby landmark..."
                  rows={2}
                  className="w-full text-sm border border-brown-200 dark:border-dm-border rounded-card px-3 py-2 bg-ivory dark:bg-dm-surface text-charcoal dark:text-white/80 placeholder-brown-300 dark:placeholder-white/30 focus:outline-none focus:border-plum-500 dark:focus:border-plum-400 resize-none"
                />
              </div>
            </div>
          )}
        </>
      );
    } else if (fulfillmentMethod === 'pickup') {
      return (
        <>
          {/* Fulfillment method toggle */}
          {fulfillmentToggle}
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
    } else {
      return (
        <>
          {/* Fulfillment method toggle */}
          {fulfillmentToggle}
          <h3 className='text-lg font-semibold text-charcoal dark:text-white mb-3'>Send via SACCO / Bus</h3>
          <div className="bg-plum-50 dark:bg-plum-900/20 border border-plum-200 dark:border-plum-700/40 text-plum-700 dark:text-plum-300 px-4 py-3 rounded-card mb-3 text-sm space-y-1.5 leading-relaxed">
            <p>
              <span className="font-semibold">KES {SACCO_TERMINAL_DROPOFF_CHARGE}</span> covers our rider
              taking your order from the shop to the operator&apos;s Nairobi terminal — pay that as part of this order.
            </p>
            <p>
              Once the rider is at the terminal, they&apos;ll <span className="font-semibold">call you</span> to
              confirm drop-off. The SACCO/bus operator charges their own separate fee to carry your parcel to{' '}
              {saccoDestinationTown || 'your destination town'} — you or your receiver pay that directly to them,
              not through this app.
            </p>
          </div>
          {(!saccoOperatorId || !saccoDestinationTown) && (
            <div className="bg-gold-100 dark:bg-gold-600/10 border border-gold-300 dark:border-gold-600/30 text-gold-700 dark:text-gold-300 px-4 py-2 rounded-card mb-4 text-sm">
              Please select an operator and destination town to proceed with payment.
            </div>
          )}
          <div className='bg-white dark:bg-dm-card p-4 rounded-card border border-brown-100 dark:border-dm-border mb-4 transition-colors duration-200 space-y-3'>
            <div>
              <label className="block text-sm font-semibold text-charcoal dark:text-white mb-2">SACCO / bus operator</label>
              <select
                value={saccoOperatorId}
                onChange={(e) => setSaccoOperatorId(e.target.value)}
                className="w-full text-sm border border-brown-200 dark:border-dm-border rounded-card px-3 py-2 bg-ivory dark:bg-dm-surface text-charcoal dark:text-white/80"
                disabled={saccoOperatorsLoading}
              >
                <option value=''>{saccoOperatorsLoading ? 'Loading operators...' : 'Select an operator'}</option>
                {saccoOperators.map((operator) => (
                  <option key={operator._id} value={operator._id}>
                    {operator.name}{operator.isCrossBorder ? ' (cross-border)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedSaccoOperator && (
              <div className="text-xs text-brown-500 dark:text-white/55 bg-brown-50 dark:bg-dm-surface rounded-card p-3 space-y-1">
                {selectedSaccoOperator.nairobiTerminal && (
                  <p><span className="font-semibold">Terminal:</span> {selectedSaccoOperator.nairobiTerminal}</p>
                )}
                {selectedSaccoOperator.contactPhone && (
                  <p><span className="font-semibold">Contact:</span> {selectedSaccoOperator.contactPhone}</p>
                )}
                {selectedSaccoOperator.destinationsServed?.length > 0 && (
                  <p><span className="font-semibold">Serves:</span> {selectedSaccoOperator.destinationsServed.join(', ')}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-charcoal dark:text-white mb-2">Destination town</label>
              <input
                type="text"
                value={saccoDestinationTown}
                onChange={(e) => setSaccoDestinationTown(e.target.value)}
                placeholder="e.g. Nyeri, Kisumu, Dar es Salaam"
                className="w-full text-sm border border-brown-200 dark:border-dm-border rounded-card px-3 py-2 bg-ivory dark:bg-dm-surface text-charcoal dark:text-white/80 placeholder-brown-300 dark:placeholder-white/30 focus:outline-none focus:border-plum-500 dark:focus:border-plum-400"
              />
            </div>
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
              {fulfillmentMethod !== 'sacco_pickup' && (
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  disabled={payOnDeliveryBlocked}
                  className={`flex-1 py-2 px-3 rounded-card text-sm font-semibold border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    selectedPaymentMethod === 'cash'
                      ? 'border-plum-600 text-plum-700 bg-plum-50 dark:border-plum-500 dark:text-plum-200 dark:bg-plum-900/20'
                      : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/40'
                  }`}
                >
                  {payLaterLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('jenga-checkout')}
                className={`flex-1 py-2 px-3 rounded-card text-sm font-semibold border-2 transition-colors ${
                  selectedPaymentMethod === 'jenga-checkout'
                    ? 'border-plum-600 text-plum-700 bg-plum-50 dark:border-plum-500 dark:text-plum-200 dark:bg-plum-900/20'
                    : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/40'
                }`}
              >
                Pay now
              </button>
            </div>

            {payOnDeliveryBlocked && (
              <p className="text-xs text-brown-500 dark:text-white/50">
                Pay on Delivery is only available for deliveries within Nairobi County. Pay now with M-Pesa to complete this order.
              </p>
            )}

            {selectedPaymentMethod === 'cash' && fulfillmentMethod !== 'sacco_pickup' && (
              <p className="text-xs text-brown-500 dark:text-white/50">
                {fulfillmentMethod === 'pickup'
                  ? 'Pay by M-Pesa at the counter when you collect your order.'
                  : 'Pay by M-Pesa when your order arrives. Our rider will send the payment request to your phone.'}
              </p>
            )}

            {selectedPaymentMethod === 'cash' && fulfillmentMethod !== 'sacco_pickup' && (
              <button
                className={`flex items-center justify-between w-full py-3 px-4 rounded-card border-2 font-semibold text-sm transition-all duration-200 press ${
                  isPaymentEnabled && !isCheckoutBusy
                    ? 'border-plum-600 text-plum-700 dark:border-plum-500 dark:text-plum-200 bg-plum-50 dark:bg-plum-900/20 hover:bg-plum-100 dark:hover:bg-plum-900/40'
                    : 'border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 cursor-not-allowed'
                }`}
                onClick={handleCashOnDelivery}
                disabled={!isPaymentEnabled || isCheckoutBusy}
              >
                <span>{checkoutAction === 'cash' ? 'Placing order...' : `Place order · ${payLaterLabel}`}</span>
                {!isPaymentEnabled && (
                  <span className="text-xs font-normal opacity-60">
                    {paymentBlockedReason}
                  </span>
                )}
              </button>
            )}

            {selectedPaymentMethod === 'jenga-checkout' && isPaymentEnabled && (
              <JengaCardPayment
                cartItems={cartItemsList}
                totalAmount={finalPrice}
                addressId={fulfillmentMethod === 'delivery' ? selectedAddress?._id : null}
                communityRewardId={selectedReward ? selectedReward._id : null}
                communityDiscountAmount={selectedReward && selectedReward.type === 'discount' ? communityDiscount : 0}
                usePoints={usePoints}
                pointsUsed={usePoints ? pointsValue : 0}
                fulfillment_type={fulfillmentMethod}
                pickup_location={pickupLocation}
                pickup_instructions={pickupInstructions}
                saccoOperatorId={fulfillmentMethod === 'sacco_pickup' ? saccoOperatorId : undefined}
                saccoDestinationTown={fulfillmentMethod === 'sacco_pickup' ? saccoDestinationTown : undefined}
                deliveryCharge={deliveryCharge}
                deliveryInstructions={deliveryInstructions}
                deliveryMode={deliveryMode}
                deliveryZoneId={deliveryZoneId}
                customerLocation={customerLocation}
                onError={handleJengaPaymentError}
              />
            )}

            {selectedPaymentMethod === 'jenga-checkout' && !isPaymentEnabled && (
              <div className="flex items-center justify-between w-full py-3 px-4 rounded-card border-2 border-brown-100 dark:border-dm-border text-brown-300 dark:text-white/20 font-semibold text-sm">
                <span>M-Pesa</span>
                <span className="text-xs font-normal opacity-60">
                  {paymentBlockedReason}
                </span>
              </div>
            )}

            {/* Guest Checkout CTA — only show for unauthenticated users */}
            {!user?._id && (
            <div className="mt-6 pt-6 border-t border-brown-200 dark:border-brown-700">
              <p className="text-center text-sm text-brown-500 dark:text-brown-400 mb-3">
                Don&apos;t want to create an account?
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

        {/* Delivery location — adjusts the selected address's pin (or sets
            one for an address saved without a pin). Rider directions are
            collected on this page, so the modal doesn't ask for them again. */}
        <DeliveryLocationModal
          isOpen={showLocationModal}
          initialLocation={customerLocation}
          mode={deliveryMode}
          askInstructions={false}
          onClose={() => setShowLocationModal(false)}
          onSave={(loc) => setPinOverride({ lat: loc.lat, lng: loc.lng })}
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

export default CheckoutPage;

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import { submitJengaHostedCheckout } from '../utils/jengaHostedCheckout';

const JengaCardPayment = ({
  cartItems,
  totalAmount,
  addressId,
  onError,
  communityRewardId,
  communityDiscountAmount,
  usePoints = false,
  pointsUsed = 0,
  fulfillment_type = 'delivery',
  pickup_location = '',
  pickup_instructions = '',
  saccoOperatorId = '',
  saccoDestinationTown = '',
  deliveryCharge = 0,
  deliveryInstructions = '',
  deliveryMode = 'standard',
  deliveryZoneId = '',
  customerLocation = null,
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const submitLockRef = useRef(false);

  const handlePay = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsBusy(true);

    try {
      const response = await Axios({
        ...SummaryApi.jengaCheckoutPayment,
        data: {
          list_items: cartItems,
          addressId,
          communityRewardId,
          communityDiscountAmount,
          // The server prices points in (and redeems them once paid), so the
          // M-Pesa amount matches the total shown on the checkout page.
          usePoints,
          pointsUsed,
          fulfillment_type,
          pickup_location,
          pickup_instructions,
          saccoOperatorId,
          saccoDestinationTown,
          deliveryCharge,
          deliveryInstructions,
          delivery_mode: fulfillment_type === 'delivery' ? deliveryMode : 'standard',
          deliveryZoneId: fulfillment_type === 'delivery' && deliveryMode === 'bike' ? deliveryZoneId : undefined,
          customerLocation: fulfillment_type === 'delivery' ? customerLocation : undefined,
        },
        requestLockKey: `payment:jenga-checkout:${totalAmount}:${addressId || pickup_location || 'pickup'}`,
      });

      if (response.data.success) {
        const { checkoutUrl, fields } = response.data.data;
        toast.success('Redirecting you to secure M-Pesa checkout...');
        submitJengaHostedCheckout(checkoutUrl, fields);
        // Intentionally leave isBusy true — the page is about to navigate away.
      } else {
        setIsBusy(false);
        submitLockRef.current = false;
        onError && onError(response.data.message);
      }
    } catch (error) {
      setIsBusy(false);
      submitLockRef.current = false;
      onError && onError(error.response?.data?.message || 'Could not start secure checkout');
    }
  };

  return (
    <div className="jenga-card-payment-form">
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Pay with M-Pesa</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          You&apos;ll be redirected to Jenga&apos;s secure checkout page to enter your M-Pesa number and approve the payment prompt.
        </p>
      </div>

      <button
        type="button"
        onClick={handlePay}
        disabled={isBusy}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isBusy ? 'Redirecting to secure checkout...' : `Pay KES ${totalAmount.toFixed(2)} with M-Pesa`}
      </button>
    </div>
  );
};

export default JengaCardPayment;

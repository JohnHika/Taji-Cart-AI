import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

const KENYAN_PHONE_REGEX = /^(?:254|\+254|0)?(7\d{8}|1\d{8})$/;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000; // 2 minutes — matches typical STK prompt expiry

const TERMINAL_STATUSES = new Set(['failed', 'cancelled', 'expired', 'stale']);

const JengaPayment = ({
  cartItems,
  totalAmount,
  addressId,
  onSuccess,
  onError,
  communityRewardId,
  communityDiscountAmount,
  fulfillment_type = 'delivery',
  pickup_location = '',
  pickup_instructions = '',
  deliveryCharge = 0,
  deliveryInstructions = '',
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stage, setStage] = useState('idle'); // idle | initiating | pending | done
  const submitLockRef = useRef(false);
  const pollTimerRef = useRef(null);
  const pollDeadlineRef = useRef(null);

  useEffect(() => () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const pollStatus = (orderReference) => {
    const poll = async () => {
      if (Date.now() > pollDeadlineRef.current) {
        stopPolling();
        setStage('idle');
        onError && onError('Payment timed out. If you approved the prompt, check My Orders before retrying.');
        return;
      }

      try {
        const response = await Axios({
          ...SummaryApi.checkJengaStatus,
          url: SummaryApi.checkJengaStatus.url.replace(':orderReference', orderReference),
        });

        const status = response?.data?.status;

        if (status === 'paid') {
          stopPolling();
          setStage('done');
          toast.success('Payment confirmed!');
          onSuccess && onSuccess(response.data);
          return;
        }

        if (TERMINAL_STATUSES.has(status)) {
          stopPolling();
          setStage('idle');
          const message = status === 'stale'
            ? (response.data.resultDesc || 'No confirmation received yet. If you approved the payment, contact support with your order reference.')
            : `Payment ${status}. Please try again.`;
          onError && onError(message);
          return;
        }

        // still pending/unknown — keep polling
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        // Network hiccup — keep polling until the deadline rather than failing hard.
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    poll();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current || stage !== 'idle') {
      return;
    }

    if (!KENYAN_PHONE_REGEX.test(phoneNumber)) {
      toast.error('Please enter a valid Kenyan phone number');
      return;
    }

    submitLockRef.current = true;
    setStage('initiating');

    try {
      const response = await Axios({
        ...SummaryApi.jengaPayment,
        data: {
          phoneNumber,
          list_items: cartItems,
          addressId,
          communityRewardId,
          communityDiscountAmount,
          fulfillment_type,
          pickup_location,
          pickup_instructions,
          deliveryCharge,
          deliveryInstructions,
        },
        requestLockKey: `payment:jenga:${phoneNumber}:${totalAmount}:${addressId || pickup_location || 'pickup'}`,
      });

      if (response.data.success) {
        toast.success('Check your phone to approve the M-Pesa prompt.');
        setStage('pending');
        pollStatus(response.data.data.orderReference);
      } else {
        setStage('idle');
        onError && onError(response.data.message);
      }
    } catch (error) {
      setStage('idle');
      onError && onError(error.response?.data?.message || 'Payment failed');
    } finally {
      submitLockRef.current = false;
    }
  };

  const isBusy = stage === 'initiating' || stage === 'pending';

  return (
    <div className="jenga-payment-form">
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">M-Pesa via Equity (Jenga)</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Pay via M-Pesa STK push, settled directly to Nawiri's Equity account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="jenga-phone" className="block text-sm font-medium text-charcoal">
            Phone Number
          </label>
          <input
            type="text"
            id="jenga-phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 0712345678"
            className="w-full px-3 py-2 border border-brown-200 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isBusy}
            required
          />
          <p className="text-xs text-brown-400">Format: 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX</p>
        </div>
        <button
          type="submit"
          disabled={isBusy}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stage === 'initiating' && 'Sending request...'}
          {stage === 'pending' && 'Waiting for M-Pesa approval...'}
          {stage === 'idle' && `Pay KES ${totalAmount.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
};

export default JengaPayment;

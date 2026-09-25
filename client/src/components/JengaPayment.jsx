import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

const KENYAN_PHONE_REGEX = /^(?:254|\+254|0)?(7\d{8}|1\d{8})$/;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000; // 2 minutes — matches typical STK prompt expiry

// Genuinely final — the customer must start a brand new payment.
// 'stale' is deliberately not here: it means "no confirmation yet", not
// "this payment is over" (see handleStale below).
const TERMINAL_STATUSES = new Set(['failed', 'cancelled', 'expired']);

const normalizePhoneInput = (value) => (typeof value === 'string' ? value.trim() : '');

const JengaPayment = ({
  cartItems,
  totalAmount,
  addressId,
  onSuccess,
  onError,
  onPendingChange,
  communityRewardId,
  communityDiscountAmount,
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
  payEndpoint = SummaryApi.jengaPayment,
  statusEndpoint = SummaryApi.checkJengaStatus,
  extraData = {},
  defaultPhone = '',
  isGuest = false,
}) => {
  // Prefilled from the phone already entered earlier in the form (see
  // defaultPhone) so the guest isn't asked for the same number twice.
  const [phoneNumber, setPhoneNumber] = useState(() => normalizePhoneInput(defaultPhone));
  const [stage, setStage] = useState('idle'); // idle | initiating | pending | stale | done
  const [orderReference, setOrderReference] = useState('');
  const [staleMessage, setStaleMessage] = useState('');
  const submitLockRef = useRef(false);
  const pollTimerRef = useRef(null);
  const pollDeadlineRef = useRef(null);
  // Guards every setState/callback a poll can reach after this component has
  // unmounted — editing the form used to unmount this component mid-poll,
  // and an in-flight request would still land, re-arm the next setTimeout,
  // and eventually call onSuccess/onError on a page that's gone.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Tell the parent whenever a payment is in flight or unresolved so it can
  // lock the rest of the checkout form (method toggle, address, etc.) and
  // keep this component mounted until the guest resolves or restarts it.
  useEffect(() => {
    onPendingChange?.(stage === 'initiating' || stage === 'pending' || stage === 'stale');
  }, [stage, onPendingChange]);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const pollStatus = useCallback((reference) => {
    const poll = async () => {
      if (!mountedRef.current) return;

      if (Date.now() > pollDeadlineRef.current) {
        stopPolling();
        if (!mountedRef.current) return;
        setStage('stale');
        setStaleMessage('No confirmation received yet. If you approved the prompt, tap "Check again" in a moment.');
        return;
      }

      try {
        const response = await Axios({
          ...statusEndpoint,
          url: statusEndpoint.url.replace(':orderReference', reference),
        });

        if (!mountedRef.current) return;

        const status = response?.data?.status;

        if (status === 'paid') {
          stopPolling();
          setStage('done');
          toast.success('Payment confirmed!');
          onSuccess && onSuccess(response.data);
          return;
        }

        if (status === 'stale') {
          stopPolling();
          setStage('stale');
          setStaleMessage(
            response.data.resultDesc || 'No confirmation received yet. If you approved the payment, tap "Check again" in a moment.'
          );
          return;
        }

        if (TERMINAL_STATUSES.has(status)) {
          stopPolling();
          setStage('idle');
          setOrderReference('');
          onError && onError(`Payment ${status}. Please try again.`);
          return;
        }

        // still pending/unknown — keep polling
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!mountedRef.current) return;
        // Network hiccup — keep polling until the deadline rather than failing hard.
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    poll();
  }, [onError, onSuccess, statusEndpoint]);

  // Resume polling the same payment without starting a new STK push — used
  // both from a client-side timeout and a server-reported 'stale' status.
  const handleCheckAgain = () => {
    if (!orderReference) return;
    setStage('pending');
    setStaleMessage('');
    pollStatus(orderReference);
  };

  // Explicit opt-in to abandon this payment attempt and start a fresh one.
  // Never happens automatically — a guest who already approved the M-Pesa
  // prompt must not be able to pay twice for the same order.
  const handleStartOver = () => {
    stopPolling();
    setOrderReference('');
    setStaleMessage('');
    setStage('idle');
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
        ...payEndpoint,
        data: {
          phoneNumber,
          list_items: cartItems,
          addressId,
          communityRewardId,
          communityDiscountAmount,
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
          ...extraData,
        },
        requestLockKey: `payment:jenga:${phoneNumber}:${totalAmount}:${addressId || pickup_location || 'pickup'}`,
      });

      if (!mountedRef.current) return;

      if (response.data.success) {
        toast.success('Check your phone to approve the M-Pesa prompt.');
        setOrderReference(response.data.data.orderReference);
        setStage('pending');
        pollStatus(response.data.data.orderReference);
      } else {
        setStage('idle');
        onError && onError(response.data.message);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      setStage('idle');
      onError && onError(error.response?.data?.message || 'Payment failed');
    } finally {
      submitLockRef.current = false;
    }
  };

  const isBusy = stage === 'initiating' || stage === 'pending';

  const trackingHint = useMemo(() => {
    // No order exists server-side until the payment is confirmed (it's
    // created only on payment success), so there's nothing to look up yet —
    // keep the reference and resume from here rather than sending a guest to
    // a tracking page that won't find anything.
    return isGuest
      ? 'Keep this reference. Once payment is confirmed you can look this order up on the guest order tracking page.'
      : 'Keep this reference in case you need to contact support.';
  }, [isGuest]);

  if (stage === 'stale') {
    return (
      <div className="jenga-payment-form">
        <div className="mb-4 p-3 bg-gold-50 dark:bg-gold-900/20 rounded-lg border border-gold-300 dark:border-gold-700">
          <p className="text-sm font-semibold text-gold-800 dark:text-gold-300 mb-1">Still waiting for confirmation</p>
          <p className="text-xs text-gold-700 dark:text-gold-400 mb-2">{staleMessage}</p>
          <p className="text-xs font-mono text-gold-700 dark:text-gold-400 break-all">Reference: {orderReference}</p>
          <p className="text-xs text-gold-600 dark:text-gold-400 mt-2">{trackingHint}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCheckAgain}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Check again
          </button>
          <button
            type="button"
            onClick={handleStartOver}
            className="flex-1 py-2 px-4 border border-brown-300 text-brown-600 hover:bg-brown-50 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown-400"
          >
            Start over
          </button>
        </div>
        <p className="text-xs text-brown-400 mt-2">
          Only choose &quot;Start over&quot; if you did not approve the M-Pesa prompt — starting a new payment while the first is still pending can charge you twice.
        </p>
      </div>
    );
  }

  return (
    <div className="jenga-payment-form">
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Pay with M-Pesa</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Enter your M-Pesa number below and approve the payment prompt on your phone.
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

JengaPayment.propTypes = {
  cartItems: PropTypes.array,
  totalAmount: PropTypes.number.isRequired,
  addressId: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  onPendingChange: PropTypes.func,
  communityRewardId: PropTypes.string,
  communityDiscountAmount: PropTypes.number,
  fulfillment_type: PropTypes.string,
  pickup_location: PropTypes.string,
  pickup_instructions: PropTypes.string,
  saccoOperatorId: PropTypes.string,
  saccoDestinationTown: PropTypes.string,
  deliveryCharge: PropTypes.number,
  deliveryInstructions: PropTypes.string,
  deliveryMode: PropTypes.string,
  deliveryZoneId: PropTypes.string,
  customerLocation: PropTypes.object,
  payEndpoint: PropTypes.object,
  statusEndpoint: PropTypes.object,
  extraData: PropTypes.object,
  defaultPhone: PropTypes.string,
  isGuest: PropTypes.bool,
};

export default JengaPayment;

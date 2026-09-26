import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCart, fetchCartItems } from '../store/cartProduct';
import { clearGuestCart } from '../utils/guestCart';
import Axios from '../utils/Axios';

const POLL_INTERVAL_MS = 4000;
// Jenga's confirmation (IPN) can take a few minutes after the customer
// approves on their phone; keep checking that long before offering a manual
// "check again".
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

const TERMINAL_FAILURE_STATUSES = new Set(['failed', 'cancelled', 'expired', 'error']);

// Landed here after Jenga's hosted checkout redirects the browser back
// (server/controllers/jenga.controller.js: handleJengaCardCallback). The
// status in the URL is only a hint — anyone can edit it — so this page always
// confirms with the status endpoint, which reports 'paid' only once the order
// has actually been created.
const CardPaymentResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { fetchCartItem, fetchOrder } = useGlobalContext();

  const params = new URLSearchParams(location.search);
  const orderReference = params.get('orderReference');
  const hintedStatus = params.get('status');
  // Guests (no account) come back from Jenga with guest=1 appended by
  // handleJengaCardCallback, and must poll the public guest status endpoint —
  // the authenticated one would 401 for them.
  const isGuestFlow = params.get('guest') === '1';

  const [status, setStatus] = useState(
    TERMINAL_FAILURE_STATUSES.has(hintedStatus) ? hintedStatus : 'pending'
  );
  const [message, setMessage] = useState('');
  const [guestPaid, setGuestPaid] = useState(null); // { orderId, amount } once a guest payment confirms
  const pollTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const deadlineRef = useRef(Date.now() + POLL_TIMEOUT_MS);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!orderReference || status !== 'pending') {
      return undefined;
    }

    const poll = async () => {
      if (!mountedRef.current) return;
      if (Date.now() > deadlineRef.current) {
        setStatus('stale');
        setMessage('We haven\'t received confirmation from M-Pesa yet. If you approved the payment, it can take a few minutes — check again shortly before paying again.');
        return;
      }

      try {
        const statusEndpoint = isGuestFlow ? SummaryApi.checkJengaGuestStatus : SummaryApi.checkJengaStatus;
        const response = await Axios({
          ...statusEndpoint,
          url: statusEndpoint.url.replace(':orderReference', orderReference),
        });
        if (!mountedRef.current) return;

        const nextStatus = response?.data?.status;
        if (nextStatus === 'paid') {
          if (isGuestFlow) {
            // Guests have no /success page (it reads their account orders) —
            // show the confirmation here instead. The pending order only
            // becomes real orders on the server once paid, so the guest cart
            // can finally be emptied.
            clearGuestCart();
            dispatch(fetchCartItems());
            setGuestPaid({ orderId: response.data.orderId, amount: response.data.amount });
            return;
          }
          // The server has already emptied the cart; mirror that locally.
          dispatch(clearCart());
          if (fetchCartItem) fetchCartItem();
          if (fetchOrder) fetchOrder();
          navigate('/success', {
            replace: true,
            state: { text: 'Order', orderId: response.data.orderId },
          });
          return;
        }
        if (TERMINAL_FAILURE_STATUSES.has(nextStatus)) {
          setStatus(nextStatus);
          setMessage(response.data.resultDesc || '');
          return;
        }
        if (nextStatus === 'stale') {
          setStatus('stale');
          setMessage(response.data.resultDesc || '');
          return;
        }
      } catch {
        // Network hiccup — keep polling until the deadline.
      }

      if (mountedRef.current) {
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, orderReference]);

  const checkAgain = () => {
    deadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    setMessage('');
    setStatus('pending');
  };

  const isPending = status === 'pending';
  const isStale = status === 'stale';
  const isFailure = TERMINAL_FAILURE_STATUSES.has(status) || !orderReference;

  return (
    <div className='min-h-[80vh] py-8 flex items-center justify-center bg-ivory dark:bg-dm-surface'>
      <div className='w-full max-w-md bg-white dark:bg-dm-card p-6 rounded-card border border-brown-100 dark:border-dm-border shadow-card mx-auto text-center'>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${
          isFailure ? 'bg-red-100 dark:bg-red-900/30' : isStale ? 'bg-gold-100 dark:bg-gold-600/15' : 'bg-green-100 dark:bg-green-900/30'
        }`}>
          {isPending && orderReference && !guestPaid && <FaSpinner className='text-plum-600 dark:text-plum-300 text-2xl animate-spin' />}
          {(isFailure || isStale) && <FaExclamationTriangle className={`${isStale ? 'text-gold-600 dark:text-gold-300' : 'text-red-600 dark:text-red-400'} text-2xl`} />}
          {(status === 'paid' || guestPaid) && <FaCheck className='text-green-600 dark:text-green-400 text-2xl' />}
        </div>

        {isPending && orderReference && !guestPaid && (
          <>
            <h1 className='text-xl font-bold text-charcoal dark:text-white mb-2'>Confirming your payment...</h1>
            <p className='text-brown-500 dark:text-white/55 text-sm'>
              Please don&apos;t close this page while we confirm your M-Pesa payment.
            </p>
          </>
        )}

        {guestPaid && (
          <>
            <h1 className='text-xl font-bold text-charcoal dark:text-white mb-2'>Payment confirmed — order placed!</h1>
            <p className='text-brown-500 dark:text-white/55 text-sm mb-4'>
              We received your M-Pesa payment and your order is being prepared. A confirmation was sent to your email.
            </p>
            {guestPaid.orderId && (
              <p className='text-sm mb-1'>
                Order: <span className='font-semibold text-charcoal dark:text-white font-mono'>{guestPaid.orderId}</span>
              </p>
            )}
            <p className='text-xs font-mono text-brown-400 dark:text-white/40 mb-4'>
              Reference: {orderReference}
            </p>
            <div className='flex flex-col space-y-3'>
              <Link
                to='/'
                className='w-full py-2.5 px-4 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill transition-colors press'
              >
                Continue Shopping
              </Link>
              <Link
                to={`/order/track-guest?orderId=${encodeURIComponent(guestPaid.orderId || '')}`}
                className='w-full py-2.5 px-4 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white font-medium rounded-pill text-center hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors'
              >
                Track Your Order
              </Link>
            </div>
          </>
        )}

        {isStale && (
          <>
            <h1 className='text-xl font-bold text-charcoal dark:text-white mb-2'>Still Waiting for Confirmation</h1>
            <p className='text-brown-500 dark:text-white/55 text-sm mb-4'>{message}</p>
            <p className='text-xs font-mono text-brown-400 dark:text-white/40 mb-4'>
              Reference: {orderReference}
            </p>
            {/* No "try again" here: if the first payment went through, paying
                again would charge the customer twice. */}
            <div className='flex flex-col space-y-3'>
              <button
                type='button'
                onClick={checkAgain}
                className='w-full py-2.5 px-4 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill transition-colors press'
              >
                Check Again
              </button>
              {isGuestFlow ? (
                <Link
                  to='/order/track-guest'
                  className='w-full py-2.5 px-4 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white font-medium rounded-pill text-center hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors'
                >
                  Track Your Order
                </Link>
              ) : (
                <Link
                  to='/dashboard/myorders'
                  className='w-full py-2.5 px-4 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white font-medium rounded-pill text-center hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors'
                >
                  View My Orders
                </Link>
              )}
            </div>
          </>
        )}

        {isFailure && (
          <>
            <h1 className='text-xl font-bold text-charcoal dark:text-white mb-2'>Payment Not Completed</h1>
            <p className='text-brown-500 dark:text-white/55 text-sm mb-4'>
              {message || 'Your payment was not completed, so no order was placed. Your cart is still saved.'}
            </p>
            {orderReference && (
              <p className='text-xs font-mono text-brown-400 dark:text-white/40 mb-4'>
                Reference: {orderReference}
              </p>
            )}
            <div className='flex flex-col space-y-3'>
              <Link
                to={isGuestFlow ? '/guest-checkout' : '/dashboard/checkout'}
                replace
                className='w-full py-2.5 px-4 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill transition-colors press'
              >
                Try Again
              </Link>
              <Link
                to={isGuestFlow ? '/guest-checkout' : '/dashboard/cart'}
                replace
                className='w-full py-2.5 px-4 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white font-medium rounded-pill text-center hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors'
              >
                Back to Cart
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardPaymentResult;

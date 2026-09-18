import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCartItems } from '../store/cartProduct';
import Axios from '../utils/Axios';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

const TERMINAL_FAILURE_STATUSES = new Set(['failed', 'cancelled', 'expired', 'stale', 'error']);

// Landed here after Jenga's hosted card checkout redirects the browser back
// (server/controllers/jenga.controller.js: handleJengaCardCallback). The
// server already reconciled the payment before redirecting, but if that
// one-shot check hit a transient error the payment can still be 'pending'
// here — so this page polls the same status endpoint the M-Pesa flow uses,
// which re-checks Jenga on the card payment's behalf on every poll.
const CardPaymentResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { fetchCartItem, fetchOrder } = useGlobalContext();

  const params = new URLSearchParams(location.search);
  const orderReference = params.get('orderReference');
  const initialStatus = params.get('status') || 'pending';

  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState('');
  const pollTimerRef = useRef(null);
  const deadlineRef = useRef(Date.now() + POLL_TIMEOUT_MS);

  useEffect(() => () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  }, []);

  useEffect(() => {
    if (status === 'paid') {
      dispatch(clearCartItems());
      if (fetchCartItem) fetchCartItem();
      if (fetchOrder) fetchOrder();
      navigate('/success', { state: { text: 'Order' } });
      return;
    }

    if (!orderReference || TERMINAL_FAILURE_STATUSES.has(status)) {
      return;
    }

    const poll = async () => {
      if (Date.now() > deadlineRef.current) {
        setStatus('stale');
        setMessage('No confirmation received yet. If you completed payment, check My Orders before retrying, or contact support with your order reference.');
        return;
      }

      try {
        const response = await Axios({
          ...SummaryApi.checkJengaStatus,
          url: SummaryApi.checkJengaStatus.url.replace(':orderReference', orderReference),
        });

        const nextStatus = response?.data?.status;
        if (nextStatus === 'paid') {
          setStatus('paid');
          return;
        }
        if (TERMINAL_FAILURE_STATUSES.has(nextStatus)) {
          setStatus(nextStatus);
          setMessage(response.data.resultDesc || '');
          return;
        }

        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, orderReference]);

  const isPending = status === 'pending';
  const isFailure = TERMINAL_FAILURE_STATUSES.has(status);

  return (
    <div className='min-h-[80vh] py-8 flex items-center justify-center bg-ivory dark:bg-dm-surface'>
      <div className='w-full max-w-md bg-white dark:bg-dm-card p-6 rounded-card border border-brown-100 dark:border-dm-border shadow-card mx-auto text-center'>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${
          isFailure ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
        }`}>
          {isPending && <FaSpinner className='text-plum-600 dark:text-plum-300 text-2xl animate-spin' />}
          {isFailure && <FaExclamationTriangle className='text-red-600 dark:text-red-400 text-2xl' />}
          {status === 'paid' && <FaCheck className='text-green-600 dark:text-green-400 text-2xl' />}
        </div>

        {isPending && (
          <>
            <h1 className='text-xl font-bold text-charcoal dark:text-white mb-2'>Confirming your payment...</h1>
            <p className='text-brown-500 dark:text-white/55 text-sm'>
              Please don&apos;t close this page while we confirm your card payment with Jenga.
            </p>
          </>
        )}

        {isFailure && (
          <>
            <h1 className='text-xl font-bold text-charcoal dark:text-white mb-2'>
              {status === 'stale' ? 'Still Waiting for Confirmation' : 'Payment Not Completed'}
            </h1>
            <p className='text-brown-500 dark:text-white/55 text-sm mb-4'>
              {message || 'Your card payment was not completed. No charge should have been made. Please try again.'}
            </p>
            {orderReference && (
              <p className='text-xs font-mono text-brown-400 dark:text-white/40 mb-4'>
                Reference: {orderReference}
              </p>
            )}
            <div className='flex flex-col space-y-3'>
              <Link
                to='/dashboard/cart'
                className='w-full py-2.5 px-4 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill transition-colors press'
              >
                Try Again
              </Link>
              <Link
                to='/dashboard/myorders'
                className='w-full py-2.5 px-4 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white font-medium rounded-pill text-center hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors'
              >
                View My Orders
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardPaymentResult;

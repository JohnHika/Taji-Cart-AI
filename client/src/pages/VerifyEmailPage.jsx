import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { nawiriBrand } from '../config/brand';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const sent = searchParams.get('sent') === '1';

  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState(
    token
      ? 'We are confirming your email address now.'
      : sent
        ? `We sent a verification link to ${email || 'your inbox'}.`
        : 'Use the verification link from your inbox to activate your account.'
  );
  const [isResending, setIsResending] = useState(false);

  const canResend = useMemo(() => Boolean(email), [email]);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        return;
      }

      try {
        const response = await Axios({
          ...SummaryApi.verifyEmail,
          data: { token },
          requestLockKey: `auth:verify-email:${token}`,
        });

        setStatus('success');
        setMessage(response.data?.message || 'Your email is verified and your account is ready.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'We could not verify this email link.');
      }
    };

    verifyToken();
  }, [token]);

  const handleResend = async () => {
    if (!email || isResending) {
      return;
    }

    setIsResending(true);

    try {
      const response = await Axios({
        ...SummaryApi.sendVerificationEmail,
        data: { email },
        requestLockKey: `auth:send-verification:${email.toLowerCase()}`,
      });

      toast.success(response.data?.message || 'Verification email sent.');
      setMessage(response.data?.message || 'Verification email sent.');
      if (status !== 'success') {
        setStatus('idle');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="min-h-screen bg-ivory px-4 py-8 dark:bg-dm-surface">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-brown-100 dark:bg-dm-card dark:ring-dm-border">
        <div className="hidden w-2/5 flex-col justify-between bg-plum-900 p-10 lg:flex">
          <div>
            <div className="inline-flex rounded-3xl bg-white p-3 shadow-lg">
              <img src={nawiriBrand.logo} alt={nawiriBrand.shortName} className="h-20 w-auto object-contain" />
            </div>
            <p className="mt-4 text-sm text-white/70">{nawiriBrand.companyName}</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-gold-300">Secure Access</p>
            <h1 className="font-display text-4xl font-semibold italic leading-tight text-white">
              {nawiriBrand.motto}
            </h1>
            <p className="max-w-md text-sm leading-7 text-white/65">
              Every verified account gets clearer communication, safer sign-in, and well-structured order updates from Nawiri Hair Kenya.
            </p>
          </div>

          <div className="text-sm text-white/70">
            <p>{nawiriBrand.email}</p>
            <p>{nawiriBrand.phoneDisplay}</p>
            <p>{nawiriBrand.location}</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-14">
          <div className="w-full max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-700 dark:text-gold-300">
              Email Verification
            </p>
            <h2 className="mt-3 text-3xl font-bold text-charcoal dark:text-white">
              {status === 'success' ? 'Email confirmed' : 'Verify your account'}
            </h2>
            <p className="mt-4 text-sm leading-7 text-brown-500 dark:text-white/60">{message}</p>

            {email && (
              <div className="mt-6 rounded-2xl border border-brown-100 bg-blush-50 px-4 py-3 text-sm text-charcoal dark:border-dm-border dark:bg-dm-card-2 dark:text-white/80">
                Verification email: <span className="font-semibold">{email}</span>
              </div>
            )}

            {status === 'verifying' && (
              <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-plum-50 px-4 py-2 text-sm font-medium text-plum-700 dark:bg-plum-900/20 dark:text-plum-200">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-plum-300 border-t-plum-700" />
                Verifying your email...
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {status === 'success' ? (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal transition hover:bg-gold-400"
                  >
                    Continue to sign in
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-full border border-brown-200 px-5 py-3 text-sm font-semibold text-charcoal transition hover:bg-brown-50 dark:border-dm-border dark:text-white"
                  >
                    Back to home
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || isResending}
                    className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                      canResend
                        ? 'bg-plum-700 text-white hover:bg-plum-600'
                        : 'cursor-not-allowed bg-brown-100 text-brown-400 dark:bg-dm-card-2 dark:text-white/25'
                    }`}
                  >
                    {isResending ? 'Sending...' : 'Resend verification email'}
                  </button>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-full border border-brown-200 px-5 py-3 text-sm font-semibold text-charcoal transition hover:bg-brown-50 dark:border-dm-border dark:text-white"
                  >
                    Back to sign in
                  </Link>
                </>
              )}
            </div>

            {!email && status !== 'success' && (
              <p className="mt-6 text-sm text-brown-500 dark:text-white/55">
                Open the verification link from the email you used to create your account, or register again with a real email address you can access.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerifyEmailPage;

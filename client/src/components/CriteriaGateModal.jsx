import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaExclamationTriangle, FaMapMarkerAlt, FaTimes, FaUserEdit } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { setUserDetails } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const FIELD_CONFIG = {
  name: {
    label: 'Full name',
    type: 'text',
    placeholder: 'Enter your full name',
  },
  email: {
    label: 'Email address',
    type: 'email',
    placeholder: 'Enter your email address',
  },
  mobile: {
    label: 'Phone number',
    type: 'tel',
    placeholder: 'e.g. 0712345678',
  },
};

const CriteriaGateModal = ({
  isOpen,
  evaluation,
  onClose,
  onRefreshUser,
  blocking = false,
}) => {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    mobile: '',
  });
  const [otp, setOtp] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [updatingPresence, setUpdatingPresence] = useState(false);

  const requirements = evaluation?.requirements || [];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      mobile: user?.mobile || '',
    });
    setOtp('');
  }, [isOpen, user?.email, user?.mobile, user?.name]);

  const requiredProfileFields = useMemo(() => {
    const fields = new Set();

    requirements.forEach((requirement) => {
      (requirement.fields || []).forEach((field) => fields.add(field));
    });

    return Array.from(fields);
  }, [requirements]);

  const hasPresenceFix = requirements.some((requirement) => requirement.fixType === 'presence');
  const hasEmailVerificationFix = requirements.some((requirement) => requirement.key === 'email_verified');
  const hasPhoneVerificationFix = requirements.some((requirement) => requirement.key === 'mobile_verified');
  const externalRequirements = requirements.filter((requirement) => requirement.fixType === 'external');

  if (!isOpen || !evaluation) {
    return null;
  }

  const handleProfileChange = (field) => (event) => {
    const { value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const refreshUser = async () => {
    if (typeof onRefreshUser === 'function') {
      const response = await onRefreshUser();

      if (response?.success && response?.data) {
        dispatch(setUserDetails(response.data));
      }

      return response;
    }

    return null;
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const response = await Axios({
        ...SummaryApi.updateUserDetails,
        data: {
          name: profileForm.name,
          email: profileForm.email,
          mobile: profileForm.mobile,
        },
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Profile updated successfully');
        await refreshUser();
      } else {
        toast.error(response.data?.message || 'Failed to update your profile');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    try {
      setSendingEmail(true);
      const response = await Axios({
        ...SummaryApi.sendVerificationEmail,
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Verification email sent');
        await refreshUser();
      } else {
        toast.error(response.data?.message || 'Failed to send verification email');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    try {
      setSendingOtp(true);
      const response = await Axios({
        ...SummaryApi.requestPhoneVerificationOtp,
        data: {
          mobile: profileForm.mobile || user?.mobile || '',
        },
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Verification code sent');
        await refreshUser();
      } else {
        toast.error(response.data?.message || 'Failed to send phone verification code');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otp.trim()) {
      toast.error('Enter the verification code first');
      return;
    }

    try {
      setVerifyingOtp(true);
      const response = await Axios({
        ...SummaryApi.verifyPhoneOtp,
        data: { otp: otp.trim() },
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Phone number verified');
        setOtp('');
        await refreshUser();
      } else {
        toast.error(response.data?.message || 'Failed to verify the phone number');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleFixPresence = async () => {
    try {
      setUpdatingPresence(true);
      const response = await Axios({
        url: '/api/delivery/presence',
        method: 'POST',
        data: {
          isOnline: true,
          isAvailable: true,
        },
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'You are now online and available');
        await refreshUser();
      } else {
        toast.error(response.data?.message || 'Failed to update your delivery presence');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setUpdatingPresence(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-dm-card dark:text-white">
        <div className="flex items-start justify-between gap-4 border-b border-brown-100 px-5 py-4 dark:border-dm-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600 dark:text-plum-300">
              Criteria check
            </p>
            <h2 className="mt-1 text-xl font-bold text-charcoal dark:text-white">{evaluation.title}</h2>
            <p className="mt-2 text-sm text-brown-500 dark:text-white/55">{evaluation.description}</p>
          </div>

          {!blocking && typeof onClose === 'function' && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-brown-100 p-2 text-brown-400 transition hover:text-charcoal dark:border-dm-border dark:text-white/55 dark:hover:text-white"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="mt-0.5 text-amber-600 dark:text-amber-300" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">These items still need attention</p>
                <div className="mt-3 space-y-2">
                  {requirements.map((requirement) => (
                    <div
                      key={requirement.key}
                      className="rounded-xl border border-amber-200/70 bg-white/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-black/10 dark:text-amber-100"
                    >
                      <p className="font-medium">{requirement.label}</p>
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">{requirement.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {requiredProfileFields.length > 0 && (
            <div className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
              <div className="flex items-center gap-2">
                <FaUserEdit className="text-plum-600 dark:text-plum-300" />
                <h3 className="font-semibold text-charcoal dark:text-white">Update your details now</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {requiredProfileFields.map((field) => {
                  const config = FIELD_CONFIG[field];
                  if (!config) return null;

                  return (
                    <label key={field} className="block text-sm">
                      <span className="mb-1 block font-medium text-charcoal dark:text-white/80">{config.label}</span>
                      <input
                        type={config.type}
                        value={profileForm[field] || ''}
                        onChange={handleProfileChange(field)}
                        placeholder={config.placeholder}
                        className="w-full rounded-xl border border-brown-100 bg-white px-4 py-3 outline-none transition focus:border-plum-500 focus:ring-2 focus:ring-plum-100 dark:border-dm-border dark:bg-dm-surface dark:text-white"
                      />
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  Save details
                </button>
              </div>
            </div>
          )}

          {hasPresenceFix && (
            <div className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-plum-600 dark:text-plum-300" />
                <h3 className="font-semibold text-charcoal dark:text-white">Delivery presence</h3>
              </div>
              <p className="mt-2 text-sm text-brown-500 dark:text-white/55">
                We can switch you online and available right now so you can continue.
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleFixPresence}
                  disabled={updatingPresence}
                  className="inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingPresence ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  Go online now
                </button>
              </div>
            </div>
          )}

          {hasEmailVerificationFix && (
            <div className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
              <h3 className="font-semibold text-charcoal dark:text-white">Email verification</h3>
              <p className="mt-2 text-sm text-brown-500 dark:text-white/55">
                Send a fresh verification email to continue.
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSendVerificationEmail}
                  disabled={sendingEmail}
                  className="inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingEmail ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  Send verification email
                </button>
              </div>
            </div>
          )}

          {hasPhoneVerificationFix && (
            <div className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
              <h3 className="font-semibold text-charcoal dark:text-white">Phone verification</h3>
              <p className="mt-2 text-sm text-brown-500 dark:text-white/55">
                Request a fresh code, then paste it below to verify your phone number.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter verification code"
                  className="w-full rounded-xl border border-brown-100 bg-white px-4 py-3 outline-none transition focus:border-plum-500 focus:ring-2 focus:ring-plum-100 dark:border-dm-border dark:bg-dm-surface dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={sendingOtp}
                    className="rounded-xl border border-brown-100 px-4 py-3 text-sm font-semibold text-charcoal transition hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-60 dark:border-dm-border dark:text-white/80 dark:hover:bg-dm-surface"
                  >
                    {sendingOtp ? 'Sending...' : 'Send code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    disabled={verifyingOtp}
                    className="rounded-xl bg-plum-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifyingOtp ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {externalRequirements.length > 0 && (
            <div className="rounded-2xl border border-brown-100 p-4 dark:border-dm-border">
              <h3 className="font-semibold text-charcoal dark:text-white">Need another page?</h3>
              <div className="mt-3 space-y-3">
                {externalRequirements.map((requirement) => (
                  <div key={`${requirement.key}-external`} className="rounded-xl bg-ivory px-4 py-3 dark:bg-dm-surface">
                    <p className="font-medium text-charcoal dark:text-white">{requirement.label}</p>
                    <p className="mt-1 text-sm text-brown-500 dark:text-white/55">{requirement.message}</p>
                    {requirement.redirectTo && (
                      <button
                        type="button"
                        onClick={() => {
                          navigate(requirement.redirectTo);
                          if (!blocking && typeof onClose === 'function') {
                            onClose();
                          }
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brown-100 px-3 py-2 text-sm font-semibold text-charcoal transition hover:bg-white dark:border-dm-border dark:text-white/80 dark:hover:bg-dm-card"
                      >
                        {requirement.actionLabel || 'Open page'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!blocking && typeof onClose === 'function' && (
          <div className="flex justify-end border-t border-brown-100 px-5 py-4 dark:border-dm-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brown-100 px-4 py-3 text-sm font-medium text-charcoal transition hover:bg-ivory dark:border-dm-border dark:text-white/70 dark:hover:bg-dm-surface"
            >
              Continue later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CriteriaGateModal;

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaBell,
  FaCamera,
  FaCheck,
  FaCrown,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaKey,
  FaRegEye,
  FaRegEyeSlash,
  FaSave,
  FaShieldAlt,
  FaSpinner,
  FaUser
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import RoyalCard from '../components/RoyalCard';
import UserProfileAvatarEdit from '../components/UserProfileAvatarEdit';
import { setUserDetails } from '../store/userSlice'; // Changed from setUser to setUserDetails
import Axios from '../utils/Axios';

const UserProfile = () => {
  console.log("UserProfile component rendering");

  const location = useLocation();
  const user = useSelector((state) => {
    console.log("User from Redux:", state.user);
    return state.user;
  });
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'royal', or 'security'

  useEffect(() => {
    if (location.hash === '#royal') {
      setActiveTab('royal');
    }
  }, [location.hash]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false); // State for avatar edit modal
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    mobile: user.mobile || ''
  });
  
  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [confirmingPhone, setConfirmingPhone] = useState(false);

  // Password validation
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    
    setPasswordData({
      ...passwordData,
      [name]: value
    });
    
    // Validate the new password as it's being typed
    if (name === 'newPassword') {
      setPasswordError(validatePassword(value));
    }
    
    // Check if passwords match
    if (name === 'confirmPassword' && passwordData.newPassword !== value) {
      setPasswordError("Passwords don't match");
    } else if (name === 'confirmPassword') {
      setPasswordError(validatePassword(passwordData.newPassword));
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      // Fix: Use the correct API endpoint that matches the server route
      const response = await Axios({
        ...SummaryApi.updateUserDetails,
        data: formData
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Profile updated successfully');
        if (response.data.data) {
          dispatch(setUserDetails(response.data.data));
        } else {
          dispatch(setUserDetails({ 
            ...user, 
            name: formData.name,
            email: formData.email,
            mobile: formData.mobile 
          }));
        }
        setEmailSent(false);
        setPhoneOtpSent(false);
        setPhoneOtp('');
        setIsEditing(false);
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate password again before submitting
    const validateError = validatePassword(passwordData.newPassword);
    if (validateError) {
      setPasswordError(validateError);
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    
    try {
      setLoading(true);
      // Use the correct path without hardcoded localhost
      const response = await Axios({
        url: '/api/user/change-password',
        method: 'POST',
        data: {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }
      });
      
      if (response.data.success) {
        toast.success('Password changed successfully');
        // Clear the form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordError('');
      } else {
        toast.error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      // Show the specific error message from the server if available
      toast.error(error.response?.data?.message || 'Current password is incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { label: '', color: '', width: '0%' };
    
    const length = password.length;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    const count = [length >= 8, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    
    switch (count) {
      case 1:
        return { label: 'Very Weak', color: 'bg-red-500', width: '20%' };
      case 2:
        return { label: 'Weak', color: 'bg-orange-500', width: '40%' };
      case 3:
        return { label: 'Fair', color: 'bg-yellow-500', width: '60%' };
      case 4:
        return { label: 'Good', color: 'bg-plum-500', width: '80%' };
      case 5:
        return { label: 'Strong', color: 'bg-green-500', width: '100%' };
      default:
        return { label: '', color: '', width: '0%' };
    }
  };

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || ''
      });
    }
  }, [user]);

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  // Format date function for better display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Add function to request email verification
  const handleRequestVerification = async () => {
    try {
      setVerifyingEmail(true);
      const response = await Axios({
        ...SummaryApi.sendVerificationEmail,
        data: { 
          email: user.email,
        }
      });
      
      if (response.data.success) {
        setEmailSent(true);
        toast.success(response.data.message || 'Verification email sent.');
      } else {
        toast.error(response.data.message || 'Failed to verify email');
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      toast.error(error.response?.data?.message || 'Failed to verify email');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const targetPhone = (formData.mobile || user.mobile || '').trim();

    if (!targetPhone) {
      toast.error('Add your phone number first.');
      return;
    }

    try {
      setVerifyingPhone(true);
      const response = await Axios({
        ...SummaryApi.requestPhoneVerificationOtp,
        data: { mobile: targetPhone }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Phone verification code sent.');
        setPhoneOtpSent(true);
      } else {
        toast.error(response.data.message || 'Unable to send phone verification code.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send phone verification code.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) {
      toast.error('Enter the phone verification code first.');
      return;
    }

    try {
      setConfirmingPhone(true);
      const response = await Axios({
        ...SummaryApi.verifyPhoneOtp,
        data: { otp: phoneOtp.trim() }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Phone number verified.');
        dispatch(setUserDetails({
          ...user,
          mobile_verified: true
        }));
        setPhoneOtp('');
      } else {
        toast.error(response.data.message || 'Unable to verify phone code.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to verify phone code.');
    } finally {
      setConfirmingPhone(false);
    }
  };

  return (
    <div className="min-h-full w-full">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
      {!user || Object.keys(user).length === 0 ? (
        <div className="rounded-card border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card shadow-hover p-8 sm:p-10 text-center">
          <h2 className="text-xl font-bold text-plum-700 dark:text-plum-300 mb-3">Unable to load profile</h2>
          <p className="text-charcoal dark:text-white/80 mb-2">We couldn&apos;t load your account information.</p>
          <p className="text-sm text-brown-500 dark:text-white/50">
            Try refreshing the page or signing in again if your session expired.
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-brown-100 dark:border-dm-border shadow-hover overflow-hidden bg-white dark:bg-dm-card">
          <div className="bg-gradient-to-br from-plum-900 via-plum-700 to-charcoal px-5 sm:px-8 pt-8 pb-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display italic text-gold-300 text-sm mb-1">Nawiri Hair</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">My Account</h1>
              </div>
              {activeTab === 'profile' && !isEditing && (
                <button
                  type="button"
                  onClick={handleEditProfile}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-pill text-sm font-medium transition-colors border border-white/25"
                >
                  <FaEdit size={14} /> Edit profile
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2 mt-8">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`py-2.5 px-4 font-medium text-sm rounded-t-lg transition flex items-center gap-2 ${
                  activeTab === 'profile'
                    ? 'bg-ivory dark:bg-dm-card text-plum-800 dark:text-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]'
                    : 'text-white/85 hover:text-white hover:bg-white/10 rounded-t-lg'
                }`}
              >
                <FaUser /> Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('royal')}
                className={`py-2.5 px-4 font-medium text-sm rounded-t-lg transition flex items-center gap-2 ${
                  activeTab === 'royal'
                    ? 'bg-ivory dark:bg-dm-card text-plum-800 dark:text-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]'
                    : 'text-white/85 hover:text-white hover:bg-white/10 rounded-t-lg'
                }`}
              >
                <FaCrown className="text-gold-400" /> Royal Card
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`py-2.5 px-4 font-medium text-sm rounded-t-lg transition flex items-center gap-2 ${
                  activeTab === 'security'
                    ? 'bg-ivory dark:bg-dm-card text-plum-800 dark:text-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]'
                    : 'text-white/85 hover:text-white hover:bg-white/10 rounded-t-lg'
                }`}
              >
                <FaShieldAlt /> Security
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-8 bg-ivory dark:bg-dm-surface/50">
            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-plum-100 to-blush-100 dark:from-plum-900/50 dark:to-plum-800/30 ring-2 ring-plum-200/80 dark:ring-plum-700 flex items-center justify-center overflow-hidden relative group">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name || 'User'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className="text-plum-400 dark:text-plum-500 text-4xl" />
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                               onClick={() => setShowAvatarEdit(true)}>
                            <div className="text-white text-center">
                              <FaCamera className="mx-auto mb-1" size={20} />
                              <span className="text-xs">Change</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-grow w-full min-w-0">
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-charcoal dark:text-white/80 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2.5 border border-brown-200 dark:border-dm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 bg-white dark:bg-dm-card text-charcoal dark:text-white"
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-charcoal dark:text-white/80 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2.5 border border-brown-200 dark:border-dm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 bg-white dark:bg-dm-card text-charcoal dark:text-white"
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-charcoal dark:text-white/80 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2.5 border border-brown-200 dark:border-dm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 bg-white dark:bg-dm-card text-charcoal dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          // Reset form data to current user data
                          setFormData({
                            name: user.name || '',
                            email: user.email || '',
                            mobile: user.mobile || ''
                          });
                        }}
                        className="px-4 py-2.5 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white/80 rounded-pill hover:bg-plum-50 dark:hover:bg-plum-900/25 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center justify-center px-5 py-2.5 bg-plum-700 hover:bg-plum-600 text-white rounded-pill font-medium transition-colors disabled:opacity-60"
                      >
                        {loading ? (
                          <FaSpinner className="animate-spin mr-2" />
                        ) : (
                          <FaSave className="mr-2" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="rounded-card border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 shadow-sm">
                    <div className="flex items-start gap-4 sm:gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-plum-100 to-blush-100 dark:from-plum-900/50 dark:to-plum-800/30 ring-2 ring-plum-200/80 dark:ring-plum-700 flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name || 'User'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className="text-plum-400 dark:text-plum-500 text-4xl sm:text-5xl" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <h2 className="text-xl sm:text-2xl font-semibold text-charcoal dark:text-white">{user.name}</h2>
                        <p className="text-brown-600 dark:text-white/65 mt-1 flex items-center gap-2">
                          <FaEnvelope className="text-plum-500 shrink-0 text-sm" />
                          {user.email}
                        </p>
                        {user.mobile && (
                          <p className="text-brown-600 dark:text-white/65 mt-1 text-sm">{user.mobile}</p>
                        )}
                      </div>
                    </div>
                    </div>
                    
                    <div className="border-t border-brown-100 dark:border-dm-border mt-6 pt-6">
                      <div className="rounded-card border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-4">Account Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                          <p className="text-sm text-brown-500 dark:text-white/50">Account Created</p>
                          <p className="font-medium text-charcoal dark:text-white">
                            {user.createdAt 
                              ? formatDate(user.createdAt)
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-brown-500 dark:text-white/50">Account Type</p>
                          <div className="flex items-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.isAdmin || user.role === 'admin' 
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' 
                                : user.isDelivery || user.role === 'delivery'
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-plum-100 dark:bg-plum-900 text-plum-800 dark:text-plum-200'
                            }`}>
                              {user.isAdmin || user.role === 'admin' 
                                ? 'Administrator' 
                                : user.isDelivery || user.role === 'delivery'
                                  ? 'Delivery Personnel'
                                  : 'Customer'}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-brown-500 dark:text-white/50">Last Login</p>
                          <p className="font-medium text-charcoal dark:text-white">
                            {user.lastLogin 
                              ? formatDate(user.lastLogin)
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-brown-500 dark:text-white/50">Email Verified</p>
                          <div className="flex flex-col">
                            {user.emailVerified || user.verify_email ? (
                              <span className="text-green-600 dark:text-green-400 flex items-center">
                                <FaCheck className="mr-1" /> Verified
                              </span>
                            ) : (
                              <>
                                <span className="text-orange-600 dark:text-orange-400 flex items-center mb-1">
                                  <FaExclamationTriangle className="mr-1" /> Not Verified
                                </span>
                                {emailSent ? (
                                  <span className="text-sm text-green-600 dark:text-green-400">
                                    Verification email sent. Please check your inbox.
                                  </span>
                                ) : (
                                  <button
                                    onClick={handleRequestVerification}
                                    disabled={verifyingEmail}
                                    className="mt-1 text-sm flex items-center font-semibold text-plum-700 hover:text-plum-600 dark:text-plum-300 dark:hover:text-plum-200"
                                  >
                                    {verifyingEmail ? (
                                      <>
                                        <FaSpinner className="animate-spin mr-1" /> Sending...
                                      </>
                                    ) : (
                                      <>
                                        <FaEnvelope className="mr-1" /> Verify Now
                                      </>
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-brown-500 dark:text-white/50">Phone Verified</p>
                          <div className="flex flex-col">
                            {user.mobile_verified ? (
                              <span className="text-green-600 dark:text-green-400 flex items-center">
                                <FaCheck className="mr-1" /> Verified
                              </span>
                            ) : (
                              <>
                                <span className="text-orange-600 dark:text-orange-400 flex items-center mb-1">
                                  <FaExclamationTriangle className="mr-1" /> Not Verified
                                </span>
                                <button
                                  onClick={handleSendPhoneOtp}
                                  disabled={verifyingPhone}
                                  className="mt-1 text-sm flex items-center font-semibold text-plum-700 hover:text-plum-600 dark:text-plum-300 dark:hover:text-plum-200"
                                >
                                  {verifyingPhone ? (
                                    <>
                                      <FaSpinner className="animate-spin mr-1" /> Sending code...
                                    </>
                                  ) : (
                                    'Send phone code'
                                  )}
                                </button>
                                {phoneOtpSent && (
                                  <div className="mt-3 flex flex-col gap-2 sm:max-w-xs">
                                    <input
                                      type="text"
                                      value={phoneOtp}
                                      onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                      placeholder="Enter 6-digit code"
                                      className="w-full rounded-lg border border-brown-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-plum-500/30 dark:border-dm-border dark:bg-dm-card dark:text-white"
                                    />
                                    <button
                                      onClick={handleVerifyPhoneOtp}
                                      disabled={confirmingPhone}
                                      className="inline-flex items-center justify-center rounded-pill bg-plum-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum-600 disabled:opacity-60"
                                    >
                                      {confirmingPhone ? 'Verifying...' : 'Confirm phone code'}
                                    </button>
                                    <p className="text-xs text-brown-500 dark:text-white/45">
                                      The verification code is sent to your email inbox for now, then linked back to your phone number.
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-brown-100 dark:border-dm-border mt-6 pt-6">
                      <div className="rounded-card border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-4">Notification Preferences</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FaBell className="text-plum-500 dark:text-plum-400" />
                            <span className="text-charcoal dark:text-white/90">Email Notifications</span>
                          </div>
                          <div className="relative w-12 h-6 transition duration-200 ease-linear rounded-full">
                            <label htmlFor="email-notifications" className="w-12 h-6 flex items-center bg-brown-200 dark:bg-dm-border rounded-full p-1 cursor-pointer transition duration-200 ease-in-out">
                              <div className="bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out" style={{ transform: `translateX(${user.emailNotifications ? '24px' : '0'})` }}></div>
                            </label>
                            <input 
                              type="checkbox" 
                              id="email-notifications" 
                              className="opacity-0 absolute" 
                              defaultChecked={user.emailNotifications}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FaBell className="text-plum-500 dark:text-plum-400" />
                            <span className="text-charcoal dark:text-white/90">Order Updates</span>
                          </div>
                          <div className="relative w-12 h-6 transition duration-200 ease-linear rounded-full">
                            <label htmlFor="order-updates" className="w-12 h-6 flex items-center bg-brown-200 dark:bg-dm-border rounded-full p-1 cursor-pointer transition duration-200 ease-in-out">
                              <div className="bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out" style={{ transform: `translateX(${user.orderUpdates ? '24px' : '0'})` }}></div>
                            </label>
                            <input 
                              type="checkbox" 
                              id="order-updates" 
                              className="opacity-0 absolute" 
                              defaultChecked={user.orderUpdates}
                            />
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Royal Card Tab Content */}
            {activeTab === 'royal' && <RoyalCard />}

            {/* Security Tab Content */}
            {activeTab === 'security' && (
              <div className="max-w-xl mx-auto">
                <div className="rounded-card border border-plum-200 dark:border-plum-800 bg-plum-50/80 dark:bg-plum-900/25 p-4 sm:p-5 mb-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-pill bg-plum-700 text-white flex items-center justify-center">
                      <FaShieldAlt className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-charcoal dark:text-white">Account security</h3>
                      <p className="mt-1 text-sm text-brown-600 dark:text-white/60 leading-relaxed">
                        Use a strong password and update it from time to time to keep your Nawiri Hair account safe.
                      </p>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleChangePassword} className="space-y-5 rounded-card border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-charcoal dark:text-white">Change password</h3>
                  
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-charcoal dark:text-white/80 mb-1">
                      Current password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full pl-10 pr-10 py-2.5 border border-brown-200 dark:border-dm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 bg-white dark:bg-dm-card text-charcoal dark:text-white"
                      />
                      <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400 dark:text-white/40" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brown-400 hover:text-plum-600 dark:text-white/50 dark:hover:text-white focus:outline-none"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-charcoal dark:text-white/80 mb-1">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full pl-10 pr-10 py-2.5 border border-brown-200 dark:border-dm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 bg-white dark:bg-dm-card text-charcoal dark:text-white"
                      />
                      <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400 dark:text-white/40" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brown-400 hover:text-plum-600 dark:text-white/50 dark:hover:text-white focus:outline-none"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                    {/* Password strength meter */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="w-full bg-brown-100 dark:bg-dm-border rounded-full h-2">
                          <div
                            className={`${passwordStrength.color} h-2 rounded-full`}
                            style={{ width: passwordStrength.width }}
                          ></div>
                        </div>
                        <p className="text-xs mt-1 text-brown-600 dark:text-white/50">
                          Password strength: {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal dark:text-white/80 mb-1">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full pl-10 pr-10 py-2.5 border border-brown-200 dark:border-dm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 bg-white dark:bg-dm-card text-charcoal dark:text-white"
                      />
                      <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brown-400 dark:text-white/40" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brown-400 hover:text-plum-600 dark:text-white/50 dark:hover:text-white focus:outline-none"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                  </div>
                  
                  {passwordError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 rounded-lg text-sm border border-red-100 dark:border-red-900/50">
                      <FaExclamationTriangle className="inline mr-2" />
                      {passwordError}
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !!passwordError}
                      className={`flex items-center justify-center px-5 py-2.5 bg-plum-700 font-medium ${
                        loading || passwordError ? 'opacity-70 cursor-not-allowed' : 'hover:bg-plum-600'
                      } text-white rounded-pill transition-colors`}
                    >
                      {loading ? (
                        <FaSpinner className="animate-spin mr-2" />
                      ) : (
                        <FaKey className="mr-2" />
                      )}
                      Change Password
                    </button>
                  </div>
                </form>
                
                <div className="mt-8 border-t border-brown-100 dark:border-dm-border pt-6">
                  <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-4">Account recovery</h3>
                  <div className="mb-6">
                    <p className="text-sm text-brown-600 dark:text-white/55 mb-2 leading-relaxed">
                      If you forget your password, you can recover your account using your registered email address.
                    </p>
                    <a href="/forgot-password" className="text-plum-700 hover:text-plum-600 dark:text-plum-300 dark:hover:text-plum-200 text-sm font-semibold underline underline-offset-2">
                      I forgot my password →
                    </a>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-gold-50/90 dark:bg-gold-900/15 text-charcoal dark:text-gold-200/90 rounded-card text-sm border border-gold-200/80 dark:border-gold-800/40">
                    <div className="flex-shrink-0 pt-0.5">
                      <FaExclamationTriangle />
                    </div>
                    <p>
                      For your security, never share your password with anyone. Our staff will never ask you for your password.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Avatar Edit Modal */}
      {showAvatarEdit && <UserProfileAvatarEdit close={() => setShowAvatarEdit(false)} />}
      </div>
    </div>
  );
};

export default UserProfile;

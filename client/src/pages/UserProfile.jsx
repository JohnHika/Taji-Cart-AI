import { useEffect, useState } from 'react';
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
import { getAccountTypeMeta } from '../utils/userRole';

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
      return new Date(dateString).toLocaleString('en-KE', {
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

  const accountCreatedAt = user.createdAt || user.created_at;
  const lastLoginAt = user.lastLogin || user.last_login_date;
  const accountTypeMeta = getAccountTypeMeta(user);

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
    <div className="min-h-full w-full bg-gradient-to-b from-ivory via-ivory to-blush-50/30 dark:from-dm-surface dark:via-dm-surface dark:to-dm-background">
      <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-6 md:px-5 md:py-8 lg:px-6">
      {!user || Object.keys(user).length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl border border-brown-100/60 dark:border-dm-border bg-white/95 dark:bg-dm-card backdrop-blur-sm shadow-lg shadow-plum-900/5 p-6 sm:p-8 md:p-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5 rounded-full bg-gradient-to-br from-plum-100 to-blush-100 dark:from-plum-900/50 dark:to-plum-800/30 flex items-center justify-center">
            <FaUser className="text-2xl sm:text-3xl text-plum-400 dark:text-plum-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-plum-700 dark:text-plum-300 mb-2 sm:mb-3">Unable to load profile</h2>
          <p className="text-charcoal dark:text-white/80 mb-2">We couldn&apos;t load your account information.</p>
          <p className="text-sm text-brown-500 dark:text-white/50">
            Try refreshing the page or signing in again if your session expired.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl border border-brown-100/60 dark:border-dm-border shadow-xl shadow-plum-900/8 dark:shadow-black/20 overflow-hidden bg-white/98 dark:bg-dm-card backdrop-blur-sm">
          {/* Elegant Header with Gradient */}
          <div className="relative bg-gradient-to-br from-plum-900 via-plum-800 to-plum-950 px-4 pt-7 pb-0 sm:px-5 sm:pt-8 md:px-6 md:pt-9 overflow-hidden">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 sm:w-80 sm:h-80 bg-gold-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-64 sm:h-64 bg-blush-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
            </div>
            <div className="relative flex flex-wrap items-start justify-between gap-3 sm:gap-4">
              <div>
                <p className="font-display italic text-gold-300/90 text-xs sm:text-sm mb-1.5 tracking-wide">Nawiri Hair</p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">My Account</h1>
              </div>
              {activeTab === 'profile' && !isEditing && (
                <button
                  type="button"
                  onClick={handleEditProfile}
                  className="flex items-center gap-2 bg-white/12 hover:bg-white/22 active:bg-white/28 text-white px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <FaEdit size={14} /> Edit profile
                </button>
              )}
            </div>

            {/* Elegant Tab Navigation */}
            <div className="relative mt-7 sm:mt-8 flex gap-0.5 sm:gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`relative py-2.5 sm:py-3 px-3 sm:px-5 font-semibold text-xs sm:text-sm rounded-t-xl sm:rounded-t-2xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                  activeTab === 'profile'
                    ? 'bg-ivory dark:bg-dm-surface/80 text-plum-800 dark:text-white shadow-[0_-6px_20px_rgba(0,0,0,0.12)] z-10 scale-[1.02]'
                    : 'text-white/80 hover:text-white hover:bg-white/8 active:bg-white/15'
                }`}
              >
                <FaUser className="text-xs sm:text-base shrink-0" /> 
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('royal')}
                className={`relative py-2.5 sm:py-3 px-3 sm:px-5 font-semibold text-xs sm:text-sm rounded-t-xl sm:rounded-t-2xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                  activeTab === 'royal'
                    ? 'bg-ivory dark:bg-dm-surface/80 text-plum-800 dark:text-white shadow-[0_-6px_20px_rgba(0,0,0,0.12)] z-10 scale-[1.02]'
                    : 'text-white/80 hover:text-white hover:bg-white/8 active:bg-white/15'
                }`}
              >
                <FaCrown className="text-gold-400 text-xs sm:text-base shrink-0" /> 
                <span>Royal Card</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`relative py-2.5 sm:py-3 px-3 sm:px-5 font-semibold text-xs sm:text-sm rounded-t-xl sm:rounded-t-2xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                  activeTab === 'security'
                    ? 'bg-ivory dark:bg-dm-surface/80 text-plum-800 dark:text-white shadow-[0_-6px_20px_rgba(0,0,0,0.12)] z-10 scale-[1.02]'
                    : 'text-white/80 hover:text-white hover:bg-white/8 active:bg-white/15'
                }`}
              >
                <FaShieldAlt className="text-xs sm:text-base shrink-0" /> 
                <span>Security</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-ivory p-4 dark:bg-dm-surface/50 sm:p-5 md:p-6 lg:p-8">
            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
              <div className="space-y-5 sm:space-y-6 md:space-y-8">
                {isEditing ? (
                  <div className="space-y-5 sm:space-y-6">
                    {/* Mobile-First Editing Layout */}
                    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-5 sm:gap-6">
                      {/* Avatar Section - Centered on Mobile */}
                      <div className="shrink-0 flex flex-col items-center">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-plum-100 via-blush-50 to-plum-100 dark:from-plum-900/50 dark:to-plum-800/30 ring-4 ring-white dark:ring-dm-card shadow-xl shadow-plum-900/15 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                             onClick={() => setShowAvatarEdit(true)}>
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name || 'User'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className="text-plum-400 dark:text-plum-500 text-4xl sm:text-5xl" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <div className="text-white text-center">
                              <FaCamera className="mx-auto mb-0.5" size={18} />
                              <span className="text-xs font-medium">Change</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAvatarEdit(true)}
                          className="mt-3 text-sm font-medium text-plum-600 hover:text-plum-700 dark:text-plum-400 dark:hover:text-plum-300 flex items-center gap-1.5"
                        >
                          <FaCamera size={12} /> Change photo
                        </button>
                      </div>
                      
                      {/* Form Fields */}
                      <div className="flex-grow w-full min-w-0 space-y-4 sm:space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-charcoal dark:text-white/85 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3.5 sm:py-3 border-2 border-brown-200/80 dark:border-dm-border rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/40 focus:border-plum-400 bg-white dark:bg-dm-card text-charcoal dark:text-white text-base transition-all duration-200 placeholder:text-brown-400"
                            placeholder="Your full name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-charcoal dark:text-white/85 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3.5 sm:py-3 border-2 border-brown-200/80 dark:border-dm-border rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/40 focus:border-plum-400 bg-white dark:bg-dm-card text-charcoal dark:text-white text-base transition-all duration-200 placeholder:text-brown-400"
                            placeholder="your@email.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-charcoal dark:text-white/85 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3.5 sm:py-3 border-2 border-brown-200/80 dark:border-dm-border rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/40 focus:border-plum-400 bg-white dark:bg-dm-card text-charcoal dark:text-white text-base transition-all duration-200 placeholder:text-brown-400"
                            placeholder="+254 7XX XXX XXX"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Full Width on Mobile */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-2">
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
                        className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 border-2 border-brown-200 dark:border-dm-border text-charcoal dark:text-white/85 rounded-xl sm:rounded-full hover:bg-plum-50 dark:hover:bg-plum-900/25 font-semibold transition-all duration-200 text-base sm:text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="w-full sm:w-auto flex items-center justify-center px-6 py-3.5 sm:py-2.5 bg-gradient-to-r from-plum-700 to-plum-600 hover:from-plum-600 hover:to-plum-500 active:from-plum-800 active:to-plum-700 text-white rounded-xl sm:rounded-full font-semibold transition-all duration-200 disabled:opacity-60 shadow-lg shadow-plum-900/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 text-base sm:text-sm"
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
                    {/* Profile Hero Card - Elegant Mobile Layout */}
                    <div className="rounded-2xl sm:rounded-xl border border-brown-100/60 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 md:p-7 shadow-md shadow-plum-900/5">
                      {/* Mobile: Centered Avatar Layout / Desktop: Side-by-Side */}
                      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5 sm:gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-28 h-28 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-plum-100 via-blush-50 to-plum-100 dark:from-plum-900/50 dark:to-plum-800/30 ring-4 ring-white dark:ring-dm-card shadow-xl shadow-plum-900/15 flex items-center justify-center overflow-hidden">
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
                        
                        <div className="flex-grow min-w-0 py-1">
                          <h2 className="text-2xl sm:text-xl md:text-2xl font-bold text-charcoal dark:text-white leading-tight">{user.name}</h2>
                          <p className="text-brown-600 dark:text-white/65 mt-2 sm:mt-1.5 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base">
                            <FaEnvelope className="text-plum-500 shrink-0 text-sm" />
                            <span className="truncate">{user.email}</span>
                          </p>
                          {user.mobile && (
                            <p className="text-brown-500 dark:text-white/55 mt-1.5 text-sm flex items-center justify-center sm:justify-start gap-2">
                              <span className="text-plum-400">📱</span>
                              {user.mobile}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Account Details Card */}
                    <div className="mt-5 sm:mt-6 md:mt-8">
                      <div className="rounded-2xl sm:rounded-xl border border-brown-100/60 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 md:p-7 shadow-md shadow-plum-900/5">
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-charcoal dark:text-white mb-5 sm:mb-6 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-plum-100 dark:bg-plum-900/40 flex items-center justify-center">
                            <FaUser className="text-plum-600 dark:text-plum-400 text-sm" />
                          </span>
                          Account Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-x-8 sm:gap-y-6">
                          {/* Account Created */}
                          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-plum-50/50 to-transparent dark:from-plum-900/20 dark:to-transparent border border-plum-100/50 dark:border-plum-800/30">
                            <p className="text-xs font-semibold text-plum-600 dark:text-plum-400 uppercase tracking-wider mb-1.5">Account Created</p>
                            <p className="font-semibold text-charcoal dark:text-white text-sm sm:text-base">
                              {accountCreatedAt 
                                ? formatDate(accountCreatedAt)
                                : 'N/A'}
                            </p>
                          </div>
                          
                          {/* Account Type */}
                          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-gold-50/50 to-transparent dark:from-gold-900/10 dark:to-transparent border border-gold-100/50 dark:border-gold-800/30">
                            <p className="text-xs font-semibold text-gold-700 dark:text-gold-400 uppercase tracking-wider mb-1.5">Account Type</p>
                            <div className="flex items-center">
                              <span className={`px-3 py-1.5 text-xs font-bold rounded-full tracking-wide ${accountTypeMeta.chipClass}`}>
                                {accountTypeMeta.type}
                              </span>
                            </div>
                          </div>
                          
                          {/* Last Login */}
                          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-blush-50/50 to-transparent dark:from-blush-900/10 dark:to-transparent border border-blush-100/50 dark:border-blush-800/30">
                            <p className="text-xs font-semibold text-blush-700 dark:text-blush-400 uppercase tracking-wider mb-1.5">Last Login</p>
                            <p className="font-semibold text-charcoal dark:text-white text-sm sm:text-base">
                              {lastLoginAt 
                                ? formatDate(lastLoginAt)
                                : 'N/A'}
                            </p>
                          </div>
                        
                          {/* Email Verified */}
                          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/10 dark:to-transparent border border-green-100/50 dark:border-green-800/30">
                            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1.5">Email Verified</p>
                            <div className="flex flex-col">
                              {user.emailVerified || user.verify_email ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center font-semibold text-sm">
                                  <FaCheck className="mr-1.5" /> Verified
                                </span>
                              ) : (
                                <>
                                  <span className="text-orange-600 dark:text-orange-400 flex items-center mb-2 font-medium text-sm">
                                    <FaExclamationTriangle className="mr-1.5" /> Not Verified
                                  </span>
                                  {emailSent ? (
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      ✓ Verification email sent!
                                    </span>
                                  ) : (
                                    <button
                                      onClick={handleRequestVerification}
                                      disabled={verifyingEmail}
                                      className="text-xs flex items-center font-bold text-plum-700 hover:text-plum-600 dark:text-plum-300 dark:hover:text-plum-200 transition-colors"
                                    >
                                      {verifyingEmail ? (
                                        <>
                                          <FaSpinner className="animate-spin mr-1" /> Sending...
                                        </>
                                      ) : (
                                        <>
                                          <FaEnvelope className="mr-1" /> Verify Now →
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Phone Verified */}
                          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent border border-blue-100/50 dark:border-blue-800/30">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1.5">Phone Verified</p>
                            <div className="flex flex-col">
                              {user.mobile_verified ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center font-semibold text-sm">
                                  <FaCheck className="mr-1.5" /> Verified
                                </span>
                              ) : (
                                <>
                                  <span className="text-orange-600 dark:text-orange-400 flex items-center mb-2 font-medium text-sm">
                                    <FaExclamationTriangle className="mr-1.5" /> Not Verified
                                  </span>
                                  <button
                                    onClick={handleSendPhoneOtp}
                                    disabled={verifyingPhone}
                                    className="text-xs flex items-center font-bold text-plum-700 hover:text-plum-600 dark:text-plum-300 dark:hover:text-plum-200 transition-colors"
                                  >
                                    {verifyingPhone ? (
                                      <>
                                        <FaSpinner className="animate-spin mr-1" /> Sending...
                                      </>
                                    ) : (
                                      'Send verification code →'
                                    )}
                                  </button>
                                  {phoneOtpSent && (
                                    <div className="mt-4 flex flex-col gap-3">
                                      <input
                                        type="text"
                                        value={phoneOtp}
                                        onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit code"
                                        className="w-full rounded-xl border-2 border-brown-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-plum-500/30 focus:border-plum-400 dark:border-dm-border dark:bg-dm-card dark:text-white transition-all"
                                      />
                                      <button
                                        onClick={handleVerifyPhoneOtp}
                                        disabled={confirmingPhone}
                                        className="w-full rounded-xl bg-gradient-to-r from-plum-700 to-plum-600 px-4 py-3 text-sm font-bold text-white transition-all hover:from-plum-600 hover:to-plum-500 disabled:opacity-60 shadow-md"
                                      >
                                        {confirmingPhone ? 'Verifying...' : 'Confirm Code'}
                                      </button>
                                      <p className="text-xs text-brown-500 dark:text-white/45 leading-relaxed">
                                        Code sent to your email, then linked to your phone.
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
                    
                    {/* Notification Preferences Card */}
                    <div className="mt-5 sm:mt-6 md:mt-8">
                      <div className="rounded-2xl sm:rounded-xl border border-brown-100/60 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 md:p-7 shadow-md shadow-plum-900/5">
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-charcoal dark:text-white mb-5 sm:mb-6 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                            <FaBell className="text-gold-600 dark:text-gold-400 text-sm" />
                          </span>
                          Notifications
                        </h3>
                        <div className="space-y-4">
                          {/* Email Notifications Toggle */}
                          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-plum-50/40 to-transparent dark:from-plum-900/15 dark:to-transparent border border-plum-100/40 dark:border-plum-800/20 hover:border-plum-200 dark:hover:border-plum-700/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-plum-100 dark:bg-plum-900/50 flex items-center justify-center">
                                <FaEnvelope className="text-plum-600 dark:text-plum-400 text-sm" />
                              </div>
                              <div>
                                <span className="font-semibold text-charcoal dark:text-white/90 text-sm sm:text-base">Email Notifications</span>
                                <p className="text-xs text-brown-500 dark:text-white/50 mt-0.5">Receive updates via email</p>
                              </div>
                            </div>
                            <div className="relative w-14 h-8 transition duration-200 ease-linear rounded-full shrink-0">
                              <label htmlFor="email-notifications" className="w-14 h-8 flex items-center bg-brown-200 dark:bg-dm-border rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out hover:bg-brown-300 dark:hover:bg-dm-border/80">
                                <div className="bg-white w-6 h-6 rounded-full shadow-lg transform duration-300 ease-in-out" style={{ transform: `translateX(${user.emailNotifications ? '24px' : '0'})` }}></div>
                              </label>
                              <input 
                                type="checkbox" 
                                id="email-notifications" 
                                className="opacity-0 absolute" 
                                defaultChecked={user.emailNotifications}
                              />
                            </div>
                          </div>
                          
                          {/* Order Updates Toggle */}
                          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gold-50/40 to-transparent dark:from-gold-900/10 dark:to-transparent border border-gold-100/40 dark:border-gold-800/20 hover:border-gold-200 dark:hover:border-gold-700/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center">
                                <FaBell className="text-gold-600 dark:text-gold-400 text-sm" />
                              </div>
                              <div>
                                <span className="font-semibold text-charcoal dark:text-white/90 text-sm sm:text-base">Order Updates</span>
                                <p className="text-xs text-brown-500 dark:text-white/50 mt-0.5">Track your order status</p>
                              </div>
                            </div>
                            <div className="relative w-14 h-8 transition duration-200 ease-linear rounded-full shrink-0">
                              <label htmlFor="order-updates" className="w-14 h-8 flex items-center bg-brown-200 dark:bg-dm-border rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out hover:bg-brown-300 dark:hover:bg-dm-border/80">
                                <div className="bg-white w-6 h-6 rounded-full shadow-lg transform duration-300 ease-in-out" style={{ transform: `translateX(${user.orderUpdates ? '24px' : '0'})` }}></div>
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
              <div className="max-w-xl mx-auto space-y-5 sm:space-y-6">
                {/* Security Info Banner */}
                <div className="relative overflow-hidden rounded-2xl sm:rounded-xl border border-plum-200/70 dark:border-plum-800 bg-gradient-to-br from-plum-50 via-plum-50/80 to-blush-50/50 dark:from-plum-900/30 dark:via-plum-900/25 dark:to-plum-900/15 p-5 sm:p-6 shadow-md shadow-plum-900/5">
                  {/* Decorative blur orb */}
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-plum-300/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start gap-4 relative">
                    <div className="flex-shrink-0 w-14 h-14 sm:w-12 sm:h-12 rounded-2xl sm:rounded-xl bg-gradient-to-br from-plum-600 to-plum-700 text-white flex items-center justify-center shadow-lg shadow-plum-600/30">
                      <FaShieldAlt className="h-6 w-6 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-sm font-bold tracking-tight text-charcoal dark:text-white">Account security</h3>
                      <p className="mt-1.5 sm:mt-1 text-sm text-brown-600 dark:text-white/60 leading-relaxed">
                        Use a strong password and update it from time to time to keep your Nawiri Hair account safe.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Change Password Form Card */}
                <form onSubmit={handleChangePassword} className="rounded-2xl sm:rounded-xl border border-brown-100/60 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 md:p-7 shadow-md shadow-plum-900/5 space-y-5 sm:space-y-4">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-charcoal dark:text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-brown-100 dark:bg-brown-800/30 flex items-center justify-center">
                      <FaKey className="text-brown-500 dark:text-brown-400 text-sm" />
                    </span>
                    Change password
                  </h3>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="currentPassword" className="block text-sm font-semibold text-charcoal dark:text-white/80">
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
                        className="w-full pl-11 pr-12 py-3.5 sm:py-3 border-2 border-brown-200/80 dark:border-dm-border rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 focus:border-plum-400/50 bg-ivory/50 dark:bg-dm-card text-charcoal dark:text-white text-base sm:text-sm transition-colors"
                        placeholder="Enter current password"
                      />
                      <FaKey className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brown-400 dark:text-white/40" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-brown-400 hover:text-plum-600 hover:bg-plum-50 dark:text-white/50 dark:hover:text-white dark:hover:bg-plum-900/30 rounded-full focus:outline-none transition-colors"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="newPassword" className="block text-sm font-semibold text-charcoal dark:text-white/80">
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
                        className="w-full pl-11 pr-12 py-3.5 sm:py-3 border-2 border-brown-200/80 dark:border-dm-border rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 focus:border-plum-400/50 bg-ivory/50 dark:bg-dm-card text-charcoal dark:text-white text-base sm:text-sm transition-colors"
                        placeholder="Enter new password"
                      />
                      <FaKey className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brown-400 dark:text-white/40" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-brown-400 hover:text-plum-600 hover:bg-plum-50 dark:text-white/50 dark:hover:text-white dark:hover:bg-plum-900/30 rounded-full focus:outline-none transition-colors"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                    {/* Password strength meter */}
                    {passwordData.newPassword && (
                      <div className="mt-3 p-3 rounded-xl bg-brown-50/70 dark:bg-dm-border/30 border border-brown-100/50 dark:border-dm-border/50">
                        <div className="w-full bg-brown-200/50 dark:bg-dm-border rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`${passwordStrength.color} h-2.5 rounded-full transition-all duration-300 ease-out`}
                            style={{ width: passwordStrength.width }}
                          ></div>
                        </div>
                        <p className="text-xs mt-2 font-medium text-brown-600 dark:text-white/50">
                          Strength: <span className="capitalize">{passwordStrength.label}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-charcoal dark:text-white/80">
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
                        className="w-full pl-11 pr-12 py-3.5 sm:py-3 border-2 border-brown-200/80 dark:border-dm-border rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-plum-500/35 focus:border-plum-400/50 bg-ivory/50 dark:bg-dm-card text-charcoal dark:text-white text-base sm:text-sm transition-colors"
                        placeholder="Re-enter new password"
                      />
                      <FaKey className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brown-400 dark:text-white/40" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-brown-400 hover:text-plum-600 hover:bg-plum-50 dark:text-white/50 dark:hover:text-white dark:hover:bg-plum-900/30 rounded-full focus:outline-none transition-colors"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                  </div>
                  
                  {passwordError && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 rounded-xl text-sm border border-red-200/80 dark:border-red-900/50 flex items-start gap-3">
                      <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !!passwordError}
                      className={`w-full sm:w-auto flex items-center justify-center px-6 sm:px-5 py-3.5 sm:py-2.5 bg-gradient-to-r from-plum-700 to-plum-600 font-semibold ${
                        loading || passwordError ? 'opacity-70 cursor-not-allowed' : 'hover:from-plum-600 hover:to-plum-500 active:scale-[0.98]'
                      } text-white rounded-xl sm:rounded-full shadow-lg shadow-plum-700/25 transition-all duration-200`}
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
                
                {/* Account Recovery Section */}
                <div className="rounded-2xl sm:rounded-xl border border-brown-100/60 dark:border-dm-border bg-white dark:bg-dm-card p-5 sm:p-6 shadow-md shadow-plum-900/5">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-charcoal dark:text-white mb-4 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FaEnvelope className="text-blue-500 dark:text-blue-400 text-sm" />
                    </span>
                    Account recovery
                  </h3>
                  <div className="mb-5">
                    <p className="text-sm text-brown-600 dark:text-white/55 mb-3 leading-relaxed">
                      If you forget your password, you can recover your account using your registered email address.
                    </p>
                    <a href="/forgot-password" className="inline-flex items-center gap-1.5 text-plum-700 hover:text-plum-600 dark:text-plum-300 dark:hover:text-plum-200 text-sm font-semibold group">
                      <span className="underline underline-offset-2">I forgot my password</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </a>
                  </div>
                  
                  {/* Security Warning */}
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-gold-50 to-gold-50/60 dark:from-gold-900/20 dark:to-gold-900/10 text-charcoal dark:text-gold-200/90 rounded-xl text-sm border border-gold-200/80 dark:border-gold-800/40">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gold-100 dark:bg-gold-800/40 flex items-center justify-center">
                      <FaExclamationTriangle className="text-gold-600 dark:text-gold-400" />
                    </div>
                    <p className="leading-relaxed pt-1">
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

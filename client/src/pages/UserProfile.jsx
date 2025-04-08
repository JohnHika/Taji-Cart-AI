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
import RoyalCard from '../components/RoyalCard';
import UserProfileAvatarEdit from '../components/UserProfileAvatarEdit';
import { setUserDetails } from '../store/userSlice'; // Changed from setUser to setUserDetails
import Axios from '../utils/Axios';

const UserProfile = () => {
  console.log("UserProfile component rendering");
  
  const user = useSelector((state) => {
    console.log("User from Redux:", state.user);
    return state.user;
  });
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'royal', or 'security'
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
        url: '/api/user/update-user',
        method: 'PUT',
        data: formData
      });
      
      if (response.data.success) {
        toast.success('Profile updated successfully');
        // Update user data in Redux store - Changed setUser to setUserDetails
        dispatch(setUserDetails({ 
          ...user, 
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile 
        }));
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
        return { label: 'Good', color: 'bg-blue-500', width: '80%' };
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
        url: '/api/user/verify-email',
        method: 'POST',
        data: { 
          email: user.email,
          code: user._id // The server expects a code parameter
        }
      });
      
      if (response.data.success) {
        setEmailSent(true);
        toast.success('Email verified successfully!');
        
        // Update user state to reflect verified status
        dispatch(setUserDetails({
          ...user,
          verify_email: true
        }));
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

  return (
    <div className="container mx-auto p-4">
      {/* Add a simple fallback message if there's an error */}
      {!user || Object.keys(user).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Profile</h2>
          <p className="mb-4">Unable to load user profile information.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This might be due to a session timeout or login issue. Try refreshing the page or logging in again.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* Header with background */}
          <div className="bg-gradient-to-r from-primary-100 to-primary-200 dark:from-primary-200 dark:to-primary-300 p-6 relative">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white mb-2">My Account</h1>
              {activeTab === 'profile' && !isEditing && (
                <button
                  onClick={handleEditProfile}
                  className="flex items-center bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded-md text-sm transition"
                >
                  <FaEdit className="mr-1" /> Edit
                </button>
              )}
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 mt-4 border-b border-white border-opacity-20">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-4 font-medium text-sm text-white rounded-t-md transition ${
                  activeTab === 'profile'
                    ? 'bg-white bg-opacity-20 border-b-2 border-white'
                    : 'hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <FaUser className="inline mr-2" /> Profile
              </button>
              <button
                onClick={() => setActiveTab('royal')}
                className={`py-2 px-4 font-medium text-sm text-white rounded-t-md transition ${
                  activeTab === 'royal' 
                    ? 'bg-white bg-opacity-20 border-b-2 border-white'
                    : 'hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <FaCrown className="inline mr-2" /> Royal Card
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-2 px-4 font-medium text-sm text-white rounded-t-md transition ${
                  activeTab === 'security' 
                    ? 'bg-white bg-opacity-20 border-b-2 border-white'
                    : 'hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <FaShieldAlt className="inline mr-2" /> Security
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-4">
                        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative group">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name || 'User'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className="text-gray-400 text-4xl" />
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
                      
                      <div className="flex-grow">
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 dark:bg-gray-700 dark:text-white"
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
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center justify-center px-4 py-2 bg-primary-200 hover:bg-primary-300 text-white rounded-md transition-colors"
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
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-4">
                        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name || 'User'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUser className="text-gray-400 text-4xl" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-grow">
                        <h2 className="text-xl font-semibold dark:text-white">{user.name}</h2>
                        <p className="text-gray-600 dark:text-gray-300">{user.email}</p>
                        {user.mobile && (
                          <p className="text-gray-600 dark:text-gray-300">{user.mobile}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6">
                      <h3 className="text-lg font-medium dark:text-white mb-4">Account Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Account Created</p>
                          <p className="font-medium dark:text-gray-200">
                            {user.createdAt 
                              ? formatDate(user.createdAt)
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Account Type</p>
                          <div className="flex items-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.isAdmin || user.role === 'admin' 
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' 
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            }`}>
                              {user.isAdmin || user.role === 'admin' ? 'Administrator' : 'Customer'}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Last Login</p>
                          <p className="font-medium dark:text-gray-200">
                            {user.lastLogin 
                              ? formatDate(user.lastLogin)
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Email Verified</p>
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
                                    className="mt-1 text-sm flex items-center text-primary-200 hover:text-primary-300 dark:text-primary-300 dark:hover:text-primary-400"
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
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6">
                      <h3 className="text-lg font-medium dark:text-white mb-4">Notification Preferences</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FaBell className="text-gray-500 dark:text-gray-400" />
                            <span className="dark:text-gray-200">Email Notifications</span>
                          </div>
                          <div className="relative w-12 h-6 transition duration-200 ease-linear rounded-full">
                            <label htmlFor="email-notifications" className="w-12 h-6 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 cursor-pointer transition duration-200 ease-in-out">
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
                            <FaBell className="text-gray-500 dark:text-gray-400" />
                            <span className="dark:text-gray-200">Order Updates</span>
                          </div>
                          <div className="relative w-12 h-6 transition duration-200 ease-linear rounded-full">
                            <label htmlFor="order-updates" className="w-12 h-6 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 cursor-pointer transition duration-200 ease-in-out">
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
                )}
              </div>
            )}

            {/* Royal Card Tab Content */}
            {activeTab === 'royal' && <RoyalCard />}

            {/* Security Tab Content */}
            {activeTab === 'security' && (
              <div className="max-w-xl mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 p-4 rounded-md mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaShieldAlt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Account Security</h3>
                      <div className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                        <p>Protect your account by using a strong password and changing it regularly.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <h3 className="text-lg font-medium dark:text-white">Change Password</h3>
                  
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 dark:bg-gray-700 dark:text-white"
                      />
                      <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 dark:bg-gray-700 dark:text-white"
                      />
                      <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                    {/* Password strength meter */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`${passwordStrength.color} h-2 rounded-full`}
                            style={{ width: passwordStrength.width }}
                          ></div>
                        </div>
                        <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                          Password Strength: {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 dark:bg-gray-700 dark:text-white"
                      />
                      <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                      </button>
                    </div>
                  </div>
                  
                  {passwordError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                      <FaExclamationTriangle className="inline mr-2" />
                      {passwordError}
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !!passwordError}
                      className={`flex items-center justify-center px-4 py-2 bg-primary-200 ${
                        loading || passwordError ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-300'
                      } text-white rounded-md transition-colors`}
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
                
                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium dark:text-white mb-4">Account Recovery</h3>
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      If you forget your password, you can recover your account using your registered email address.
                    </p>
                    <a href="/forgot-password" className="text-primary-200 hover:text-primary-300 dark:text-primary-300 dark:hover:text-primary-400 text-sm font-medium">
                      I forgot my password →
                    </a>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md text-sm">
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
  );
};

export default UserProfile;
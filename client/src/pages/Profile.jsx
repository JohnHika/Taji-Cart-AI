import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaExclamationTriangle, FaEye, FaEyeSlash, FaKey, FaLock, FaRegUserCircle, FaShieldAlt, FaSpinner, FaTruck, FaUser, FaUserShield, FaUserTie } from "react-icons/fa";
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import ActiveRewards from '../components/ActiveRewards';
import RoyalCard from '../components/RoyalCard';
import UserProfileAvatarEdit from '../components/UserProfileAvatarEdit';
import { logout, setUserDetails, updatedAvatar } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import fetchUserDetails from '../utils/fetchUserDetails';

const Profile = () => {
    const user = useSelector(state => state.user)
    const [openProfileAvatarEdit, setProfileAvatarEdit] = useState(false)
    const [userData, setUserData] = useState({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
    })
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('profile') // New state for active tab
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()

    // File Upload states
    const [selectedFile, setSelectedFile] = useState(null)
    const [avatarLoading, setAvatarLoading] = useState(false)
    const fileInputRef = React.useRef()

    // Password management states
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [passwordError, setPasswordError] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    useEffect(() => {
        setUserData({
            name: user.name || '',
            email: user.email || '',
            mobile: user.mobile || '',
        })
    }, [user])

    useEffect(() => {
        if (location.state?.passwordChanged) {
            handleLogout()
        }
    }, [location])

    const handleLogout = () => {
        toast.success("Password changed successfully. Please login with your new password.")
        dispatch(logout())
        navigate('/login')
    }

    const handleOnChange = (e) => {
        const { name, value } = e.target

        setUserData((preve) => {
            return {
                ...preve,
                [name]: value
            }
        })
    }

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
        if (!/[^A-Za-z0-9]/.test(password)) {
            return 'Password must contain at least one special character';
        }
        return '';
    };

    // Handle password strength indicator
    const getPasswordStrength = (password) => {
        if (!password) return { label: '', color: '', width: '0%' };
        
        const length = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        
        const count = [length, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
        
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

    const passwordStrength = getPasswordStrength(passwordData.newPassword);

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.updateUserDetails,
                data: userData
            })

            const { data: responseData } = response

            if (responseData.success) {
                toast.success(responseData.message)
                const userData = await fetchUserDetails()
                dispatch(setUserDetails(userData.data))
            }

        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    const handleChangePasswordRedirect = () => {
        navigate('/reset-password', { 
            state: { 
                email: userData.email,
                data: { success: true },
                returnToProfile: true
            }
        })
    }

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
            const response = await Axios.post('/api/user/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
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
            toast.error(error.response?.data?.message || 'Current password is incorrect');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        
        if (!file) return
        
        if (validateFile(file)) {
            setSelectedFile(file)
            uploadAvatar(file)
        }
    }
    
    const validateFile = (file) => {
        // Check if file is an image
        if (!file.type.match('image.*')) {
            toast.error('Please select an image file (JPEG, PNG, GIF, etc.)')
            return false
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB')
            return false
        }
        
        return true
    }
    
    const uploadAvatar = async (file) => {
        const formData = new FormData()
        formData.append('avatar', file)
        
        try {
            setAvatarLoading(true)
            toast.loading('Uploading avatar...')
            
            const response = await Axios({
                url: '/api/user/upload-avatar',
                method: 'PUT',
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            
            if (response.data.success) {
                dispatch(updatedAvatar(response.data.data.avatar))
                toast.success('Profile picture updated successfully')
                setSelectedFile(null)
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
            }
        } catch (error) {
            console.error('Upload error:', error)
            AxiosToastError(error)
        } finally {
            setAvatarLoading(false)
            toast.dismiss()
        }
    }

    // Add this helper function to determine account type with enhanced staff detection
    const getAccountType = (user) => {
        console.log("Determining account type for user:", user);
        
        // Check all possible staff indicators
        if (
            user.isStaff === true || 
            user.role === 'staff' || 
            user.userType === 'staff' ||
            user.accountType === 'staff' ||
            (typeof user.permissions === 'object' && user.permissions?.staff === true)
        ) {
            return { 
                type: 'Staff', 
                color: 'text-purple-600 dark:text-purple-400', 
                icon: <FaUserTie className="mr-1" /> 
            };
        }
        
        // Check for admin role
        if (
            user.isAdmin === true || 
            user.role === 'admin' || 
            user.userType === 'admin' ||
            user.accountType === 'admin'
        ) {
            return { 
                type: 'Admin', 
                color: 'text-red-600 dark:text-red-400', 
                icon: <FaUserShield className="mr-1" /> 
            };
        }
        
        // Check for delivery personnel
        if (
            user.isDelivery === true || 
            user.role === 'delivery' || 
            user.userType === 'delivery' ||
            user.accountType === 'delivery'
        ) {
            return { 
                type: 'Delivery Personnel', 
                color: 'text-blue-600 dark:text-blue-400', 
                icon: <FaTruck className="mr-1" /> 
            };
        }
        
        // Default to customer
        return { 
            type: 'Customer', 
            color: 'text-green-600 dark:text-green-400', 
            icon: <FaUser className="mr-1" /> 
        };
    };

    if (user.role === 'staff') {
        // Render profile settings for staff
        return (
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-200">
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white transition-colors duration-200">Profile Settings</h1>
                {/* Profile avatar and other settings */}
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6 dark:text-white">My Account</h1>
            
            {/* Tab Navigation */}
            <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-3 px-5 font-medium text-lg transition-colors duration-200 ${
                        activeTab === 'profile' 
                        ? 'text-green-800 dark:text-green-500 border-b-2 border-green-800 dark:border-green-500' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400'
                    }`}
                >
                    My Profile
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`py-3 px-5 font-medium text-lg transition-colors duration-200 ${
                        activeTab === 'security' 
                        ? 'text-green-800 dark:text-green-500 border-b-2 border-green-800 dark:border-green-500' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400'
                    }`}
                >
                    Security
                </button>
                <button
                    onClick={() => setActiveTab('royal-card')}
                    className={`py-3 px-5 font-medium text-lg transition-colors duration-200 ${
                        activeTab === 'royal-card' 
                        ? 'text-green-800 dark:text-green-500 border-b-2 border-green-800 dark:border-green-500' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400'
                    }`}
                >
                    Royal Card
                </button>
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={`py-3 px-5 font-medium text-lg transition-colors duration-200 ${
                        activeTab === 'rewards' 
                        ? 'text-green-800 dark:text-green-500 border-b-2 border-green-800 dark:border-green-500' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400'
                    }`}
                >
                    My Rewards
                </button>
            </div>
            
            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
                <div className='p-4 bg-white dark:bg-gray-900 transition-colors duration-200'>
                    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-200">
                        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white transition-colors duration-200">Profile Settings</h1>

                        {/* Profile avatar section */}
                        <div className="flex flex-col items-center mb-8">
                            <div className='w-24 h-24 bg-blue-50 dark:bg-gray-700 flex items-center justify-center rounded-full overflow-hidden border-2 border-primary-100 dark:border-primary-300 drop-shadow-sm transition-colors duration-200 relative group'>
                                {
                                    user.avatar ? (
                                        <img
                                            alt={user.name}
                                            src={user.avatar}
                                            className='w-full h-full object-cover'
                                        />
                                    ) : (
                                        <FaRegUserCircle size={75} className="text-gray-400 dark:text-gray-300 transition-colors duration-200" />
                                    )
                                }
                                
                                {/* Overlay for direct upload on hover */}
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
                                     onClick={() => fileInputRef.current?.click()}>
                                    <div className="text-white text-center">
                                        {avatarLoading ? (
                                            <FaSpinner className="animate-spin mx-auto mb-1" size={20} />
                                        ) : (
                                            <FaRegUserCircle className="mx-auto mb-1" size={20} />
                                        )}
                                        <span className="text-xs">Change</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* File input and upload button */}
                            <div className="mt-4 flex flex-col items-center">
                                <input 
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    ref={fileInputRef}
                                    className="hidden"
                                    disabled={avatarLoading}
                                />
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarLoading} 
                                    className='text-sm border border-primary-100 dark:border-primary-300 hover:border-primary-200 dark:hover:border-primary-200 hover:bg-primary-200 dark:hover:bg-primary-200/90 px-4 py-2 rounded-full transition-colors duration-200 text-gray-700 dark:text-white hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    {avatarLoading ? 'Uploading...' : 'Change Profile Picture'}
                                </button>
                                
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    JPEG, PNG or GIF (Max 5MB)
                                </p>
                            </div>
                        </div>

                        {
                            openProfileAvatarEdit && (
                                <UserProfileAvatarEdit close={() => setProfileAvatarEdit(false)} />
                            )
                        }

                        {/* Profile information form */}
                        <form className='grid gap-6 mt-6' onSubmit={handleSubmit}>
                            <div className='grid gap-2'>
                                <label className="font-medium text-gray-700 dark:text-gray-200 transition-colors duration-200">Name</label>
                                <input
                                    type='text'
                                    placeholder='Enter your name'
                                    className='p-3 bg-blue-50 dark:bg-gray-700 outline-none border dark:border-gray-600 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded-md text-gray-800 dark:text-white transition-colors duration-200'
                                    value={userData.name}
                                    name='name'
                                    onChange={handleOnChange}
                                    required
                                />
                            </div>
                            
                            <div className='grid gap-2'>
                                <label htmlFor='email' className="font-medium text-gray-700 dark:text-gray-200 transition-colors duration-200">Email</label>
                                <input
                                    type='email'
                                    id='email'
                                    placeholder='Enter your email'
                                    className='p-3 bg-blue-50 dark:bg-gray-700 outline-none border dark:border-gray-600 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded-md text-gray-800 dark:text-white transition-colors duration-200'
                                    value={userData.email}
                                    name='email'
                                    onChange={handleOnChange}
                                    required
                                />
                            </div>
                            
                            <div className='grid gap-2'>
                                <label htmlFor='mobile' className="font-medium text-gray-700 dark:text-gray-200 transition-colors duration-200">Mobile</label>
                                <input
                                    type='text'
                                    id='mobile'
                                    placeholder='Enter your mobile number'
                                    className='p-3 bg-blue-50 dark:bg-gray-700 outline-none border dark:border-gray-600 focus-within:border-primary-200 dark:focus-within:border-primary-300 rounded-md text-gray-800 dark:text-white transition-colors duration-200'
                                    value={userData.mobile}
                                    name='mobile'
                                    onChange={handleOnChange}
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
                                    Phone number with country code (e.g., +254712345678)
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Account Type
                                </label>
                                <div className="flex items-center">
                                    {(() => {
                                        const accountInfo = getAccountType(user);
                                        return (
                                            <span className={`flex items-center font-medium ${accountInfo.color}`}>
                                                {accountInfo.icon}
                                                {accountInfo.type}
                                            </span>
                                        );
                                    })()}
                                </div>
                                
                                {/* Debug info - only visible in development */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                                        <div>Role properties:</div>
                                        <div>- isStaff: {String(user.isStaff)}</div>
                                        <div>- role: {user.role || 'undefined'}</div>
                                        <div>- userType: {user.userType || 'undefined'}</div>
                                        <div>- accountType: {user.accountType || 'undefined'}</div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-2">
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className='w-full md:w-auto px-6 py-3 bg-green-800 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-md font-semibold transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed'
                                >
                                    {loading ? "Updating..." : "Update Profile"}
                                </button>
                            </div>
                        </form>

                        {/* Link to security section */}
                        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
                            <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white transition-colors duration-200">Account Security</h2>
                            
                            <div className="flex items-center justify-between">
                                <div className="text-gray-600 dark:text-gray-300 transition-colors duration-200">
                                    <p>Need to update your password?</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">Secure your account with a strong password</p>
                                </div>
                                
                                <button 
                                    onClick={() => setActiveTab('security')} 
                                    className='px-4 py-2 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-500 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white rounded-md transition-colors duration-200'
                                >
                                    Manage Security
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Security Tab Content */}
            {activeTab === 'security' && (
                <div className="bg-white dark:bg-gray-900 p-4 transition-colors duration-200">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-200">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white transition-colors duration-200">Security Settings</h2>
                            
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 p-4 rounded-md mb-6 transition-colors duration-200">
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
                                        <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        >
                                            {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
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
                                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                    {/* Password strength meter */}
                                    {passwordData.newPassword && (
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className={`${passwordStrength.color} h-2 rounded-full transition-all duration-300`}
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
                                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
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
                    </div>
                </div>
            )}
            
            {/* Royal Card Tab Content */}
            {activeTab === 'royal-card' && (
                <div className="bg-white dark:bg-gray-900 p-4 transition-colors duration-200">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white transition-colors duration-200">My Royal Card</h2>
                        
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
                            <RoyalCard />
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                            <h3 className="font-medium text-lg mb-2 dark:text-white">Royal Benefits</h3>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Tier</th>
                                        <th className="text-left py-2">Discount</th>
                                        <th className="text-left py-2">Benefits</th>
                                        <th className="text-left py-2">Required Points</th>
                                    </tr>
                                </thead>
                                <tbody className="dark:text-gray-300">
                                    <tr className="border-b">
                                        <td className="py-2">Basic</td>
                                        <td className="py-2">0%</td>
                                        <td className="py-2">Card membership</td>
                                        <td className="py-2">0</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Bronze</td>
                                        <td className="py-2">2%</td>
                                        <td className="py-2">Basic discount</td>
                                        <td className="py-2">500</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Silver</td>
                                        <td className="py-2">3%</td>
                                        <td className="py-2">Free delivery on orders over KES 5,000</td>
                                        <td className="py-2">1500</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Gold</td>
                                        <td className="py-2">5%</td>
                                        <td className="py-2">Free delivery + early access to sales</td>
                                        <td className="py-2">3,000</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2">Platinum</td>
                                        <td className="py-2">7%</td>
                                        <td className="py-2">All benefits + exclusive products</td>
                                        <td className="py-2">5,000</td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                <p>Earn 1 point for every KES 100 spent in our store.</p>
                                <p className="mt-1">Admin accounts automatically receive Platinum status.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Community Rewards Tab Content */}
            {activeTab === 'rewards' && (
                <div className="bg-white dark:bg-gray-900 p-4 transition-colors duration-200">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white transition-colors duration-200">My Rewards</h2>
                        
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Community Campaign Rewards</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">
                                    These are rewards you've earned by participating in community campaigns.
                                    You can apply them during checkout to receive discounts or other benefits.
                                </p>
                                
                                <ActiveRewards />
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">How Rewards Work</h3>
                                <div className="text-gray-600 dark:text-gray-300">
                                    <p className="mb-3">
                                        <strong>1. Participate in Community Campaigns</strong> - Make purchases, write reviews, or refer friends to contribute to community goals.
                                    </p>
                                    <p className="mb-3">
                                        <strong>2. Claim Your Rewards</strong> - Once a community goal is achieved, you can claim your reward if you participated.
                                    </p>
                                    <p className="mb-3">
                                        <strong>3. Use at Checkout</strong> - During checkout, you'll see your available rewards and can apply them to your purchase.
                                    </p>
                                    <p className="mb-3">
                                        <strong>4. Validity Period</strong> - Each reward has an expiry date. Make sure to use them before they expire!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Profile

import { Router } from 'express';
import { verifyPickupController } from '../controllers/order.controller.js';
import {
    blockUserController,
    changePassword,
    deleteUserController,
    forgotPasswordController,
    getAllCustomers,
    getAllUsersController,
    getStaffPermissionCatalog,
    getWishlist,
    loginController,
    logoutController,
    refreshToken,
    registerUserController,
    resetpassword,
    requestPhoneVerificationOtpController,
    scanLoyaltyCard,
    searchUsers,
    sendVerificationEmailController,
    adminSendVerificationEmailController,
    adminBulkSendVerificationController,
    setDeliveryRoleController,
    setStaffRoleController,
    toggleWishlist,
    unblockUserController,
    updateUserDetails,
    updateUserRoleController,
    updateStaffPermissionsController,
    uploadAvatar,
    userDetails,
    verifyEmailController,
    verifyPhoneOtpController,
    verifyForgotPasswordOtp
} from '../controllers/user.controller.js';
import { admin } from '../middleware/Admin.js';
import auth from '../middleware/auth.js';
import { delivery } from '../middleware/Delivery.js';
import staff from '../middleware/Staff.js';
import { requireStaffPermission } from '../middleware/requireStaffPermission.js';
import upload from '../middleware/multer.js';

const userRouter = Router()

// Public routes
userRouter.post('/register', registerUserController)
userRouter.post('/verify-email', verifyEmailController)
userRouter.post('/send-verification-email', sendVerificationEmailController)
userRouter.post('/login', loginController)
userRouter.get('/logout', logoutController)
userRouter.put('/forgot-password', forgotPasswordController)
userRouter.put('/verify-forgot-password-otp', verifyForgotPasswordOtp)
userRouter.put('/reset-password', resetpassword)
userRouter.post('/refresh-token', refreshToken)

// Authenticated user routes
userRouter.get('/user-details', auth, userDetails)
userRouter.put('/upload-avatar', auth, upload.single('avatar'), uploadAvatar)
userRouter.put('/update-user', auth, updateUserDetails)
userRouter.post('/change-password', auth, changePassword)
userRouter.post('/request-phone-verification-otp', auth, requestPhoneVerificationOtpController)
userRouter.post('/verify-phone-otp', auth, verifyPhoneOtpController)
userRouter.get('/wishlist', auth, getWishlist)
userRouter.post('/wishlist/toggle', auth, toggleWishlist)

// Admin routes
userRouter.get('/admin/users/search', auth, admin, searchUsers)
userRouter.get('/admin/users', auth, admin, getAllUsersController)
userRouter.put('/admin/update-role', auth, admin, updateUserRoleController)
userRouter.put('/admin/set-delivery', auth, admin, setDeliveryRoleController)
userRouter.put('/admin/set-staff', auth, admin, setStaffRoleController)
userRouter.get('/admin/staff-permissions', auth, admin, getStaffPermissionCatalog)
userRouter.put('/admin/staff-permissions', auth, admin, updateStaffPermissionsController)
userRouter.put('/admin/block-user', auth, admin, blockUserController)
userRouter.put('/admin/unblock-user', auth, admin, unblockUserController)
userRouter.delete('/admin/delete-user/:userId', auth, admin, deleteUserController)
userRouter.post('/admin/send-verification-email', auth, admin, adminSendVerificationEmailController)
userRouter.post('/admin/bulk-send-verification', auth, admin, adminBulkSendVerificationController)

// Delivery routes
userRouter.get('/delivery/profile', auth, delivery, userDetails)

// Staff routes
userRouter.post('/staff/verify-pickup', auth, staff, requireStaffPermission('pickup.verify_code'), verifyPickupController);
userRouter.get('/search', auth, staff, requireStaffPermission('customer.search'), searchUsers);
userRouter.get('/customers', auth, staff, requireStaffPermission('customer.view_contact'), getAllCustomers);
userRouter.post('/scan-loyalty-card', auth, staff, requireStaffPermission('loyalty.scan'), scanLoyaltyCard);

export default userRouter

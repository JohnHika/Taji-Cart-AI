import { Router } from 'express';
import { verifyPickupController } from '../controllers/order.controller.js';
import {
    blockUserController,
    changePassword,
    deleteUserController,
    forgotPasswordController,
    getAllUsersController,
    loginController,
    logoutController,
    refreshToken,
    registerUserController,
    resetpassword,
    searchUsers,
    setDeliveryRoleController,
    setStaffRoleController,
    unblockUserController,
    updateUserDetails,
    updateUserRoleController,
    uploadAvatar,
    userDetails,
    verifyEmailController,
    verifyForgotPasswordOtp
} from '../controllers/user.controller.js';
import { admin } from '../middleware/Admin.js';
import auth from '../middleware/auth.js';
import { delivery } from '../middleware/Delivery.js';
import upload from '../middleware/multer.js';

const userRouter = Router()

// Public routes
userRouter.post('/register', registerUserController)
userRouter.post('/verify-email', verifyEmailController)
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

// Admin routes
userRouter.get('/admin/users/search', auth, admin, searchUsers)
userRouter.get('/admin/users', auth, admin, getAllUsersController)
userRouter.put('/admin/update-role', auth, admin, updateUserRoleController)
userRouter.put('/admin/set-delivery', auth, admin, setDeliveryRoleController)
userRouter.put('/admin/set-staff', auth, admin, setStaffRoleController)
userRouter.put('/admin/block-user', auth, admin, blockUserController)
userRouter.put('/admin/unblock-user', auth, admin, unblockUserController)
userRouter.delete('/admin/delete-user/:userId', auth, admin, deleteUserController)

// Delivery routes
userRouter.get('/delivery/profile', auth, delivery, userDetails)

// Staff routes
userRouter.post('/staff/verify-pickup', auth, verifyPickupController);

export default userRouter
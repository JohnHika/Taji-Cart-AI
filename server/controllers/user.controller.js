import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sendEmail from '../config/sendEmail.js'
import LoyaltyCard from '../models/loyaltycard.model.js'
import UserModel from '../models/user.model.js'
import { nawiriBrand } from '../utils/brand.js'
import { renderAccountNoticeEmail } from '../utils/emailTemplates.js'
import { normalizeEmail, validateEmailAddress } from '../utils/emailValidation.js'
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js'
import generatedAccessToken from '../utils/generatedAccessToken.js'
import generatedOtp from '../utils/generatedOtp.js'
import genertedRefreshToken from '../utils/generatedRefreshToken.js'
import { sendVerificationEmail } from '../utils/sendVerificationEmail.js'
import uploadImageClodinary from '../utils/uploadImageClodinary.js'

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/

const normalizePhoneNumber = (value = '') => {
    const digits = String(value).replace(/\D/g, '')

    if (!digits) {
        return ''
    }

    if (digits.startsWith('254') && digits.length === 12) {
        return `0${digits.slice(3)}`
    }

    if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
        return `0${digits}`
    }

    return digits
}

const isValidKenyanPhone = (value = '') => /^(07|01)\d{8}$/.test(normalizePhoneNumber(value))

const maskPhoneNumber = (value = '') => {
    const normalized = normalizePhoneNumber(value)

    if (normalized.length < 4) {
        return normalized
    }

    return `${normalized.slice(0, 4)} ${'*'.repeat(Math.max(normalized.length - 7, 1))}${normalized.slice(-3)}`
}

const sendPhoneVerificationCodeEmail = async ({ user, phoneNumber, otp }) =>
    sendEmail({
        sendTo: user.email,
        subject: 'Verify your Nawiri Hair Kenya phone number',
        html: renderAccountNoticeEmail({
            name: user.name,
            title: 'Confirm your phone number',
            intro: 'Use the one-time code below to verify the phone number linked to your Nawiri Hair Kenya account.',
            infoRows: [
                { label: 'Phone number', value: phoneNumber },
                { label: 'Verification code', value: otp },
                { label: 'Validity', value: '10 minutes' },
            ],
            highlights: [
                'For now, the verification code is delivered to your email so your team can keep testing securely.',
                'Once an SMS provider is configured, the same verification flow can send the code directly to the phone number.',
            ],
        }),
    })

export async function registerUserController(request,response){
    try {
        const { name, email , password } = request.body

        if(!name || !email || !password){
            return response.status(400).json({
                message : "provide email, name, password",
                error : true,
                success : false
            })
        }

        const trimmedName = name.trim()

        if (!trimmedName) {
            return response.status(400).json({
                message: 'Name is required.',
                error: true,
                success: false
            })
        }

        const emailValidation = await validateEmailAddress(email)

        if (!emailValidation.valid) {
            return response.status(400).json({
                message: emailValidation.message,
                error: true,
                success: false
            })
        }

        if (!passwordRegex.test(password)) {
            return response.status(400).json({
                message: 'Password must be at least 8 characters and include letters and numbers.',
                error: true,
                success: false
            })
        }

        const user = await UserModel.findOne({ email: emailValidation.normalizedEmail })

        if(user){
            return response.json({
                message : "Already register email",
                error : true,
                success : false
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(password,salt)

        const payload = {
            name: trimmedName,
            email: emailValidation.normalizedEmail,
            password : hashPassword
        }

        const newUser = new UserModel(payload)
        const save = await newUser.save()
        await sendVerificationEmail(save)

        return response.json({
            message : "Account created. A verification email has been sent to your email address. Please check your inbox and verify your account before signing in.",
            error : false,
            success : true,
            data : {
                _id: save._id,
                name: save.name,
                email: save.email,
                verify_email: save.verify_email
            }
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export async function getAllUsersController(request, response) {
    try {
        console.log("Fetching all users - admin request");

        // Query all users, excluding sensitive fields
        const users = await UserModel.find().select('-password -refresh_token -forgot_password_otp -forgot_password_expiry');
        
        if (!users) {
            console.log("No users found");
            return response.status(404).json({
                message: "No users found",
                error: true,
                success: false,
                data: []
            });
        }
        
        // Make sure all boolean fields are properly converted and all required fields are present
        const processedUsers = users.map(user => {
            const userData = user.toObject ? user.toObject() : {...user};
            return {
                ...userData,
                _id: userData._id || '',
                name: userData.name || 'Unknown User',
                email: userData.email || 'No Email',
                isAdmin: Boolean(userData.isAdmin),
                isDelivery: Boolean(userData.isDelivery),
                role: userData.role || 'user',
                status: userData.status || 'Active'
            };
        });
        
        console.log(`Successfully fetched ${processedUsers.length} users`);
        
        return response.json({
            message: "All users",
            error: false,
            success: true,
            data: processedUsers
        });
    } catch (error) {
        console.error("Error in getAllUsersController:", error);
        return response.status(500).json({
            message: error.message || "Failed to fetch users",
            error: true,
            success: false,
            data: []
        });
    }
}

export async function verifyEmailController(request,response){
    try {
        const { token } = request.body

        if (!token) {
            return response.status(400).json({
                message: "Verification token is required",
                error: true,
                success: false
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')

        if (decoded?.purpose !== 'verify-email') {
            return response.status(400).json({
                message: "Invalid verification token",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findOne({
            _id: decoded.userId,
            email: normalizeEmail(decoded.email)
        })

        if(!user){
            return response.status(400).json({
                message : "Invalid verification request",
                error : true,
                success : false
            })
        }

        if (user.verify_email) {
            return response.json({
                message : "Email already verified",
                success : true,
                error : false
            })
        }

        await UserModel.updateOne({ _id : user._id },{
            verify_email : true
        })

        return response.json({
            message : "Email verified successfully",
            success : true,
            error : false
        })
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return response.status(400).json({
                message: "This verification link has expired. Please request a new one.",
                error: true,
                success: false
            })
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return response.status(400).json({
                message: "Invalid verification link. Please request a new one.",
                error: true,
                success: false
            })
        }

        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export async function sendVerificationEmailController(request, response) {
    try {
        const requestedEmail = normalizeEmail(request.body?.email)

        if (!requestedEmail) {
            return response.status(400).json({
                message: 'Email address is required',
                error: true,
                success: false
            })
        }

        const user = await UserModel.findOne({ email: requestedEmail })

        if (!user) {
            return response.json({
                message: 'If that account exists, a verification email is on the way.',
                error: false,
                success: true
            })
        }

        if (user.verify_email) {
            return response.json({
                message: 'This email address is already verified.',
                error: false,
                success: true
            })
        }

        await sendVerificationEmail(user)

        return response.json({
            message: 'Verification email sent. Please check your inbox.',
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//login controller
export async function loginController(request, response) {
    try {
        const { email, password } = request.body;

        if (!email || !password) {
            return response.status(400).json({
                message: "Provide email and password",
                error: true,
                success: false
            });
        }

        const normalizedEmail = normalizeEmail(email)
        const user = await UserModel.findOne({ email: normalizedEmail });

        if (!user) {
            return response.status(400).json({
                message: "User not registered",
                error: true,
                success: false
            });
        }

        if (user.status !== "Active") {
            return response.status(400).json({
                message: "Contact Admin",
                error: true,
                success: false
            });
        }

        const checkPassword = await bcryptjs.compare(password, user.password);

        if (!checkPassword) {
            return response.status(400).json({
                message: "Incorrect password",
                error: true,
                success: false
            });
        }

        if (!user.verify_email && user.authType !== 'google') {
            try {
                await sendVerificationEmail(user);
            } catch (verificationEmailError) {
                console.error('Error sending login verification email:', verificationEmailError);
            }

            return response.status(403).json({
                message: "Please verify your email before signing in. If you do not see the link, request another verification email from the verify email screen.",
                error: true,
                success: false,
                requiresVerification: true,
                email: user.email
            });
        }

        const accesstoken = await generatedAccessToken(user._id);
        const refreshToken = await genertedRefreshToken(user._id);

        await UserModel.findByIdAndUpdate(user._id, {
            last_login_date: new Date(),
            lastLogin: new Date()
        });

        // Fetch loyalty points and class
        const loyaltyCard = await LoyaltyCard.findOne({ userId: user._id });
        const loyaltyPoints = loyaltyCard?.points || 0;
        const loyaltyClass = loyaltyCard?.tier || "Basic";

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        };
        response.cookie('accessToken', accesstoken, cookiesOption);
        response.cookie('refreshToken', refreshToken, cookiesOption);

        console.log(`User ${user._id} logged in - role: ${user.role}, isAdmin: ${user.isAdmin}`);

        return response.json({
            message: "Login successful",
            error: false,
            success: true,
            data: {
                accesstoken,
                refreshToken,
                loyaltyPoints,
                loyaltyClass,
                isAdmin: Boolean(user.isAdmin),
                role: user.role || 'user'
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// admin endpoint to force send verification email to a specific user ID
export async function adminSendVerificationEmailController(request, response) {
    try {
        const userId = request.body?.userId;
        if (!userId) {
            return response.status(400).json({
                message: "User ID is required.",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findById(userId);

        if (!user) {
            return response.status(404).json({
                message: "User not found.",
                error: true,
                success: false
            });
        }

        if (user.verify_email) {
            return response.json({
                message: "Email already verified.",
                error: false,
                success: true
            });
        }

        await sendVerificationEmail(user);

        return response.json({
            message: "Verification email resent successfully. Please check the user's inbox.",
            error: false,
            success: true
        });

    } catch (error) {
        console.error("Error in adminSendVerificationEmailController:", error);
        return response.status(500).json({
            message: error.message || "Failed to send verification email.",
            error: true,
            success: false
        });
    }
}

// admin endpoint to bulk-send verification emails to ALL unverified users
export async function adminBulkSendVerificationController(request, response) {
    try {
        // Exclude Google/social OAuth accounts — they are verified by the provider
        const unverified = await UserModel.find({
            verify_email: false,
            $or: [{ authType: { $exists: false } }, { authType: 'email' }],
        }).select('_id name email');

        if (unverified.length === 0) {
            return response.json({ message: 'All users are already verified.', sent: 0, failed: 0, success: true });
        }

        let sent = 0;
        let failed = 0;
        for (const user of unverified) {
            try {
                await sendVerificationEmail(user);
                sent++;
            } catch (err) {
                console.error(`Bulk verification: failed for ${user.email}:`, err.message);
                failed++;
            }
        }

        return response.json({
            message: `Verification emails sent: ${sent}. Failed: ${failed}.`,
            sent,
            failed,
            total: unverified.length,
            success: true,
            error: false,
        });
    } catch (error) {
        console.error('Error in adminBulkSendVerificationController:', error);
        return response.status(500).json({ message: error.message || 'Bulk send failed.', error: true, success: false });
    }
}

//upload user avatar
export async function uploadAvatar(request, response) {
    try {
        const userId = request.userId // auth middleware
        const image = request.file  // multer middleware

        if (!image) {
            return response.status(400).json({
                message: "No image file provided. Please upload an image.",
                error: true,
                success: false
            });
        }

        console.log("Received file:", image.originalname, image.mimetype, image.size);
        
        const upload = await uploadImageClodinary(image)
        
        const updateUser = await UserModel.findByIdAndUpdate(userId, {
            avatar: upload.url
        })

        return response.json({
            message: "Profile picture uploaded successfully",
            success: true,
            error: false,
            data: {
                _id: userId,
                avatar: upload.url
            }
        })

    } catch (error) {
        console.error("Error in uploadAvatar:", error);
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//update user details
export async function updateUserDetails(request, response) {
    try {
        const userId = request.userId; //auth middleware
        const { name, email, mobile, password, notification_preferences } = request.body;
        const currentUser = await UserModel.findById(userId);

        if (!currentUser) {
            return response.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        let hashPassword = "";
        const updatePayload = {};
        let emailChanged = false;
        let mobileChanged = false;
        let verificationEmailFailed = false;

        if (password) {
            if (!passwordRegex.test(password)) {
                return response.status(400).json({
                    message: 'Password must be at least 8 characters and include letters and numbers.',
                    error: true,
                    success: false
                });
            }

            const salt = await bcryptjs.genSalt(10);
            hashPassword = await bcryptjs.hash(password, salt);
            updatePayload.password = hashPassword;
            updatePayload.passwordLastChanged = new Date();
        }

        if (name?.trim()) {
            updatePayload.name = name.trim();
        }

        if (email) {
            const normalizedNewEmail = normalizeEmail(email);

            if (normalizedNewEmail !== currentUser.email) {
                const emailValidation = await validateEmailAddress(normalizedNewEmail);

                if (!emailValidation.valid) {
                    return response.status(400).json({
                        message: emailValidation.message,
                        error: true,
                        success: false
                    });
                }

                const existingUser = await UserModel.findOne({
                    email: emailValidation.normalizedEmail,
                    _id: { $ne: userId }
                });

                if (existingUser) {
                    return response.status(400).json({
                        message: 'That email address is already in use.',
                        error: true,
                        success: false
                    });
                }

                updatePayload.email = emailValidation.normalizedEmail;
                updatePayload.verify_email = false;
                emailChanged = true;
            }
        }

        if (typeof mobile === 'string') {
            const normalizedMobile = normalizePhoneNumber(mobile);

            if (normalizedMobile && !isValidKenyanPhone(normalizedMobile)) {
                return response.status(400).json({
                    message: 'Please use a valid Kenyan mobile number.',
                    error: true,
                    success: false
                });
            }

            if (normalizedMobile !== (currentUser.mobile || '')) {
                updatePayload.mobile = normalizedMobile;
                updatePayload.mobile_verified = false;
                mobileChanged = true;
            }
        }

        if (notification_preferences && typeof notification_preferences === 'object' && !Array.isArray(notification_preferences)) {
            const prev = currentUser.notification_preferences
                ? (typeof currentUser.notification_preferences.toObject === 'function'
                    ? currentUser.notification_preferences.toObject()
                    : { ...currentUser.notification_preferences })
                : { email: true, push: true, sms: false };
            const next = { ...prev };
            if (typeof notification_preferences.email === 'boolean') {
                next.email = notification_preferences.email;
            }
            if (typeof notification_preferences.push === 'boolean') {
                next.push = notification_preferences.push;
            }
            if (typeof notification_preferences.sms === 'boolean') {
                next.sms = notification_preferences.sms;
            }
            updatePayload.notification_preferences = next;
        }

        await UserModel.updateOne({ _id: userId }, updatePayload);

        const updatedUser = await UserModel.findById(userId).select('-password -refresh_token');

        if (emailChanged && updatedUser) {
            try {
                await sendVerificationEmail(updatedUser);
            } catch (verificationError) {
                console.error('Error sending updated email verification:', verificationError);
                verificationEmailFailed = true;
            }
        }

        return response.json({
            message: emailChanged
                ? verificationEmailFailed
                    ? "Profile updated, but we could not send the verification email yet. Please request another verification email from your profile."
                    : "Profile updated. Please verify your new email address before your next sign-in."
                : mobileChanged
                    ? "Profile updated. Your phone number will need verification."
                    : "Updated successfully",
            error: false,
            success: true,
            data: updatedUser
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

export async function requestPhoneVerificationOtpController(request, response) {
    try {
        const user = await UserModel.findById(request.userId)

        if (!user) {
            return response.status(404).json({
                message: 'User not found',
                error: true,
                success: false
            })
        }

        const requestedMobile = normalizePhoneNumber(request.body?.mobile || user.mobile)

        if (!requestedMobile || !isValidKenyanPhone(requestedMobile)) {
            return response.status(400).json({
                message: 'Please provide a valid Kenyan mobile number first.',
                error: true,
                success: false
            })
        }

        const otp = String(generatedOtp())
        const expiry = new Date(Date.now() + 10 * 60 * 1000)

        user.mobile = requestedMobile
        user.mobile_verified = false
        user.mobile_verification_otp = otp
        user.mobile_verification_expiry = expiry
        await user.save()

        await sendPhoneVerificationCodeEmail({
            user,
            phoneNumber: requestedMobile,
            otp,
        })

        return response.json({
            message: `Verification code sent for ${maskPhoneNumber(requestedMobile)}. Check your email inbox.`,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export async function verifyPhoneOtpController(request, response) {
    try {
        const { otp } = request.body
        const user = await UserModel.findById(request.userId)

        if (!user) {
            return response.status(404).json({
                message: 'User not found',
                error: true,
                success: false
            })
        }

        if (!otp) {
            return response.status(400).json({
                message: 'Verification code is required',
                error: true,
                success: false
            })
        }

        if (!user.mobile_verification_otp || !user.mobile_verification_expiry) {
            return response.status(400).json({
                message: 'No active phone verification code found. Please request a new one.',
                error: true,
                success: false
            })
        }

        if (user.mobile_verification_expiry < new Date()) {
            return response.status(400).json({
                message: 'This phone verification code has expired. Please request a new one.',
                error: true,
                success: false
            })
        }

        if (String(otp).trim() !== user.mobile_verification_otp) {
            return response.status(400).json({
                message: 'Invalid phone verification code',
                error: true,
                success: false
            })
        }

        user.mobile_verified = true
        user.mobile_verification_otp = null
        user.mobile_verification_expiry = null
        await user.save()

        return response.json({
            message: 'Phone number verified successfully',
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

//forgot password not login
export async function forgotPasswordController(request,response) {
    try {
        const normalizedEmail = normalizeEmail(request.body?.email)

        const user = await UserModel.findOne({ email: normalizedEmail })

        if(!user){
            return response.status(400).json({
                message : "Email not available",
                error : true,
                success : false
            })
        }

        const otp = generatedOtp()
        const expireTime = new Date() + 60 * 60 * 1000 // 1hr

        const update = await UserModel.findByIdAndUpdate(user._id,{
            forgot_password_otp : otp,
            forgot_password_expiry : new Date(expireTime).toISOString()
        })

        await sendEmail({
            sendTo : normalizedEmail,
            subject : "Reset your Nawiri Hair Kenya password",
            html : forgotPasswordTemplate({
                name : user.name,
                otp : otp
            })
        })

        return response.json({
            message : "check your email",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//verify forgot password otp
export async function verifyForgotPasswordOtp(request,response){
    try {
        const { otp }  = request.body
        const email = normalizeEmail(request.body?.email)

        if(!email || !otp){
            return response.status(400).json({
                message : "Provide required field email, otp.",
                error : true,
                success : false
            })
        }

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email not available",
                error : true,
                success : false
            })
        }

        const currentTime = new Date().toISOString()

        if(user.forgot_password_expiry < currentTime  ){
            return response.status(400).json({
                message : "Otp is expired",
                error : true,
                success : false
            })
        }

        if(otp !== user.forgot_password_otp){
            return response.status(400).json({
                message : "Invalid otp",
                error : true,
                success : false
            })
        }

        //if otp is not expired
        //otp === user.forgot_password_otp

        const updateUser = await UserModel.findByIdAndUpdate(user?._id,{
            forgot_password_otp : "",
            forgot_password_expiry : ""
        })
        
        return response.json({
            message : "Verify otp successfully",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//reset the password
export async function resetpassword(request,response){
    try {
        const { newPassword, confirmPassword } = request.body 
        const email = normalizeEmail(request.body?.email)

        if(!email || !newPassword || !confirmPassword){
            return response.status(400).json({
                message : "provide required fields email, newPassword, confirmPassword"
            })
        }

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email is not available",
                error : true,
                success : false
            })
        }

        if(newPassword !== confirmPassword){
            return response.status(400).json({
                message : "newPassword and confirmPassword must be same.",
                error : true,
                success : false,
            })
        }

        if (!passwordRegex.test(newPassword)) {
            return response.status(400).json({
                message: 'Password must be at least 8 characters and include letters and numbers.',
                error: true,
                success: false,
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(newPassword,salt)

        await UserModel.findByIdAndUpdate(user._id,{
            password : hashPassword,
            passwordLastChanged: new Date()
        })

        try {
            await sendEmail({
                sendTo: user.email,
                subject: 'Password reset completed - Nawiri Hair Kenya',
                html: renderAccountNoticeEmail({
                    name: user.name,
                    title: 'Your password was reset',
                    intro: 'Your Nawiri Hair Kenya password has just been reset successfully.',
                    highlights: [
                        'You can now sign in with your new password.',
                        `If this reset was not made by you, contact ${nawiriBrand.supportEmail} immediately.`,
                    ],
                })
            })
        } catch (emailError) {
            console.error('Error sending password reset confirmation:', emailError)
        }

        return response.json({
            message : "Password updated successfully.",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

/**
 * Refresh token controller - generates new access and refresh tokens
 */
export async function refreshToken(request, response) {
    try {
        // Get refresh token from cookies, request body, or Authorization header
        const refreshToken = request.body.refreshToken || 
                           request.cookies?.refreshToken || 
                           request?.headers?.authorization?.split(" ")[1];

        if (!refreshToken) {
            console.log("No refresh token provided");
            return response.status(401).json({
                message: "Invalid token",
                error: true,
                success: false
            });
        }

        try {
            // Verify the refresh token
            const verifyToken = await jwt.verify(refreshToken, process.env.SECRET_KEY_REFRESH_TOKEN);
            
            if (!verifyToken) {
                console.log("Token verification failed");
                return response.status(401).json({
                    message: "Token is expired",
                    error: true,
                    success: false
                });
            }

            const userId = verifyToken?._id;
            
            // Generate new tokens
            const newAccessToken = await generatedAccessToken(userId);
            const newRefreshToken = await genertedRefreshToken(userId);

            // Set cookies for security
            const cookiesOption = {
                httpOnly: true,
                secure: true,
                sameSite: "None"
            };

            response.cookie('accessToken', newAccessToken, cookiesOption);
            response.cookie('refreshToken', newRefreshToken, cookiesOption);

            console.log(`Tokens refreshed for user ${userId}`);

            // Return both tokens in the response
            return response.json({
                message: "Tokens refreshed successfully",
                error: false,
                success: true,
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
            });
        } catch (tokenError) {
            console.error("Token verification error:", tokenError);
            return response.status(401).json({
                message: "Invalid or expired token",
                error: true,
                success: false
            });
        }
    } catch (error) {
        console.error("Refresh token error:", error);
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

//get login user details
export async function userDetails(request,response){
    try {
        const userId = request.userId;

        console.log(`Fetching user details for userId: ${userId}`);

        const user = await UserModel.findById(userId).select('-password -refresh_token');
        
        if (!user) {
            return response.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }
        
        // Get the user's loyalty card if it exists
        let loyaltyInfo = { points: 0, tier: 'Basic' };
        
        try {
            const loyaltyCard = await LoyaltyCard.findOne({ userId });
            if (loyaltyCard) {
                loyaltyInfo = {
                    points: loyaltyCard.points,
                    tier: loyaltyCard.tier
                };
            }
        } catch (error) {
            console.error("Error fetching loyalty card:", error);
        }

        // Make sure admin status is correctly included in the response
        // Explicitly include both isAdmin and role fields
        const userWithLoyalty = {
            ...user.toObject(),
            loyaltyPoints: loyaltyInfo.points,
            loyaltyClass: loyaltyInfo.tier,
            isAdmin: Boolean(user.isAdmin),  // Ensure boolean type
            isDelivery: Boolean(user.isDelivery),
            isStaff: Boolean(user.isStaff),
            mobile_verified: Boolean(user.mobile_verified),
            role: user.role || 'user'        // Provide default if missing
        };

        console.log(`User details for ${userId}:`, {
            role: userWithLoyalty.role,
            isAdmin: userWithLoyalty.isAdmin,
            isDelivery: userWithLoyalty.isDelivery
        });

        return response.json({
            message: 'user details',
            data: userWithLoyalty,
            error: false,
            success: true
        });
    } catch (error) {
        console.error("Error in userDetails:", error);
        return response.status(500).json({
            message: "Something is wrong",
            error: true,
            success: false
        });
    }
}

//get user details
export const getUserDetails = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            });
        }

        // Get loyalty information
        let loyaltyInfo = { points: 0, tier: 'Basic' };
        try {
            const loyaltyCard = await LoyaltyCard.findOne({ userId: req.userId });
            if (loyaltyCard) {
                loyaltyInfo = {
                    points: loyaltyCard.points,
                    tier: loyaltyCard.tier
                };
            }
        } catch (error) {
            console.error("Error fetching loyalty card:", error);
        }

        // Ensure isAdmin is explicitly included
        const userDetails = {
            _id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            mobile_verified: Boolean(user.mobile_verified),
            isAdmin: Boolean(user.isAdmin), // Force boolean conversion
            role: user.role,
            avatar: user.avatar,
            loyaltyPoints: loyaltyInfo.points,
            loyaltyClass: loyaltyInfo.tier
        };

        return res.status(200).json({
            success: true,
            data: userDetails
        });
    } catch (error) {
        console.error('Error in getUserDetails:', error);
        return res.status(500).json({
            message: error.message || 'Internal Server Error',
            success: false
        });
    }
}

//change password (secure endpoint)
export async function changePassword(request, response) {
    try {
        const userId = request.userId; // User ID from auth middleware
        const { currentPassword, newPassword } = request.body;

        // Validate request body
        if (!currentPassword || !newPassword) {
            return response.status(400).json({
                message: "Current password and new password are required",
                error: true,
                success: false
            });
        }

        // Password complexity validation - only apply to new password, not current password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return response.status(400).json({
                message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character",
                error: true,
                success: false
            });
        }

        // Get user with password
        const user = await UserModel.findById(userId);
        if (!user) {
            return response.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        // Verify current password - using bcrypt compare which doesn't require regex validation
        const isPasswordValid = await bcryptjs.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            // Log for debugging
            console.log("Password verification failed for user:", userId);
            
            return response.status(400).json({
                message: "Current password is incorrect",
                error: true,
                success: false
            });
        }

        // Hash new password
        const salt = await bcryptjs.genSalt(10);
        const hashedNewPassword = await bcryptjs.hash(newPassword, salt);

        // Update user password
        await UserModel.findByIdAndUpdate(userId, {
            password: hashedNewPassword,
            passwordLastChanged: new Date()
        });

        // Optional: Send email notification about password change
        try {
            await sendEmail({
                sendTo: user.email,
                subject: "Password changed - Nawiri Hair Kenya",
                html: renderAccountNoticeEmail({
                    name: user.name,
                    title: 'Your password was changed',
                    intro: 'This is a security confirmation that your Nawiri Hair Kenya password was updated successfully.',
                    highlights: [
                        'If you made this change, no further action is needed.',
                        `If this was not you, contact us immediately at ${nawiriBrand.supportEmail}.`,
                    ],
                })
            });
        } catch (emailError) {
            console.error("Error sending password change notification:", emailError);
            // Don't fail the request if email fails
        }

        return response.json({
            message: "Password changed successfully",
            error: false,
            success: true
        });

    } catch (error) {
        console.error("Password change error:", error);
        return response.status(500).json({
            message: error.message || "An error occurred while changing password",
            error: true,
            success: false
        });
    }
}

/**
 * Search users - Admin endpoint
 * This allows admins to search for users when granting special tier promotions
 */
export async function searchUsers(req, res) {
  try {
    // Allow both staff and admin access to search users
    if (!req.isStaff && !req.isAdmin) {
      return res.status(403).json({
        message: "Unauthorized access - Staff or Admin role required",
        success: false
      });
    }

    const { q: term, role } = req.query;
    
    // If no search term provided, return all customers (with role filter)
    if (!term || term.trim() === '') {
      const searchQuery = {};
      
      // Add role filter if specified
      if (role) {
        if (role === 'user') {
          searchQuery.role = { $ne: 'admin' }; // Find non-admin users
        } else {
          searchQuery.role = role;
        }
      } else {
        // Default to non-admin users if no role specified
        searchQuery.role = { $ne: 'admin' };
      }

      const users = await UserModel.find(searchQuery)
        .select('_id name email mobile avatar role')
        .sort({ name: 1 })
        .limit(50); // Increased limit for all customers view

      // Get loyalty cards for these users
      const LoyaltyCardModel = (await import('../models/loyaltycard.model.js')).default;
      const userIds = users.map(user => user._id);
      const loyaltyCards = await LoyaltyCardModel.find({ userId: { $in: userIds } })
        .select('userId cardNumber tier pointsEarned discountRate');

      // Create a map for quick lookup
      const loyaltyCardMap = {};
      loyaltyCards.forEach(card => {
        loyaltyCardMap[card.userId.toString()] = card;
      });

      // Attach loyalty card data to users
      const usersWithLoyalty = users.map(user => ({
        ...user.toObject(),
        loyaltyCard: loyaltyCardMap[user._id.toString()] || null
      }));

      return res.status(200).json({
        success: true,
        data: usersWithLoyalty,
        message: "All customers retrieved successfully"
      });
    }

    // For search terms less than 2 characters, treat as short search
    if (term.length < 2) {
      // Allow single character searches but limit results
      const searchQuery = {
        $or: [
          { name: { $regex: `^${term}`, $options: 'i' } }, // Names starting with the character
          { email: { $regex: `^${term}`, $options: 'i' } }, // Emails starting with the character
        ]
      };

      // Add role filter
      if (role) {
        if (role === 'user') {
          searchQuery.role = { $ne: 'admin' };
        } else {
          searchQuery.role = role;
        }
      } else {
        searchQuery.role = { $ne: 'admin' };
      }

      const users = await UserModel.find(searchQuery)
        .select('_id name email mobile avatar role')
        .sort({ name: 1 })
        .limit(20);

      // Get loyalty cards for these users
      const LoyaltyCardModel = (await import('../models/loyaltycard.model.js')).default;
      const userIds = users.map(user => user._id);
      const loyaltyCards = await LoyaltyCardModel.find({ userId: { $in: userIds } })
        .select('userId cardNumber tier pointsEarned discountRate');

      // Create a map for quick lookup
      const loyaltyCardMap = {};
      loyaltyCards.forEach(card => {
        loyaltyCardMap[card.userId.toString()] = card;
      });

      // Attach loyalty card data to users
      const usersWithLoyalty = users.map(user => ({
        ...user.toObject(),
        loyaltyCard: loyaltyCardMap[user._id.toString()] || null
      }));

      return res.status(200).json({
        success: true,
        data: usersWithLoyalty,
        message: "Customers found with short search"
      });
    }

    // Check if the search term is a loyalty card number (starts with NAWIRI or legacy TAJ)
    if (term.startsWith('NAWIRI') || term.startsWith('TAJ')) {
      // Search for the loyalty card first
      const LoyaltyCardModel = (await import('../models/loyaltycard.model.js')).default;
      
      // Try to find the card with the exact number first
      let card = await LoyaltyCardModel.findOne({ cardNumber: term });
      
      // If not found and it starts with TAJ, try converting to NAWIRI format
      if (!card && term.startsWith('TAJ')) {
        const nawiriCardNumber = term.replace('TAJ', 'NAWIRI');
        card = await LoyaltyCardModel.findOne({ cardNumber: nawiriCardNumber });
      }
      
      // If still not found and it starts with NAWIRI, try legacy TAJ format
      if (!card && term.startsWith('NAWIRI')) {
        const tajCardNumber = term.replace('NAWIRI', 'TAJ');
        card = await LoyaltyCardModel.findOne({ cardNumber: tajCardNumber });
      }
      
      if (card) {
        // Get the user details for this card
        const user = await UserModel.findById(card.userId)
          .select('_id name email mobile avatar');
        
        if (user) {
          // Attach loyalty card data to user
          const userWithLoyalty = {
            ...user.toObject(),
            loyaltyCard: card
          };

          return res.status(200).json({
            success: true,
            data: [userWithLoyalty],
            message: "User found by loyalty card number"
          });
        }
      }
    }
    
    // Normal user search by name, email, or mobile
    const searchQuery = {
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { mobile: { $regex: term, $options: 'i' } }
      ]
    };

    // Add role filter if specified
    if (role) {
      if (role === 'user') {
        searchQuery.role = { $ne: 'admin' }; // Find non-admin users
      } else {
        searchQuery.role = role;
      }
    }

    const users = await UserModel.find(searchQuery)
    .select('_id name email mobile avatar role')
    .limit(10);
    
    // Get loyalty cards for these users
    const LoyaltyCardModel = (await import('../models/loyaltycard.model.js')).default;
    const userIds = users.map(user => user._id);
    const loyaltyCards = await LoyaltyCardModel.find({ userId: { $in: userIds } })
      .select('userId cardNumber tier pointsEarned discountRate');

    // Create a map for quick lookup
    const loyaltyCardMap = {};
    loyaltyCards.forEach(card => {
      loyaltyCardMap[card.userId.toString()] = card;
    });

    // Attach loyalty card data to users
    const usersWithLoyalty = users.map(user => ({
      ...user.toObject(),
      loyaltyCard: loyaltyCardMap[user._id.toString()] || null
    }));
    
    return res.status(200).json({
      success: true,
      data: usersWithLoyalty,
      message: "Users found successfully"
    });
  } catch (error) {
    console.error("Error in searchUsers:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
}

/**
 * Get all customers for POS system (staff and admin only)
 */
export async function getAllCustomers(req, res) {
  try {
    // Allow both staff and admin access
    if (!req.isStaff && !req.isAdmin) {
      return res.status(403).json({
        message: "Unauthorized access - Staff or Admin role required",
        success: false
      });
    }

    const { role = 'user' } = req.query;
    
    const searchQuery = {};
    
    // Add role filter
    if (role === 'user') {
      searchQuery.role = { $ne: 'admin' }; // Find non-admin users
    } else {
      searchQuery.role = role;
    }

    const users = await UserModel.find(searchQuery)
      .select('_id name email mobile avatar role')
      .populate('loyaltyCard', 'cardNumber tier pointsEarned')
      .sort({ name: 1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: users,
      message: "All customers retrieved successfully",
      count: users.length
    });
  } catch (error) {
    console.error("Error in getAllCustomers:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
}

/**
 * Scan loyalty card and get customer details (for POS system)
 */
export async function scanLoyaltyCard(req, res) {
  try {
    // Allow both staff and admin access
    if (!req.isStaff && !req.isAdmin) {
      return res.status(403).json({
        message: "Unauthorized access - Staff or Admin role required",
        success: false
      });
    }

    const { cardNumber } = req.body;
    
    if (!cardNumber) {
      return res.status(400).json({
        message: "Card number is required",
        success: false
      });
    }

    // Import loyalty card model
    const LoyaltyCardModel = (await import('../models/loyaltycard.model.js')).default;
    
    // Find the loyalty card with fallback for TAJ/NAWIRI conversion
    let loyaltyCard = await LoyaltyCardModel.findOne({ cardNumber: cardNumber.trim() });
    
    // If not found, try converting between TAJ and NAWIRI formats
    if (!loyaltyCard) {
      if (cardNumber.startsWith('TAJ')) {
        // Try converting TAJ to NAWIRI format
        const nawiriCardNumber = cardNumber.replace('TAJ', 'NAWIRI');
        loyaltyCard = await LoyaltyCardModel.findOne({ cardNumber: nawiriCardNumber });
      } else if (cardNumber.startsWith('NAWIRI')) {
        // Try converting NAWIRI to TAJ format (for legacy cards)
        const tajCardNumber = cardNumber.replace('NAWIRI', 'TAJ');
        loyaltyCard = await LoyaltyCardModel.findOne({ cardNumber: tajCardNumber });
      }
    }
    
    if (!loyaltyCard) {
      return res.status(404).json({
        message: "Loyalty card not found. Please check the card number.",
        success: false
      });
    }

    // Get the user details for this card
    const user = await UserModel.findById(loyaltyCard.userId)
      .select('_id name email mobile avatar role');

    if (!user) {
      return res.status(404).json({
        message: "Customer not found for this loyalty card",
        success: false
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        customer: user,
        loyaltyCard: loyaltyCard,
        message: `Welcome ${user.name}! ${loyaltyCard.tier} member with ${loyaltyCard.pointsEarned} points.`
      },
      message: "Loyalty card scanned successfully"
    });
  } catch (error) {
    console.error("Error in scanLoyaltyCard:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRoleController(req, res) {
    try {
        const { userId, isAdmin } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
                success: false,
                error: true
            });
        }
        
        // Log the request for debugging
        console.log(`Received role update request for user ${userId}:`, { isAdmin });
        
        // Use findByIdAndUpdate to ensure atomic update
        const updateData = {
            isAdmin: Boolean(isAdmin),
            role: isAdmin ? 'admin' : 'user'
        };
        
        console.log(`Applying updates:`, updateData);
        
        // Use findByIdAndUpdate with { new: true } to get the updated document
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId, 
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }
        
        console.log(`User ${userId} role updated successfully:`, {
            isAdmin: updatedUser.isAdmin,
            role: updatedUser.role
        });
        
        // Send email notification asynchronously so SMTP latency does not block API response
        sendEmail({
            sendTo: updatedUser.email,
            subject: `Account role updated - Nawiri Hair Kenya`,
            html: renderAccountNoticeEmail({
                name: updatedUser.name,
                title: 'Your account role changed',
                intro: `Your Nawiri Hair Kenya account role is now ${updatedUser.isAdmin ? 'Administrator' : 'Customer'}.`,
                highlights: [
                    'This change controls the tools and dashboards available on your account.',
                    `If you were not expecting this update, contact ${nawiriBrand.supportEmail}.`,
                ],
            })
        }).catch((emailError) => {
            console.error("Error sending role update notification:", emailError);
        });
        
        return res.status(200).json({
            message: `User role updated to ${updatedUser.isAdmin ? 'admin' : 'regular user'} successfully`,
            success: true,
            error: false,
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error("Error updating user role:", error);
        return res.status(500).json({
            message: error.message || "Failed to update user role",
            success: false,
            error: true
        });
    }
}

/**
 * Block user (admin only)
 */
export async function blockUserController(req, res) {
    try {
        const { userId, reason, duration, status } = req.body;
        
        if (!userId || !reason) {
            return res.status(400).json({
                message: "User ID and reason are required",
                success: false,
                error: true
            });
        }
        
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }
        
        // Calculate suspension end date based on duration
        let suspensionEndDate = null;
        if (duration === '7days') {
            suspensionEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        } else if (duration === '30days') {
            suspensionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else if (duration === '90days') {
            suspensionEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        }
        // For 'permanent', leave suspensionEndDate as null
        
        // Update user's status and add suspension info
        user.status = 'Suspended';
        user.suspensionReason = reason;
        user.suspensionDate = new Date();
        user.suspensionEndDate = suspensionEndDate;
        user.suspensionDuration = duration;
        
        await user.save();
        
        // Send email notification to the user
        try {
            await sendEmail({
                sendTo: user.email,
                subject: `Account suspended - Nawiri Hair Kenya`,
                html: renderAccountNoticeEmail({
                    name: user.name,
                    title: 'Your account has been suspended',
                    intro: `Your Nawiri Hair Kenya account has been suspended ${suspensionEndDate ? `until ${suspensionEndDate.toDateString()}` : 'until further notice'}.`,
                    infoRows: [
                        { label: 'Reason', value: reason },
                        { label: 'Support', value: nawiriBrand.supportEmail },
                    ],
                })
            });
        } catch (emailError) {
            console.error("Error sending suspension notification:", emailError);
            // Don't fail the request if email fails
        }
        
        return res.status(200).json({
            message: "User blocked successfully",
            success: true,
            error: false
        });
    } catch (error) {
        console.error("Error blocking user:", error);
        return res.status(500).json({
            message: error.message || "Failed to block user",
            success: false,
            error: true
        });
    }
}

/**
 * Unblock user (admin only)
 */
export async function unblockUserController(req, res) {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
                success: false,
                error: true
            });
        }
        
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }
        
        // Update user's status and remove suspension info
        user.status = 'Active';
        user.suspensionReason = null;
        user.suspensionDate = null;
        user.suspensionEndDate = null;
        user.suspensionDuration = null;
        
        await user.save();
        
        // Send email notification to the user
        try {
            await sendEmail({
                sendTo: user.email,
                subject: `Account reactivated - Nawiri Hair Kenya`,
                html: renderAccountNoticeEmail({
                    name: user.name,
                    title: 'Your account is active again',
                    intro: 'Your Nawiri Hair Kenya account has been reactivated and you can now sign in normally.',
                })
            });
        } catch (emailError) {
            console.error("Error sending reactivation notification:", emailError);
            // Don't fail the request if email fails
        }
        
        return res.status(200).json({
            message: "User unblocked successfully",
            success: true,
            error: false
        });
    } catch (error) {
        console.error("Error unblocking user:", error);
        return res.status(500).json({
            message: error.message || "Failed to unblock user",
            success: false,
            error: true
        });
    }
}

/**
 * Delete user (admin only)
 */
export async function deleteUserController(req, res) {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
                success: false,
                error: true
            });
        }
        
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }
        
        // Delete user from database
        await UserModel.findByIdAndDelete(userId);
        
        // Send email notification to the user
        try {
            await sendEmail({
                sendTo: user.email,
                subject: `Account deleted - Nawiri Hair Kenya`,
                html: renderAccountNoticeEmail({
                    name: user.name,
                    title: 'Your account was deleted',
                    intro: 'Your Nawiri Hair Kenya account has been removed from our system.',
                    highlights: [
                        `If you believe this was done in error, contact ${nawiriBrand.supportEmail}.`,
                        'You can always create a fresh account later if needed.',
                    ],
                })
            });
        } catch (emailError) {
            console.error("Error sending account deletion notification:", emailError);
            // Don't fail the request if email fails
        }
        
        return res.status(200).json({
            message: "User deleted successfully",
            success: true,
            error: false
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({
            message: error.message || "Failed to delete user",
            success: false,
            error: true
        });
    }
}

/**
 * Set or unset delivery role (admin only)
 */
export async function setDeliveryRoleController(req, res) {
    try {
        const { userId, isDelivery } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
                success: false,
                error: true
            });
        }
        
        console.log(`Setting delivery role for user ${userId} to: ${isDelivery}`);
        
        // Update both fields for consistency
        const updateData = {
            isDelivery: Boolean(isDelivery),
            // Only set role to delivery if isDelivery is true and user is not an admin
            ...(isDelivery ? { role: 'delivery' } : {})
        };
        
        // If we're removing delivery status, set role back to user
        // (but don't change admin to user)
        if (!isDelivery) {
            const currentUser = await UserModel.findById(userId);
            if (currentUser && currentUser.role === 'delivery') {
                updateData.role = 'user';
            }
        }
        
        console.log(`Applying delivery updates:`, updateData);
        
        // Update the user
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId, 
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }
        
        // Log the updated user for debugging
        console.log(`Updated user after delivery change:`, {
            id: updatedUser._id,
            role: updatedUser.role,
            isAdmin: updatedUser.isAdmin,
            isDelivery: updatedUser.isDelivery
        });
        
        return res.status(200).json({
            message: `User delivery role ${updatedUser.isDelivery ? 'assigned' : 'removed'} successfully`,
            success: true,
            error: false,
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isDelivery: updatedUser.isDelivery,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error("Error updating user delivery role:", error);
        return res.status(500).json({
            message: error.message || "Failed to update user delivery role",
            success: false,
            error: true
        });
    }
}

/**
 * Set or unset staff role (admin only)
 */
export async function setStaffRoleController(req, res) {
    try {
        const { userId, isStaff } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
                success: false,
                error: true
            });
        }
        
        console.log(`Setting staff role for user ${userId} to: ${isStaff}`);
        
        // Update both fields for consistency
        const updateData = {
            isStaff: Boolean(isStaff),
            // Only set role to staff if isStaff is true and user is not an admin
            ...(isStaff ? { role: 'staff' } : {})
        };
        
        // If we're removing staff status, set role back to user
        // (but don't change admin to user)
        if (!isStaff) {
            const currentUser = await UserModel.findById(userId);
            if (currentUser && currentUser.role === 'staff') {
                updateData.role = 'user';
            }
        }
        
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId, 
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }
        
        return res.status(200).json({
            message: `User staff role ${updatedUser.isStaff ? 'assigned' : 'removed'} successfully`,
            success: true,
            error: false,
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isStaff: updatedUser.isStaff,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error("Error updating user staff role:", error);
        return res.status(500).json({
            message: error.message || "Failed to update user staff role",
            success: false,
            error: true
        });
    }
}

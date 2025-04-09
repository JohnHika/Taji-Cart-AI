import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sendEmail from '../config/sendEmail.js'
import LoyaltyCard from '../models/loyaltycard.model.js'
import UserModel from '../models/user.model.js'
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js'
import generatedAccessToken from '../utils/generatedAccessToken.js'
import generatedOtp from '../utils/generatedOtp.js'
import genertedRefreshToken from '../utils/generatedRefreshToken.js'
import uploadImageClodinary from '../utils/uploadImageClodinary.js'
import verifyEmailTemplate from '../utils/verifyEmailTemplate.js'

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

        const user = await UserModel.findOne({ email })

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
            name,
            email,
            password : hashPassword
        }

        const newUser = new UserModel(payload)
        const save = await newUser.save()

        const VerifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${save?._id}`

        const verifyEmail = await sendEmail({
            sendTo : email,
            subject : "Verify email from TAJI CART",
            html : verifyEmailTemplate({
                name,
                url : VerifyEmailUrl
            })
        })

        return response.json({
            message : "User register successfully",
            error : false,
            success : true,
            data : save
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
        const { code } = request.body

        const user = await UserModel.findOne({ _id : code})

        if(!user){
            return response.status(400).json({
                message : "Invalid code",
                error : true,
                success : false
            })
        }

        const updateUser = await UserModel.updateOne({ _id : code },{
            verify_email : true
        })

        return response.json({
            message : "Verify email done",
            success : true,
            error : false
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : true
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

        const user = await UserModel.findOne({ email });

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

        const accesstoken = await generatedAccessToken(user._id);
        const refreshToken = await genertedRefreshToken(user._id);

        await UserModel.findByIdAndUpdate(user._id, {
            last_login_date: new Date()
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

//logout controller
export async function logoutController(request,response){
    try {
        // Get the user ID from middleware if it exists, but don't require it
        const userid = request.userId // May be undefined now
        
        const cookiesOption = {
            httpOnly : true,
            secure : true,
            sameSite : "None"
        }

        // Always clear cookies
        response.clearCookie("accessToken", cookiesOption)
        response.clearCookie("refreshToken", cookiesOption)

        // If we have a user ID, update the database
        if (userid) {
            try {
                await UserModel.findByIdAndUpdate(userid, {
                    refresh_token : ""
                })
            } catch (error) {
                console.log("Error updating user refresh token:", error.message)
                // Continue with logout even if this fails
            }
        }

        return response.json({
            message : "Logout successfully",
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
        const { name, email, mobile, password } = request.body;

        let hashPassword = "";

        if (password) {
            const salt = await bcryptjs.genSalt(10);
            hashPassword = await bcryptjs.hash(password, salt);
        }

        const updateUser = await UserModel.updateOne({ _id: userId }, {
            ...(name && { name: name }),
            ...(email && { email: email }),
            ...(mobile && { mobile: mobile }),
            ...(password && { password: hashPassword })
        });

        return response.json({
            message: "Updated successfully",
            error: false,
            success: true,
            data: updateUser
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

//forgot password not login
export async function forgotPasswordController(request,response) {
    try {
        const { email } = request.body 

        const user = await UserModel.findOne({ email })

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
            sendTo : email,
            subject : "Forgot password from TAJI CART",
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
        const { email , otp }  = request.body

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
        const { email , newPassword, confirmPassword } = request.body 

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

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(newPassword,salt)

        const update = await UserModel.findOneAndUpdate(user._id,{
            password : hashPassword
        })

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
                subject: "Password Changed - Taji Cart",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #333;">Password Changed</h2>
                        <p>Hello ${user.name},</p>
                        <p>Your password was recently changed. If you made this change, you can ignore this email.</p>
                        <p>If you did not change your password, please contact us immediately.</p>
                        <p>Thank you,<br>Taji Cart Team</p>
                    </div>
                `
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
    // Ensure the request is coming from an admin (this is a backup check, middleware should handle this)
    if (!req.isAdmin) {
      return res.status(403).json({
        message: "Unauthorized access",
        success: false
      });
    }

    const { term } = req.query;
    
    if (!term || term.length < 2) {
      return res.status(400).json({
        message: "Search term must be at least 2 characters",
        success: false
      });
    }

    // Check if the search term is a loyalty card number (starts with TAJI)
    if (term.startsWith('TAJI')) {
      // Search for the loyalty card first
      const LoyaltyCardModel = (await import('../models/loyaltycard.model.js')).default;
      const card = await LoyaltyCardModel.findOne({ cardNumber: term });
      
      if (card) {
        // Get the user details for this card
        const user = await UserModel.findById(card.userId).select('_id name email mobile avatar');
        
        if (user) {
          return res.status(200).json({
            success: true,
            data: [user],
            message: "User found by loyalty card number"
          });
        }
      }
    }
    
    // Normal user search by name, email, or mobile
    const users = await UserModel.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { mobile: { $regex: term, $options: 'i' } }
      ]
    }).select('_id name email mobile avatar')
    .limit(10);
    
    return res.status(200).json({
      success: true,
      data: users,
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
        
        // Send email notification to the user
        try {
            await sendEmail({
                sendTo: updatedUser.email,
                subject: `Role Update - Taji Cart`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #333;">Account Role Updated</h2>
                        <p>Hello ${updatedUser.name},</p>
                        <p>Your account role has been updated. You are now ${updatedUser.isAdmin ? 'an admin' : 'a regular user'}.</p>
                        <p>If you have any questions, please contact support.</p>
                        <p>Thank you,<br>Taji Cart Team</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error("Error sending role update notification:", emailError);
            // Don't fail the request if email fails
        }
        
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
                subject: `Account Suspended - Taji Cart`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #ff0000;">Account Suspended</h2>
                        <p>Hello ${user.name},</p>
                        <p>Your account has been suspended ${suspensionEndDate ? 'until ' + suspensionEndDate.toDateString() : 'permanently'}.</p>
                        <p><strong>Reason:</strong> ${reason}</p>
                        <p>If you believe this is a mistake, please contact our support team.</p>
                        <p>Thank you,<br>Taji Cart Team</p>
                    </div>
                `
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
                subject: `Account Reactivated - Taji Cart`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #00aa00;">Account Reactivated</h2>
                        <p>Hello ${user.name},</p>
                        <p>Your account has been reactivated. You can now log in and use our services again.</p>
                        <p>Thank you,<br>Taji Cart Team</p>
                    </div>
                `
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
                subject: `Account Deleted - Taji Cart`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #ff0000;">Account Deleted</h2>
                        <p>Hello ${user.name},</p>
                        <p>Your account has been deleted from our system.</p>
                        <p>If you believe this is a mistake or if you want to create a new account, please contact our support team.</p>
                        <p>Thank you,<br>Taji Cart Team</p>
                    </div>
                `
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

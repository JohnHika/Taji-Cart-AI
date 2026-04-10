import jwt from 'jsonwebtoken'
import UserModel from '../models/user.model.js'

const auth = async(request, response, next) => {
    try {
        // Try to get token from cookies first, then fallback to Authorization header
        const token = request.cookies.accessToken || request?.headers?.authorization?.split(" ")[1]
       
        if(!token){
            console.log("Auth middleware: No token provided")
            return response.status(401).json({
                message : "Authentication required",
                error: true,
                success: false
            })
        }

        try {
            const decode = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN)
            
            // Updated to use _id instead of id for consistency with our token updates
            request.userId = decode._id
            
            // Add user role to request for admin checks
            try {
                const user = await UserModel.findById(decode._id);
                if (user) {
                    // Attach full user for downstream middleware/controllers expecting req.user
                    request.user = user;
                    request.userRole = user.role || 'user';
                    request.isAdmin = user.isAdmin === true || user.role === 'admin';
                    // Ensure both conditions are checked for delivery status
                    request.isDelivery = user.isDelivery === true || user.role === 'delivery';
                }
            } catch (userError) {
                console.error("Error fetching user for role:", userError);
                // Continue even if we couldn't set the role
            }
            
            next()
        } catch (jwtError) {
            console.log("JWT verification failed:", jwtError.message)
            // Don't immediately return 401 - check if we can refresh the token
            if (jwtError.name === 'TokenExpiredError') {
                return response.status(401).json({
                    message: "Token expired, please refresh",
                    error: true,
                    success: false,
                    expired: true
                });
            }
            
            return response.status(401).json({
                message : "Invalid token",
                error : true,
                success : false
            })
        }

    } catch (error) {
        console.error("Auth middleware error:", error)
        return response.status(500).json({
            message : "Server error during authentication",
            error : true,
            success : false
        })
    }
}

export default auth
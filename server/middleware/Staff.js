import UserModel from '../models/user.model.js';

const staff = async (request, response, next) => {
    try {
        const userId = request.userId;
        
        if (!userId) {
            return response.status(401).json({
                message: "Authentication required",
                error: true,
                success: false
            });
        }
        
        console.log(`Staff middleware checking permissions for user ${userId}`)
        
        const user = await UserModel.findById(userId);
        
        if (!user) {
            console.log(`Staff auth failed: User ${userId} not found`)
            return response.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }
        
        // Check for staff role or isStaff property
        const isStaffUser = user.role === 'staff' || user.isStaff === true;
        
        // Also allow admin users to access staff functionality (admins can do everything)
        const isAdminUser = user.role === 'admin' || user.isAdmin === true;
        
        if (!isStaffUser && !isAdminUser) {
            console.log(`Staff auth failed: User ${userId} has role ${user.role}, isStaff: ${user.isStaff}`)
            return response.status(403).json({
                message: "Permission denied",
                error: true,
                success: false
            });
        }

        // Set a isStaff flag on the request object for controllers to use
        request.isStaff = true;
        request.userRole = user.role;
        
        console.log(`Staff auth successful for user ${userId}`)
        next();

    } catch (error) {
        console.error("Staff middleware error:", error);
        return response.status(500).json({
            message: "Server error during authentication",
            error: true,
            success: false
        });
    }
};

export default staff;

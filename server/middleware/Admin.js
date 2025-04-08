import UserModel from "../models/user.model.js";

export const admin = async(request, response, next) => {
    try {
        // If the auth middleware has already validated that this is an admin user
        // we can use that information directly
        if (request.isAdmin === true) {
            console.log(`Admin check passed: User is already validated as admin in auth middleware`);
            return next();
        }
        
        const userId = request.userId
        
        if (!userId) {
            console.log("Admin auth failed: No userId in request")
            return response.status(401).json({
                message: "Authentication required",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findById(userId)
        
        if (!user) {
            console.log(`Admin auth failed: User with ID ${userId} not found`)
            return response.status(404).json({
                message: "User not found",
                error: true,
                success: false
            })
        }

        console.log(`Admin check for user ${user.name} (${user.email}) - role: ${user.role}, isAdmin: ${user.isAdmin}`)
        
        // Check both role and isAdmin property for better compatibility
        const isAdminUser = user.role === 'admin' || user.isAdmin === true;
        
        if (!isAdminUser) {
            console.log(`Admin auth failed: User ${userId} has role ${user.role}, isAdmin: ${user.isAdmin}`)
            return response.status(403).json({
                message: "Permission denied",
                error: true,
                success: false
            })
        }

        // Set an isAdmin flag and userRole on the request object for controllers to use
        request.isAdmin = true;
        request.userRole = user.role || 'admin';
        
        console.log(`Admin auth successful for user ${userId}`)
        next()

    } catch (error) {
        console.error("Admin middleware error:", error)
        return response.status(500).json({
            message: "Server error during authentication",
            error: true,
            success: false
        })
    }
}
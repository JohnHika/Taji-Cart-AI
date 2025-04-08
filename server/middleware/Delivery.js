import UserModel from "../models/user.model.js";

export const delivery = async(request, response, next) => {
    try {
        // If the auth middleware has already validated this is a delivery user
        if (request.isDelivery === true) {
            console.log(`Delivery check passed: User is already validated as delivery personnel in auth middleware`);
            return next();
        }
        
        const userId = request.userId;
        
        if (!userId) {
            console.log("Delivery auth failed: No userId in request")
            return response.status(401).json({
                message: "Authentication required",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findById(userId);
        
        if (!user) {
            console.log(`Delivery auth failed: User with ID ${userId} not found`);
            return response.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }
        
        if (user.isDelivery !== true && user.role !== 'delivery') {
            console.log(`Delivery auth failed: User ${userId} is not delivery personnel (isDelivery=${user.isDelivery}, role=${user.role})`);
            return response.status(403).json({
                message: "Delivery personnel access required",
                error: true,
                success: false
            });
        }
        
        // Add delivery status to request for downstream middleware/controllers
        request.isDelivery = true;
        
        return next();
    } catch (error) {
        console.log("Delivery middleware error:", error);
        return response.status(500).json({
            message: "Internal server error",
            error: true,
            success: false
        });
    }
};

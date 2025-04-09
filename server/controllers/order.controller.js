import mongoose from "mongoose";
import util from 'util';
import Stripe from "../config/stripe.js";
import CartProductModel from "../models/cartproduct.model.js";
import DeliveryPersonnelModel from "../models/deliverypersonnel.model.js"; // Add this import
import LoyaltyCardModel from "../models/loyaltycard.model.js"; // Add this import
import NotificationModel from "../models/notification.model.js"; // Add this import
import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js"; // Add this import
import UserModel from "../models/user.model.js";
import { getIO } from '../socket/socket.js'; // Add this import
import { processOrderContribution } from './communitycampaign.controller.js'; // Add this import

// Add this helper function to better log objects
const inspectObject = (obj) => util.inspect(obj, {depth: 3, colors: true});

export async function CashOnDeliveryOrderController(request, response) {
    try {
        const userId = request.userId // auth middleware 
        const { list_items, totalAmt, addressId, subTotalAmt, fulfillment_type, pickup_location, pickup_instructions } = request.body 

        // Validate inputs based on fulfillment type
        if (fulfillment_type === 'delivery' && !addressId) {
            return response.status(400).json({
                message: "Delivery address is required for delivery orders",
                error: true,
                success: false
            });
        }

        if (fulfillment_type === 'pickup' && !pickup_location) {
            return response.status(400).json({
                message: "Pickup location is required for pickup orders",
                error: true,
                success: false
            });
        }

        // Check stock availability first
        for (const item of list_items) {
            const product = await ProductModel.findById(item.productId._id);
            if (!product) {
                return response.status(404).json({
                    message: `Product ${item.productId.name} not found`,
                    error: true,
                    success: false
                });
            }
            
            if (product.stock < item.quantity) {
                return response.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
                    error: true,
                    success: false
                });
            }
        }

        // Generate verification code for pickup orders
        const generateVerificationCode = () => {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
        };

        const pickupVerificationCode = fulfillment_type === 'pickup' 
            ? generateVerificationCode() 
            : "";

        const payload = list_items.map(el => {
            return({
                userId: userId,
                orderId: `ORD-${new mongoose.Types.ObjectId()}`,
                productId: el.productId._id, 
                product_details: {
                    name: el.productId.name,
                    image: el.productId.image
                },
                paymentId: "",
                payment_status: "CASH ON DELIVERY",
                delivery_address: fulfillment_type === 'delivery' ? addressId : null,
                fulfillment_type: fulfillment_type || 'delivery',
                pickup_location: pickup_location || '',
                pickup_instructions: pickup_instructions || '',
                pickupVerificationCode: pickupVerificationCode,
                subTotalAmt: subTotalAmt,
                totalAmt: totalAmt,
            })
        })

        const generatedOrder = await OrderModel.insertMany(payload)

        // Update product stock after order creation
        const stockUpdatePromises = list_items.map(async (item) => {
            const product = await ProductModel.findById(item.productId._id);
            
            // Reduce stock
            product.stock -= item.quantity;
            
            // Create low stock notification if needed
            if (product.stock < 5) {
                await NotificationModel.create({
                    type: 'low_stock',
                    title: 'Low Stock Alert',
                    message: `Product "${product.name}" is running low (${product.stock} remaining)`,
                    isRead: false,
                    forAdmin: true
                });
            }
            
            return product.save();
        });
        
        await Promise.all(stockUpdatePromises);

        // Remove from the cart
        const removeCartItems = await CartProductModel.deleteMany({ userId: userId })
        const updateInUser = await UserModel.updateOne({ _id: userId }, { shopping_cart: [] })

        // Update loyalty points
        await updateLoyaltyPoints(userId, totalAmt, payload[0].orderId);

        // Contribute to active community campaigns
        try {
            const contributedCampaigns = await processOrderContribution(userId, totalAmt, payload[0].orderId);
            
            if (contributedCampaigns && contributedCampaigns.length > 0) {
                console.log(`User ${userId} contributed to ${contributedCampaigns.length} community campaigns`);
                
                // Check if any campaign was achieved
                const achievedCampaign = contributedCampaigns.find(campaign => campaign.isAchieved);
                if (achievedCampaign) {
                    console.log(`Community campaign "${achievedCampaign.title}" was achieved!`);
                }
            }
        } catch (error) {
            console.error("Error processing community campaign contribution:", error);
            // Continue with order processing regardless of campaign error
        }

        // Create user notification
        const orderNotification = {
            type: 'order_placed',
            title: 'Order Placed Successfully',
            message: fulfillment_type === 'delivery' 
                ? 'Your order has been placed and will be delivered soon.' 
                : `Your order has been placed. You can pick it up at ${pickup_location}. Your verification code is ${pickupVerificationCode}`,
            isRead: false,
            userId: userId
        };

        await NotificationModel.create(orderNotification);

        return response.json({
            message: "Order successfully",
            error: false,
            success: true,
            data: generatedOrder
        })

    } catch (error) {
        console.error("Order creation error:", error);
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const pricewithDiscount = (price,dis = 1)=>{
    const discountAmout = Math.ceil((Number(price) * Number(dis)) / 100)
    const actualPrice = Number(price) - Number(discountAmout)
    return actualPrice
}

export async function paymentController(request,response){
    try {
        const userId = request.userId // auth middleware 
        const { list_items, totalAmt, addressId, subTotalAmt, royalDiscount = 0 } = request.body 

        const user = await UserModel.findById(userId)
        
        // Get user's loyalty card to apply Royal card discount
        let userRoyalDiscount = 0
        if (royalDiscount) {
            // If frontend provided the royalDiscount, use it directly
            userRoyalDiscount = Number(royalDiscount)
            console.log(`Using provided Royal discount: ${userRoyalDiscount}%`)
        } else {
            // Otherwise fetch it from the database
            try {
                const loyaltyCard = await LoyaltyCardModel.findOne({ userId })
                if (loyaltyCard) {
                    // Get discount percentage based on tier
                    switch(loyaltyCard.tier) {
                        case 'Bronze':
                            userRoyalDiscount = 2
                            break
                        case 'Silver':
                            userRoyalDiscount = 3
                            break
                        case 'Gold':
                            userRoyalDiscount = 5
                            break
                        case 'Platinum':
                            userRoyalDiscount = 7
                            break
                        default:
                            userRoyalDiscount = 0
                    }
                    console.log(`Applied Royal card discount: ${userRoyalDiscount}% (${loyaltyCard.tier} tier)`)
                }
            } catch (error) {
                console.error("Error fetching loyalty card:", error)
                // Continue without Royal discount if there's an error
            }
        }

        const line_items = list_items.map(item => {
            // Calculate the combined discount (product discount + royal card discount)
            const productDiscount = Number(item.productId.discount || 0)
            const combinedDiscount = productDiscount + userRoyalDiscount
            
            // Calculate the discounted price using the combined discount
            const originalPrice = Number(item.productId.price)
            const discountAmount = Math.ceil((originalPrice * combinedDiscount) / 100)
            const discountedPrice = originalPrice - discountAmount
            
            // Log the price calculations for debugging
            console.log(`Product: ${item.productId.name}`)
            console.log(`Original price: ${originalPrice}`)
            console.log(`Product discount: ${productDiscount}%`)
            console.log(`Royal discount: ${userRoyalDiscount}%`)
            console.log(`Combined discount: ${combinedDiscount}%`)
            console.log(`Final price: ${discountedPrice}`)
            
            return {
               price_data: {
                    currency: 'kes',
                    product_data: {
                        name: item.productId.name,
                        images: item.productId.image,
                        metadata: {
                            productId: item.productId._id,
                            originalPrice: originalPrice,
                            productDiscount: productDiscount,
                            royalDiscount: userRoyalDiscount
                        },
                        description: combinedDiscount > 0 ? 
                            `Discount: ${productDiscount}% + ${userRoyalDiscount}% Royal Card` : 
                            undefined
                    },
                    unit_amount: discountedPrice * 100
               },
               adjustable_quantity: {
                    enabled: true,
                    minimum: 1
               },
               quantity: item.quantity 
            }
        })

        const params = {
            submit_type: 'pay',
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: user.email,
            metadata: {
                userId: userId,
                addressId: addressId,
                royalDiscount: userRoyalDiscount // Store the Royal discount in metadata
            },
            line_items: line_items,
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`
        }

        const session = await Stripe.checkout.sessions.create(params)

        return response.status(200).json(session)

    } catch (error) {
        console.error("Stripe checkout error:", error);
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

const getOrderProductItems = async({
    lineItems,
    userId,
    addressId,
    paymentId,
    payment_status,
 })=>{
    const productList = []

    if(lineItems?.data?.length){
        for(const item of lineItems.data){
            const product = await Stripe.products.retrieve(item.price.product)

            const paylod = {
                userId : userId,
                orderId : `ORD-${new mongoose.Types.ObjectId()}`,
                productId : product.metadata.productId, 
                product_details : {
                    name : product.name,
                    image : product.images
                } ,
                paymentId : paymentId,
                payment_status : payment_status,
                delivery_address : addressId,
                subTotalAmt  : Number(item.amount_total / 100),
                totalAmt  :  Number(item.amount_total / 100),
            }

            productList.push(paylod)
        }
    }

    return productList
}

//http://localhost:8080/api/order/webhook
export async function webhookStripe(request, response) {
    const event = request.body;
    const endPointSecret = process.env.STRIPE_ENPOINT_WEBHOOK_SECRET_KEY

    console.log("event", event)

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const lineItems = await Stripe.checkout.sessions.listLineItems(session.id)
            const userId = session.metadata.userId
            const orderProduct = await getOrderProductItems({
                lineItems: lineItems,
                userId: userId,
                addressId: session.metadata.addressId,
                paymentId: session.payment_intent,
                payment_status: session.payment_status,
            })
        
            const order = await OrderModel.insertMany(orderProduct)

            console.log(order)
            if (Boolean(order[0])) {
                // Update product stock for all ordered items
                try {
                    for (const item of lineItems.data) {
                        const stripeProduct = await Stripe.products.retrieve(item.price.product);
                        const productId = stripeProduct.metadata.productId;
                        
                        if (productId) {
                            const product = await ProductModel.findById(productId);
                            
                            if (product) {
                                // Reduce stock
                                product.stock -= item.quantity;
                                
                                // Create low stock notification if needed
                                if (product.stock < 5) {
                                    await NotificationModel.create({
                                        type: 'low_stock',
                                        title: 'Low Stock Alert',
                                        message: `Product "${product.name}" is running low (${product.stock} remaining)`,
                                        isRead: false,
                                        forAdmin: true
                                    });
                                }
                                
                                await product.save();
                            }
                        }
                    }
                } catch (stockError) {
                    console.error("Error updating stock:", stockError);
                    // We don't want to fail the webhook response, 
                    // so just log the error but continue
                }
                
                // Clean up the cart
                try {
                    // Ensure both user shopping_cart array and CartProductModel are cleared
                    const removeCartItems = await UserModel.findByIdAndUpdate(userId, {
                        shopping_cart: []
                    });
                    
                    // Add debug logs
                    console.log(`Clearing cart for user ${userId}`);
                    
                    // Use deleteMany instead of findAndDelete for better reliability
                    const cartDeleteResult = await CartProductModel.deleteMany({ userId: userId });
                    console.log(`Deleted ${cartDeleteResult.deletedCount} cart items for user ${userId}`);
                } catch (cartError) {
                    console.error("Error clearing cart:", cartError);
                }

                // Update loyalty points
                await updateLoyaltyPoints(userId, Number(lineItems.data.reduce((acc, item) => acc + item.amount_total, 0) / 100), orderProduct[0].orderId);

                // Process community campaign contributions
                await processOrderContribution(userId, Number(lineItems.data.reduce((acc, item) => acc + item.amount_total, 0) / 100), orderProduct[0].orderId);
            }
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
}


export async function getOrderDetailsController(request,response){
    try {
        const userId = request.userId // order id

        const orderlist = await OrderModel.find({ userId : userId }).sort({ createdAt : -1 }).populate('delivery_address')

        return response.json({
            message : "order list",
            data : orderlist,
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

// Add this to your order.controller.js file
export const getOrderBySessionController = async (request, response) => {
  try {
    const sessionId = request.query.session_id;
    
    if (!sessionId) {
      return response.status(400).json({
        message: "Session ID is required",
        success: false
      });
    }
    
    // Add this - clear the cart for the user
    try {
      await UserModel.findByIdAndUpdate(request.userId, {
        shopping_cart: []
      });
      await CartProductModel.deleteMany({ userId: request.userId });
    } catch (cartError) {
      console.error("Error clearing cart in session handler:", cartError);
    }
    
    // The rest of the function remains the same
    
    // Find the order by session ID
    const order = await OrderModel.findOne({ 
      'payment.session_id': sessionId 
    }).populate('items.productId');
    
    if (!order) {
      return response.status(404).json({
        message: "Order not found",
        success: false
      });
    }
    
    return response.status(200).json({
      message: "Order details retrieved successfully",
      success: true,
      order: order
    });
  } catch (error) {
    console.error("Error in getOrderBySessionController:", error);
    return response.status(500).json({
      message: "Error retrieving order details",
      success: false,
      error: error.message
    });
  }
};

// Add to your existing order processing logic

const updateLoyaltyPoints = async (userId, orderAmount, orderId) => {
  try {
    // Check if userId is null or invalid
    if (!userId || userId === 'null' || userId === 'undefined') {
      console.log("Cannot update loyalty points: Invalid or null user ID");
      return;
    }
    
    // Award 1 point per 100 spent
    const pointsToAward = Math.floor(orderAmount / 100);
    
    if (pointsToAward <= 0) {
      console.log(`No loyalty points to award for amount ${orderAmount}`);
      return;
    }
    
    console.log(`Awarding ${pointsToAward} loyalty points to user ${userId} for order ${orderId}`);
    
    // Check if user has a loyalty card
    let loyaltyCard = await LoyaltyCardModel.findOne({ userId });
    
    // If user doesn't have a loyalty card, create one
    if (!loyaltyCard) {
      console.log(`Creating new loyalty card for user ${userId}`);
      
      const user = await UserModel.findById(userId);
      if (!user) {
        console.log(`Cannot create loyalty card: User ${userId} not found`);
        return;
      }
      
      const isAdmin = user.isAdmin === true || user.role === 'admin';
      
      loyaltyCard = new LoyaltyCardModel({
        userId,
        cardNumber: `TAJI${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        tier: isAdmin ? 'Platinum' : 'Basic',
        points: pointsToAward,
        isActive: true,
        pointsHistory: [{
          points: pointsToAward,
          reason: `Order #${orderId}`,
          date: new Date()
        }],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      
      await loyaltyCard.save();
      
      // Update user model to reference loyalty card
      try {
        await UserModel.findByIdAndUpdate(userId, {
          loyaltyCard: loyaltyCard._id
        });
      } catch (err) {
        console.error("Error updating user with loyalty card reference:", err);
      }
      
      // Create notification for new loyalty card
      try {
        await NotificationModel.create({
          type: 'loyalty_points',
          title: 'New Loyalty Card Created',
          message: `Welcome to our loyalty program! You've earned ${pointsToAward} Royal Points from your purchase.`,
          isRead: false,
          userId
        });
      } catch (notificationError) {
        console.error("Error creating loyalty notification:", notificationError);
      }
      
      return;
    }
    
    // Get the user to check if admin
    const user = await UserModel.findById(userId);
    const isAdmin = user?.isAdmin === true || user?.role === 'admin';
    
    const oldTier = loyaltyCard.tier;
    const oldPoints = loyaltyCard.points;
    
    // Update points
    loyaltyCard.points += pointsToAward;
    console.log(`Updated points: ${oldPoints} → ${loyaltyCard.points}`);
    
    // Add to points history
    loyaltyCard.pointsHistory.push({
      points: pointsToAward,
      reason: `Order #${orderId}`,
      date: new Date()
    });
    
    // Check for tier upgrades (not for admins)
    let tierUpgraded = false;
    let newTier = oldTier;
    
    if (!isAdmin) {
      if (loyaltyCard.points >= 200 && loyaltyCard.tier === 'Basic') {
        console.log(`Upgrading user from Basic to Bronze`);
        loyaltyCard.tier = 'Bronze';
        newTier = 'Bronze';
        tierUpgraded = true;
      } else if (loyaltyCard.points >= 500 && loyaltyCard.tier === 'Bronze') {
        console.log(`Upgrading user from Bronze to Silver`);
        loyaltyCard.tier = 'Silver';
        newTier = 'Silver';
        tierUpgraded = true;
      } else if (loyaltyCard.points >= 1000 && loyaltyCard.tier === 'Silver') {
        console.log(`Upgrading user from Silver to Gold`);
        loyaltyCard.tier = 'Gold';
        newTier = 'Gold';
        tierUpgraded = true;
      } else if (loyaltyCard.points >= 2000 && loyaltyCard.tier === 'Gold') {
        console.log(`Upgrading user from Gold to Platinum`);
        loyaltyCard.tier = 'Platinum';
        newTier = 'Platinum';
        tierUpgraded = true;
      }
    } else {
      // Ensure admin always has Platinum tier
      if (loyaltyCard.tier !== 'Platinum') {
        loyaltyCard.tier = 'Platinum';
      }
    }
    
    await loyaltyCard.save();
    
    // Create notifications
    try {
      // Points notification
      await NotificationModel.create({
        type: 'loyalty_points',
        title: 'Loyalty Points Earned',
        message: `You earned ${pointsToAward} Royal Points from your recent purchase!`,
        isRead: false,
        userId
      });
      
      // If tier upgraded, create a tier upgrade notification
      if (tierUpgraded) {
        await NotificationModel.create({
          type: 'loyalty_points',
          title: 'Loyalty Tier Upgraded!',
          message: `Congratulations! You've been upgraded to ${newTier} tier. Enjoy new benefits and rewards!`,
          isRead: false,
          userId
        });
      }
    } catch (notificationError) {
      console.error("Error creating loyalty notification:", notificationError);
    }
    
  } catch (error) {
    console.error("Error updating loyalty points:", error);
  }
};

/**
 * Get all orders (admin only)
 */
export async function getAllOrdersAdmin(request, response) {
  try {
    // This endpoint should only be accessible by admins
    if (!request.isAdmin && request.userRole !== 'admin') {
      console.log(`Admin orders access denied: isAdmin=${request.isAdmin}, userRole=${request.userRole}`);
      return response.status(403).json({
        message: "Access denied. Admin privileges required.",
        success: false
      });
    }

    // Handle filtering by fulfillment type
    const { fulfillment_type, status } = request.query;
    let query = {};

    if (fulfillment_type) {
      query.fulfillment_type = fulfillment_type;
    }

    if (status) {
      query.status = status;
    }

    // Improve the populate to include more user information
    const orders = await OrderModel.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'userId',
        select: 'name email mobile profile_pic'
      })
      .populate('delivery_address')
      .lean(); // Use lean for better performance
    
    // Add debug info to help diagnose user data issues
    console.log(`Successfully retrieved ${orders.length} orders for admin`);
    if (orders.length > 0) {
      console.log(`Sample order user info: ${JSON.stringify(orders[0].userId || 'No user data')}`);
    }
    
    return response.json({
      message: "All orders retrieved successfully",
      data: orders,
      success: true
    });
  } catch (error) {
    console.error("Error getting all orders:", error);
    return response.status(500).json({
      message: error.message || "Internal server error",
      success: false
    });
  }
}

/**
 * Update order status (admin only)
 */
export async function updateOrderStatus(request, response) {
  try {
    const { id } = request.params;
    const { status } = request.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return response.status(400).json({
        message: "Invalid status value",
        success: false
      });
    }
    
    const order = await OrderModel.findById(id);
    
    if (!order) {
      return response.status(404).json({
        message: "Order not found",
        success: false
      });
    }
    
    // Update the status
    order.status = status;
    
    // If order is cancelled, consider restoring stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      // Implement product stock restoration logic here if needed
    }
    
    // If order is delivered, mark delivery date
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }
    
    await order.save();
    
    // Create notification for the user
    try {
      let notificationMessage;
      
      switch (status) {
        case 'processing':
          notificationMessage = "Your order is now being processed";
          break;
        case 'shipped':
          notificationMessage = "Your order has been shipped";
          break;
        case 'delivered':
          notificationMessage = "Your order has been delivered";
          break;
        case 'cancelled':
          notificationMessage = "Your order has been cancelled";
          break;
        default:
          notificationMessage = `Your order status has been updated to ${status}`;
      }
      
      await NotificationModel.create({
        type: 'order_update',
        title: 'Order Status Update',
        message: notificationMessage,
        isRead: false,
        userId: order.userId
      });
    } catch (notificationError) {
      console.error("Error creating order status notification:", notificationError);
      // Continue with the response even if notification fails
    }
    
    return response.json({
      message: "Order status updated successfully",
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return response.status(500).json({
      message: error.message || "Internal server error",
      success: false
    });
  }
}

// Get order tracking details
export async function getOrderTrackingDetails(request, response) {
    try {
        const { id } = request.params;
        
        // Validate if ID is in correct format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return response.status(400).json({
                message: "Invalid order ID format",
                success: false,
                errorCode: "INVALID_ID_FORMAT"
            });
        }
        
        // Fetch order with populated delivery personnel and status history
        const order = await OrderModel.findById(id)
            .populate('deliveryPersonnel')
            .populate({
                path: 'items.productId',
                select: 'name price image'
            })
            .populate('delivery_address');
        
        if (!order) {
            console.log(`Order not found for ID: ${id}`);
            return response.status(404).json({
                message: "Order not found",
                success: false,
                errorCode: "ORDER_NOT_FOUND"
            });
        }
        
        // Check if user is authorized to view this order
        if (order.userId.toString() !== request.userId.toString() && request.userRole !== 'admin') {
            console.log(`Unauthorized access attempt: User ${request.userId} tried to access order ${id} belonging to ${order.userId}`);
            return response.status(403).json({
                message: "You are not authorized to view this order",
                success: false,
                errorCode: "UNAUTHORIZED_ACCESS"
            });
        }
        
        return response.json({
            message: "Order tracking details retrieved successfully",
            success: true,
            data: order
        });
    } catch (error) {
        console.error("Error fetching order tracking details:", error);
        return response.status(500).json({
            message: "Internal server error. Please try again later.",
            success: false,
            errorCode: "SERVER_ERROR",
            devError: error.message
        });
    }
}

// Assign delivery personnel to order
export async function assignDeliveryPersonnel(request, response) {
    try {
        const { orderId, personnelId } = request.body;
        
        // Validate inputs
        if (!orderId || !personnelId) {
            return response.status(400).json({
                message: "Order ID and Personnel ID are required",
                success: false
            });
        }
        
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return response.status(404).json({
                message: "Order not found",
                success: false
            });
        }
        
        const personnel = await DeliveryPersonnelModel.findById(personnelId);
        if (!personnel) {
            return response.status(404).json({
                message: "Delivery personnel not found",
                success: false
            });
        }
        
        // Update order with delivery personnel and status
        order.deliveryPersonnel = personnelId;
        order.status = 'driver_assigned';
        order.statusHistory.push({
            status: 'driver_assigned',
            timestamp: new Date(),
            note: `Assigned to ${personnel.name}`
        });
        
        // Calculate estimated delivery time (e.g., 45 minutes from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + 45);
        order.estimatedDeliveryTime = estimatedDelivery;
        
        await order.save();
        
        // Update delivery personnel status
        personnel.isAvailable = false;
        personnel.activeOrders.push(orderId);
        await personnel.save();
        
        // Send real-time notification
        const io = getIO();
        io.to(`order_${orderId}`).emit('statusUpdated', {
            orderId,
            status: 'driver_assigned',
            personnelName: personnel.name,
            estimatedDelivery: estimatedDelivery
        });
        
        // If you have a notification model, create a notification for the user
        // await NotificationModel.create({...})
        
        return response.json({
            message: "Delivery personnel assigned successfully",
            success: true,
            data: order
        });
    } catch (error) {
        console.error("Error assigning delivery personnel:", error);
        return response.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

// Update order location and status
export async function updateOrderLocation(request, response) {
    try {
        const { orderId, location, status } = request.body;
        
        if (!orderId || !location || !location.lat || !location.lng) {
            return response.status(400).json({
                message: "Order ID and location coordinates are required",
                success: false
            });
        }
        
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return response.status(404).json({
                message: "Order not found",
                success: false
            });
        }
        
        // Update order location
        order.currentLocation = {
            lat: location.lat,
            lng: location.lng,
            lastUpdated: new Date()
        };
        
        // Update status if provided
        if (status && status !== order.status) {
            order.status = status;
            order.statusHistory.push({
                status,
                timestamp: new Date(),
                location: {
                    lat: location.lat,
                    lng: location.lng
                }
            });
            
            // If delivered, update necessary fields
            if (status === 'delivered') {
                order.deliveredAt = new Date();
                
                // Update delivery personnel status
                if (order.deliveryPersonnel) {
                    const personnel = await DeliveryPersonnelModel.findById(order.deliveryPersonnel);
                    if (personnel) {
                        personnel.isAvailable = true;
                        personnel.activeOrders = personnel.activeOrders.filter(
                            id => id.toString() !== orderId.toString()
                        );
                        await personnel.save();
                    }
                }
            }
        }
        
        await order.save();
        
        // Send real-time update
        const io = getIO();
        io.to(`order_${orderId}`).emit('locationUpdated', {
            orderId,
            location,
            status: order.status,
            timestamp: new Date()
        });
        
        return response.json({
            message: "Order location updated successfully",
            success: true,
            data: {
                orderId,
                location: order.currentLocation,
                status: order.status
            }
        });
    } catch (error) {
        console.error("Error updating order location:", error);
        return response.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

// Get orders assigned to delivery personnel
export async function getAssignedOrders(request, response) {
    try {
        // Only get delivery orders (not pickup)
        const orders = await OrderModel.find({ 
            status: { $in: ['driver_assigned', 'out_for_delivery', 'nearby'] },
            fulfillment_type: 'delivery'
        });
        
        return response.json({
            message: "Assigned orders retrieved successfully",
            success: true,
            data: orders
        });
    } catch (error) {
        console.error("Error fetching assigned orders:", error);
        return response.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

// Verify pickup code
export async function verifyPickupCode(request, response) {
    console.log("=== verifyPickupCode called ===");
    console.log("Request body:", inspectObject(request.body));
    
    try {
        const { orderId, verificationCode } = request.body;
        
        console.log(`Verifying pickup: orderId=${orderId}, code=${verificationCode}`);
        
        if (!verificationCode) {
            console.log("Error: No verification code provided");
            return response.status(400).json({
                message: "Verification code is required",
                success: false
            });
        }
        
        // If no orderId, try to find by verification code directly
        let query = {};
        if (orderId) {
            console.log(`Looking up by orderId: ${orderId}`);
            query = { _id: orderId };
        } else {
            console.log(`Looking up by verification code: ${verificationCode}`);
            query = { 
                pickupVerificationCode: verificationCode,
                fulfillment_type: 'pickup'
            };
        }
        
        console.log("MongoDB query:", inspectObject(query));
        
        // Log all pickup orders for debugging
        console.log("DEBUG: Querying all pickup orders");
        const allPickupOrders = await OrderModel.find({ fulfillment_type: 'pickup' })
            .select('_id orderId pickupVerificationCode status');
        console.log("All pickup orders:", inspectObject(allPickupOrders));
        
        const order = await OrderModel.findOne(query)
            .populate('userId', 'name email mobile')
            .populate({
                path: 'items.productId',
                select: 'name price image'
            });
        
        console.log("Order lookup result:", order ? "Found" : "Not found");
        if (order) {
            console.log("Order details:", {
                id: order._id,
                status: order.status,
                fulfillment_type: order.fulfillment_type,
                pickupVerificationCode: order.pickupVerificationCode
            });
        }
        
        if (!order) {
            console.log("Order not found with the provided criteria");
            return response.status(404).json({
                message: "Order not found",
                success: false
            });
        }
        
        if (order.fulfillment_type !== 'pickup') {
            console.log("Not a pickup order. Fulfillment type:", order.fulfillment_type);
            return response.status(400).json({
                message: "This is not a pickup order",
                success: false
            });
        }
        
        if (order.status === 'picked_up') {
            console.log("Order already picked up");
            return response.status(400).json({
                message: "This order has already been picked up",
                success: false
            });
        }
        
        if (orderId && order.pickupVerificationCode !== verificationCode) {
            console.log("Invalid verification code provided");
            console.log(`Expected: ${order.pickupVerificationCode}, Received: ${verificationCode}`);
            return response.status(400).json({
                message: "Invalid verification code",
                success: false
            });
        }
        
        console.log("Verification successful, returning order details");
        
        return response.json({
            message: "Order verified successfully",
            success: true,
            data: order
        });
        
    } catch (error) {
        console.error("Error verifying pickup code:", error);
        return response.status(500).json({
            message: "Internal server error",
            error: error.message,
            success: false
        });
    }
}

// Get most recent order for current user
export async function getMostRecentOrder(request, response) {
  try {
    const userId = request.userId;
    
    if (!userId) {
      return response.status(401).json({
        message: "Authentication required",
        success: false
      });
    }
    
    console.log(`Fetching most recent order for user ${userId}`);
    
    // Find most recent order for this user
    const recentOrder = await OrderModel.findOne({ 
      userId: userId 
    })
    .sort({ createdAt: -1 })
    .populate({
      path: 'items.productId',
      select: 'name image price'
    })
    .populate('delivery_address');
    
    if (!recentOrder) {
      console.log(`No orders found for user ${userId}`);
      return response.status(404).json({
        message: "No orders found",
        success: false
      });
    }
    
    console.log(`Successfully found recent order ${recentOrder._id} for user ${userId}`);
    
    return response.json({
      message: "Recent order retrieved successfully",
      success: true,
      order: recentOrder
    });
    
  } catch (error) {
    console.error("Error fetching recent order:", error);
    return response.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message
    });
  }
}

/**
 * Verify an order pickup code
 * This is used by staff to verify a customer's pickup code
 */
export const verifyPickupController = async (req, res) => {
  try {
    const { pickupCode } = req.body;
    
    if (!pickupCode) {
      return res.status(400).json({
        message: "Pickup code is required",
        success: false
      });
    }
    
    // Find order with this pickup code
    const order = await OrderModel.findOne({ 
      pickupCode, 
      deliveryMethod: 'store-pickup', 
      status: { $nin: ['Cancelled', 'Picked Up'] }
    }).populate('userId', 'name email mobile');
    
    if (!order) {
      return res.status(404).json({
        message: "Invalid pickup code or order already picked up",
        success: false
      });
    }
    
    // Return order details for verification
    return res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: order.userId?.name || 'Unknown Customer',
        customerEmail: order.userId?.email,
        customerPhone: order.userId?.mobile,
        totalAmount: order.totalAmt,
        items: order.products.map(p => ({
          productId: p.productId,
          productName: p.name,
          quantity: p.quantity,
          price: p.price
        })),
        pickupCode: order.pickupCode,
        status: order.status
      }
    });
    
  } catch (error) {
    console.error("Error verifying pickup code:", error);
    return res.status(500).json({
      message: error.message || "Error verifying pickup code",
      success: false
    });
  }
};

/**
 * Complete an order pickup after verification
 */
export const completePickupController = async (req, res) => {
  try {
    const { orderId, pickupCode } = req.body;
    const staffUserId = req.userId;
    
    if (!orderId || !pickupCode) {
      return res.status(400).json({
        message: "Order ID and pickup code are required",
        success: false
      });
    }
    
    // Get staff user details
    const staffUser = await UserModel.findById(staffUserId);
    if (!staffUser) {
      return res.status(404).json({
        message: "Staff user not found",
        success: false
      });
    }
    
    // Find order and verify pickup code
    const order = await OrderModel.findOne({ 
      _id: orderId, 
      pickupCode, 
      deliveryMethod: 'store-pickup',
      status: { $nin: ['Cancelled', 'Picked Up'] } 
    }).populate('userId', 'name email mobile');
    
    if (!order) {
      return res.status(404).json({
        message: "Invalid order ID or pickup code",
        success: false
      });
    }
    
    // Update order status
    order.status = 'Picked Up';
    order.updatedAt = new Date();
    
    // Add verification record
    if (!order.pickupVerification) {
      order.pickupVerification = {};
    }
    
    order.pickupVerification = {
      verifiedBy: staffUser.name || staffUser.email || staffUserId,
      verifiedById: staffUserId,
      verifiedAt: new Date()
    };
    
    await order.save();
    
    // Create a verification history record
    // This would be a separate collection in a real implementation
    // For now, just return success
    
    // Return success with updated order details
    return res.status(200).json({
      success: true,
      message: "Order pickup completed successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: order.userId?.name || 'Unknown Customer',
        customerEmail: order.userId?.email,
        customerPhone: order.userId?.mobile,
        totalAmount: order.totalAmt,
        items: order.products.map(p => ({
          productId: p.productId,
          productName: p.name,
          quantity: p.quantity,
          price: p.price
        })),
        pickupCode: order.pickupCode,
        status: order.status,
        verifiedBy: staffUser.name || staffUser.email,
        verifiedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error("Error completing pickup:", error);
    return res.status(500).json({
      message: error.message || "Error completing pickup",
      success: false
    });
  }
};

/**
 * Get pending pickups for staff
 */
export const getPendingPickupsController = async (req, res) => {
  try {
    // Find all orders with store pickup that haven't been picked up yet
    const pendingPickups = await OrderModel.find({
      deliveryMethod: 'store-pickup',
      status: { $nin: ['Cancelled', 'Picked Up'] }
    }).populate('userId', 'name email mobile').sort({ createdAt: -1 });
    
    // Format response data
    const formattedPickups = pendingPickups.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.userId?.name || 'Unknown Customer',
      customerPhone: order.userId?.mobile,
      totalAmount: order.totalAmt,
      createdAt: order.createdAt,
      pickupCode: order.pickupCode,
      status: order.status
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedPickups
    });
    
  } catch (error) {
    console.error("Error fetching pending pickups:", error);
    return res.status(500).json({
      message: error.message || "Error fetching pending pickups",
      success: false
    });
  }
};

/**
 * Get verification history for staff
 */
export const getVerificationHistoryController = async (req, res) => {
  try {
    // Find all orders that have been picked up and have verification records
    const verifiedPickups = await OrderModel.find({
      deliveryMethod: 'store-pickup',
      status: 'Picked Up',
      'pickupVerification.verifiedAt': { $exists: true }
    }).populate('userId', 'name email mobile')
      .populate('pickupVerification.verifiedById', 'name email')
      .sort({ 'pickupVerification.verifiedAt': -1 });
    
    // Format response data
    const formattedHistory = verifiedPickups.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.userId?.name || 'Unknown Customer',
      customerPhone: order.userId?.mobile,
      totalAmount: order.totalAmt,
      pickupCode: order.pickupCode,
      verifiedBy: order.pickupVerification?.verifiedBy || 'Unknown Staff',
      verifiedAt: order.pickupVerification?.verifiedAt
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedHistory
    });
    
  } catch (error) {
    console.error("Error fetching verification history:", error);
    return res.status(500).json({
      message: error.message || "Error fetching verification history",
      success: false
    });
  }
};
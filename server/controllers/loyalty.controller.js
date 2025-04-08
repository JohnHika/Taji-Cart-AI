import mongoose from 'mongoose';
import LoyaltyCardModel from '../models/loyaltycard.model.js';
import LoyaltyThresholdModel from '../models/loyaltythreshold.model.js';
import OrderModel from '../models/order.model.js';
import UserModel from '../models/user.model.js';
import { createSecurityCode, verifySecurityCode } from '../utils/securityUtils.js';

// Generate a unique card number
const generateCardNumber = () => {
  const prefix = 'TAJI';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
};

/**
 * Get or create a user's loyalty card
 */
export const getUserLoyaltyCard = async (req, res) => {
  try {
    // First try to get userId from params, then fall back to the user ID from the session
    // This allows both direct access by ID and session-based access
    const userId = req.params.userId || req.userId;
    
    console.log(`Loyalty Card Request - params userId: ${req.params.userId}, session userId: ${req.userId}`);
    
    // Check if userId is null or invalid
    if (!userId || userId === 'null' || userId === 'undefined') {
      console.log("Loyalty Card Error - No valid userId in request");
      return res.status(401).json({
        message: "Authentication required",
        success: false
      });
    }
    
    console.log(`Fetching loyalty card for user ${userId}`);
    
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      console.log(`Loyalty Card Error - User not found: ${userId}`);
      return res.status(404).json({
        message: "User not found",
        success: false
      });
    }
    
    // Check if user is an admin
    const isAdmin = user.isAdmin === true || user.role === 'admin';
    console.log(`User ${user.name || userId} (${user.email}) - Admin status: ${isAdmin}`);
    console.log(`Admin check details: isAdmin property = ${user.isAdmin}, role = ${user.role}`);
    
    // Check if user already has a loyalty card
    let loyaltyCard = await LoyaltyCardModel.findOne({ userId });
    
    // If not, create a new one
    if (!loyaltyCard) {
      console.log(`No loyalty card found, creating new one for user ${userId}`);
      
      // Calculate tier based on order history
      let orderCount = 0;
      let totalSpent = 0;
      
      try {
        // Get all completed orders for this user
        const orders = await OrderModel.find({
          user: userId,
          status: 'Delivered' // Only count completed orders
        });
        
        if (orders && orders.length > 0) {
          orderCount = orders.length;
          totalSpent = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        }
        
        console.log(`User has ${orderCount} orders totaling KES ${totalSpent}`);
      } catch (err) {
        console.error("Error calculating order history:", err);
        // Continue with default values if there's an error
      }
      
      // Determine tier level - admins always get Platinum tier but their points should reflect their spending
      let tier = 'Basic'; // Default tier for new users
      let points = Math.floor(totalSpent / 100); // Base points from spending
      
      if (isAdmin) {
        tier = 'Platinum';
        // Still calculate points for admins based on their spending
        // This allows them to see how they would rank naturally
      } else {
        // For regular users, determine tier based on points
        // Use the determineUserTier helper function and extract the tier string
        const tierResult = await determineUserTier(points, false);
        tier = tierResult.tier; // Extract just the tier string
        console.log(`Setting user tier to ${tier} based on ${points} points`);
      }
      
      // Create new loyalty card
      loyaltyCard = new LoyaltyCardModel({
        userId,
        cardNumber: generateCardNumber(),
        createdAt: new Date(),
        points: points,
        tier,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      
      await loyaltyCard.save();
      console.log(`Created new loyalty card with tier ${tier} and ${loyaltyCard.points} points`);
      
      // Update user model to reference loyalty card
      try {
        user.loyaltyCard = loyaltyCard._id;
        await user.save();
      } catch (err) {
        console.error("Error updating user with loyalty card reference:", err);
        // Continue even if this fails
      }
      
    } else {
      console.log(`Found existing loyalty card: Tier: ${loyaltyCard.tier}, Points: ${loyaltyCard.points}`);
      
      // For admins and regular users, let's check and update their points based on actual orders
      try {
        // Get total spent from completed orders
        const orders = await OrderModel.find({
          user: userId,
          status: 'Delivered'
        });
        
        const totalSpent = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const calculatedPoints = Math.floor(totalSpent / 100);
        
        console.log(`User has spent KES ${totalSpent} which equals ${calculatedPoints} points`);
        
        // Only update points if they're less than what they should be
        if (calculatedPoints > loyaltyCard.points) {
          console.log(`Updating user's points from ${loyaltyCard.points} to ${calculatedPoints} based on spending`);
          loyaltyCard.points = calculatedPoints;
          
          // Update tier for regular users based on new points
          if (!isAdmin) {
            // Use the helper function and extract the tier string
            const tierResult = await determineUserTier(calculatedPoints, false, loyaltyCard);
            console.log(`Upgrading user to ${tierResult.tier} tier based on points (${calculatedPoints})`);
            loyaltyCard.tier = tierResult.tier; // Just use the tier string
            
            // Only add to tier history if this is a new tier
            if (tierResult.tier !== loyaltyCard.tier) {
              // Add to tier acquisition history
              if (!loyaltyCard.tierAcquisitionHistory) {
                loyaltyCard.tierAcquisitionHistory = [];
              }
              
              loyaltyCard.tierAcquisitionHistory.push({
                tier: tierResult.tier,
                method: tierResult.method,
                acquiredAt: new Date()
              });
            }
          }
          
          await loyaltyCard.save();
        }
      } catch (err) {
        console.error("Error updating loyalty points from order history:", err);
        // Continue with existing values if there's an error
      }
    }
    
    // Get current loyalty thresholds to check early access settings
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ createdAt: -1 });
    const earlyAccessEnabled = thresholds ? thresholds.earlyAccessEnabled === true : false;
    
    // Determine if this is an admin request
    const isRequestAdmin = req.isAdmin === true;
    
    // Format the expiry date for clear display
    const expiryDate = loyaltyCard.expiresAt;
    const formattedExpiryDate = expiryDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Create a response object that properly reflects early access status
    const response = {
      success: true,
      data: {
        ...loyaltyCard.toObject(),
        // Add formatted expiry date for better user experience
        formattedExpiryDate: formattedExpiryDate,
        expiryMessage: `Your loyalty benefits expire on ${formattedExpiryDate}`,
        // For ALL users, accurately report if early access is enabled system-wide
        earlyAccessEnabled: earlyAccessEnabled,
        // Only show early access UI section to admin users when disabled
        showEarlyAccess: earlyAccessEnabled || isRequestAdmin,
        // Clearly mark if the feature is active or not
        earlyAccessActive: earlyAccessEnabled,
        // Add clear early access message for all users
        earlyAccessMessage: earlyAccessEnabled ? 
          "Early Access Program Active - You can access tier benefits earlier than standard thresholds!" :
          "Early Access Program Inactive - All tier upgrades now require the standard point thresholds.",
        // Flag to indicate admin preview mode
        isAdminPreview: isRequestAdmin && !earlyAccessEnabled
      }
    };
    
    // If this is a non-admin user and early access was just disabled,
    // make sure to recalculate their tier immediately so they don't continue
    // to see early access benefits
    if (!isAdmin && !earlyAccessEnabled && loyaltyCard.tier !== 'Basic') {
      // Force recalculate tier immediately for this user
      console.log(`Recalculating tier for non-admin user ${userId} since early access is disabled`);
      const tierResult = await determineUserTier(loyaltyCard.points, false, loyaltyCard);
      
      // If tier would change because early access is off, apply the change immediately
      if (tierResult.tier !== loyaltyCard.tier && tierResult.tier !== 'Basic') {
        console.log(`Adjusting user tier from ${loyaltyCard.tier} to ${tierResult.tier} due to early access being disabled`);
        
        // Update the response directly so the user sees the change immediately
        response.data.tier = tierResult.tier;
        
        // Save the change to the database asynchronously
        loyaltyCard.tier = tierResult.tier;
        
        // Add acquisition history entry - ONLY if new tier is not Basic
        if (!loyaltyCard.tierAcquisitionHistory) {
          loyaltyCard.tierAcquisitionHistory = [];
        }
        
        // Only add to acquisition history if it's not a downgrade to Basic
        loyaltyCard.tierAcquisitionHistory.push({
          tier: tierResult.tier,
          method: 'standard',
          acquiredAt: new Date()
        });
        
        // Add points history for clarity
        if (!loyaltyCard.pointsHistory) {
          loyaltyCard.pointsHistory = [];
        }
        
        loyaltyCard.pointsHistory.push({
          points: 0,
          reason: `Tier adjusted to ${tierResult.tier} - Early Access program is now disabled`,
          date: new Date()
        });
        
        await loyaltyCard.save();
      } else if (tierResult.tier === 'Basic') {
        // If downgrading to Basic, don't change their tier (preserve their rank)
        console.log(`Preserving user's ${loyaltyCard.tier} tier despite qualifying for Basic tier after early access disabled`);
        
        // Add points history note without changing tier
        if (!loyaltyCard.pointsHistory) {
          loyaltyCard.pointsHistory = [];
        }
        
        loyaltyCard.pointsHistory.push({
          points: 0,
          reason: `Maintained ${loyaltyCard.tier} tier despite early access being disabled (grandfathered privilege)`,
          date: new Date()
        });
        
        await loyaltyCard.save();
      }
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error("Error in getUserLoyaltyCard:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false
    });
  }
};

/**
 * Update loyalty points
 */
export const updateLoyaltyPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    
    if (!userId || !points) {
      return res.status(400).json({
        message: "User ID and points are required",
        success: false
      });
    }
    
    console.log(`Updating loyalty points for user ${userId}: ${points} points - ${reason || 'No reason provided'}`);
    
    const loyaltyCard = await LoyaltyCardModel.findOne({ userId });
    if (!loyaltyCard) {
      console.log(`No loyalty card found for ${userId}, creating one`);
      
      // Create a new card with basic details
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          success: false
        });
      }
      
      const newCard = new LoyaltyCardModel({
        userId,
        cardNumber: generateCardNumber(),
        points: Math.max(0, points),
        // Note: tier will be calculated automatically by the pre-save middleware
        isActive: true,
        pointsHistory: [{
          points,
          reason: reason || 'Initial points',
          date: new Date()
        }],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      
      await newCard.save();
      
      return res.status(200).json({
        success: true,
        data: newCard,
        message: "New loyalty card created with points"
      });
    }
    
    // Update points
    loyaltyCard.points += points;
    console.log(`Updated points: ${loyaltyCard.points}`);
    
    // Add points history
    loyaltyCard.pointsHistory = loyaltyCard.pointsHistory || [];
    loyaltyCard.pointsHistory.push({
      points,
      reason: reason || 'Points update',
      date: new Date()
    });
    
    // Important: Check if early access is enabled and this is a purchase
    // If so, mark this user as having participated in early access
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 });
    const earlyAccessEnabled = thresholds?.earlyAccessEnabled === true;
    
    if (earlyAccessEnabled && reason?.toLowerCase().includes('purchase')) {
      console.log(`User ${userId} made a purchase during early access period - marking for grandfathered benefits`);
      
      // Get the user info to check if they're admin
      const user = await UserModel.findById(userId);
      const isAdmin = user?.isAdmin === true || user?.role === 'admin';
      
      if (!isAdmin) {
        // Determine which tier user qualifies for with current points
        const tierResult = await determineUserTier(loyaltyCard.points, false);
        
        // Update tier - even if it hasn't changed, we want to make sure method is 'early_access'
        loyaltyCard.tier = tierResult.tier;
        
        // Add early access qualification record if user isn't already on basic tier
        if (tierResult.tier !== 'Basic' && 
            tierResult.method === 'early_access' &&
            !loyaltyCard.tierAcquisitionHistory?.some(h => h.method === 'early_access')) {
          
          console.log(`Marking user as qualified for early access benefits at ${tierResult.tier} tier`);
          
          // Initialize tier acquisition history if needed
          if (!loyaltyCard.tierAcquisitionHistory) {
            loyaltyCard.tierAcquisitionHistory = [];
          }
          
          // Add early access qualification entry
          loyaltyCard.tierAcquisitionHistory.push({
            tier: tierResult.tier,
            method: 'early_access',
            acquiredAt: new Date(),
            reason: 'Purchase during early access period'
          });
        }
      }
    }
    
    // Save the card - tier will be automatically updated by the pre-save middleware
    await loyaltyCard.save();
    
    return res.status(200).json({
      success: true,
      data: loyaltyCard,
      message: "Loyalty points updated successfully"
    });
  } catch (error) {
    console.error("Error in updateLoyaltyPoints:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false
    });
  }
};

/**
 * Validate a loyalty card (for in-store scanning)
 */
export const validateLoyaltyCard = async (req, res) => {
  try {
    const { cardNumber } = req.params;
    
    if (!cardNumber) {
      return res.status(400).json({
        message: "Card number is required",
        success: false
      });
    }
    
    const loyaltyCard = await LoyaltyCardModel.findOne({ cardNumber });
    if (!loyaltyCard) {
      return res.status(404).json({
        message: "Invalid loyalty card",
        success: false
      });
    }
    
    if (!loyaltyCard.isActive) {
      return res.status(400).json({
        message: "This loyalty card is inactive",
        success: false
      });
    }
    
    // Check if it's expired
    if (loyaltyCard.expiresAt < new Date()) {
      return res.status(400).json({
        message: "This loyalty card has expired",
        success: false
      });
    }
    
    // Get the user info (excluding sensitive data)
    const user = await UserModel.findById(loyaltyCard.userId, {
      name: 1,
      email: 1,
      mobile: 1
    });
    
    // Check if user is admin
    const isAdmin = user?.isAdmin === true || user?.role === 'admin';
    
    // Get current loyalty thresholds to check early access settings
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ createdAt: -1 });
    const earlyAccessEnabled = thresholds ? thresholds.earlyAccessEnabled === true : false;
    
    // Get discount percentage based on tier
    const getDiscountPercentage = (tier) => {
      switch(tier) {
        case 'Basic': return '0%';
        case 'Bronze': return '2%';
        case 'Silver': return '3%';
        case 'Gold': return '5%';
        case 'Platinum': return '7%';
        default: return '0%';
      }
    };
    
    // Format expiry date with clear day, month, and year
    const expiryDate = loyaltyCard.expiresAt;
    const formattedExpiryDate = expiryDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Add early access status information for UI display 
    // Only create this object if either early access is enabled OR user is admin
    const earlyAccessInfo = {
      enabled: earlyAccessEnabled,
      // Early access should only be visible to regular users when it's actually enabled
      visible: earlyAccessEnabled || isAdmin,
      inPreview: isAdmin && !earlyAccessEnabled,
      statusText: earlyAccessEnabled ? "Active" : "Inactive",
      // Add clear message about early access status
      message: earlyAccessEnabled ? 
        "Early Access Program Active - You can access tier benefits earlier than standard thresholds!" :
        "Early Access Program Inactive - All tier upgrades now require the standard point thresholds."
    };
    
    return res.status(200).json({
      success: true,
      data: {
        cardNumber: loyaltyCard.cardNumber,
        tier: loyaltyCard.tier,
        points: loyaltyCard.points,
        issuedDate: loyaltyCard.createdAt,
        expiresAt: loyaltyCard.expiresAt,
        // Add formatted expiry date for clear display
        formattedExpiryDate: formattedExpiryDate,
        expiryMessage: `Your loyalty benefits expire on ${formattedExpiryDate}`,
        discountPercentage: getDiscountPercentage(loyaltyCard.tier),
        user: {
          name: user?.name || 'Unknown User',
          email: user?.email,
          mobile: user?.mobile
        },
        // Only include early access information if it's enabled or user is admin
        earlyAccess: earlyAccessInfo,
        storeInfo: {
          logoUrl: '/assets/Brand_logo.png',
          brandName: 'TajiCart AI'
        }
      },
      message: "Card validated successfully"
    });
  } catch (error) {
    console.error("Error in validateLoyaltyCard:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
};

/**
 * Get current tier threshold settings
 */
export const getTierThresholds = async (req, res) => {
  try {
    // Find the most recent thresholds or create default ones if none exist
    let thresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 });
    
    if (!thresholds) {
      thresholds = new LoyaltyThresholdModel({
        // Standard tier thresholds
        bronzeThreshold: 500,
        silverThreshold: 1500,
        goldThreshold: 3000,
        platinumThreshold: 5000,
        // Early access settings
        earlyAccessEnabled: true,
        // Early access thresholds
        earlyBronzeThreshold: 400,
        earlySilverThreshold: 1200,
        earlyGoldThreshold: 2500,
        earlyPlatinumThreshold: 3750,
        lastUpdated: new Date()
      });
      await thresholds.save();
    }
    
    // Clearly mark if early access is enabled
    const isAdmin = req.isAdmin === true;
    const earlyAccessEnabled = thresholds.earlyAccessEnabled === true;
    
    // Only show early access UI sections when it's enabled or to admin users
    const shouldShowEarlyAccess = earlyAccessEnabled || isAdmin;
    
    return res.status(200).json({
      success: true,
      data: {
        ...thresholds.toObject(),
        // Report early access status
        earlyAccessEnabled: earlyAccessEnabled,
        // Only show early access sections when enabled or to admin users
        showEarlyAccess: shouldShowEarlyAccess,
        earlyAccessActive: earlyAccessEnabled,
        isAdminPreview: isAdmin && !earlyAccessEnabled,
        earlyAccessStatusText: earlyAccessEnabled ? "Active" : "Inactive"
      },
      message: "Tier thresholds retrieved successfully"
    });
  } catch (error) {
    console.error("Error in getTierThresholds:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false
    });
  }
};

/**
 * Update tier threshold settings
 */
export const updateTierThresholds = async (req, res) => {
  try {
    const { 
      // Standard tier thresholds
      bronzeThreshold,
      silverThreshold,
      goldThreshold,
      platinumThreshold,
      // Early access settings
      earlyAccessEnabled,
      // Early access thresholds
      earlyBronzeThreshold, 
      earlySilverThreshold, 
      earlyGoldThreshold, 
      earlyPlatinumThreshold 
    } = req.body;
    
    // Validate standard thresholds are in ascending order
    if (
      bronzeThreshold >= silverThreshold || 
      silverThreshold >= goldThreshold || 
      goldThreshold >= platinumThreshold
    ) {
      return res.status(400).json({
        message: "Standard thresholds must be in ascending order (Bronze < Silver < Gold < Platinum)",
        success: false
      });
    }
    
    // Validate early access thresholds - only if early access is enabled
    if (earlyAccessEnabled) {
      if (
        earlyBronzeThreshold < 0 || earlyBronzeThreshold > bronzeThreshold ||
        earlySilverThreshold < bronzeThreshold || earlySilverThreshold > silverThreshold ||
        earlyGoldThreshold < silverThreshold || earlyGoldThreshold > goldThreshold ||
        earlyPlatinumThreshold < goldThreshold || earlyPlatinumThreshold > platinumThreshold
      ) {
        return res.status(400).json({
          message: "Early access thresholds must be between the previous and current tier thresholds",
          success: false
        });
      }
    }
    
    // Create a new threshold document
    const thresholds = new LoyaltyThresholdModel({
      // Standard tier thresholds
      bronzeThreshold,
      silverThreshold,
      goldThreshold,
      platinumThreshold,
      // Early access settings
      earlyAccessEnabled,
      // Early access thresholds
      earlyBronzeThreshold,
      earlySilverThreshold,
      earlyGoldThreshold,
      earlyPlatinumThreshold,
      lastUpdated: new Date(),
      updatedBy: req.userId
    });
    
    await thresholds.save();
    
    // Get the previous threshold settings to check if early access was disabled
    const prevThresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 }).skip(1);
    const wasEarlyAccessDisabled = prevThresholds?.earlyAccessEnabled === true && earlyAccessEnabled === false;
    
    // Schedule a background job to update all user tiers based on new thresholds
    // This is important to ensure that all existing loyalty cards reflect the new threshold settings
    try {
      console.log('Initiating loyalty tier recalculation for all users based on new thresholds');
      
      // If early access is disabled, ensure all users are recalculated based on standard thresholds
      if (!earlyAccessEnabled) {
        console.log('Early access disabled. Recalculating all user tiers based on standard thresholds.');
        
        if (wasEarlyAccessDisabled) {
          console.log('IMPORTANT: Early access was previously enabled and is now disabled. Forcing full recalculation for all users.');
          
          // If early access was just turned off, immediately update all users who were on early access
          // to ensure they're properly moved to standard tiers
          setTimeout(async () => {
            try {
              // Find all cards with early access tiers
              const earlyAccessCards = await LoyaltyCardModel.find({
                $or: [
                  { 'tierAcquisitionHistory.method': 'early_access' },
                  { 'tierAcquisitionHistory.method': 'early_access_legacy' }
                ]
              });
              
              console.log(`Found ${earlyAccessCards.length} cards with early access benefits to update`);
              
              // Update each card individually
              for (const card of earlyAccessCards) {
                const user = await UserModel.findById(card.userId);
                const isAdmin = user?.isAdmin === true || user?.role === 'admin';
                
                if (!isAdmin) {
                  const oldTier = card.tier;
                  const tierResult = await determineUserTier(card.points, false);
                  card.tier = tierResult.tier;
                  
                  // Add history if tier changed
                  if (oldTier !== tierResult.tier) {
                    card.tierAcquisitionHistory = card.tierAcquisitionHistory || [];
                    card.tierAcquisitionHistory.push({
                      tier: tierResult.tier,
                      method: 'standard',
                      acquiredAt: new Date()
                    });
                    
                    // Add points history entry for clarity
                    card.pointsHistory = card.pointsHistory || [];
                    card.pointsHistory.push({
                      points: 0,
                      reason: `Tier changed from ${oldTier} to ${tierResult.tier} due to early access program deactivation`,
                      date: new Date()
                    });
                    
                    await card.save();
                    console.log(`Updated user ${card.userId} from ${oldTier} to ${tierResult.tier} tier (early access disabled)`);
                  }
                }
              }
            } catch (err) {
              console.error('Error in early access cleanup:', err);
            }
          }, 0);
        }
      }
      
      // Use setTimeout to run this asynchronously after responding to the client
      setTimeout(async () => {
        await updateAllUserTiers();
      }, 100);
    } catch (backgroundError) {
      console.error('Error scheduling tier recalculation:', backgroundError);
      // Continue anyway, we've already saved the thresholds
    }
    
    return res.status(200).json({
      success: true,
      data: thresholds,
      message: "Tier thresholds updated successfully. User tiers will be recalculated in the background."
    });
  } catch (error) {
    console.error("Error in updateTierThresholds:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false
    });
  }
};

/**
 * Update all user tiers based on current threshold settings
 * This is a background job that runs when threshold settings are changed
 */
export const updateAllUserTiers = async () => {
  try {
    console.log('Starting background job to update all user tiers...');
    
    // Get the current thresholds
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 });
    
    if (!thresholds) {
      console.log('No threshold settings found, using default values');
      return { processed: 0, updated: 0 };
    }
    
    console.log('Current threshold settings:');
    console.log(`Standard tiers: Bronze=${thresholds.bronzeThreshold}, Silver=${thresholds.silverThreshold}, Gold=${thresholds.goldThreshold}, Platinum=${thresholds.platinumThreshold}`);
    console.log(`Early access enabled: ${thresholds.earlyAccessEnabled}`);
    if (thresholds.earlyAccessEnabled) {
      console.log(`Early access tiers: Bronze=${thresholds.earlyBronzeThreshold}, Silver=${thresholds.earlySilverThreshold}, Gold=${thresholds.earlyGoldThreshold}, Platinum=${thresholds.earlyPlatinumThreshold}`);
    } else {
      console.log('Early access is disabled - only users who previously qualified will retain early access benefits');
    }
    
    // Batch size for processing to avoid memory issues
    const BATCH_SIZE = 100;
    let processed = 0;
    let updated = 0;
    
    // Get total count for progress tracking
    const totalCards = await LoyaltyCardModel.countDocuments();
    console.log(`Found ${totalCards} loyalty cards to process`);
    
    // Process in batches using pagination
    let hasMore = true;
    let page = 0;
    
    while (hasMore) {
      // Get a batch of loyalty cards
      const loyaltyCards = await LoyaltyCardModel.find()
        .skip(page * BATCH_SIZE)
        .limit(BATCH_SIZE)
        .populate('userId', 'isAdmin role');
      
      if (loyaltyCards.length === 0) {
        hasMore = false;
        continue;
      }
      
      // Process each card in the batch
      for (const card of loyaltyCards) {
        try {
          processed++;
          
          // Check if user is admin
          const isAdmin = card.userId?.isAdmin === true || card.userId?.role === 'admin';
          
          // Skip updating admin cards - they should always be Platinum
          if (isAdmin) {
            console.log(`Skipping admin user card ${card._id} (User: ${card.userId?._id})`);
            
            // Ensure admin cards have proper tier acquisition history
            if (card.tier !== 'Platinum') {
              card.tier = 'Platinum';
              
              // Add tier acquisition history if it doesn't exist
              if (!card.tierAcquisitionHistory) {
                card.tierAcquisitionHistory = [];
              }
              
              // Add admin grant entry if not already present
              const hasAdminGrant = card.tierAcquisitionHistory.some(entry => 
                entry.tier === 'Platinum' && entry.method === 'admin_grant'
              );
              
              if (!hasAdminGrant) {
                card.tierAcquisitionHistory.push({
                  tier: 'Platinum',
                  method: 'admin_grant',
                  acquiredAt: new Date()
                });
                await card.save();
                console.log(`Updated admin user ${card.userId?._id} to ensure Platinum tier with proper acquisition record`);
                updated++;
              }
            }
            continue;
          }
          
          console.log(`Processing card ${card._id} for user ${card.userId?._id} with ${card.points} points, current tier: ${card.tier}`);
          
          // Determine the appropriate tier based on current points and latest thresholds
          // Pass the full card to check tier acquisition history
          const tierResult = await determineUserTier(card.points, isAdmin, card);
          
          console.log(`Determined appropriate tier: ${tierResult.tier} via ${tierResult.method} (current: ${card.tier})`);
          
          // Only update if tier has changed AND we're not downgrading to Basic
          if (tierResult.tier !== card.tier && tierResult.tier !== 'Basic') {
            const oldTier = card.tier;
            card.tier = tierResult.tier;
            
            // Add a history entry to track this automated change
            if (!card.pointsHistory) {
              card.pointsHistory = [];
            }
            
            // Initialize tier acquisition history if needed
            if (!card.tierAcquisitionHistory) {
              card.tierAcquisitionHistory = [];
            }
            
            // Add to points history
            card.pointsHistory.push({
              points: 0, // No points change, just tier
              reason: `Tier updated from ${oldTier} to ${tierResult.tier} due to threshold settings change`,
              date: new Date()
            });
            
            // Add to tier acquisition history if not Basic tier
            if (tierResult.tier !== 'Basic') {
              card.tierAcquisitionHistory.push({
                tier: tierResult.tier,
                method: tierResult.method,
                acquiredAt: new Date()
              });
              
              console.log(`Added tier acquisition record: ${tierResult.tier} via ${tierResult.method}`);
              
              if (tierResult.preserved) {
                console.log(`This tier was preserved from previous early access qualification`);
              }
            }
            
            await card.save();
            updated++;
            
            console.log(`Updated user ${card.userId?._id}: tier changed from ${oldTier} to ${tierResult.tier} via ${tierResult.method}`);
            
            // Log every 50 updates for visibility
            if (updated % 50 === 0) {
              console.log(`Updated ${updated} tiers so far...`);
            }
          } else if (tierResult.tier === 'Basic' && tierResult.tier !== card.tier) {
            // If downgrading to Basic, preserve their current tier
            console.log(`Preserving user ${card.userId?._id}'s ${card.tier} tier (not downgrading to Basic)`);
            
            // Add a note to points history but DON'T change tier
            if (!card.pointsHistory) {
              card.pointsHistory = [];
            }
            
            card.pointsHistory.push({
              points: 0,
              reason: `Maintained ${card.tier} tier despite early access being disabled (grandfathered privilege)`,
              date: new Date()
            });
            
            await card.save();
            updated++;
          } else {
            // Tier hasn't changed, but check if we need to update the acquisition method
            // This is important when early access toggle changes
            if (tierResult.tier !== 'Basic' && card.tierAcquisitionHistory) {
              const latestTierRecord = [...card.tierAcquisitionHistory]
                .filter(entry => entry.tier === tierResult.tier)
                .sort((a, b) => new Date(b.acquiredAt) - new Date(a.acquiredAt))[0];
              
              // If current method is different than recorded method, add a new entry
              if (latestTierRecord && latestTierRecord.method !== tierResult.method) {
                card.tierAcquisitionHistory.push({
                  tier: tierResult.tier,
                  method: tierResult.method,
                  acquiredAt: new Date()
                });
                
                await card.save();
                updated++;
                
                console.log(`Updated acquisition method for user ${card.userId?._id}: ${latestTierRecord.method} → ${tierResult.method}`);
              }
            }
          }
          
          // When processing each card, check if early access status affected tier:
          // Inside the card processing loop where you call determineUserTier:
          
          // After getting tierResult, add this:
          if (tierResult.earlyAccessDisabled && tierResult.wasOnEarlyAccess) {
            console.log(`User ${card.userId?._id} was previously on early access tier but is now downgraded because early access is disabled`);
            
            // Add a special note to the points history
            if (!card.pointsHistory) {
              card.pointsHistory = [];
            }
            
            card.pointsHistory.push({
              points: 0,
              reason: `Early Access program is now disabled - tier recalculated using standard thresholds only`,
              date: new Date()
            });
          }
          
        } catch (cardError) {
          console.error(`Error updating card ${card._id}:`, cardError);
          // Continue with next card
        }
      }
      
      // Log progress
      console.log(`Processed ${processed} of ${totalCards} loyalty cards`);
      
      // Move to next page
      page++;
    }
    
    console.log(`Tier recalculation complete. Processed ${processed} cards, updated ${updated} tiers.`);
    return { processed, updated };
  } catch (error) {
    console.error('Error in updateAllUserTiers job:', error);
    throw error;
  }
};

/**
 * Determine user tier based on points and threshold settings
 * This is a helper function that can be used by other services
 */
export const determineUserTier = async (points, isAdmin = false, loyaltyCard = null) => {
  try {
    // Admins always get Platinum tier
    if (isAdmin) {
      return { tier: 'Platinum', method: 'admin_grant' };
    }
    
    // Get the current thresholds
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 });
    
    // If no thresholds found, use default tier logic
    if (!thresholds) {
      if (points >= 5000) return { tier: 'Platinum', method: 'standard' };
      if (points >= 3000) return { tier: 'Gold', method: 'standard' };
      if (points >= 1500) return { tier: 'Silver', method: 'standard' };
      if (points >= 500) return { tier: 'Bronze', method: 'standard' };
      return { tier: 'Basic', method: 'standard' };
    }
    
    // Get the user's current tier if loyalty card is provided
    const currentTier = loyaltyCard?.tier || 'Basic';
    const tierRank = { 'Basic': 0, 'Bronze': 1, 'Silver': 2, 'Gold': 3, 'Platinum': 4 };
    
    // First, determine what tier the user would qualify for using standard thresholds
    let standardTier = 'Basic';
    if (points >= thresholds.platinumThreshold) standardTier = 'Platinum';
    else if (points >= thresholds.goldThreshold) standardTier = 'Gold';
    else if (points >= thresholds.silverThreshold) standardTier = 'Silver';
    else if (points >= thresholds.bronzeThreshold) standardTier = 'Bronze';
    
    // Next, determine what tier the user would qualify for using early access thresholds (if enabled)
    let earlyAccessTier = 'Basic';
    let finalMethod = 'standard';
    
    if (thresholds.earlyAccessEnabled) {
      console.log(`Early access is enabled. Checking early access thresholds for user with ${points} points`);
      
      if (points >= thresholds.earlyPlatinumThreshold) earlyAccessTier = 'Platinum';
      else if (points >= thresholds.earlyGoldThreshold) earlyAccessTier = 'Gold';
      else if (points >= thresholds.earlySilverThreshold) earlyAccessTier = 'Silver';
      else if (points >= thresholds.earlyBronzeThreshold) earlyAccessTier = 'Bronze';
      
      // If early access tier is higher than standard tier, use it
      if (tierRank[earlyAccessTier] > tierRank[standardTier]) {
        finalMethod = 'early_access';
      }
    } else {
      console.log('Early access is disabled. Using standard thresholds only.');
    }
    
    // Important: First check if the user already has a higher tier than what they would get now
    // This ensures users don't get downgraded when early access is toggled
    let finalTier = standardTier;
    if (thresholds.earlyAccessEnabled && tierRank[earlyAccessTier] > tierRank[standardTier]) {
      finalTier = earlyAccessTier;
    }
    
    // Enhanced preservation logic:
    // 1. Never downgrade when early access is activated (existing logic)
    // 2. NEW: Never downgrade when early access is deactivated either
    if (loyaltyCard && tierRank[currentTier] > tierRank[finalTier]) {
      // Check if user earned tier during early access
      const earnedDuringEarlyAccess = loyaltyCard.tierAcquisitionHistory?.some(
        history => history.method === 'early_access' && history.tier === currentTier
      );
      
      // For ANY tier above Basic, preserve it regardless of early access status
      console.log(`Preserving user's current tier ${currentTier} which is higher than calculated tier ${finalTier}`);
      const preservationReason = !thresholds.earlyAccessEnabled && earnedDuringEarlyAccess
        ? 'grandfathered_early_access'
        : 'preserved';
        
      return { 
        tier: currentTier, 
        method: preservationReason, 
        previousTier: finalTier,
        message: !thresholds.earlyAccessEnabled && earnedDuringEarlyAccess
          ? 'User maintained tier earned during early access period even after deactivation'
          : 'User maintained higher existing tier'
      };
    }
    
    // Make sure we explicitly set the early access status to be included in the response
    const earlyAccessEnabled = thresholds.earlyAccessEnabled === true;
    
    // Return the final tier and method
    return { 
      tier: finalTier,
      method: finalMethod,
      earlyAccessEnabled: earlyAccessEnabled, // Explicitly set this value
      earlyAccessMessage: earlyAccessEnabled ? 
        "Early Access Program Active - You can access tier benefits earlier than standard thresholds!" :
        "Early Access Program Inactive - All tier upgrades now require the standard point thresholds."
    };
    
  } catch (error) {
    console.error("Error in determineUserTier:", error);
    // Use default tier logic if there's an error
    if (points >= 5000) return { tier: 'Platinum', method: 'standard' };
    if (points >= 3000) return { tier: 'Gold', method: 'standard' };
    if (points >= 1500) return { tier: 'Silver', method: 'standard' };
    if (points >= 500) return { tier: 'Bronze', method: 'standard' };
    return { tier: 'Basic', method: 'standard' };
  }
};

/**
 * Get the current special benefit range settings
 */
export const getBenefitRanges = async (req, res) => {
  try {
    // Import the model at the top of the file if not already imported
    // import LoyaltyBenefitRangeModel from '../models/loyaltybenefitrange.model.js';
    
    const LoyaltyBenefitRangeModel = (await import('../models/loyaltybenefitrange.model.js')).default;
    
    // Find the most recent settings or create default ones if none exist
    let ranges = await LoyaltyBenefitRangeModel.findOne().sort({ lastUpdated: -1 });
    
    if (!ranges) {
      ranges = new LoyaltyBenefitRangeModel({
        firstMilestone: 1000,
        firstMilestoneName: 'Welcome Reward',
        secondMilestone: 2500,
        secondMilestoneName: 'Loyalty Bonus',
        thirdMilestone: 5000,
        thirdMilestoneName: 'VIP Status',
        lastUpdated: new Date()
      });
      await ranges.save();
    }
    
    return res.status(200).json({
      success: true,
      data: ranges,
      message: "Benefit ranges retrieved successfully"
    });
  } catch (error) {
    console.error("Error in getBenefitRanges:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
};

/**
 * Update the special benefit range settings
 */
export const updateBenefitRanges = async (req, res) => {
  try {
    const { 
      firstMilestone, 
      firstMilestoneName, 
      secondMilestone, 
      secondMilestoneName, 
      thirdMilestone, 
      thirdMilestoneName 
    } = req.body;
    
    // Basic validation
    if (
      !firstMilestone || !firstMilestoneName || 
      !secondMilestone || !secondMilestoneName || 
      !thirdMilestone || !thirdMilestoneName
    ) {
      return res.status(400).json({
        message: "All milestone values and names are required",
        success: false
      });
    }
    
    // Validate milestone order (each should be higher than the previous)
    if (firstMilestone >= secondMilestone || secondMilestone >= thirdMilestone) {
      return res.status(400).json({
        message: "Milestones must be in ascending order (first < second < third)",
        success: false
      });
    }
    
    const LoyaltyBenefitRangeModel = (await import('../models/loyaltybenefitrange.model.js')).default;
    
    // Create a new settings document
    const ranges = new LoyaltyBenefitRangeModel({
      firstMilestone,
      firstMilestoneName,
      secondMilestone,
      secondMilestoneName,
      thirdMilestone,
      thirdMilestoneName,
      lastUpdated: new Date(),
      updatedBy: req.userId
    });
    
    await ranges.save();
    
    return res.status(200).json({
      success: true,
      data: ranges,
      message: "Benefit ranges updated successfully"
    });
  } catch (error) {
    console.error("Error in updateBenefitRanges:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
};

/**
 * Get paginated list of loyalty cards with search functionality
 * This is for the admin panel to manage all loyalty cards
 */
export const getLoyaltyCards = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;
    
    // Build search filter
    let filter = {};
    if (search) {
      // If search is a card number format, search exactly 
      if (search.startsWith('TAJI')) {
        filter.cardNumber = search;
      } else {
        // Otherwise search for user info by looking up users first
        const users = await UserModel.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { mobile: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        
        const userIds = users.map(user => user._id);
        
        if (userIds.length > 0) {
          filter.userId = { $in: userIds };
        } else {
          // If no users match, still try searching card tiers
          filter.tier = { $regex: search, $options: 'i' };
        }
      }
    }
    
    // Get total count for pagination
    const total = await LoyaltyCardModel.countDocuments(filter);
    
    // Get paginated results
    const loyaltyCards = await LoyaltyCardModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get current loyalty thresholds to check early access settings
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ createdAt: -1 });
    const earlyAccessEnabled = thresholds ? thresholds.earlyAccessEnabled === true : false;
    const isRequestAdmin = req.isAdmin === true;
    
    // Add user details and early access status
    const cardsWithUserInfo = [];
    for (const card of loyaltyCards) {
      const user = await UserModel.findById(card.userId).select('name email mobile avatar isAdmin role');
      const isUserAdmin = user?.isAdmin === true || user?.role === 'admin';
      
      // Format expiry date for clear display
      const expiryDate = card.expiresAt;
      const formattedExpiryDate = expiryDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      const earlyAccessInfo = {
        enabled: earlyAccessEnabled,
        // Early access status is only visible to admins when disabled
        visible: earlyAccessEnabled || isRequestAdmin,
        statusText: earlyAccessEnabled ? "Active" : "Inactive",
        // For non-admin cards, highlight if tier might change due to disabled early access
        affectedByDisabled: !earlyAccessEnabled && !isUserAdmin && 
                           card.tierAcquisitionHistory?.some(h => 
                             h.method === 'early_access' || h.method === 'early_access_legacy'
                           )
      };
      
      cardsWithUserInfo.push({
        ...card,
        user: user ? {
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar
        } : {
          name: 'Unknown User',
          email: 'No email',
          mobile: 'No mobile'
        },
        // Add formatted expiry date
        formattedExpiryDate: formattedExpiryDate,
        daysUntilExpiry: Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)),
        // Add early access status to each card
        earlyAccess: earlyAccessInfo
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        cards: cardsWithUserInfo,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit
        },
        // Add overall early access status for the table UI - visible only to admins when disabled
        earlyAccessStatus: {
          enabled: earlyAccessEnabled,
          visible: earlyAccessEnabled || isRequestAdmin,
          statusText: earlyAccessEnabled ? "Active" : "Inactive"
        }
      },
      message: "Loyalty cards fetched successfully"
    });
  } catch (error) {
    console.error("Error in getLoyaltyCards:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false
    });
  }
};

/**
 * Get loyalty program statistics for admin dashboard
 */
export const getLoyaltyStats = async (req, res) => {
  try {
    // Get total cards by tier
    const tierStats = await LoyaltyCardModel.aggregate([
      { $group: { _id: "$tier", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Calculate total points across all members
    const pointsResult = await LoyaltyCardModel.aggregate([
      { $group: { _id: null, total: { $sum: "$points" } } }
    ]);
    const totalPoints = pointsResult.length > 0 ? pointsResult[0].total : 0;
    
    // Get total active cards
    const activeCards = await LoyaltyCardModel.countDocuments({ isActive: true });
    
    // Get total members
    const totalMembers = await LoyaltyCardModel.countDocuments();
    
    // Get average points per member
    const avgPoints = totalMembers > 0 ? Math.floor(totalPoints / totalMembers) : 0;
    
    // Get loyalty growth (new members in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newMembers = await LoyaltyCardModel.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    
    // Calculate growth percentage
    const growthPercentage = totalMembers > 0 
      ? Math.floor((newMembers / totalMembers) * 100) 
      : 0;
    
    // Format tier stats into an object
    const tierCounts = {};
    tierStats.forEach(tier => {
      tierCounts[tier._id] = tier.count;
    });
    
    // Ensure all tiers have counts
    const allTiers = ['Basic', 'Bronze', 'Silver', 'Gold', 'Platinum'];
    allTiers.forEach(tier => {
      if (!tierCounts[tier]) tierCounts[tier] = 0;
    });
    
    // Get early access status
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 });
    const earlyAccessEnabled = thresholds ? thresholds.earlyAccessEnabled === true : false;
    
    return res.status(200).json({
      success: true,
      data: {
        totalMembers,
        activeCards,
        totalPoints,
        avgPointsPerMember: avgPoints,
        newMembersLast30Days: newMembers,
        growthPercentage,
        tierDistribution: tierCounts,
        // Add early access status
        earlyAccessStatus: {
          enabled: earlyAccessEnabled,
          // Always visible to everyone
          visible: true,
          // Clear status text
          statusText: earlyAccessEnabled ? "Active" : "Inactive"
        }
      },
      message: "Loyalty statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Error in getLoyaltyStats:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
};

/**
 * Request a security code for loyalty operations
 * This is admin-only and used before sensitive operations like resetting points
 */
export const requestSecurityCode = async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({
        message: "Action type is required",
        success: false
      });
    }
    
    // Verify this is an admin user
    if (!req.isAdmin) {
      return res.status(403).json({
        message: "Unauthorized. Admin access required.",
        success: false
      });
    }
    
    // Generate a security code
    const securityCode = createSecurityCode(req.userId, action);
    
    // Send the code to the admin's email
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false
      });
    }
    
    try {
      const sendEmailModule = await import('../config/sendEmail.js');
      const sendEmail = sendEmailModule.default;
      
      await sendEmail({
        sendTo: user.email,
        subject: "Security Code for Loyalty Program Operation",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #333;">Security Verification Code</h2>
            <p>Hello ${user.name},</p>
            <p>Your security code for performing a loyalty program operation is:</p>
            <div style="background-color: #f2f2f2; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
              ${securityCode}
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you did not request this code, please contact the system administrator immediately.</p>
            <p>Thank you,<br>Taji Cart Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error("Error sending security code email:", emailError);
      return res.status(500).json({
        message: "Failed to send security code",
        success: false
      });
    }
    
    return res.status(200).json({
      message: "Security code sent to your email",
      success: true
    });
  } catch (error) {
    console.error("Error in requestSecurityCode:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
};

/**
 * Refresh user points based on spending history or reset to zero
 * This admin-only endpoint allows refreshing a user's loyalty points
 * Now with security code verification
 */
export const refreshUserPoints = async (req, res) => {
  try {
    const { cardId, userId, resetToZero, securityCode } = req.body;
    
    if (!cardId || !userId) {
      return res.status(400).json({
        message: "Card ID and User ID are required",
        success: false
      });
    }
    
    // Verify security code for sensitive operations
    if (!securityCode) {
      return res.status(400).json({
        message: "Security code is required for this operation",
        success: false
      });
    }
    
    const action = resetToZero ? 'resetPoints' : 'refreshPoints';
    const isCodeValid = verifySecurityCode(securityCode, req.userId, action);
    
    if (!isCodeValid) {
      return res.status(403).json({
        message: "Invalid or expired security code",
        success: false
      });
    }
    
    // Find the existing card
    const loyaltyCard = await LoyaltyCardModel.findById(cardId);
    if (!loyaltyCard) {
      return res.status(404).json({
        message: "Loyalty card not found",
        success: false
      });
    }
    
    // Check if the card belongs to the specified user
    if (loyaltyCard.userId.toString() !== userId) {
      return res.status(400).json({
        message: "Card ID does not match User ID",
        success: false
      });
    }
    
    // Continue with the original functionality
    if (resetToZero) {
      // Reset points to zero
      console.log(`Admin resetting points to zero for user ${userId}`);
      loyaltyCard.points = 0;
      loyaltyCard.tier = 'Basic'; // Reset tier to Basic as well
      
      // Add entry to points history
      loyaltyCard.pointsHistory = loyaltyCard.pointsHistory || [];
      loyaltyCard.pointsHistory.push({
        points: -loyaltyCard.points, // Negative value to show points were removed
        reason: 'Admin reset with security verification',
        date: new Date()
      });
      
      await loyaltyCard.save();
      
      return res.status(200).json({
        success: true,
        data: loyaltyCard,
        message: "Points reset to zero successfully"
      });
    } else {
      // Refresh points based on spending history
      // ...existing refresh points code...
      
      console.log(`Admin refreshing points based on spending for user ${userId}`);
      
      // Calculate points based on order history
      const spentResult = await OrderModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: "$totalAmt" } } }
      ]);
      
      const totalSpent = spentResult.length > 0 ? spentResult[0].total : 0;
      const earnedPoints = Math.floor(totalSpent / 100); // 1 point per KES 100 spent
      
      console.log(`User has spent KES ${totalSpent} which equals ${earnedPoints} points`);
      
      // Get current points before update for history
      const previousPoints = loyaltyCard.points;
      
      // Update points
      loyaltyCard.points = earnedPoints;
      
      // Check for user type to determine tier
      const user = await UserModel.findById(userId);
      const isAdmin = user?.isAdmin === true || user?.role === 'admin';
      
      // Determine new tier
      const newTier = await determineUserTier(earnedPoints, isAdmin);
      loyaltyCard.tier = newTier;
      
      // Add entry to points history
      loyaltyCard.pointsHistory = loyaltyCard.pointsHistory || [];
      loyaltyCard.pointsHistory.push({
        points: earnedPoints - previousPoints, // May be negative if points decreased
        reason: 'Admin refresh based on spending (with security verification)',
        date: new Date()
      });
      
      await loyaltyCard.save();
      
      return res.status(200).json({
        success: true,
        data: loyaltyCard,
        message: "Points refreshed successfully"
      });
    }
  } catch (error) {
    console.error("Error in refreshUserPoints:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false
    });
  }
};

// Helper function to update tier based on points
export const updateLoyaltyCardTier = async (loyaltyCard) => {
  try {
    // Get current thresholds
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ createdAt: -1 });
    
    if (!thresholds) {
      console.error('No loyalty thresholds found in database');
      return loyaltyCard;
    }
    
    // Get user info to check if user is admin
    const user = await UserModel.findById(loyaltyCard.userId);
    const isAdmin = user?.isAdmin === true || user?.role === 'admin';
    
    if (isAdmin) {
      // Ensure admin cards are always Platinum
      if (loyaltyCard.tier !== 'Platinum') {
        loyaltyCard.tier = 'Platinum';
        await loyaltyCard.save();
      }
      return loyaltyCard;
    }
    
    const points = loyaltyCard.points;
    console.log(`Updating tier for user ${loyaltyCard.userId} with ${points} points. Current tier: ${loyaltyCard.tier}`);
    console.log(`Early access is ${thresholds.earlyAccessEnabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (thresholds.earlyAccessEnabled) {
      console.log(`Early access thresholds: Bronze=${thresholds.earlyBronzeThreshold}, Silver=${thresholds.earlySilverThreshold}, Gold=${thresholds.earlyGoldThreshold}, Platinum=${thresholds.earlyPlatinumThreshold}`);
    }
    
    // IMPORTANT: Use the determineUserTier helper to ensure consistent tier logic
    // This ensures early access is properly applied when enabled
    const tierResult = await determineUserTier(points, isAdmin, loyaltyCard);
    const newTier = tierResult.tier;
    
    console.log(`Determined tier: ${newTier} via ${tierResult.method}`);
    
    // Only update if tier has changed
    if (loyaltyCard.tier !== newTier) {
      console.log(`Upgrading user ${loyaltyCard.userId} from ${loyaltyCard.tier} to ${newTier} (method: ${tierResult.method})`);
      
      // Add tier change to history
      if (!loyaltyCard.tierHistory) loyaltyCard.tierHistory = [];
      loyaltyCard.tierHistory.push({
        from: loyaltyCard.tier,
        to: newTier,
        date: new Date(),
        reason: `Points Threshold (${tierResult.method})`
      });
      
      // Add to tier acquisition history
      if (!loyaltyCard.tierAcquisitionHistory) {
        loyaltyCard.tierAcquisitionHistory = [];
      }
      
      loyaltyCard.tierAcquisitionHistory.push({
        tier: newTier,
        method: tierResult.method,
        acquiredAt: new Date()
      });
      
      loyaltyCard.tier = newTier;
      await loyaltyCard.save();
    }
    
    return loyaltyCard;
  } catch (error) {
    console.error('Error updating loyalty card tier:', error);
    return loyaltyCard;
  }
};

// Add a new route to force recalculate all users' tiers
export const recalculateAllTiers = async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }
    
    // Get current thresholds to log early access status
    const thresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 });
    console.log(`Running tier recalculation. Early access is ${thresholds?.earlyAccessEnabled ? 'ENABLED' : 'DISABLED'}`);
    
    const loyaltyCards = await LoyaltyCardModel.find();
    let updated = 0;
    
    for (const card of loyaltyCards) {
      const oldTier = card.tier;
      const user = await UserModel.findById(card.userId);
      const isAdmin = user?.isAdmin === true || user?.role === 'admin';
      
      // Skip admin users as they always get Platinum
      if (isAdmin) {
        continue;
      }
      
      console.log(`Processing card for user ${card.userId} with ${card.points} points (current tier: ${card.tier})`);
      
      // Use determineUserTier for consistency
      const tierResult = await determineUserTier(card.points, false, card);
      
      if (tierResult.tier !== card.tier) {
        console.log(`Tier changed: ${card.tier} -> ${tierResult.tier} via ${tierResult.method}`);
        card.tier = tierResult.tier;
        
        // Add to tier acquisition history
        if (!card.tierAcquisitionHistory) {
          card.tierAcquisitionHistory = [];
        }
        
        card.tierAcquisitionHistory.push({
          tier: tierResult.tier,
          method: tierResult.method,
          acquiredAt: new Date()
        });
        
        await card.save();
        updated++;
      } else {
        console.log(`No tier change needed for user ${card.userId}`);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Recalculated tiers for ${loyaltyCards.length} cards, updated ${updated} tiers`
    });
  } catch (error) {
    console.error("Error recalculating tiers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export default {
  getUserLoyaltyCard,
  updateLoyaltyPoints,
  validateLoyaltyCard,
  getTierThresholds,
  updateTierThresholds,
  determineUserTier,
  getBenefitRanges,
  updateBenefitRanges,
  getLoyaltyCards,
  getLoyaltyStats,
  requestSecurityCode,
  refreshUserPoints,
  updateAllUserTiers,
  recalculateAllTiers,
  updateLoyaltyCardTier
};
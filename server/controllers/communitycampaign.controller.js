import Campaign from '../models/communitycampaign.model.js';
import CommunityParticipation from '../models/communityparticipation.model.js';
import NotificationModel from '../models/notification.model.js';
import UserReward from '../models/userreward.model.js';

/**
 * Create a new community campaign
 */
export const createCampaign = async (req, res) => {
  try {
    const {
      title,
      description,
      goalType,
      goalTarget,
      rewardType,
      rewardValue,
      startDate,
      endDate,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !goalTarget || !rewardType || !rewardValue || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Create new campaign
    const campaign = new Campaign({
      title,
      description,
      goalType: goalType || 'purchases',
      goalTarget,
      rewardType,
      rewardValue,
      startDate: startDate || new Date(),
      endDate,
      isActive: true,
      metadata: metadata || {}
    });
    
    await campaign.save();
    
    return res.status(201).json({
      success: true,
      message: 'Community campaign created successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Error creating community campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating community campaign',
      error: error.message
    });
  }
};

/**
 * Get all community campaigns
 */
export const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching campaigns',
      error: error.message
    });
  }
};

/**
 * Get active campaigns
 */
export const getActiveCampaigns = async (req, res) => {
  try {
    const userId = req.userId; // May be undefined for non-authenticated requests
    
    // Find all active campaigns that haven't ended or been achieved
    const campaigns = await Campaign.find({
      isActive: true,
      endDate: { $gt: new Date() },
      isAchieved: false
    }).sort({ endDate: 1 });
    
    // If user is authenticated, add user participation info
    let campaignsWithParticipation = campaigns;
    
    if (userId) {
      // Get user participation data for all campaigns
      const participations = await CommunityParticipation.find({ 
        userId,
        campaignId: { $in: campaigns.map(c => c._id) }
      });
      
      // Map participations to campaigns
      campaignsWithParticipation = campaigns.map(campaign => {
        const participation = participations.find(p => 
          p.campaignId.toString() === campaign._id.toString()
        );
        
        return {
          ...campaign.toObject(),
          userParticipation: participation || null
        };
      });
    }
    
    return res.status(200).json({
      success: true,
      data: campaignsWithParticipation
    });
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching active campaigns',
      error: error.message
    });
  }
};

/**
 * Get campaign by ID
 */
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // May be undefined for non-authenticated requests
    
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    // Add user participation data if user is authenticated
    let campaignWithParticipation = campaign;
    
    if (userId) {
      const participation = await CommunityParticipation.findOne({
        userId,
        campaignId: campaign._id
      });
      
      campaignWithParticipation = {
        ...campaign.toObject(),
        userParticipation: participation || null
      };
    }
    
    return res.status(200).json({
      success: true,
      data: campaignWithParticipation
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching campaign',
      error: error.message
    });
  }
};

/**
 * Update a campaign
 */
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating campaign',
      error: error.message
    });
  }
};

/**
 * Delete a campaign
 */
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await Campaign.findByIdAndDelete(id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    // Also delete all participation records for this campaign
    await CommunityParticipation.deleteMany({ campaignId: id });
    
    return res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting campaign',
      error: error.message
    });
  }
};

/**
 * Get campaigns created by a specific user
 */
export const getUserCampaigns = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the requested userId matches authenticated user or is admin
    if (req.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access this resource'
      });
    }
    
    // Find all participations by this user
    const participations = await CommunityParticipation.find({ userId }).populate('campaignId');
    
    // Extract campaigns and add participation data
    const campaigns = participations.map(participation => ({
      ...participation.campaignId.toObject(),
      userParticipation: {
        contributionAmount: participation.contributionAmount,
        lastContributionDate: participation.lastContributionDate,
        hasRedeemed: participation.hasRedeemed,
        redeemDate: participation.redeemDate
      }
    }));
    
    return res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user campaigns',
      error: error.message
    });
  }
};

/**
 * Contribute to a campaign
 */
export const contributeToCampaign = async (req, res) => {
  try {
    const userId = req.userId;
    const { campaignId, contributionAmount = 1, contributionType = 'purchase' } = req.body;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID is required'
      });
    }
    
    // Check if campaign exists and is active
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This campaign is not active'
      });
    }
    
    if (campaign.isAchieved) {
      return res.status(400).json({
        success: false,
        message: 'This campaign has already achieved its goal'
      });
    }
    
    if (campaign.endDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This campaign has expired'
      });
    }
    
    // Record the contribution
    const participation = await CommunityParticipation.recordContribution(
      userId,
      campaignId,
      contributionAmount,
      contributionType
    );
    
    // Update campaign progress
    campaign.currentProgress += contributionAmount;
    
    // Check if goal is achieved
    let isNewlyAchieved = false;
    if (campaign.currentProgress >= campaign.goalTarget && !campaign.isAchieved) {
      campaign.isAchieved = true;
      campaign.achievedDate = new Date();
      isNewlyAchieved = true;
    }
    
    await campaign.save();
    
    // If goal was just achieved, notify participants
    if (isNewlyAchieved) {
      notifyParticipantsOfAchievement(campaign);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Contribution recorded successfully',
      data: {
        campaign,
        participation,
        isAchieved: isNewlyAchieved
      }
    });
  } catch (error) {
    console.error('Error contributing to campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error contributing to campaign',
      error: error.message
    });
  }
};

/**
 * Add contribution to campaign from order
 */
export const addContribution = async (req, res) => {
  try {
    const userId = req.userId;
    const { campaignId } = req.params;
    const { contributionAmount = 1, orderId } = req.body;
    
    // Check if campaign exists and is active
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign || !campaign.isActive || campaign.endDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Campaign is not available'
      });
    }
    
    // Record contribution
    const participation = await CommunityParticipation.recordContribution(
      userId,
      campaignId,
      contributionAmount,
      'order'
    );
    
    // Update campaign progress
    campaign.currentProgress += contributionAmount;
    
    // Check if goal is achieved
    let isNewlyAchieved = false;
    if (campaign.currentProgress >= campaign.goalTarget && !campaign.isAchieved) {
      campaign.isAchieved = true;
      campaign.achievedDate = new Date();
      isNewlyAchieved = true;
    }
    
    await campaign.save();
    
    // Add to metadata
    participation.metadata = {
      ...participation.metadata,
      orderId
    };
    await participation.save();
    
    // If goal was just achieved, notify participants
    if (isNewlyAchieved) {
      notifyParticipantsOfAchievement(campaign);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Contribution added successfully',
      data: {
        campaign,
        participation,
        isAchieved: isNewlyAchieved
      }
    });
  } catch (error) {
    console.error('Error adding contribution:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding contribution',
      error: error.message
    });
  }
};

/**
 * Get leaderboard for a campaign
 */
export const getCampaignLeaderboard = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Check if campaign exists
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    // Get top contributors
    const leaderboard = await CommunityParticipation.find({ campaignId })
      .sort({ contributionAmount: -1 })
      .limit(10)
      .populate('userId', 'name email avatar');
    
    return res.status(200).json({
      success: true,
      data: {
        campaign,
        leaderboard
      }
    });
  } catch (error) {
    console.error('Error fetching campaign leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching campaign leaderboard',
      error: error.message
    });
  }
};

/**
 * Redeem campaign reward
 */
export const redeemCampaignReward = async (req, res) => {
  try {
    const userId = req.userId;
    const { campaignId } = req.params;
    
    // Check if campaign exists and is achieved
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    if (!campaign.isAchieved) {
      return res.status(400).json({
        success: false,
        message: 'This campaign has not achieved its goal yet'
      });
    }
    
    // Check if user participated in the campaign
    const participation = await CommunityParticipation.findOne({
      userId,
      campaignId
    });
    
    if (!participation) {
      return res.status(400).json({
        success: false,
        message: 'You did not participate in this campaign'
      });
    }
    
    if (participation.hasRedeemed) {
      return res.status(400).json({
        success: false,
        message: 'You have already redeemed the reward for this campaign'
      });
    }
    
    // Process reward based on type
    let rewardDetails = {};
    
    // Get validity period from campaign metadata or default to 7 days
    const validityPeriod = campaign.metadata?.validityPeriod || 7;
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityPeriod);
    
    // Generate discount code
    const discountCode = `COMM${campaign._id.toString().substring(0, 6)}${userId.toString().substring(0, 4)}`;
    
    switch (campaign.rewardType) {
      case 'points':
        // Add points to user's loyalty account (implementation depends on your loyalty system)
        // For now, we'll just record it
        rewardDetails = {
          type: 'points',
          value: campaign.rewardValue,
          message: `${campaign.rewardValue} points added to your loyalty account`
        };
        break;
        
      case 'discount':
        // Generate discount code or record entitlement
        rewardDetails = {
          type: 'discount',
          value: campaign.rewardValue,
          code: discountCode,
          message: `${campaign.rewardValue}% discount on your next purchase`
        };
        break;
        
      case 'shipping':
        // Mark user eligible for free shipping
        rewardDetails = {
          type: 'shipping',
          message: 'Free shipping on your next order'
        };
        break;
        
      case 'product':
        // Record entitlement to free product
        rewardDetails = {
          type: 'product',
          productId: campaign.metadata.productId,
          message: 'Free gift with your next purchase'
        };
        break;
        
      default:
        rewardDetails = {
          type: campaign.rewardType,
          value: campaign.rewardValue,
          message: 'Reward redeemed'
        };
    }
    
    // Mark participation as redeemed
    participation.hasRedeemed = true;
    participation.redeemDate = new Date();
    participation.metadata = {
      ...participation.metadata,
      redeemedReward: rewardDetails
    };
    
    await participation.save();
    
    // Create a UserReward entry to track this reward
    const userReward = new UserReward({
      userId,
      campaignId,
      type: campaign.rewardType,
      value: campaign.rewardValue,
      code: rewardDetails.code,
      isActive: true,
      expiryDate,
      campaignTitle: campaign.title,
      metadata: {
        campaignDescription: campaign.description,
        validityPeriod
      }
    });
    
    await userReward.save();
    
    // Create notification for the user
    await NotificationModel.create({
      type: 'community_reward',
      title: 'Community Reward Redeemed',
      message: `You have redeemed your reward for the "${campaign.title}" campaign: ${rewardDetails.message}. Valid until ${expiryDate.toLocaleDateString()}.`,
      isRead: false,
      userId,
      metadata: {
        campaignId: campaign._id,
        rewardDetails,
        expiryDate,
        rewardId: userReward._id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Reward redeemed successfully',
      data: {
        campaign,
        reward: {
          ...rewardDetails,
          expiryDate,
          rewardId: userReward._id
        }
      }
    });
  } catch (error) {
    console.error('Error redeeming campaign reward:', error);
    return res.status(500).json({
      success: false,
      message: 'Error redeeming campaign reward',
      error: error.message
    });
  }
};

/**
 * Create a community perk (special type of campaign)
 */
export const createCommunityPerk = async (req, res) => {
  try {
    const {
      title,
      description,
      goalTarget,
      discountPercentage,
      validityPeriod = 7,
      displayOnHomepage = true,
      displayInCart = true
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !goalTarget || !discountPercentage) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Calculate end date (default 30 days from now)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    // Create new campaign as a perk
    const campaign = new Campaign({
      title,
      description,
      goalType: 'purchases',
      goalTarget,
      rewardType: 'discount',
      rewardValue: discountPercentage,
      startDate: new Date(),
      endDate,
      isActive: true,
      metadata: {
        isPerk: true,
        validityPeriod,
        displayOnHomepage,
        displayInCart,
        displayInProfile: true
      }
    });
    
    await campaign.save();
    
    return res.status(201).json({
      success: true,
      message: 'Community perk created successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Error creating community perk:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating community perk',
      error: error.message
    });
  }
};

/**
 * Process order contribution to community campaigns
 * This is called from the order processing flow
 */
export const processOrderContribution = async (userId, orderAmount, orderId) => {
  try {
    if (!userId) {
      console.log('No user ID provided for community campaign contribution');
      return [];
    }
    
    // Find active campaigns
    const activeCampaigns = await Campaign.find({
      isActive: true,
      endDate: { $gt: new Date() },
      isAchieved: false
    });
    
    if (!activeCampaigns || activeCampaigns.length === 0) {
      return [];
    }
    
    console.log(`Processing community campaign contributions for user ${userId}, order ${orderId}`);
    
    // Determine contribution amount based on order value
    // For simplicity, contribute 1 point to each campaign
    // You could modify this to contribute more for higher-value orders
    const contributionAmount = 1;
    
    // Record contributions to all active campaigns
    const contributionPromises = activeCampaigns.map(async campaign => {
      try {
        // Record contribution
        await CommunityParticipation.recordContribution(
          userId,
          campaign._id,
          contributionAmount,
          'order'
        );
        
        // Update campaign progress
        campaign.currentProgress += contributionAmount;
        
        // Check if goal is achieved
        let isNewlyAchieved = false;
        if (campaign.currentProgress >= campaign.goalTarget && !campaign.isAchieved) {
          campaign.isAchieved = true;
          campaign.achievedDate = new Date();
          isNewlyAchieved = true;
          
          // If goal was just achieved, notify participants
          notifyParticipantsOfAchievement(campaign);
        }
        
        await campaign.save();
        
        return {
          campaignId: campaign._id,
          title: campaign.title,
          contribution: contributionAmount,
          isAchieved: isNewlyAchieved
        };
      } catch (error) {
        console.error(`Error contributing to campaign ${campaign._id}:`, error);
        return null;
      }
    });
    
    const contributions = await Promise.all(contributionPromises);
    return contributions.filter(Boolean);
    
  } catch (error) {
    console.error('Error processing campaign contributions:', error);
    return [];
  }
};

/**
 * Get active rewards for a user
 */
export const getUserActiveRewards = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get all active rewards that haven't expired
    const activeRewards = await UserReward.find({
      userId,
      isActive: true,
      isUsed: false,
      expiryDate: { $gt: new Date() }
    }).sort({ expiryDate: 1 });
    
    return res.status(200).json({
      success: true,
      data: activeRewards
    });
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user rewards',
      error: error.message
    });
  }
};

/**
 * Apply a reward to an order
 */
export const applyReward = async (req, res) => {
  try {
    const userId = req.userId;
    const { rewardId } = req.params;
    
    // Find the reward
    const reward = await UserReward.findOne({
      _id: rewardId,
      userId,
      isActive: true,
      isUsed: false,
      expiryDate: { $gt: new Date() }
    });
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found or expired'
      });
    }
    
    // Mark as used (will be done when order is completed)
    // This is just a preview to show discount amount
    
    return res.status(200).json({
      success: true,
      message: 'Reward applied successfully',
      data: {
        reward,
        discountAmount: reward.type === 'discount' ? reward.value : 0,
        freeShipping: reward.type === 'shipping',
        freeProduct: reward.type === 'product' ? reward.metadata?.productId : null
      }
    });
  } catch (error) {
    console.error('Error applying reward:', error);
    return res.status(500).json({
      success: false,
      message: 'Error applying reward',
      error: error.message
    });
  }
};

/**
 * Mark a reward as used after order completion
 */
export const markRewardAsUsed = async (userId, rewardId, orderId) => {
  try {
    if (!userId || !rewardId) {
      console.log('Missing userId or rewardId when marking reward as used');
      return null;
    }
    
    const reward = await UserReward.findOne({
      _id: rewardId,
      userId,
      isActive: true,
      isUsed: false
    });
    
    if (!reward) {
      console.log(`Reward ${rewardId} not found or already used`);
      return null;
    }
    
    // Mark as used
    reward.isUsed = true;
    reward.usedAt = new Date();
    reward.metadata = {
      ...reward.metadata,
      orderId
    };
    
    await reward.save();
    
    return reward;
  } catch (error) {
    console.error('Error marking reward as used:', error);
    return null;
  }
};

/**
 * Helper function to notify all participants when a campaign goal is achieved
 */
const notifyParticipantsOfAchievement = async (campaign) => {
  try {
    // Get all participants for this campaign
    const participants = await CommunityParticipation.find({ campaignId: campaign._id });
    
    if (!participants || participants.length === 0) {
      return;
    }
    
    // Format reward message based on reward type
    let rewardMessage;
    switch (campaign.rewardType) {
      case 'discount':
        rewardMessage = `${campaign.rewardValue}% discount`;
        break;
      case 'points':
        rewardMessage = `${campaign.rewardValue} loyalty points`;
        break;
      case 'shipping':
        rewardMessage = 'free shipping on your next order';
        break;
      case 'product':
        rewardMessage = 'a free gift with your next purchase';
        break;
      default:
        rewardMessage = `a special reward`;
    }
    
    // Create notifications for all participants
    const notifications = participants.map(participation => ({
      type: 'community_achievement',
      title: 'Community Goal Achieved!',
      message: `The "${campaign.title}" community goal has been achieved! You can now claim ${rewardMessage}.`,
      isRead: false,
      userId: participation.userId,
      metadata: { 
        campaignId: campaign._id,
        rewardType: campaign.rewardType,
        rewardValue: campaign.rewardValue
      }
    }));
    
    // Insert all notifications at once
    await NotificationModel.insertMany(notifications);
    
    console.log(`Sent achievement notifications to ${participants.length} participants for campaign ${campaign.title}`);
    
  } catch (error) {
    console.error('Error notifying participants of campaign achievement:', error);
  }
};

export default {
  createCampaign,
  getAllCampaigns,
  getActiveCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getUserCampaigns,
  contributeToCampaign,
  addContribution,
  getCampaignLeaderboard,
  redeemCampaignReward,
  createCommunityPerk,
  processOrderContribution,
  getUserActiveRewards,
  applyReward,
  markRewardAsUsed
};
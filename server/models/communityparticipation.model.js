import mongoose from 'mongoose';

const communityParticipationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  contributionAmount: {
    type: Number,
    default: 1,
    min: 1
  },
  contributionType: {
    type: String,
    enum: ['purchase', 'points', 'order', 'referral', 'review'],
    default: 'purchase'
  },
  lastContributionDate: {
    type: Date,
    default: Date.now
  },
  hasRedeemed: {
    type: Boolean,
    default: false
  },
  redeemDate: {
    type: Date
  },
  metadata: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

// Compound index to ensure a user can only have one participation record per campaign
communityParticipationSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

communityParticipationSchema.statics.recordContribution = async function(userId, campaignId, contributionAmount = 1, contributionType = 'purchase') {
  try {
    // Find or create participation record
    let participation = await this.findOne({ userId, campaignId });
    
    if (!participation) {
      participation = new this({
        userId,
        campaignId,
        contributionAmount,
        contributionType,
        lastContributionDate: new Date()
      });
    } else {
      // Update existing record
      participation.contributionAmount += contributionAmount;
      participation.lastContributionDate = new Date();
      
      // If contribution type changed, update it (e.g., from purchase to review)
      if (participation.contributionType !== contributionType) {
        participation.contributionType = contributionType;
      }
    }
    
    await participation.save();
    return participation;
  } catch (error) {
    console.error('Error recording campaign contribution:', error);
    throw error;
  }
};

const CommunityParticipation = mongoose.model('CommunityParticipation', communityParticipationSchema);

export default CommunityParticipation;
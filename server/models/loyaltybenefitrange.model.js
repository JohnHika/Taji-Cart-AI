import mongoose from 'mongoose';

const loyaltyBenefitRangeSchema = new mongoose.Schema({
  // First milestone (e.g. 1000 points)
  firstMilestone: {
    type: Number,
    required: true,
    min: 0,
    default: 1000
  },
  firstMilestoneName: {
    type: String,
    required: true,
    default: 'Welcome Reward'
  },
  
  // Second milestone (e.g. 2500 points)
  secondMilestone: {
    type: Number,
    required: true,
    min: 0,
    default: 2500
  },
  secondMilestoneName: {
    type: String,
    required: true,
    default: 'Loyalty Bonus'
  },
  
  // Third milestone (e.g. 5000 points)
  thirdMilestone: {
    type: Number,
    required: true,
    min: 0,
    default: 5000
  },
  thirdMilestoneName: {
    type: String,
    required: true,
    default: 'VIP Status'
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, { timestamps: true });

const LoyaltyBenefitRangeModel = mongoose.model('LoyaltyBenefitRange', loyaltyBenefitRangeSchema);

export default LoyaltyBenefitRangeModel;
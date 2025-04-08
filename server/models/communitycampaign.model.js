import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  goalType: {
    type: String,
    enum: ['purchases', 'points', 'orders', 'referrals', 'reviews'],
    default: 'purchases'
  },
  goalTarget: {
    type: Number,
    required: true,
    min: 1
  },
  currentProgress: {
    type: Number,
    default: 0,
    min: 0
  },
  rewardType: {
    type: String,
    enum: ['discount', 'points', 'product', 'shipping', 'credit'],
    default: 'discount'
  },
  rewardValue: {
    type: Number,
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAchieved: {
    type: Boolean,
    default: false
  },
  achievedDate: {
    type: Date
  },
  metadata: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

// Add an index for querying active campaigns
campaignSchema.index({ isActive: 1, endDate: 1 });

// Add a method to check if campaign is still valid
campaignSchema.methods.isValid = function() {
  return this.isActive && this.endDate > new Date() && !this.isAchieved;
};

// Add a method to calculate the percentage completion
campaignSchema.methods.getPercentage = function() {
  return Math.min(100, Math.round((this.currentProgress / this.goalTarget) * 100));
};

// Add a method to check if goal is achieved
campaignSchema.methods.checkAchievement = function() {
  if (this.currentProgress >= this.goalTarget && !this.isAchieved) {
    this.isAchieved = true;
    this.achievedDate = new Date();
    return true;
  }
  return false;
};

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;
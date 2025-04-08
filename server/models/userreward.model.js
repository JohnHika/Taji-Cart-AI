import mongoose from 'mongoose';

const userRewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityCampaign',
      required: true,
    },
    type: {
      type: String,
      enum: ['discount', 'points', 'shipping', 'product'],
      required: true,
    },
    value: {
      type: Number,
      required: function() {
        return this.type === 'discount' || this.type === 'points';
      },
    },
    code: {
      type: String,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
    },
    campaignTitle: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries by userId and active state
userRewardSchema.index({ userId: 1, isActive: 1 });
userRewardSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

const UserReward = mongoose.model('UserReward', userRewardSchema);

export default UserReward;
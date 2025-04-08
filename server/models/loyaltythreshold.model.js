import mongoose from 'mongoose';

const loyaltyThresholdSchema = new mongoose.Schema({
  // Standard tier thresholds - previously these were hardcoded
  bronzeThreshold: {
    type: Number,
    required: true,
    min: 100,
    default: 500
  },
  silverThreshold: {
    type: Number,
    required: true,
    min: 500,
    default: 1500
  },
  goldThreshold: {
    type: Number,
    required: true,
    min: 1500,
    default: 3000
  },
  platinumThreshold: {
    type: Number,
    required: true,
    min: 3000,
    default: 5000
  },
  
  // Early access configuration
  earlyAccessEnabled: {
    type: Boolean,
    default: false
  },
  
  // Early access thresholds for each tier
  earlyBronzeThreshold: {
    type: Number,
    required: true,
    min: 0,
    default: 400
  },
  earlySilverThreshold: {
    type: Number,
    required: true,
    min: 500,
    default: 1200
  },
  earlyGoldThreshold: {
    type: Number,
    required: true,
    min: 1500,
    default: 2500
  },
  earlyPlatinumThreshold: {
    type: Number,
    required: true,
    min: 3000,
    default: 3750
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

const LoyaltyThresholdModel = mongoose.model('LoyaltyThreshold', loyaltyThresholdSchema);

export default LoyaltyThresholdModel;
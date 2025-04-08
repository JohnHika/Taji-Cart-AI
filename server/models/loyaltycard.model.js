import mongoose from 'mongoose';

const pointsHistorySchema = new mongoose.Schema({
  points: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Add a schema for special promotions
const specialPromotionSchema = new mongoose.Schema({
  grantedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date,
    required: false
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
});

// Add a schema to track tier acquisition method
const tierAcquisitionSchema = new mongoose.Schema({
  tier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    required: true
  },
  method: {
    type: String,
    enum: ['standard', 'early_access', 'special_promotion', 'admin_grant'],
    required: true
  },
  acquiredAt: {
    type: Date,
    default: Date.now
  }
});

const loyaltyCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardNumber: {
    type: String,
    required: true,
    unique: true
  },
  tier: {
    type: String,
    enum: ['Basic', 'Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Basic'
  },
  points: {
    type: Number,
    default: 0
  },
  pointsHistory: [pointsHistorySchema],
  // Track how the user acquired their tier
  tierAcquisitionHistory: [tierAcquisitionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
  },
  // Add the special promotion field
  specialPromotion: {
    type: specialPromotionSchema,
    required: false
  }
});

// Improve the pre-save hook to always update tier based on points
loyaltyCardSchema.pre('save', async function(next) {
  try {
    // Only proceed with tier calculation if points have changed
    if (this.isModified('points')) {
      // Get the user to check if admin
      const UserModel = mongoose.model('User');
      const user = await UserModel.findById(this.userId);
      const isAdmin = user?.isAdmin === true || user?.role === 'admin';
      
      // Admins always maintain Platinum status
      if (isAdmin) {
        if (this.tier !== 'Platinum') {
          this.tier = 'Platinum';
          
          // Add to tier acquisition history if it doesn't exist
          if (!this.tierAcquisitionHistory) {
            this.tierAcquisitionHistory = [];
          }
          
          // Add admin grant entry if not already present
          const hasAdminGrant = this.tierAcquisitionHistory.some(entry => 
            entry.tier === 'Platinum' && entry.method === 'admin_grant'
          );
          
          if (!hasAdminGrant) {
            this.tierAcquisitionHistory.push({
              tier: 'Platinum',
              method: 'admin_grant',
              acquiredAt: new Date()
            });
          }
        }
        return next();
      }
      
      // For regular users, calculate tier based on points
      // Get the current thresholds from the database
      const LoyaltyThresholdModel = mongoose.model('LoyaltyThreshold');
      const thresholds = await LoyaltyThresholdModel.findOne().sort({ lastUpdated: -1 });
      
      if (!thresholds) {
        console.log('No loyalty thresholds found, using default values');
        // Use default tier logic if no thresholds found
        const points = this.points;
        let newTier = 'Basic';
        
        if (points >= 5000) newTier = 'Platinum';
        else if (points >= 3000) newTier = 'Gold';
        else if (points >= 1500) newTier = 'Silver';
        else if (points >= 500) newTier = 'Bronze';
        
        // Check if tier is changing
        if (this.tier !== newTier) {
          console.log(`Auto-upgrading user ${this.userId} from ${this.tier} to ${newTier} (${points} points)`);
          
          // Store the old tier before changing
          const oldTier = this.tier;
          this.tier = newTier;
          
          // Add tier acquisition history if it doesn't exist
          if (!this.tierAcquisitionHistory) {
            this.tierAcquisitionHistory = [];
          }
          
          // Add standard tier acquisition method
          this.tierAcquisitionHistory.push({
            tier: newTier,
            method: 'standard',
            acquiredAt: new Date()
          });
        }
      } else {
        // Use configured thresholds
        const points = this.points;
        let newTier = 'Basic';
        let method = 'standard';
        
        // First check standard thresholds
        if (points >= thresholds.platinumThreshold) newTier = 'Platinum';
        else if (points >= thresholds.goldThreshold) newTier = 'Gold';
        else if (points >= thresholds.silverThreshold) newTier = 'Silver';
        else if (points >= thresholds.bronzeThreshold) newTier = 'Bronze';
        
        // If still Basic and early access is enabled, check early access thresholds
        if (newTier === 'Basic' && thresholds.earlyAccessEnabled) {
          if (points >= thresholds.earlyPlatinumThreshold) {
            newTier = 'Platinum';
            method = 'early_access';
          } else if (points >= thresholds.earlyGoldThreshold) {
            newTier = 'Gold';
            method = 'early_access';
          } else if (points >= thresholds.earlySilverThreshold) {
            newTier = 'Silver';
            method = 'early_access';
          } else if (points >= thresholds.earlyBronzeThreshold) {
            newTier = 'Bronze';
            method = 'early_access';
          }
        }
        
        // Check if tier is changing
        if (this.tier !== newTier) {
          console.log(`Auto-upgrading user ${this.userId} from ${this.tier} to ${newTier} (${points} points) via ${method}`);
          
          // Store the old tier before changing
          const oldTier = this.tier;
          this.tier = newTier;
          
          // Add tier acquisition history if it doesn't exist
          if (!this.tierAcquisitionHistory) {
            this.tierAcquisitionHistory = [];
          }
          
          // Add the appropriate tier acquisition method
          this.tierAcquisitionHistory.push({
            tier: newTier,
            method: method,
            acquiredAt: new Date()
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in tier upgrade middleware:', error);
    next(error);
  }
});

const LoyaltyCardModel = mongoose.model('LoyaltyCard', loyaltyCardSchema);

export default LoyaltyCardModel;
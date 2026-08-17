import mongoose from 'mongoose';

const loyaltySettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'loyaltyProgram',
      unique: true,
      immutable: true,
    },
    // Master switch. When false, the loyalty/Royal Card feature is fully
    // deactivated for every customer except those individually granted
    // access via User.loyaltyAccessGranted (see hasLoyaltyAccess()).
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const LoyaltySettingsModel = mongoose.model('loyaltySettings', loyaltySettingsSchema);

export default LoyaltySettingsModel;

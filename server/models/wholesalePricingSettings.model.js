import mongoose from 'mongoose';

const wholesalePricingSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'wholesalePricing',
      unique: true,
      immutable: true,
    },
    // When true, a product's % discount and Royal loyalty card discount still
    // apply on top of its wholesale price once an order qualifies. When false
    // (default), the wholesale price is used as-is — it's already treated as
    // the final bulk-negotiated rate.
    stackDiscounts: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const WholesalePricingSettingsModel = mongoose.model('wholesalePricingSettings', wholesalePricingSettingsSchema);

export default WholesalePricingSettingsModel;

import mongoose from 'mongoose';

const catalogSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'storefront',
      unique: true,
      immutable: true,
    },
    hideIncompleteProducts: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const CatalogSettingsModel = mongoose.model('catalogSettings', catalogSettingsSchema);

export default CatalogSettingsModel;

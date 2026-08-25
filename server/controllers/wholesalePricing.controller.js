import WholesalePricingSettingsModel from '../models/wholesalePricingSettings.model.js';
import { getWholesalePricingSettings } from '../utils/wholesalePricing.js';

// Public — the storefront cart needs this to preview the same price the
// server will actually charge once an order qualifies for wholesale pricing.
// Not sensitive: it only exposes a single on/off toggle, no pricing data.
export const getWholesalePricingSettingsController = async (_req, res) => {
  try {
    const settings = await getWholesalePricingSettings();
    return res.status(200).json({
      success: true,
      data: { stackDiscounts: settings.stackDiscounts },
    });
  } catch (error) {
    console.error('Error fetching wholesale pricing settings:', error);
    return res.status(500).json({ success: false, message: 'Unable to load wholesale pricing settings' });
  }
};

export const updateWholesalePricingSettingsController = async (req, res) => {
  try {
    const { stackDiscounts } = req.body;
    if (typeof stackDiscounts !== 'boolean') {
      return res.status(400).json({ success: false, message: "'stackDiscounts' must be true or false" });
    }

    const settings = await WholesalePricingSettingsModel.findOneAndUpdate(
      { key: 'wholesalePricing' },
      { $set: { stackDiscounts } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: stackDiscounts
        ? 'Discounts will now stack on top of wholesale pricing'
        : 'Wholesale price will now be used as the final price',
      data: { stackDiscounts: settings.stackDiscounts },
    });
  } catch (error) {
    console.error('Error updating wholesale pricing settings:', error);
    return res.status(500).json({ success: false, message: 'Unable to update wholesale pricing settings' });
  }
};

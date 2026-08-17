import LoyaltySettingsModel from '../models/loyaltySettings.model.js';

const LOYALTY_SETTINGS_KEY = 'loyaltyProgram';

export const getLoyaltySettings = async () =>
  LoyaltySettingsModel.findOneAndUpdate(
    { key: LOYALTY_SETTINGS_KEY },
    { $setOnInsert: { enabled: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

// Single source of truth for whether the loyalty/Royal Card feature is live
// for a given user: either the program is globally enabled, or this specific
// customer has been individually granted exclusive access. Every place that
// shows loyalty UI or awards/applies a loyalty benefit must gate on this.
export const hasLoyaltyAccess = async (user) => {
  if (user?.loyaltyAccessGranted === true) return true;
  const settings = await getLoyaltySettings();
  return settings.enabled === true;
};

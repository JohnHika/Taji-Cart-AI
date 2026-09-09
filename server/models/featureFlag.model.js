import mongoose from 'mongoose';

// Feature flags power staged rollouts: a feature ships to production behind a
// key, admins preview it live while it stays invisible to everyone else, and
// an explicit "release" flips it public. Visibility rules live in
// controllers/featureFlag.controller.js (getVisibleFeatureFlags).
const featureFlagSchema = new mongoose.Schema(
  {
    // Code reference — client components gate on this via <FeatureGate flagKey="...">
    key: {
      type: String,
      required: [true, 'Provide key'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9][a-z0-9._-]*$/, 'Key must be lowercase letters, numbers, dots, dashes or underscores'],
    },
    name: {
      type: String,
      required: [true, 'Provide name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // 'admin-only' → visible to admins only (preview stage)
    // 'released'   → visible to everyone
    status: {
      type: String,
      enum: ['admin-only', 'released'],
      default: 'admin-only',
    },
    // Kill switch — when false the feature is hidden from everyone regardless
    // of status. Admins still see it in the Feature Releases panel either way.
    enabled: {
      type: Boolean,
      default: true,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const FeatureFlagModel = mongoose.model('featureFlag', featureFlagSchema);

export default FeatureFlagModel;

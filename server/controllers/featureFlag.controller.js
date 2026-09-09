import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import FeatureFlagModel from '../models/featureFlag.model.js';
import UserModel from '../models/user.model.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// The visibility endpoint must work for guests (no token) while still
// recognising admins so they can preview not-yet-released features. The normal
// auth middleware would 401 guests, so verify silently instead: any failure
// (missing/expired/invalid token) simply means "treat as guest".
const resolveRequester = async (request) => {
  const token = request.cookies?.accessToken || request?.headers?.authorization?.split(' ')[1];
  if (!token) return { isAdmin: false };

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);
    const user = await UserModel.findById(decoded._id);
    if (!user || user.status === 'Suspended') return { isAdmin: false };
    return { isAdmin: user.isAdmin === true || user.role === 'admin' };
  } catch {
    return { isAdmin: false };
  }
};

const toClientFlag = (flag) => ({
  _id: flag._id,
  key: flag.key,
  name: flag.name,
  description: flag.description,
  status: flag.status,
  enabled: flag.enabled,
  releasedAt: flag.releasedAt,
});

// GET /api/feature-flags — flags visible to *this* requester:
//   admin            → all enabled flags (admin-only + released) so they can preview
//   guest / any role → only released && enabled
export const getVisibleFeatureFlags = async (request, response) => {
  try {
    const { isAdmin } = await resolveRequester(request);

    const filter = isAdmin ? { enabled: true } : { enabled: true, status: 'released' };
    const flags = await FeatureFlagModel.find(filter).sort({ createdAt: -1 }).lean();

    return response.json({ success: true, isAdmin, data: flags.map(toClientFlag) });
  } catch (error) {
    console.error('Get visible feature flags error:', error);
    return response.status(500).json({ success: false, message: 'Failed to load feature flags' });
  }
};

// GET /api/feature-flags/all — admin: every flag, including disabled ones.
export const getAllFeatureFlags = async (_request, response) => {
  try {
    const flags = await FeatureFlagModel.find().sort({ createdAt: -1 });
    return response.json({ success: true, data: flags });
  } catch (error) {
    console.error('Get all feature flags error:', error);
    return response.status(500).json({ success: false, message: 'Failed to load feature flags' });
  }
};

// POST /api/feature-flags — admin: register a feature. Always starts admin-only.
export const createFeatureFlag = async (request, response) => {
  try {
    const { key, name, description } = request.body || {};
    if (!key?.trim() || !name?.trim()) {
      return response.status(400).json({ success: false, message: 'Key and name are required' });
    }

    // Same normalisation as the admin form: "AI Style Tryon" → "ai-style-tryon".
    // Prevents a Mongoose regex validation crash for any caller that skips the form.
    const normalisedKey = key
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/-{2,}/g, '-');
    if (!normalisedKey) {
      return response.status(400).json({ success: false, message: 'Key must contain at least one letter or number' });
    }
    const existing = await FeatureFlagModel.findOne({ key: normalisedKey });
    if (existing) {
      return response.status(409).json({ success: false, message: `Feature key "${normalisedKey}" already exists` });
    }

    const flag = await FeatureFlagModel.create({
      key: normalisedKey,
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: request.userId,
    });

    return response.status(201).json({
      success: true,
      message: 'Feature created — admins can preview it now, everyone else sees nothing until you release it',
      data: flag,
    });
  } catch (error) {
    console.error('Create feature flag error:', error);
    return response.status(500).json({ success: false, message: 'Failed to create feature' });
  }
};

// PUT /api/feature-flags/:id — admin: edit name/description/enabled.
// status is deliberately NOT editable here — releasing is an explicit, separate
// action so a generic edit can never accidentally push a feature to the public.
export const updateFeatureFlag = async (request, response) => {
  try {
    const { id } = request.params;
    if (!isValidId(id)) {
      return response.status(400).json({ success: false, message: 'Invalid feature id' });
    }

    const { name, description, enabled } = request.body || {};
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (enabled !== undefined) update.enabled = Boolean(enabled);

    const flag = await FeatureFlagModel.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!flag) {
      return response.status(404).json({ success: false, message: 'Feature not found' });
    }

    return response.json({ success: true, message: 'Feature updated', data: flag });
  } catch (error) {
    console.error('Update feature flag error:', error);
    return response.status(500).json({ success: false, message: 'Failed to update feature' });
  }
};

// POST /api/feature-flags/:id/release — admin: flip the feature to public.
export const releaseFeatureFlag = async (request, response) => {
  try {
    const { id } = request.params;
    if (!isValidId(id)) {
      return response.status(400).json({ success: false, message: 'Invalid feature id' });
    }

    const flag = await FeatureFlagModel.findById(id);
    if (!flag) {
      return response.status(404).json({ success: false, message: 'Feature not found' });
    }

    flag.status = 'released';
    flag.releasedAt = new Date();
    flag.releasedBy = request.userId;
    await flag.save();

    return response.json({
      success: true,
      message: `"${flag.name}" released — now visible to everyone`,
      data: flag,
    });
  } catch (error) {
    console.error('Release feature flag error:', error);
    return response.status(500).json({ success: false, message: 'Failed to release feature' });
  }
};

// POST /api/feature-flags/:id/unrelease — admin: pull back to admin-only preview.
export const unreleaseFeatureFlag = async (request, response) => {
  try {
    const { id } = request.params;
    if (!isValidId(id)) {
      return response.status(400).json({ success: false, message: 'Invalid feature id' });
    }

    const flag = await FeatureFlagModel.findById(id);
    if (!flag) {
      return response.status(404).json({ success: false, message: 'Feature not found' });
    }

    flag.status = 'admin-only';
    flag.releasedAt = null;
    await flag.save();

    return response.json({
      success: true,
      message: `"${flag.name}" pulled back — only admins can see it again`,
      data: flag,
    });
  } catch (error) {
    console.error('Unrelease feature flag error:', error);
    return response.status(500).json({ success: false, message: 'Failed to unrelease feature' });
  }
};

// DELETE /api/feature-flags/:id — admin. Note: gated UI treats a missing key as
// hidden, so deleting re-hides the feature from everyone (admins included).
export const deleteFeatureFlag = async (request, response) => {
  try {
    const { id } = request.params;
    if (!isValidId(id)) {
      return response.status(400).json({ success: false, message: 'Invalid feature id' });
    }

    const flag = await FeatureFlagModel.findByIdAndDelete(id);
    if (!flag) {
      return response.status(404).json({ success: false, message: 'Feature not found' });
    }

    return response.json({ success: true, message: `"${flag.name}" deleted` });
  } catch (error) {
    console.error('Delete feature flag error:', error);
    return response.status(500).json({ success: false, message: 'Failed to delete feature' });
  }
};

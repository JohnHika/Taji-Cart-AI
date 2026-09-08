import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';
import generatedAccessToken from '../utils/generatedAccessToken.js';

const HANDOFF_AUDIENCE = 'nawiri-store-portal';
const HANDOFF_TTL = '60s';
const issuedHandoffs = new Map();

const handoffSecret = () => process.env.SECRET_KEY_ACCESS_TOKEN;

const pruneExpiredHandoffs = () => {
  const now = Date.now();
  for (const [id, expiresAt] of issuedHandoffs) {
    if (expiresAt <= now) issuedHandoffs.delete(id);
  }
};

// The primary site is the only place a signed-in admin can initiate a store
// session. The resulting grant is short lived, single use, and exchanged on
// the store subdomain for a session-only API token. This avoids passing a
// reusable admin token through the URL or relying on cross-subdomain storage.
export const createStorePortalHandoff = async (request, response) => {
  const secret = handoffSecret();
  if (!secret) {
    return response.status(503).json({ success: false, message: 'Store access is not configured.' });
  }

  pruneExpiredHandoffs();
  const handoffId = crypto.randomUUID();
  const expiresAt = Date.now() + 60_000;
  issuedHandoffs.set(handoffId, expiresAt);

  const handoff = jwt.sign(
    { _id: request.userId, purpose: HANDOFF_AUDIENCE, handoffId },
    secret,
    { audience: HANDOFF_AUDIENCE, expiresIn: HANDOFF_TTL },
  );

  return response.json({ success: true, data: { handoff, expiresAt } });
};

export const exchangeStorePortalHandoff = async (request, response) => {
  const secret = handoffSecret();
  const handoff = String(request.body?.handoff || '').trim();

  if (!secret || !handoff || handoff.length > 2000) {
    return response.status(401).json({ success: false, message: 'Store access link is invalid or expired.' });
  }

  try {
    pruneExpiredHandoffs();
    const decoded = jwt.verify(handoff, secret, { audience: HANDOFF_AUDIENCE });
    if (decoded?.purpose !== HANDOFF_AUDIENCE || !decoded?.handoffId || !issuedHandoffs.has(decoded.handoffId)) {
      return response.status(401).json({ success: false, message: 'Store access link is invalid or already used.' });
    }

    // Consume before issuing a token: a copied fragment cannot be replayed.
    issuedHandoffs.delete(decoded.handoffId);
    const user = await UserModel.findById(decoded._id).select('name role isAdmin status').lean();
    if (!user || user.status === 'Suspended' || (user.role !== 'admin' && user.isAdmin !== true)) {
      return response.status(403).json({ success: false, message: 'Only an active admin can open Store Management.' });
    }

    const accessToken = await generatedAccessToken(user._id);
    return response.json({
      success: true,
      data: {
        accessToken,
        expiresInSeconds: 30 * 60,
        user: { name: user.name, role: user.role || 'admin' },
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return response.status(401).json({ success: false, message: 'Store access link is invalid or expired.' });
    }
    console.error('Failed to exchange Store Management handoff:', error);
    return response.status(500).json({ success: false, message: 'Unable to open Store Management right now.' });
  }
};

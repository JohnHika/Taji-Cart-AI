import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getAllFeatureFlags,
  getVisibleFeatureFlags,
  releaseFeatureFlag,
  unreleaseFeatureFlag,
  updateFeatureFlag,
} from '../controllers/featureFlag.controller.js';

const router = Router();

// Public but admin-aware: returns the flags the *current* requester may see.
// Guests/regular users get released flags only; admins get their previews too.
router.get('/', getVisibleFeatureFlags);

// Everything below is admin-only.
router.get('/all', auth, admin, getAllFeatureFlags);
router.post('/', auth, admin, createFeatureFlag);
router.put('/:id', auth, admin, updateFeatureFlag);
router.post('/:id/release', auth, admin, releaseFeatureFlag);
router.post('/:id/unrelease', auth, admin, unreleaseFeatureFlag);
router.delete('/:id', auth, admin, deleteFeatureFlag);

export default router;

import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
  attachTryOnToProduct,
  deleteTryOnResult,
  generateTryOn,
  listTryOnResults,
  setTryOnStatus,
} from '../controllers/tryon.controller.js';

// AI hairstyle try-on — admin-only while it's being refined. Public exposure
// later (if ever) will be its own decision; for now every endpoint requires
// an admin session, and the controller additionally fail-closes unless the
// ai-style-tryon feature flag is enabled in the Feature Releases panel.
const router = Router();

router.post('/generate', auth, admin, generateTryOn);
router.get('/results', auth, admin, listTryOnResults);
router.put('/results/:id/status', auth, admin, setTryOnStatus);
router.post('/results/:id/attach', auth, admin, attachTryOnToProduct);
router.delete('/results/:id', auth, admin, deleteTryOnResult);

export default router;